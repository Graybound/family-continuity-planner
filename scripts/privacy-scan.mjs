// Privacy and secret scan. Run before every commit and in CI: `npm run privacy-scan`.
//
// Scans every file Git tracks or would track (respecting .gitignore), plus
// commit metadata and history, for things that must never be published:
// real-looking emails, phone numbers, ID or account numbers, API keys, tokens,
// private keys, and password-like text.
//
// Private denylist: put real names, street names, or other personal terms
// (one per line) in a file named .privacy-denylist at the repository root,
// or point FCP_PRIVACY_DENYLIST at a file elsewhere. That file is ignored by
// Git and must never be committed. Matches are reported without echoing the term.
//
// A line can opt out of the generic checks with the comment "privacy-scan: allow".
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';

const BINARY = /\.(png|jpe?g|gif|webp|ico|pdf|zip|woff2?)$/i;
const SKIP = new Set(['package-lock.json']);
// Placeholder domains, GitHub noreply identities (including bots such as Dependabot), and
// GitHub's own bot addresses that appear in automated commits and sign-offs.
const ALLOWED_EMAIL_DOMAINS = /(@(example\.(com|org|net|invalid)|users\.noreply\.github\.com|anthropic\.com)|^(noreply|support)@github\.com)$/i;

const RULES = [
  { name: 'email address (use @example.com)', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, allow: (m) => ALLOWED_EMAIL_DOMAINS.test(m) },
  { name: 'phone number (use 555-01xx)', re: /(?:\+?1[ .-]?)?\(?\b\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b|\b\d{3}-\d{4}\b/g, allow: (m) => /555[ .-]01\d\d$/.test(m) },
  { name: 'SSN-like number', re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { name: 'long digit run (account or card number?)', re: /\b\d{9,}\b/g },
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: 'GitHub token', re: /\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g },
  { name: 'API secret key', re: /\b(sk|rk)-[A-Za-z0-9_-]{20,}\b/g },
  { name: 'Slack token', re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  { name: 'private key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { name: 'password-like text', re: /\b(password|passcode|passwd|pin)\s*[:=]\s*["']?[^\s"',;)]{3,}/gi },
];

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

const inGit = existsSync('.git');
const files = inGit
  ? sh('git', ['ls-files', '--cached', '--others', '--exclude-standard']).split('\n').filter(Boolean)
  : [];
if (!inGit) {
  console.error('privacy-scan: not a Git repository; nothing to scan.');
  process.exit(1);
}

const denyFile = process.env.FCP_PRIVACY_DENYLIST || '.privacy-denylist';
const deny = existsSync(denyFile)
  ? readFileSync(denyFile, 'utf8').split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#'))
  : [];
const denyRes = deny.map((t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'));

const findings = [];
function scanText(where, text, { generic = true } = {}) {
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    denyRes.forEach((re, d) => {
      if (re.test(line)) findings.push(`${where}:${i + 1}: matches private denylist entry #${d + 1}`);
    });
    if (!generic || line.includes('privacy-scan: allow')) return;
    for (const rule of RULES) {
      for (const m of line.matchAll(rule.re)) {
        if (rule.allow?.(m[0])) continue;
        findings.push(`${where}:${i + 1}: ${rule.name}: ${m[0].slice(0, 6)}...`);
      }
    }
  });
}

for (const f of files) {
  if (!existsSync(f) || statSync(f).isDirectory()) continue;
  scanText(`[filename] ${f}`, f, { generic: false });
  if (SKIP.has(f.split('/').pop())) continue;
  if (BINARY.test(f)) continue;
  scanText(f, readFileSync(f, 'utf8'));
}

// Commit authors, committers, messages, and every historical diff.
let hasCommits = true;
try {
  sh('git', ['rev-parse', '--verify', 'HEAD']);
} catch {
  hasCommits = false;
}
if (hasCommits) {
  scanText('[git authors]', sh('git', ['log', '--all', '--format=%an <%ae>%n%cn <%ce>']));
  scanText('[git messages]', sh('git', ['log', '--all', '--format=%B']));
  if (denyRes.length) scanText('[git history]', sh('git', ['log', '--all', '-p', '--no-color', '--format=']), { generic: false });
}

if (!deny.length) console.warn('privacy-scan: no private denylist found. Add real personal terms to .privacy-denylist for a stronger check.');
if (findings.length) {
  console.error(`privacy-scan: ${findings.length} finding(s):\n${[...new Set(findings)].join('\n')}`);
  process.exit(1);
}
console.log(`privacy-scan: OK (${files.length} files${hasCommits ? ', history and authors' : ''}${deny.length ? `, ${deny.length} denylist terms` : ''})`);

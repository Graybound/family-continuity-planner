// Check the deployed site: the strict CSP arrives as a header and in the page,
// and Cloudflare did not inject or rewrite anything. Run after each deploy and
// after any Cloudflare settings change. See docs/cloudflare.md.
//
// Usage: node scripts/verify-cloudflare.mjs [url]
//   default url: https://whenimgone.grayhek.com/
// Exits 1 and lists every problem if any check fails.
import { createHash } from 'node:crypto';

const url = process.argv[2] ?? 'https://whenimgone.grayhek.com/';
const res = await fetch(url, { redirect: 'manual', headers: { 'Cache-Control': 'no-cache' } });
const html = await res.text();
const problems = [];
const fail = (msg) => problems.push(msg);

if (res.status !== 200) fail(`Expected HTTP 200, got ${res.status}.`);
if (!(res.headers.get('content-type') ?? '').startsWith('text/html')) fail(`Content-Type is "${res.headers.get('content-type')}", expected text/html.`);

const header = res.headers.get('content-security-policy');
const metas = [...html.matchAll(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/g)].map((m) => m[1]);
if (!header) fail('No Content-Security-Policy response header. Is dist/_headers deployed?');
if (metas.length !== 1) fail(`Expected one CSP <meta> in the page, found ${metas.length}.`);
if (header && metas[0] && header !== `${metas[0]}; frame-ancestors 'none'`) fail('CSP header does not match the CSP <meta> plus frame-ancestors. Something rewrote the page or the header.');

// If Cloudflare rewrote the page, the inline code no longer matches the hashes the build put in the CSP.
const hash = (s) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;
const policy = metas[0] ?? '';
for (const [tag, directive] of [['script', 'script-src'], ['style', 'style-src']]) {
  const allowed = (policy.split('; ').find((d) => d.startsWith(`${directive} `)) ?? '').split(' ').slice(1);
  const blocks = [...html.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, 'g'))].filter((m) => !/\bsrc=/.test(m[1])).map((m) => m[2]);
  const extra = blocks.map(hash).filter((h) => !allowed.includes(h));
  if (extra.length) fail(`${extra.length} inline <${tag}> block(s) are not in the build's CSP. Something injected or rewrote code.`);
}

const fingerprints = {
  '/cdn-cgi/': 'a Cloudflare /cdn-cgi/ reference (Email Obfuscation, Rocket Loader, challenge or Zaraz)',
  'cloudflareinsights': 'the Web Analytics beacon',
  'rocket-loader': 'Rocket Loader',
  'data-cfemail': 'Email Obfuscation',
  'zaraz': 'Zaraz',
};
if (/<script\b[^>]*\bsrc=/.test(html)) fail('Page contains an external <script src>.');
for (const [needle, what] of Object.entries(fingerprints)) if (html.includes(needle)) fail(`Page contains ${what} ("${needle}").`);

// These make the browser send reports or keep state with Cloudflare, outside the app's CSP.
for (const h of ['set-cookie', 'nel', 'report-to', 'reporting-endpoints', 'content-security-policy-report-only']) {
  if (res.headers.get(h)) fail(`Unexpected ${h} header: ${res.headers.get(h)}`);
}

if (!(res.headers.get('cache-control') ?? '').includes('no-transform')) fail('Cache-Control is missing no-transform.');
if (!(res.headers.get('strict-transport-security') ?? '')) fail('Strict-Transport-Security header missing.');
for (const h of ['x-content-type-options', 'referrer-policy', 'x-frame-options']) if (!res.headers.get(h)) fail(`${h} header missing.`);

if (problems.length) {
  console.error(`FAIL ${url}\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`OK ${url}: CSP header and <meta> match, no injected or rewritten code, ${html.length} bytes, sha256 ${createHash('sha256').update(html).digest('hex')}`);

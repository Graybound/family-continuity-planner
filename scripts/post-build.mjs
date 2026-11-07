// Post-build: add a strict Content Security Policy to dist/index.html.
//
// The build is a single self-contained HTML file, so every script and style is
// inline. Instead of allowing all inline code ('unsafe-inline'), the policy
// lists the SHA-256 hash of each inline <script> and <style> block. Anything
// else, including any injected script, is refused by the browser. The policy
// also forbids every network connection, so even a bug could not send data out.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../dist/index.html', import.meta.url);
let html = readFileSync(file, 'utf8');

const hash = (s) => `'sha256-${createHash('sha256').update(s, 'utf8').digest('base64')}'`;
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
if (!scripts.length || !styles.length) throw new Error('Expected inline scripts and styles in the single-file build.');
if (/<script\b[^>]*\bsrc=/.test(html) || /<link\b[^>]*rel="stylesheet"/.test(html)) {
  throw new Error('Build references an external script or stylesheet; the single-file build must be fully inline.');
}

const csp = [
  "default-src 'none'",
  `script-src ${scripts.map(hash).join(' ')}`,
  `style-src ${styles.map(hash).join(' ')}`,
  'img-src data: blob:',
  "font-src 'none'",
  "connect-src 'none'",
  "media-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "manifest-src 'none'",
  "form-action 'none'",
  "base-uri 'none'",
].join('; ');

if (html.includes('http-equiv="Content-Security-Policy"')) throw new Error('CSP already present; run a clean build.');
html = html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${csp}">`);

// Fail the build if any absolute URL slipped into the output, except the project's own
// repository page, which appears only as a link the user can choose to open. The CSP
// still blocks the app from loading or sending anything to it.
const repo = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).repository.url;
const urls = [...html.matchAll(/\bhttps?:\/\/[^\s"'<>)]+/g)].map((m) => m[0]).filter((u) => !u.startsWith('http://www.w3.org/') && !u.startsWith(repo));
if (urls.length) throw new Error(`Unexpected external URLs in build output: ${[...new Set(urls)].join(', ')}`);

writeFileSync(file, html);
console.log(`post-build: CSP added (${scripts.length} script hash, ${styles.length} style hash). ${(html.length / 1024).toFixed(1)} KB`);

// Write dist/_headers for the Cloudflare deploy. Run after "npm run build".
//
// The CSP in dist/index.html lists a SHA-256 hash for each inline script and
// style, so it changes with every build. This script copies that exact policy
// into a response header instead of keeping a second copy by hand. The header
// adds the one directive a <meta> tag cannot carry: frame-ancestors, which stops
// other sites from framing the app. See docs/cloudflare.md.
//
// "no-transform" in Cache-Control asks Cloudflare features that rewrite HTML
// (Email Obfuscation, Rocket Loader, Web Analytics injection and others) to
// leave the page alone. It is a second line of defense: those features must
// still be turned off for the hostname.
//
// Usage: node scripts/cloudflare-headers.mjs [distDir]   (default: dist)
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'dist';
const html = readFileSync(join(dir, 'index.html'), 'utf8');

const metas = [...html.matchAll(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/g)];
if (metas.length !== 1) throw new Error(`Expected exactly one CSP <meta> in ${dir}/index.html, found ${metas.length}. Run "npm run build" first.`);
const csp = metas[0][1];
for (const required of ["default-src 'none'", "connect-src 'none'", 'script-src ', 'style-src ']) {
  if (!csp.includes(required)) throw new Error(`CSP in the build is missing "${required}". Refusing to deploy a weaker policy.`);
}
if (/unsafe-inline|unsafe-eval|\*/.test(csp)) throw new Error('CSP in the build allows unsafe-inline, unsafe-eval or a wildcard.');

const headers = {
  'Content-Security-Policy': `${csp}; frame-ancestors 'none'`,
  'Cache-Control': 'no-cache, no-transform',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000',
};

const body = ['/*', ...Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`)].join('\n') + '\n';
writeFileSync(join(dir, '_headers'), body);
console.log(`cloudflare-headers: wrote ${join(dir, '_headers')} (${Object.keys(headers).length} headers, CSP copied from index.html)`);

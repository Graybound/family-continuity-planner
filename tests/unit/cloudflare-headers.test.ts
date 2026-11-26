// scripts/cloudflare-headers.mjs copies the build's CSP into dist/_headers for
// the Cloudflare deploy. These tests run the real script against small fixtures.
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = new URL('../../scripts/cloudflare-headers.mjs', import.meta.url).pathname;
const CSP = "default-src 'none'; script-src 'sha256-abc='; style-src 'sha256-def='; connect-src 'none'; base-uri 'none'";

function run(html: string): { headers?: string; error?: string } {
  const dir = mkdtempSync(join(tmpdir(), 'cf-headers-'));
  writeFileSync(join(dir, 'index.html'), html);
  try {
    execFileSync(process.execPath, [SCRIPT, dir], { stdio: 'pipe' });
    return { headers: readFileSync(join(dir, '_headers'), 'utf8') };
  } catch (e) {
    return { error: String((e as { stderr?: Buffer }).stderr ?? e) };
  }
}
const page = (csp: string) => `<!doctype html><html><head><meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${csp}"></head><body></body></html>`;

describe('cloudflare-headers', () => {
  it('copies the build CSP into the header and adds frame-ancestors', () => {
    const { headers } = run(page(CSP));
    expect(headers).toBeDefined();
    const lines = headers!.split('\n');
    expect(lines[0]).toBe('/*');
    expect(lines).toContain(`  Content-Security-Policy: ${CSP}; frame-ancestors 'none'`);
    expect(lines).toContain('  Cache-Control: no-cache, no-transform');
    expect(lines).toContain('  X-Frame-Options: DENY');
  });

  it('refuses a build without exactly one CSP meta tag', () => {
    expect(run('<!doctype html><html><head></head></html>').error).toMatch(/exactly one CSP/);
    expect(run(page(CSP).replace('</head>', `<meta http-equiv="Content-Security-Policy" content="${CSP}"></head>`)).error).toMatch(/exactly one CSP/);
  });

  it('refuses a weakened policy', () => {
    expect(run(page(CSP.replace("connect-src 'none'", 'connect-src https:'))).error).toMatch(/missing "connect-src 'none'"/);
    expect(run(page(CSP.replace("'sha256-abc='", "'unsafe-inline'"))).error).toMatch(/unsafe-inline/);
  });
});

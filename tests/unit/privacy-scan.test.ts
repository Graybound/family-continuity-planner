// scripts/privacy-scan.mjs also scans every commit message. A message cannot be changed once it
// is on main, so .privacy-scan-allow-commits lets a listed commit skip the generic checks.
// These tests run the real script in a throwaway Git repository.
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = new URL('../../scripts/privacy-scan.mjs', import.meta.url).pathname;
// Built from parts so this file does not trip the scan itself.
const FLAGGED = ['Pass', 'word: ', 'hunter2'].join('');

function repoWithMessage(message: string): { dir: string; sha: string } {
  const dir = mkdtempSync(join(tmpdir(), 'privacy-scan-'));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  git('init', '-q');
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.com');
  writeFileSync(join(dir, 'README.md'), 'hello\n');
  git('add', '.');
  git('commit', '-q', '-m', message);
  return { dir, sha: git('rev-parse', 'HEAD') };
}

function scan(dir: string): { ok: boolean; output: string } {
  try {
    const out = execFileSync(process.execPath, [SCRIPT], { cwd: dir, stdio: 'pipe', encoding: 'utf8' });
    return { ok: true, output: out };
  } catch (e) {
    return { ok: false, output: String((e as { stderr?: string }).stderr ?? e) };
  }
}

describe('privacy-scan commit messages', () => {
  it('flags password-like text in a commit message', () => {
    const { dir } = repoWithMessage(`Fix audit\n\n${FLAGGED} is still flagged`);
    const result = scan(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('password-like text');
  });

  it('skips the generic checks for a commit listed in .privacy-scan-allow-commits', () => {
    const { dir, sha } = repoWithMessage(`Fix audit\n\n${FLAGGED} is still flagged`);
    writeFileSync(join(dir, '.privacy-scan-allow-commits'), `# reason\n${sha} quotes a made-up sample\n`);
    expect(scan(dir).ok).toBe(true);
  });

  it('still applies the private denylist to a listed commit', () => {
    const { dir, sha } = repoWithMessage('Mention Zebulon here');
    writeFileSync(join(dir, '.privacy-scan-allow-commits'), `${sha} test\n`);
    writeFileSync(join(dir, '.privacy-denylist'), 'Zebulon\n');
    const result = scan(dir);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('denylist');
  });
});

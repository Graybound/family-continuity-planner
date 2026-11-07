# Security

## Reporting a vulnerability

**Please do not report security problems in public issues.**

Use GitHub Private Vulnerability Reporting: open this repository's **Security** tab and choose **Report a vulnerability**. Only maintainers can see the report. If that button is missing, the maintainers have not enabled it yet; please open a public issue that says only "I have a security report, please enable private reporting," with no details.

Please include steps to reproduce using fictional data (the built-in sample data is ideal), the version, and the browser. Never send a real plan or backup. We aim to acknowledge reports within 7 days.

## Supported versions

| Version | Supported |
|---|---|
| Latest release | Yes |
| Older releases | No; please upgrade. Backups from older versions restore into the latest |
| Original single-file build (legacy/) | No; kept only for reference and compatibility testing |

## Threat model

The planner holds highly sensitive household information and runs entirely in the browser. It is designed to protect against:

- **Data leaving the device.** No network code, no third-party code at runtime, and a Content Security Policy that blocks all connections.
- **Malicious or damaged backup files.** Imports are parsed as JSON only, never executed; dangerous keys (`__proto__`, `constructor`, `prototype`) are removed; every value is validated, typed, and length-limited; record IDs must be plain characters; files over 10 MB are refused; files from newer versions are refused rather than guessed at.
- **Script injection (XSS).** All user text is inserted as text nodes, never parsed as HTML. A lint rule forbids `innerHTML` and similar APIs in application code. The CSP allows only the app's own inline code, identified by hash.
- **Accidental data loss.** Restores require a preview and explicit confirmation. Storage that cannot be read is preserved in a recovery key rather than overwritten. The legacy v1 storage key is never modified.

It does **not** protect against:

- Anyone with access to your computer account and browser profile. Data is not encrypted at rest.
- Malware, browser extensions with access to all sites or files, or a compromised operating system.
- Anyone who obtains a backup file, a saved PDF, or a printout.
- Other HTML files opened from disk in the same Chromium browser profile, which share storage with the planner (see PRIVACY.md).
- Other GitHub Pages sites under the same account, if you use a hosted copy.

## Browser risks

- Browser extensions can often read page content. Consider a separate browser profile with no extensions for the planner.
- Browser sync or profile backup features may copy local storage elsewhere.
- Clearing site data deletes the plan; keep backups.

## Shared computers, removable media, and printing

See the matching sections of [PRIVACY.md](PRIVACY.md). In short: erase the browser copy when done on a shared computer, use encrypted drives for backups, and store printouts securely.

## Content Security Policy

`scripts/post-build.mjs` adds this policy to the built file (hashes vary by build):

```
default-src 'none'; script-src 'sha256-...'; style-src 'sha256-...'; img-src data: blob:;
font-src 'none'; connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none';
worker-src 'none'; manifest-src 'none'; form-action 'none'; base-uri 'none'
```

It is delivered as a `<meta>` tag because the app is a single file opened from disk. A `<meta>` policy cannot set `frame-ancestors`; this does not matter for local use. The development server runs without the policy.

## Dependencies

The shipped file has **no runtime dependencies**. Development tools (Vite, TypeScript, ESLint, Vitest, Playwright, axe-core) never ship. `npm audit` runs in development; Dependabot opens weekly update pull requests. A patched `minimatch` is pinned through `overrides` in `package.json` to resolve an advisory in lint tooling.

## Encryption

Encrypted backups are not implemented. They are on the roadmap with strict conditions: an established browser API (Web Crypto, AES-GCM with PBKDF2 or a stronger key derivation at well-documented settings), tests, documentation, and a clear warning that **a forgotten passphrase means the family permanently loses access**. Until then, the app does not claim any encryption.

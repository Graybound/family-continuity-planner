# Contributing

Thank you for helping. This project exists to make a hard time a little easier for families, so it values reliability, privacy, and plain language over cleverness.

## The one rule

**Never put real personal information anywhere in this repository**: not in code, tests, fixtures, screenshots, issues, pull requests, or commit messages. Use the fictional Morgan family from the sample data, phone numbers in the 555-01xx range, `@example.com` addresses, and places like Exampleville. Never attach a real backup or a screenshot of a real plan.

Run `npm run privacy-scan` before committing. To check against your own real names and places, list them in a `.privacy-denylist` file at the repository root (one per line). That file is ignored by Git.

## Getting set up

```sh
npm ci
npx playwright install chromium
npm run dev          # http://localhost:5173
npm run check        # what CI runs
```

Node.js 20 or newer. Read [ARCHITECTURE.md](ARCHITECTURE.md) first; it is short.

## Making a change

1. Open or comment on an issue for anything larger than a small fix, so we can agree on the approach.
2. Keep pull requests focused on one thing.
3. Put data logic in `src/core/` with unit tests. Keep `src/ui/` about display and input.
4. Build DOM with `h()` from `src/ui/dom.ts`. Never use `innerHTML` (the linter will stop you).
5. Do not add network requests, analytics, remote fonts, CDNs, or runtime dependencies. If you think a dependency is truly needed, explain why in the issue first.
6. Changing the data format? Bump `SCHEMA_VERSION`, add a migration (never edit an old one), commit a fixture produced by the previous version, add tests, and update [docs/backup-format.md](docs/backup-format.md).
7. Changing readiness, review, or recommendation rules? Update [docs/readiness-and-audit.md](docs/readiness-and-audit.md) and the tests.
8. Check your change with the keyboard alone and at phone width.
9. Add a line to [CHANGELOG.md](CHANGELOG.md) for anything users will notice.

## Writing style for in-app text

Calm, plain, and kind. Short sentences. No jargon, no legal tone, no frightening or morbid wording, no shame for missing information, and never imply a plan is complete. Do not assume a family structure, religion, country, or gender.

## Good first issues

Look for the `good-first-issue` label. Documentation, wording, and test improvements are always welcome.

## Reporting security problems

Privately, as described in [SECURITY.md](SECURITY.md).

## Code of Conduct

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions are licensed under the MIT License.

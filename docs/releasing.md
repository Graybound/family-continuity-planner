# Releasing

1. Make sure `main` is green in CI.
2. Update `version` in `package.json` and run `npm install` to update the lock file.
3. Move the `Unreleased` notes in `CHANGELOG.md` under the new version with today's date.
4. Run `npm run check` and `npm run release` locally. Open `release/Family-Continuity-Planner-vX.Y.Z.html` from disk and try: sample data, export, restore, print preview.
5. Work through [PUBLIC_RELEASE_CHECKLIST.md](../PUBLIC_RELEASE_CHECKLIST.md) for the first public release, and its "every release" section after that.
6. Commit, then tag and push:
   ```sh
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin main vX.Y.Z
   ```
7. The **Release** workflow runs every check, builds the files, and creates a **draft** GitHub Release with the `.html`, `.zip`, and `SHA256SUMS.txt`.
8. Review the draft: download the zip, extract it, open the HTML, and compare checksums (`sha256sum -c SHA256SUMS.txt`, or `Get-FileHash` on Windows). Then publish.

## What users get

- `Family-Continuity-Planner-vX.Y.Z.zip`: a folder with `Family-Continuity-Planner.html`, `START-HERE.txt` (plain-language instructions), `LICENSE.txt`, `sample-plan.json`, and `sample-original-format-backup.json`.
- `Family-Continuity-Planner-vX.Y.Z.html`: the app alone.
- `SHA256SUMS.txt`: checksums for both.

## Regenerating screenshots and examples

```sh
npm run build
node scripts/screenshots.mjs                         # docs/screenshots, sample data only
UPDATE_EXAMPLES=1 npx vitest run tests/unit/examples.test.ts   # examples/sample-plan.json
```

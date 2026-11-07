# GitHub Pages (optional demo)

## Recommendation

Use GitHub Pages, if at all, as a **try-it-with-sample-data demo**. Recommend the downloaded release for real plans. The Pages workflow is included but runs only when a maintainer starts it by hand.

## Why not for real plans

The hosted page is the same static file as the download, and it never sends plan data anywhere. But two things differ from local use:

1. **Shared storage.** Browser storage is per origin. Every GitHub Pages site under one account (for example every repository's site at `example-user.github.io/...`) shares the origin `https://example-user.github.io`. Any other Pages project published by that account, now or later, could read the planner's saved data in a visitor's browser. A custom domain dedicated to this project avoids this.
2. **Server logs.** GitHub receives ordinary request information when the page loads (IP address, browser type, time), as with any website. The planner adds nothing to this, and plan contents are never included.

## What stays the same

- Plans stay in the visitor's browser. Nothing is uploaded.
- The Content Security Policy blocks all network connections from the app.
- No analytics or tracking are added.

## Enabling it

1. Repository **Settings**, **Pages**, Source: **GitHub Actions**.
2. **Actions** tab, **GitHub Pages demo (optional)**, **Run workflow**.
3. Add a visible note to the README linking to the demo, saying it is for trying the app and that the downloaded version is recommended for real plans.

The build uses only relative references, so it works at `https://<account>.github.io/family-continuity-planner/` without configuration. This is verified by serving `dist/` under that path during release checks (see PUBLIC_RELEASE_CHECKLIST.md).

The downloadable release remains the primary distribution and must always be available.

# The online version (GitHub Pages)

The app is published at **https://graybound.github.io/family-continuity-planner/** by the `GitHub Pages` workflow on every push to `main`, after lint, type checks, unit tests, the build, and browser tests pass.

## What is the same as the download

- It is the identical single HTML file, with the same Content Security Policy that blocks every network connection from the app.
- Plans are saved only in the visitor's browser, on that device. Nothing is uploaded to GitHub or anywhere else.
- No analytics, tracking, or cookies are added.

## What is different

1. **GitHub sees the page load.** Like any website, GitHub's servers receive ordinary request information when someone opens the page (IP address, browser type, time). Plan contents are never part of this. GitHub's own privacy statement applies to that request.
2. **Shared browser storage.** Browser storage belongs to an origin. Every GitHub Pages site published by the same account shares the origin `https://graybound.github.io`, so another Pages project on that account could, in principle, read data saved by the planner. The maintainer controls all of those sites; this is still a reason the download is the more private choice. A custom domain used only for this app would remove the issue.
3. **Availability.** The online copy depends on GitHub Pages being up. The download works forever, offline.
4. **Separate saved data.** The online copy and a downloaded copy do not share a plan. Move between them with Export backup and Restore.

The app shows a notice on the online version explaining where data is stored, with a link to the download. Visitors can acknowledge it once per browser.

## Base path

The build uses only relative references, so it works under `/family-continuity-planner/` with no configuration. This is checked by serving `dist/` under that path and by the browser test "online copy shows where data lives."

## Turning it off

Repository **Settings**, **Pages**, then unpublish, or disable the `GitHub Pages` workflow. The downloadable release does not depend on Pages.

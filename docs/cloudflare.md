# The online version on Cloudflare

Status: **prepared, not live.** This replaces GitHub Pages as the hosted copy, at **https://whenimgone.grayhek.com/**. Until the cutover steps at the end are done, GitHub Pages (`.github/workflows/pages.yml`, [github-pages.md](github-pages.md)) is still the live online version.

The hosted copy is the same single HTML file as the download. Cloudflare only serves it. Plans stay in the visitor's browser and are never sent to Cloudflare.

Anything below marked UNVERIFIED comes from Cloudflare's docs or memory and has not been checked against a real deploy yet. The verify script at the end is the real check.

## How it works

The site is a Cloudflare Worker with **static assets only**: no server code runs. Cloudflare's Git integration (Workers Builds) builds the repo on every push to `main` and serves `dist/`.

| File | What it does |
| --- | --- |
| `wrangler.jsonc` | Worker config: serve `./dist`, attach the custom domain, turn off the `workers.dev` and preview addresses. |
| `scripts/cloudflare-headers.mjs` | After the build, writes `dist/_headers` with the strict CSP copied from `dist/index.html`, plus other security headers. Fails if the build's CSP is missing or weakened. |
| `scripts/verify-cloudflare.mjs` | Checks the live site: CSP header present and identical to the page's, no injected or rewritten code, no cookies or reporting headers. |
| `tests/unit/cloudflare-headers.test.ts` | Unit tests for the headers script. |

Why Workers and not Cloudflare Pages: the deploy config lives in the repo (`wrangler.jsonc`) instead of only in the dashboard, and static asset requests are free on both. Cloudflare points new projects at Workers (UNVERIFIED as a long-term commitment on their side). Pages would also work with the same `_headers` file.

### Why one address only

Browser storage belongs to one origin. If the app were also reachable at `*.workers.dev` or a preview URL, a plan saved there would be invisible at `whenimgone.grayhek.com`, which looks like data loss to the reader. So `workers_dev` and `preview_urls` are `false`, and non-production branch builds should stay off.

### The CSP as a header

The build already puts the CSP in a `<meta>` tag, so the file is protected wherever it is opened. The header adds two things:

1. `frame-ancestors 'none'`, which a `<meta>` CSP cannot set. It stops other sites from framing the app (clickjacking).
2. A second, identical policy. Browsers enforce both, so nothing gets looser.

The CSP hashes change with every build, so the header is generated from the built file, never written by hand.

Other headers set in `dist/_headers`:

- `Cache-Control: no-cache, no-transform`. `no-cache` makes browsers check for a new version on every load. `no-transform` tells Cloudflare features that rewrite HTML to leave the response alone (this is in Cloudflare's response body inspection docs). It is a backstop, not a replacement for turning those features off.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `Permissions-Policy` (camera, microphone, geolocation, payment, usb off), `Strict-Transport-Security: max-age=31536000` (no `includeSubDomains`, so other grayhek.com hosts are unaffected).

Checked locally with `wrangler dev`: all headers arrive, `/_headers` itself returns 404, the app loads with no console errors, and the verify script passes. It also fails as expected when a Web Analytics beacon is injected into the page.

## Dashboard steps

Do these once. Labels are as of late 2026 and may drift (UNVERIFIED).

### 0. The existing Pages project

A Cloudflare Pages project named `whenimgone` is already connected to this repo. The Worker replaces it.

1. Until it is deleted: in the Pages project, **Settings**, **Builds**, **Branch control**, set preview deployments to **None**. Every preview is another `*.whenimgone-022.pages.dev` origin holding its own copy of a plan.
2. If `whenimgone.grayhek.com` is attached to the Pages project as a custom domain, remove it there first. A hostname can belong to only one of them, so the Worker deploy fails otherwise.
3. Once `node scripts/verify-cloudflare.mjs` passes against the Worker, delete the Pages project. That also takes `whenimgone-022.pages.dev` offline, which is the reason for the switch: Pages always keeps that address, a Worker does not.

### 1. Connect the repo

1. Cloudflare dashboard, **Workers & Pages**, **Create**, **Import a repository**. Authorize the Cloudflare GitHub app for `Graybound/family-continuity-planner` only.
2. Project name: `family-continuity-planner`. It must match `name` in `wrangler.jsonc`, or the build fails.
3. Production branch: `main`.
4. Build command:
   ```
   npm ci && npm run lint && npm run typecheck && npm test && npm run build && node scripts/cloudflare-headers.mjs
   ```
   This runs the same checks as CI except the browser tests, so a broken `main` does not deploy. The browser tests stay in GitHub Actions; protect `main` so CI must pass before merging.
5. Deploy command: `npx wrangler deploy` (the default).
6. **Non-production branch builds: off.** Previews would create a second origin (see above).
7. Build variable: `NODE_VERSION` = `22`, to match CI (UNVERIFIED: the default Node version in Workers Builds).
8. Save and deploy. The first deploy creates the `whenimgone.grayhek.com` custom domain and its DNS record from `routes` in `wrangler.jsonc`. If a DNS record for `whenimgone` already exists, delete it first or the deploy fails.

### 2. Turn off everything that injects or rewrites

The CSP blocks injected scripts, so most of these would not leak data. They would break the app or fill the console with errors instead, and Rocket Loader would stop the app from running at all. Some (Web Analytics, Zaraz) exist to track visitors, which the project promises not to do.

**One Configuration Rule covers most of them for this hostname only.** In the `grayhek.com` zone: **Rules**, **Configuration Rules**, **Create rule**.

- Name: `whenimgone: no rewriting`
- If incoming requests match: **Hostname** equals `whenimgone.grayhek.com`
- Settings:

| Setting | Value | Why |
| --- | --- | --- |
| Response Body Buffering | None | Cloudflare's docs say HTML-changing features do not apply their changes with this set. This is the broad switch. |
| Rocket Loader | Off | Rewrites script tags and loads its own script. The app would not run. |
| Email Obfuscation | Off | Rewrites email addresses and injects a decoder script. |
| Disable Real User Monitoring (RUM) | On | Stops Web Analytics beacon injection. |
| Disable Zaraz | On | Third-party tag manager. Injects scripts. |
| Automatic HTTPS Rewrites | Off | Rewrites URLs in HTML. Nothing to rewrite, but it is still an HTML change. |
| Fonts | Off | Rewrites Google Fonts links. |
| Markdown for Agents | Off | Serves a converted version of the page to some clients. |
| Polish | Off | Rewrites images. The app has none, so this is belt and braces. |

**Zone or account settings a Configuration Rule cannot set.** Check each one. Response Body Buffering None should already neutralize the HTML-changing ones for this hostname, but turning them off is clearer and the verify script will tell you if one slipped through.

| Feature | Where | What to do |
| --- | --- | --- |
| Web Analytics | Account, **Analytics & Logs**, **Web Analytics** | If a site exists for `grayhek.com` or `whenimgone.grayhek.com` with automatic setup, disable it or exclude this hostname. |
| Zaraz | Zone, **Zaraz** | Leave unconfigured. The rule above disables it for the hostname anyway. |
| Bot Fight Mode and JavaScript detections | Zone, **Security**, **Bots** | Off for the zone, or make sure they skip this hostname. They inject a challenge script and set a `__cf_bm` cookie. |
| AI Labyrinth | Zone, **Security**, **Bots** | Off. Injects hidden links into HTML. |
| Page Shield / client-side security script monitoring | Zone, **Security** | Off for this hostname. It adds a `Content-Security-Policy-Report-Only` header that makes browsers send reports to Cloudflare (UNVERIFIED whether it is on by default for this plan). |
| Always Online | Zone, **Caching**, **Configuration** | Off. Can serve an archived copy with a Cloudflare banner. |
| Replace insecure JavaScript libraries | Zone, **Security**, **Settings** | Off. No effect here (no external scripts), but it rewrites HTML. |
| Automatic Platform Optimization | Zone, **Speed** | Off. WordPress only. |
| Auto Minify, Mirage | Zone, **Speed** | Retired by Cloudflare (UNVERIFIED). Off if still shown. |
| Transform Rules, Snippets, other Worker routes | Zone, **Rules** and **Workers Routes** | Make sure no zone-wide rule or route (for example `*grayhek.com/*`) changes this hostname's responses or headers. |
| Network Error Logging (`NEL`, `Report-To` headers) | Zone, **Rules**, **Transform Rules**, **Modify Response Header** | If the verify script reports these, add a rule for this hostname that removes `NEL` and `Report-To`. They make browsers report connection errors to Cloudflare. UNVERIFIED that a Transform Rule can remove headers Cloudflare adds itself; if it cannot, document it in PRIVACY.md. |
| Security Level / I'm Under Attack | Zone, **Security** | Not Under Attack for this hostname. The challenge page replaces the app. |

Leave **SSL/TLS** and **Always Use HTTPS** as they are; they do not touch the page.

### 3. Verify the deployed site

From a clone of the repo, after every deploy and after any Cloudflare settings change:

```
node scripts/verify-cloudflare.mjs
```

It passes only if:

- the page returns 200 as `text/html`;
- the `Content-Security-Policy` header equals the page's `<meta>` CSP plus `frame-ancestors 'none'`;
- every inline script and style still matches a hash in the CSP (any rewrite breaks this);
- there is no external `<script src>`, `/cdn-cgi/`, Web Analytics beacon, Rocket Loader, Email Obfuscation or Zaraz trace;
- there are no `Set-Cookie`, `NEL`, `Report-To`, `Reporting-Endpoints` or `Content-Security-Policy-Report-Only` headers;
- `Cache-Control` has `no-transform`, and the other security headers are present.

Then open the site in a browser with dev tools open: no console errors, and the Network tab shows exactly one request (the page).

Also confirm the single origin: `https://family-continuity-planner.<account>.workers.dev/` should not serve the app.

## Cutover (a separate change, after the site verifies)

Not part of this change. Done in the follow-up that retires GitHub Pages:

1. Remove `.github/workflows/pages.yml` and unpublish Pages in repository **Settings**, **Pages**. Plans saved on the github.io copy do not carry over; that is accepted while no real plan exists.
2. Update every reference to the github.io address: `package.json` `homepage`, README, PRIVACY.md, docs/github-pages.md (delete or replace with this file), release notes text, issue templates.
3. App copy: the online-version notice in `src/ui/app.ts` says plans are "never sent to GitHub", and the e2e test `online copy shows where data lives` checks that text and the github.io URL. Both need to say Cloudflare.
4. PRIVACY.md: Cloudflare, not GitHub, now sees page loads (IP, browser, time). The custom domain removes the shared-origin issue that github.io had.
5. Add `.wrangler/` to `.gitignore` (local `wrangler dev` creates it).

## Rename

The Worker is still named `family-continuity-planner` because the app rename is its own pass. In that pass, change `name` in `wrangler.jsonc` and the project name in the dashboard together. A new name makes a new Worker; move the custom domain to it and delete the old one (UNVERIFIED: whether `wrangler deploy` moves the domain on its own).

## Turning it off

Delete the Worker in **Workers & Pages**. The custom domain and its DNS record go with it. The downloadable release does not depend on Cloudflare.

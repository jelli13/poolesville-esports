# Poolesville Esports

Static site for Poolesville High School Esports (black & gold).

## Layout

- **Top right:** Static “Poolesville Esports” on every view
- **Left sidebar:** Collapsible nav — Home, Varsity Team, Club Info, Events
- **Home:** Hero, What is Esports (FAQ templates), this week’s varsity schedule + full schedule link

## Share with clients (public preview)

**Live site (Render):** [https://poolesville-esports.onrender.com/](https://poolesville-esports.onrender.com/)

Use the root URL above — not `localhost`, and `/index.html` is optional.

### If the link “times out” for someone

Render’s **free tier sleeps** after ~15 minutes with no visitors. The **first open after that** can take **30–90 seconds** while the server wakes up. Many browsers and school networks give up before that, which looks like a timeout.

**Fixes (pick one or combine):**

1. **Keep the service warm** — Free [UptimeRobot](https://uptimerobot.com) monitor: ping `https://poolesville-esports.onrender.com/health` every 5 minutes.
2. **Tell viewers to wait and refresh once** — First load after idle may be slow; a second try is usually instant.
3. **Upgrade Render** to a paid plan ($7/mo) for always-on (no cold starts).
4. **Backup static link** — GitHub Pages (see below) loads instantly; use it for demos if MCPS blocks `onrender.com`.

If staff are on **MCPS Wi‑Fi**, `*.onrender.com` is sometimes filtered. Try GitHub Pages or have them test on phone data.

## School network (MCPS Wi‑Fi)

School filters often block sites for reasons that are **not** about your content:

| What you see | Likely cause |
|--------------|--------------|
| “Blocked” / filter page | `onrender.com` or “Games” category — common on MCPS |
| Spinner forever, then error | Render **cold start** (free tier sleeps ~15 min) — looks like a block |
| Site loads but images/forms broken | `unsplash.com`, `discord.gg`, or YouTube blocked separately |

**Do not use VPNs or proxies** to get around MCPS filters — that violates school policy and can mean discipline.

### What works best at school

1. **Share the GitHub Pages link** (static, fast, usually allowed):
   **[https://jelli13.github.io/poolesville-esports/](https://jelli13.github.io/poolesville-esports/)**
   Schedule, roster, and events read from `data/*.json` in the repo. Admin saves still need Render or `npm start` locally.

2. **Ask IT to whitelist** (best long-term) — have **Mr. Broome** or another staff sponsor email MCPS IT / submit a help ticket with:
   - Purpose: official PHS varsity athletics / MCEL team information
   - URLs to allow:
     - `https://jelli13.github.io/poolesville-esports/`
     - `https://poolesville-esports.onrender.com/` (if you need live admin)
   - Category request: **Education** (not Games)
   - Faculty contact: `Ryan_J_Broome@mcpsmd.org`

3. **Link from an MCPS page** — a link on [Poolesville HS](https://www.montgomeryschoolsmd.org/schools/poolesvillehs/) or Google Classroom almost always works because `montgomeryschoolsmd.org` and Classroom are already allowed.

4. **Google Sites (MCPS account)** — if IT won’t whitelist external hosts, mirror key info on a Sites page under your `@mcpsmd.org` account and link “full site” for home use.

### GitHub Pages (fast static backup)

1. Repo **Settings → Pages → Source: GitHub Actions**
2. Push to `main` (workflow included in `.github/workflows/pages.yml`)
3. Share: **[https://jelli13.github.io/poolesville-esports/](https://jelli13.github.io/poolesville-esports/)**

Public Pages site reads `data/*.json` directly. Admin saves still need Render (or another host running `npm start`).

## Run locally

Use the Node server so administrator edits to **Schedule** and **Game Highlights** are saved to `data/schedule.json` and `data/highlights.json` for every visitor:

```bash
cd ~/Projects/poolesville-esports
npm install
npm start
```

Open [http://localhost:8080](http://localhost:8080)

`python3 -m http.server` only serves static files; admin saves will not apply site-wide.

### Deploying with shared admin saves

Host the app with `npm start` (e.g. [Render](https://render.com) web service) so the `/api` routes run on the same origin. If the HTML is on GitHub Pages and the API is elsewhere, set the API URL in `js/site-config.js`:

```js
window.PHS_SITE_CONFIG = { apiBase: "https://your-api.example.com" };
```

Optional environment variables on the server: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `PORT`.

## Customize

- `**js/site-config.js**` — Discord, YouTube, PHS link, **contact email** (`links.email`), interest form URL
- Copy in `index.html` for hero text, FAQ copy, and schedule rows
- Set `href` on `#full-schedule-link` when you have the full schedule URL


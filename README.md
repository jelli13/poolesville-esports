# Poolesville Esports

Static site for Poolesville High School Esports (black & gold).

## Layout

- **Top right:** Static “Poolesville Esports” on every view
- **Left sidebar:** Collapsible nav — Home, Varsity Team, Club Info, Events
- **Home:** Hero, What is Esports (FAQ templates), this week’s varsity schedule + full schedule link

## Run locally

Use the Node server so administrator edits to **Schedule** and **Game Highlights** are saved to `data/schedule.json` and `data/highlights.json` for every visitor:

```bash
cd ~/Projects/poolesville-esports
npm install
npm start
```

Open http://localhost:8080

`python3 -m http.server` only serves static files; admin saves will not apply site-wide.

### Deploying with shared admin saves

Host the app with `npm start` (e.g. [Render](https://render.com) web service) so the `/api` routes run on the same origin. If the HTML is on GitHub Pages and the API is elsewhere, set the API URL in `js/site-config.js`:

```js
window.PHS_SITE_CONFIG = { apiBase: "https://your-api.example.com" };
```

Optional environment variables on the server: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `PORT`.

## Customize

- Copy in `index.html` for hero text, FAQ copy, and schedule rows
- Set `href` on `#full-schedule-link` when you have the full schedule URL

# Poolesville Esports

Static site for Poolesville High School Esports (black & gold).

## Layout

- **Top right:** Static “Poolesville Esports” on every view
- **Left sidebar:** Collapsible nav — Home, Varsity Team, Club Info, Events
- **Home:** Hero, What is Esports (FAQ templates), this week’s varsity schedule + full schedule link

## Run locally

```bash
cd ~/Projects/poolesville-esports
python3 -m http.server 8080
```

Open http://localhost:8080

## Customize

- Copy in `index.html` for hero text, FAQ copy, and schedule rows
- Set `href` on `#full-schedule-link` when you have the full schedule URL

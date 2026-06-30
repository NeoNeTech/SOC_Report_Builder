# SOC Report Builder

A single-page web app for SOC analysts to fill in investigation data and export a
professional, PDF-ready investigation report. Vanilla JS (ES modules), no build step,
no framework. Optional live import from **TheHive 5**.

## Run

ES modules don't load from `file://`, so serve the folder over HTTP:

```bash
node server.js
# -> http://localhost:5173   (set PORT=8080 to change)
```

Any static server works too: `python -m http.server 5173` or `npx serve`.

## Project structure

```
index.html            # markup + CDN includes (fonts, jsPDF, html2canvas, lucide)
server.js             # zero-dependency static file server (Node)
css/
  tokens.css          # Nexus design tokens (colors, spacing, type, themes)
  base.css            # reset, buttons, overlays, toast, modal
  layout.css          # app shell, header, split panels, responsive
  form.css            # accordion sections, inputs, dynamic lists
  preview.css         # rendered report document styles
js/
  config.js           # option sets + TheHive mapping tables
  util.js             # shared helpers (escape, format, html builders)
  bus.js              # tiny pub/sub event bus
  schema.js           # declarative sections + dynamic-list definitions
  state.js            # in-memory model + dotted-path access
  form.js             # left panel render + input wiring
  preview.js          # live report render + progress bar
  markdown.js         # "Copy as Markdown" export
  pdf.js              # html2canvas + jsPDF A4 paginated export
  draft.js            # save/load JSON drafts
  thehive.js          # TheHive 5 client + case → state mapping
  ui.js               # toast + confirm modal
  app.js              # bootstrap + toolbar wiring
```

State is **in-memory only** — nothing is persisted. Use **Save Draft** to download
a JSON snapshot and **Load Draft** to restore it.

## TheHive 5 integration

Click **TheHive** in the toolbar, enter your instance URL + API key (kept in memory
only, never stored), and a case number (e.g. `512`) or internal id (e.g. `~40988`).
The app pulls and maps:

| TheHive source            | Maps to                              |
|---------------------------|--------------------------------------|
| case number / title / desc| Ticket ID, Summary                   |
| `severity` (1–4)          | Severity badge                       |
| `status` / `stage`        | Status                               |
| `startDate`, `tags`       | Detection date, Tags                 |
| **observables**           | IOC table (+ hostnames/IPs → Assets) |
| **procedures**            | MITRE ATT&CK techniques (TTP)        |
| **tasks**                 | Timeline of events                   |

It calls TheHive's Query API: `POST /api/v1/query` with
`Authorization: Bearer <API_KEY>`.

### ⚠️ CORS requirement (direct browser mode)

This app talks to TheHive **directly from the browser**. Browsers block cross-origin
responses unless TheHive returns the right CORS headers. Your TheHive admin must allow
this app's origin (e.g. `http://localhost:5173`) with:

```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Headers: authorization, content-type
Access-Control-Allow-Methods: POST, GET, OPTIONS
```

configured in TheHive (`application.conf` `play.filters.cors`) or on the reverse proxy
(nginx/Traefik) in front of it. If you can't enable CORS, the secure alternative is a
small server-side proxy that injects the API key and adds CORS headers — ask and it can
be added to `server.js`.

The **API key** is also exposed to anything running in the page in this mode. For shared
or production use, prefer the proxy approach so the key never reaches the browser.

## Export

- **Export PDF** — A4 portrait, auto-paginated, filename
  `{TicketID}_{Date}_Investigation_Report.pdf`.
- **Copy MD** — clean Markdown to clipboard.

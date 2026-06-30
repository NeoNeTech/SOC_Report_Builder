<div align="center">

# 🛡️ SOC Report Builder

**Build professional, PDF-ready security investigation reports in minutes — with live import from TheHive 5.**

[![CI](https://github.com/NeoNeTech/SOC_Report_Builder/actions/workflows/ci.yml/badge.svg)](https://github.com/NeoNeTech/SOC_Report_Builder/actions/workflows/ci.yml)
[![Deploy](https://github.com/NeoNeTech/SOC_Report_Builder/actions/workflows/deploy.yml/badge.svg)](https://github.com/NeoNeTech/SOC_Report_Builder/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Vanilla JS](https://img.shields.io/badge/vanilla-JS-f7df1e?logo=javascript&logoColor=black)
![No build step](https://img.shields.io/badge/build-none-success)

</div>

A single-page web app for SOC analysts who run dozens of investigations a week and need
to fill technical fields fast and export a clean report. **Vanilla JavaScript (ES modules),
no framework, no build step, no backend.** State stays in memory; nothing is persisted unless
you export it.

---

## ✨ Features

- **Two-pane editor** — accordion form on the left, live document preview on the right.
- **Full investigation schema** — metadata, executive summary, technical analysis
  (attack vector, MITRE ATT&CK, IOCs, timeline, logs), investigation steps, containment &
  remediation, references.
- **Live import from TheHive 5** — pull a case's metadata, observables (IOC), MITRE
  procedures (TTP) and tasks straight into the report.
- **Export** — A4 PDF (auto-paginated) and clean Markdown to clipboard.
- **Drafts** — save/load the whole report as JSON.
- **Dark / light themes**, responsive, keyboard-accessible.

> 📸 _Add a screenshot or GIF here once you run it locally — drop it in a `docs/` folder and
> reference it as `![screenshot](docs/preview.png)`._

---

## 🚀 Quick start

ES modules don't load from `file://`, so serve the folder over HTTP.

### Windows (helper scripts)

```powershell
.\scripts\start.ps1          # starts the server and opens the browser (port 5173)
.\scripts\start.ps1 -Port 8080
.\scripts\stop.ps1           # stops the server
```

### Any platform (npm)

```bash
npm start                    # -> http://localhost:5173   (PORT=8080 npm start to change)
```

No dependencies to install — `npm start` just runs the built-in `server.js`.
Any static server works too: `python -m http.server 5173` or `npx serve`.

---

## 🧪 Development checks

```bash
npm run check
```

A dependency-free script ([scripts/check.mjs](scripts/check.mjs)) that runs in CI:

1. **Syntax** — `node --check` on every JS file.
2. **Module link** — verifies every ES `import` resolves to a real `export`.
3. **Smoke test** — boots `server.js` and asserts the key routes return the right status.

---

## 🔗 TheHive 5 integration

Click **TheHive** in the toolbar, enter your instance URL + API key (kept in memory only,
never stored) and a case number (`512`) or internal id (`~40988`). The app calls TheHive's
Query API (`POST /api/v1/query`, `Authorization: Bearer <API_KEY>`) and maps:

| TheHive source                | → SOC Report                          |
|-------------------------------|---------------------------------------|
| case `number` / `title` / `description` | Ticket ID · Summary         |
| `severity` (1–4)              | Severity badge                        |
| `status` / `stage`            | Status                                |
| `startDate`, `tags`           | Detection date · Tags                 |
| **observables**               | IOC table (+ hostnames/IPs → Assets)  |
| **procedures**                | MITRE ATT&CK techniques (TTP)         |
| **tasks**                     | Timeline of events                    |

### ⚠️ CORS requirement (direct browser mode)

This app talks to TheHive **directly from the browser**. Browsers block cross-origin
responses unless TheHive returns the right CORS headers. Your TheHive admin must allow this
app's origin (e.g. `http://localhost:5173`) with:

```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Headers: authorization, content-type
Access-Control-Allow-Methods: POST, GET, OPTIONS
```

configured in TheHive (`application.conf` → `play.filters.cors`) or on the reverse proxy
(nginx/Traefik) in front of it. If you can't enable CORS, the secure alternative is a small
server-side proxy that injects the API key and adds CORS headers.

> 🔐 In direct mode the **API key is exposed** to anything running in the page. Fine for a
> personal/isolated workstation; for shared or production use, prefer the proxy approach so
> the key never reaches the browser.

---

## 📦 Deployment

The site is fully static, so the **CD** pipeline publishes it to **GitHub Pages**
([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) on every push to `main`.

**One-time setup:** repo **Settings → Pages → Build and deployment → Source: _GitHub Actions_**.
After that, pushes to `main` deploy automatically.

---

## 🗂️ Project structure

```
index.html            # markup + CDN includes (fonts, jsPDF, html2canvas, lucide)
server.js             # zero-dependency static file server (ES module)
package.json          # npm scripts: start / check
scripts/
  start.ps1 stop.ps1  # Windows helpers to run/stop the dev server
  check.mjs           # CI checks (syntax + module link + smoke test)
.github/workflows/
  ci.yml              # lint + smoke test on push/PR (Node 18/20/22)
  deploy.yml          # deploy to GitHub Pages on push to main
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

### Architecture notes

- **Single source of truth** — sections and dynamic lists are declared once in
  [`js/schema.js`](js/schema.js); both form rendering and blank-row creation derive from it.
- **Decoupled rendering** — [`js/form.js`](js/form.js) mutates state and emits a `CHANGE`
  event on the [bus](js/bus.js); the preview and progress bar re-render in response.
- **No global leakage** — every module is an ES module; the only globals are the CDN
  libraries (`jsPDF`, `html2canvas`, `lucide`).

---

## 🤝 Contributing

1. Branch off `dev`.
2. Run `npm run check` before opening a PR (CI runs the same).
3. PRs target `dev`; `main` is the released/deployed branch.

## 📄 License

[MIT](LICENSE) © NeoNeTech

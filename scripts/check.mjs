// ============================================================
// check.mjs — dependency-free CI checks
//   1. Syntax-check every JS file (node --check, ES module goal)
//   2. Link-check ES module imports/exports resolve
//   3. HTTP smoke-test the static server
// Exits non-zero on the first failing stage.
// ============================================================
import { execFileSync } from "node:child_process";
import { spawn } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const jsDir = path.join(ROOT, "js");

let failures = 0;
const ok = (msg) => console.log(`  \x1b[32mok\x1b[0m   ${msg}`);
const bad = (msg) => { console.log(`  \x1b[31mFAIL\x1b[0m ${msg}`); failures++; };

// ---- 1. syntax ----
console.log("\n[1/3] Syntax check");
const jsFiles = readdirSync(jsDir).filter((f) => f.endsWith(".js")).map((f) => path.join(jsDir, f));
const allFiles = [...jsFiles, path.join(ROOT, "server.js")];
for (const file of allFiles) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
    ok(path.relative(ROOT, file));
  } catch (e) {
    bad(`${path.relative(ROOT, file)} — ${(e.stderr || e.message).toString().split("\n")[0]}`);
  }
}

// ---- 2. link (import/export resolution) ----
console.log("\n[2/3] Module link check");
// Minimal DOM shim so importing modules never throws at load time.
globalThis.window = { lucide: { createIcons() {} } };
globalThis.document = {
  getElementById: () => null,
  createElement: () => ({ style: {}, appendChild() {}, remove() {} }),
  addEventListener() {},
  readyState: "complete",
};
// app.js calls boot() at import (needs a real DOM) — link-check the rest.
const linkTargets = jsFiles.filter((f) => path.basename(f) !== "app.js");
for (const file of linkTargets) {
  try {
    await import(pathToFileURL(file).href);
    ok(path.relative(ROOT, file));
  } catch (e) {
    bad(`${path.relative(ROOT, file)} — ${e.message}`);
  }
}

// ---- 3. HTTP smoke test ----
console.log("\n[3/3] Server smoke test");
const PORT = 5188;
const child = spawn(process.execPath, ["server.js"], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT) },
  stdio: "ignore",
});

async function waitForServer(url, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try { await fetch(url); return true; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  return false;
}

try {
  const base = `http://localhost:${PORT}`;
  if (!(await waitForServer(base))) throw new Error("server did not start");

  const cases = [
    ["/", 200], ["/index.html", 200], ["/js/app.js", 200],
    ["/css/tokens.css", 200], ["/js/does-not-exist.js", 404],
  ];
  for (const [p, expected] of cases) {
    const res = await fetch(base + p);
    if (res.status === expected) ok(`GET ${p} -> ${res.status}`);
    else bad(`GET ${p} -> ${res.status} (expected ${expected})`);
  }
} catch (e) {
  bad(e.message);
} finally {
  child.kill();
}

console.log("");
if (failures) {
  console.error(`\x1b[31m✖ ${failures} check(s) failed\x1b[0m`);
  process.exit(1);
}
console.log("\x1b[32m✔ all checks passed\x1b[0m");

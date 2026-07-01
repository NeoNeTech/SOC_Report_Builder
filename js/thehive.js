// ============================================================
// THEHIVE — TheHive 5 client (direct browser fetch) + mapping
//
// IMPORTANT: direct browser → TheHive calls require CORS to be
// enabled on the TheHive side (Access-Control-Allow-Origin for
// this app's origin, allow Authorization + Content-Type headers).
// The API key lives only in this module's memory (never stored).
// ============================================================
import { THEHIVE_SEVERITY, mapThehiveStatus, mapObservableType, ASSET_DATATYPES, normTactic } from "./config.js";
import { state, newId } from "./state.js";
import { toDatetimeLocal } from "./util.js";
import { toast, openOverlay, closeOverlay } from "./ui.js";

// In-memory connection config (URL + API key). Reset on reload.
const conn = { url: "", key: "" };

// ---------- low-level query ----------
async function query(name, q) {
  let res;
  try {
    res = await fetch(`${conn.url}/api/v1/query?name=${encodeURIComponent(name)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${conn.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: q }),
    });
  } catch (e) {
    // TypeError here almost always means the browser blocked the response
    // (CORS) or the host is unreachable — fetch can't distinguish them.
    const err = new Error("Erreur réseau/CORS — le navigateur n'a pas pu joindre TheHive ou la réponse a été bloquée par le CORS. Vérifiez l'URL et que TheHive autorise cette origine.");
    err.cors = true;
    throw err;
  }
  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch { /* ignore */ }
    if (res.status === 401) throw new Error("401 Non autorisé — vérifiez votre clé API.");
    throw new Error(`TheHive ${res.status} : ${(detail || res.statusText).slice(0, 240)}`);
  }
  return res.json();
}

const first = (r) => (Array.isArray(r) ? r[0] : r);

// ---------- connection ----------
export function setConn(url, key) {
  conn.url = String(url || "").trim().replace(/\/+$/, "");
  conn.key = String(key || "").trim();
}

export async function testConnection() {
  // currentUser is the cheapest authenticated call
  const r = await query("currentUser", [{ _name: "currentUser" }]);
  const u = first(r);
  return u?.login || u?.name || "connected";
}

// ---------- case resolution + fetch ----------
async function resolveCase(ref) {
  const clean = String(ref).trim().replace(/^#/, "");
  if (clean.startsWith("~")) {
    return first(await query("getCase", [{ _name: "getCase", idOrName: clean }]));
  }
  const num = parseInt(clean, 10);
  const r = await query("cases", [
    { _name: "listCase" },
    { _name: "filter", _eq: { _field: "number", _value: isNaN(num) ? clean : num } },
    { _name: "page", from: 0, to: 1 },
  ]);
  return first(r);
}

export async function fetchCase(ref) {
  const caseObj = await resolveCase(ref);
  if (!caseObj || !caseObj._id) throw new Error(`Case « ${ref} » introuvable dans cette organisation.`);
  const id = caseObj._id;

  const observables = await query("observables", [{ _name: "getCase", idOrName: id }, { _name: "observables" }]).catch(() => []);
  const procedures = await query("procedures", [{ _name: "getCase", idOrName: id }, { _name: "procedures" }]).catch(() => []);
  const tasks = await query("tasks", [{ _name: "getCase", idOrName: id }, { _name: "tasks" }]).catch(() => []);

  return {
    caseObj,
    observables: Array.isArray(observables) ? observables : [],
    procedures: Array.isArray(procedures) ? procedures : [],
    tasks: Array.isArray(tasks) ? tasks : [],
  };
}

// ---------- mapping helpers ----------
function mapObservables(observables) {
  const iocs = [];
  const assets = [];
  observables.forEach((o) => {
    const value = o.data ?? o.attachment?.name ?? "";
    iocs.push({
      _id: newId(),
      type: mapObservableType(o.dataType, value),
      value,
      desc: o.message || (o.tags || []).join(", ") || "",
      confidence: o.ioc ? "Élevée" : "Moyenne",
    });
    if (ASSET_DATATYPES.has(String(o.dataType || "").toLowerCase())) {
      const isIp = /^ip/i.test(o.dataType);
      assets.push({ _id: newId(), hostname: isIp ? "" : value, ip: isIp ? value : "", type: "", owner: "" });
    }
  });
  return { iocs, assets };
}

function mapProcedures(procedures) {
  return procedures.map((p) => ({
    _id: newId(),
    tactic: normTactic(p.tactic ?? p.pattern?.tactic),
    id: p.patternId ?? p.pattern?.patternId ?? "",
    name: p.patternName ?? p.pattern?.name ?? "",
  }));
}

function mapTasks(tasks) {
  return tasks.map((t) => ({
    _id: newId(),
    time: toDatetimeLocal(t.startDate ?? t._createdAt ?? t.createdAt),
    source: "TheHive",
    event: [t.title, t.group ? `[${t.group}]` : "", t.status ? `(${t.status})` : ""].filter(Boolean).join(" "),
  }));
}

// Apply a fetched case into state. replace=true overwrites the imported
// sections; replace=false fills empty meta fields and appends list rows.
export function applyCase(data, replace) {
  const { caseObj: c, observables, procedures, tasks } = data;
  const { iocs, assets } = mapObservables(observables);
  const mitre = mapProcedures(procedures);
  const timeline = mapTasks(tasks);

  const m = state.meta;
  const setMeta = (k, v) => { if (replace || !String(m[k] || "").trim()) m[k] = v; };

  setMeta("ticketId", c.number != null ? String(c.number) : c._id || "");
  setMeta("severity", THEHIVE_SEVERITY[c.severity] || "");
  setMeta("status", mapThehiveStatus(c.status ?? c.stage));
  setMeta("detectionDate", toDatetimeLocal(c.startDate ?? c._createdAt));
  setMeta("tags", (c.tags || []).join(", "));
  if (!m.tools.includes("TheHive")) m.tools.push("TheHive");

  const titleBlock = [c.title, c.description].filter(Boolean).join("\n\n");
  if (titleBlock && (replace || !state.summary.text.trim())) state.summary.text = titleBlock;

  if (replace) {
    state.technical.iocs = iocs;
    state.technical.mitre = mitre;
    state.technical.timeline = timeline;
    state.summary.assets = assets;
  } else {
    state.technical.iocs.push(...iocs);
    state.technical.mitre.push(...mitre);
    state.technical.timeline.push(...timeline);
    state.summary.assets.push(...assets);
  }

  return { iocs: iocs.length, mitre: mitre.length, timeline: timeline.length, assets: assets.length, caseNumber: c.number };
}

// ---------- modal controller ----------
export function initThehive(onImported) {
  const $ = (id) => document.getElementById(id);
  const statusEl = $("thStatus");
  const setStatus = (s, text) => { statusEl.dataset.state = s; $("thStatusText").textContent = text; };
  const warn = $("thWarn");
  const showWarn = (msg) => { warn.hidden = false; warn.textContent = msg; };
  const clearWarn = () => { warn.hidden = true; warn.textContent = ""; };
  const busy = (b) => { $("thTest").disabled = b; $("thImport").disabled = b; };

  $("btnThehive").onclick = () => { clearWarn(); openOverlay("thehiveOverlay"); };
  $("thehiveClose").onclick = () => closeOverlay("thehiveOverlay");

  $("thTest").onclick = async () => {
    clearWarn();
    setConn($("thUrl").value, $("thKey").value);
    if (!conn.url || !conn.key) { showWarn("Saisissez l'URL de base et une clé API."); return; }
    setStatus("loading", "Test en cours…"); busy(true);
    try {
      const who = await testConnection();
      setStatus("ok", `Connecté en tant que ${who}`);
    } catch (e) {
      setStatus("error", "Échec de la connexion");
      showWarn(e.message);
    } finally { busy(false); }
  };

  $("thImport").onclick = async () => {
    clearWarn();
    setConn($("thUrl").value, $("thKey").value);
    const ref = $("thCase").value.trim();
    if (!conn.url || !conn.key) { showWarn("Saisissez l'URL de base et une clé API."); return; }
    if (!ref) { showWarn("Saisissez un numéro ou un ID de case."); return; }
    setStatus("loading", "Récupération du case…"); busy(true);
    try {
      const data = await fetchCase(ref);
      const counts = applyCase(data, $("thReplace").checked);
      setStatus("ok", `Case #${counts.caseNumber ?? ref} importé`);
      onImported();
      closeOverlay("thehiveOverlay");
      toast(`${counts.iocs} IOC, ${counts.mitre} TTP, ${counts.assets} actifs, ${counts.timeline} événements importés`);
    } catch (e) {
      setStatus("error", "Échec de l'import");
      showWarn(e.message);
    } finally { busy(false); }
  };
}

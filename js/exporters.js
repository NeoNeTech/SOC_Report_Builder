// ============================================================
// EXPORTERS — IOC (CSV / STIX 2.1), couche ATT&CK Navigator,
// defang, et téléchargement de fichiers.
// ============================================================
import { state } from "./state.js";

// ---- defang (pour les artefacts partagés) ----
export function defangValue(v) {
  return String(v || "")
    .replace(/http/gi, "hxxp")   // https -> hxxps
    .replace(/\./g, "[.]")
    .replace(/@/g, "[@]");
}
const df = () => (state.prefs && state.prefs.defang ? defangValue : (x) => x);

// ---- téléchargement ----
export function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const uuid = () =>
  (crypto.randomUUID ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      }));

const fileBase = () => (state.meta.ticketId || "SOC-Report").replace(/[^\w.-]+/g, "-");

// ---- IOC -> CSV ----
function csvCell(s) {
  s = String(s == null ? "" : s);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function buildIocCsv() {
  const fmt = df();
  const rows = [["type", "valeur", "description", "confiance"]];
  state.technical.iocs.forEach((i) => rows.push([i.type || "", fmt(i.value || ""), i.desc || "", i.confidence || ""]));
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

// ---- IOC -> STIX 2.1 (valeurs réelles, jamais defangées) ----
const CONF_STIX = { Faible: 15, Moyenne: 50, Élevée: 85 };
function stixPattern(type, value) {
  const v = String(value).replace(/'/g, "\\'");
  switch (type) {
    case "IP": return `[ipv4-addr:value = '${v}']`;
    case "Domaine": return `[domain-name:value = '${v}']`;
    case "URL": return `[url:value = '${v}']`;
    case "Email": return `[email-addr:value = '${v}']`;
    case "Hash MD5": return `[file:hashes.'MD5' = '${v}']`;
    case "Hash SHA1": return `[file:hashes.'SHA-1' = '${v}']`;
    case "Hash SHA256": return `[file:hashes.'SHA-256' = '${v}']`;
    case "Chemin de fichier": return `[file:name = '${v}']`;
    case "Clé de registre": return `[windows-registry-key:key = '${v}']`;
    default: return null; // User Agent, etc. — non mappé
  }
}
export function buildStixBundle() {
  const now = new Date().toISOString();
  const objects = [];
  state.technical.iocs.forEach((i) => {
    if (!i.value) return;
    const pattern = stixPattern(i.type, i.value);
    if (!pattern) return;
    objects.push({
      type: "indicator",
      spec_version: "2.1",
      id: "indicator--" + uuid(),
      created: now,
      modified: now,
      name: `${i.type} : ${i.value}`,
      description: i.desc || undefined,
      indicator_types: ["malicious-activity"],
      pattern,
      pattern_type: "stix",
      valid_from: now,
      confidence: CONF_STIX[i.confidence] || undefined,
    });
  });
  return JSON.stringify({ type: "bundle", id: "bundle--" + uuid(), objects }, null, 2);
}

// ---- MITRE -> couche ATT&CK Navigator ----
export function buildNavigatorLayer() {
  const techniques = state.technical.mitre
    .filter((x) => x.id && x.id.trim())
    .map((x) => ({
      techniqueID: x.id.trim().toUpperCase(),
      score: 1,
      color: "#e60d0d",
      comment: [x.name, x.tactic].filter(Boolean).join(" — "),
      enabled: true,
      metadata: [],
      showSubtechniques: true,
    }));
  return JSON.stringify({
    name: `SOC ${state.meta.ticketId || "rapport"}`,
    versions: { attack: "14", navigator: "4.9.0", layer: "4.5" },
    domain: "enterprise-attack",
    description: `Techniques observées — ${state.meta.ticketId || ""}`.trim(),
    techniques,
    gradient: { colors: ["#ffffff", "#e60d0d"], minValue: 0, maxValue: 1 },
    legendItems: [{ label: "Observé", color: "#e60d0d" }],
    metadata: [],
  }, null, 2);
}

// ---- points d'entrée téléchargement ----
export function exportIocCsv() {
  if (!state.technical.iocs.length) return false;
  download(`${fileBase()}_IOC.csv`, buildIocCsv(), "text/csv;charset=utf-8");
  return true;
}
export function exportStix() {
  if (!state.technical.iocs.length) return false;
  download(`${fileBase()}_IOC_stix.json`, buildStixBundle(), "application/json");
  return true;
}
export function exportNavigatorLayer() {
  if (!state.technical.mitre.length) return false;
  download(`${fileBase()}_attack_layer.json`, buildNavigatorLayer(), "application/json");
  return true;
}

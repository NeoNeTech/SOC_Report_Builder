// ============================================================
// LINT — contrôle de complétude/cohérence + indicateurs de délai.
// Tout est calculé localement à partir de l'état.
// ============================================================
import { SEVERITY_LEVEL } from "./config.js";

// Retourne une liste d'anomalies : { level: error|warn|info, section, msg }
export function runLint(state) {
  const { meta: m, summary: su, technical: t, investigation: inv, remediation: rem } = state;
  const issues = [];
  const add = (level, section, msg) => issues.push({ level, section, msg });

  // Champs requis
  if (!m.ticketId) add("error", "metadata", "Identifiant du ticket manquant");
  if (!m.severity) add("error", "metadata", "Sévérité manquante");
  if (!m.status) add("error", "metadata", "Statut manquant");
  if (!m.detectionDate) add("error", "metadata", "Date de détection manquante");
  if (!m.analyst) add("error", "metadata", "Analyste manquant");
  if (!su.text.trim()) add("error", "summary", "Synthèse vide");

  // Marquages
  if (!m.classification) add("warn", "metadata", "Classification non renseignée");
  if (!m.tlp) add("warn", "metadata", "TLP non renseigné");
  if (m.classification === "Secret" && m.tlp === "TLP:CLEAR")
    add("warn", "metadata", "Classification « Secret » avec TLP:CLEAR — incohérent");

  // Cohérence sévérité / réponse
  const sev = SEVERITY_LEVEL[m.severity];
  if ((sev === "critical" || sev === "high") && !rem.containment.length)
    add("warn", "remediation", "Sévérité élevée sans action de confinement");
  if (m.status === "Résolu" && !inv.rootCause.trim())
    add("warn", "investigation", "Statut « Résolu » sans cause racine");
  if (m.status === "Faux positif" && !inv.fpAnalysis.trim())
    add("warn", "investigation", "Statut « Faux positif » sans analyse de faux positif");

  // Analyse technique
  if (!t.mitre.length) add("info", "technical", "Aucune technique MITRE ATT&CK");
  if (!t.iocs.length) add("info", "technical", "Aucun indicateur de compromission");
  const noConf = t.iocs.filter((x) => x.value && !x.confidence).length;
  if (noConf) add("warn", "technical", `${noConf} IOC sans niveau de confiance`);
  const noType = t.iocs.filter((x) => x.value && !x.type).length;
  if (noType) add("warn", "technical", `${noType} IOC sans type`);

  // Actifs
  const badAssets = su.assets.filter((a) => !a.hostname && !a.ip).length;
  if (badAssets) add("info", "summary", `${badAssets} actif(s) sans nom d'hôte ni IP`);

  // Cohérence des dates
  const d = (s) => { const x = new Date(s); return isNaN(x) ? null : x.getTime(); };
  const det = d(m.detectionDate), cont = d(m.containmentDate), res = d(m.resolutionDate);
  if (cont != null && det != null && cont < det) add("warn", "metadata", "Date de confinement antérieure à la détection");
  if (res != null && cont != null && res < cont) add("warn", "metadata", "Date de résolution antérieure au confinement");
  if (res != null && det != null && res < det) add("warn", "metadata", "Date de résolution antérieure à la détection");

  return issues;
}

// Indicateurs de délai (pour un incident donné)
export function computeMetrics(state) {
  const m = state.meta;
  const p = (s) => { const x = new Date(s); return isNaN(x) ? null : x.getTime(); };
  const det = p(m.detectionDate);
  const times = state.technical.timeline.map((x) => p(x.time)).filter((v) => v != null);
  const firstEvent = times.length ? Math.min(...times) : null;
  const cont = p(m.containmentDate), res = p(m.resolutionDate);
  return {
    ttd: det != null && firstEvent != null && det >= firstEvent ? det - firstEvent : null, // détection − 1er événement
    ttc: cont != null && det != null && cont >= det ? cont - det : null,                   // confinement − détection
    ttr: res != null && det != null && res >= det ? res - det : null,                      // résolution − détection
  };
}

export function formatDuration(ms) {
  if (ms == null) return null;
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), rm = min % 60;
  if (h < 24) return rm ? `${h} h ${rm} min` : `${h} h`;
  const days = Math.floor(h / 24), rh = h % 24;
  return rh ? `${days} j ${rh} h` : `${days} j`;
}

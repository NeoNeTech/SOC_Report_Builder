// ============================================================
// SCHEMA — description déclarative des sections & listes dynamiques
// Source unique : le rendu du formulaire ET la création de lignes
// dérivent tous deux de LIST_DEFS (colonnes jamais dupliquées).
// ============================================================
import { OPT } from "./config.js";

export const SECTION_META = [
  { id: "metadata",      accent: "metadata",      icon: "clipboard-list", title: "Métadonnées de l'incident",   desc: "Informations clés du ticket et de la détection" },
  { id: "summary",       accent: "summary",       icon: "file-text",      title: "Synthèse",                    desc: "Vue d'ensemble & impact" },
  { id: "technical",     accent: "technical",     icon: "bug",            title: "Analyse technique",           desc: "Vecteur, MITRE, IOC, chronologie" },
  { id: "investigation", accent: "investigation", icon: "search",         title: "Investigation",               desc: "Démarche & constats" },
  { id: "remediation",   accent: "remediation",   icon: "shield-check",   title: "Confinement & remédiation",   desc: "Actions & recommandations" },
  { id: "references",    accent: "references",    icon: "link",           title: "Références",                   desc: "Tickets liés & liens externes" },
];

export const LIST_DEFS = {
  "summary.assets": {
    grid: "1.2fr 1fr 1fr 1fr", addLabel: "Ajouter un actif",
    cols: [
      { key: "hostname", type: "text", ph: "WIN-DC01" },
      { key: "ip", type: "text", ph: "10.0.4.12" },
      { key: "type", type: "select", options: OPT.assetType },
      { key: "owner", type: "text", ph: "IT / Finance" },
    ],
  },
  "technical.mitre": {
    grid: "1.2fr 0.9fr 1.4fr", addLabel: "Ajouter une technique",
    cols: [
      { key: "tactic", type: "select", options: OPT.tactic },
      { key: "id", type: "text", ph: "T1566.001" },
      { key: "name", type: "text", ph: "Pièce jointe d'hameçonnage" },
    ],
  },
  "technical.iocs": {
    grid: "1fr 1.4fr 1.2fr 0.9fr", addLabel: "Ajouter un IOC",
    cols: [
      { key: "type", type: "select", options: OPT.iocType },
      { key: "value", type: "text", ph: "185.23.x.x / evil.com / hash" },
      { key: "desc", type: "text", ph: "Description" },
      { key: "confidence", type: "select", options: OPT.confidence },
    ],
  },
  "technical.timeline": {
    grid: "1.2fr 0.8fr 1.6fr", addLabel: "Ajouter un événement",
    cols: [
      { key: "time", type: "datetime-local" },
      { key: "source", type: "text", ph: "Splunk" },
      { key: "event", type: "text", ph: "Description de l'événement" },
    ],
  },
  "investigation.queries": {
    grid: "0.8fr 2fr 1.2fr", addLabel: "Ajouter une requête",
    cols: [
      { key: "tool", type: "select", options: OPT.tools },
      { key: "query", type: "textarea", mono: true, ph: "index=wineventlog EventCode=4625 ..." },
      { key: "desc", type: "text", ph: "Ce que vérifie la requête" },
    ],
  },
  "remediation.containment": {
    grid: "2fr 1fr 1fr", addLabel: "Ajouter une action",
    cols: [
      { key: "action", type: "text", ph: "Isolation du poste du réseau" },
      { key: "responsible", type: "text", ph: "J. Dupont" },
      { key: "status", type: "select", options: OPT.containStatus },
    ],
  },
  "remediation.recommendations": {
    grid: "0.9fr 2fr 1fr", addLabel: "Ajouter une recommandation",
    cols: [
      { key: "priority", type: "select", options: OPT.priority },
      { key: "recommendation", type: "text", ph: "Imposer le MFA sur tous les comptes O365" },
      { key: "owner", type: "text", ph: "Exploitation IT" },
    ],
  },
  "references.external": {
    grid: "0.8fr 1.6fr 1.4fr", addLabel: "Ajouter une référence",
    cols: [
      { key: "type", type: "select", options: OPT.refType },
      { key: "value", type: "text", ph: "CVE-2024-1234 / https://..." },
      { key: "desc", type: "text", ph: "Description" },
    ],
  },
};

export const LIST_PATHS = Object.keys(LIST_DEFS);

// ============================================================
// SCHEMA — declarative description of sections & dynamic lists
// Single source of truth: form rendering AND blank-row creation
// both derive from LIST_DEFS, so columns are never duplicated.
// ============================================================
import { OPT } from "./config.js";

export const SECTION_META = [
  { id: "metadata",      accent: "metadata",      icon: "clipboard-list", title: "Incident Metadata",         desc: "Core ticket and detection details" },
  { id: "summary",       accent: "summary",       icon: "file-text",      title: "Executive Summary",         desc: "High-level overview & impact" },
  { id: "technical",     accent: "technical",     icon: "bug",            title: "Technical Analysis",        desc: "Attack vector, MITRE, IOCs, timeline" },
  { id: "investigation", accent: "investigation", icon: "search",         title: "Investigation Steps",       desc: "What was done & findings" },
  { id: "remediation",   accent: "remediation",   icon: "shield-check",   title: "Containment & Remediation", desc: "Actions & recommendations" },
  { id: "references",    accent: "references",    icon: "link",           title: "References",                desc: "Related tickets & external links" },
];

// Each dynamic list: dotted state path -> grid template + column defs.
export const LIST_DEFS = {
  "summary.assets": {
    grid: "1.2fr 1fr 1fr 1fr", addLabel: "Add asset",
    cols: [
      { key: "hostname", type: "text", ph: "WIN-DC01" },
      { key: "ip", type: "text", ph: "10.0.4.12" },
      { key: "type", type: "select", options: OPT.assetType },
      { key: "owner", type: "text", ph: "IT / Finance" },
    ],
  },
  "technical.mitre": {
    grid: "1.2fr 0.9fr 1.4fr", addLabel: "Add technique",
    cols: [
      { key: "tactic", type: "select", options: OPT.tactic },
      { key: "id", type: "text", ph: "T1566.001" },
      { key: "name", type: "text", ph: "Spearphishing Attachment" },
    ],
  },
  "technical.iocs": {
    grid: "1fr 1.4fr 1.2fr 0.9fr", addLabel: "Add IOC",
    cols: [
      { key: "type", type: "select", options: OPT.iocType },
      { key: "value", type: "text", ph: "185.23.x.x / evil.com / hash" },
      { key: "desc", type: "text", ph: "Description" },
      { key: "confidence", type: "select", options: OPT.confidence },
    ],
  },
  "technical.timeline": {
    grid: "1.2fr 0.8fr 1.6fr", addLabel: "Add event",
    cols: [
      { key: "time", type: "datetime-local" },
      { key: "source", type: "text", ph: "Splunk" },
      { key: "event", type: "text", ph: "Event description" },
    ],
  },
  "investigation.queries": {
    grid: "0.8fr 2fr 1.2fr", addLabel: "Add query",
    cols: [
      { key: "tool", type: "select", options: OPT.tools },
      { key: "query", type: "textarea", mono: true, ph: "index=wineventlog EventCode=4625 ..." },
      { key: "desc", type: "text", ph: "What this query checks" },
    ],
  },
  "remediation.containment": {
    grid: "2fr 1fr 1fr", addLabel: "Add action",
    cols: [
      { key: "action", type: "text", ph: "Isolated host from network" },
      { key: "responsible", type: "text", ph: "J. Doe" },
      { key: "status", type: "select", options: OPT.containStatus },
    ],
  },
  "remediation.recommendations": {
    grid: "0.9fr 2fr 1fr", addLabel: "Add recommendation",
    cols: [
      { key: "priority", type: "select", options: OPT.priority },
      { key: "recommendation", type: "text", ph: "Enforce MFA on all O365 accounts" },
      { key: "owner", type: "text", ph: "IT Ops" },
    ],
  },
  "references.external": {
    grid: "0.8fr 1.6fr 1.4fr", addLabel: "Add reference",
    cols: [
      { key: "type", type: "select", options: OPT.refType },
      { key: "value", type: "text", ph: "CVE-2024-1234 / https://..." },
      { key: "desc", type: "text", ph: "Description" },
    ],
  },
};

export const LIST_PATHS = Object.keys(LIST_DEFS);

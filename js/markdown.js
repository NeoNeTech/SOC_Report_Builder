// ============================================================
// MARKDOWN — convertit l'état en un rapport Markdown propre (FR)
// ============================================================
import { state } from "./state.js";
import { fmtDate, splitCsv } from "./util.js";

export function buildMarkdown() {
  const { meta: m, summary: su, technical: t, investigation: inv, remediation: rem, references: ref } = state;
  const L = [];
  const has = (...v) => v.some((x) => (Array.isArray(x) ? x.length : String(x || "").trim() !== ""));

  L.push(`# Rapport d'investigation de sécurité`, "");
  if (m.classification || m.tlp) {
    L.push(`> **${m.classification || "Non classifié"}**${m.tlp ? ` — ${m.tlp}` : ""}`, "");
  }
  L.push(`| Champ | Valeur |`, `|---|---|`);
  L.push(`| **Identifiant du ticket** | ${m.ticketId || "—"} |`);
  L.push(`| **Classification** | ${m.classification || "—"} |`);
  L.push(`| **TLP** | ${m.tlp || "—"} |`);
  L.push(`| **Sévérité** | ${m.severity || "—"} |`);
  L.push(`| **Statut** | ${m.status || "—"} |`);
  L.push(`| **Date de détection** | ${fmtDate(m.detectionDate) || "—"} |`);
  L.push(`| **Analyste** | ${m.analyst || "—"} |`);
  L.push(`| **Équipe** | ${m.team || "—"} |`);
  const tools = [...m.tools]; if (m.toolsOther.trim()) tools.push(...splitCsv(m.toolsOther));
  if (tools.length) L.push(`| **Outils source** | ${tools.join(", ")} |`);
  if (m.tags.trim()) L.push(`| **Étiquettes** | ${splitCsv(m.tags).join(", ")} |`);
  L.push("");

  if (has(su.text, su.impactLevel, su.impactDesc) || su.assets.length) {
    L.push(`## Synthèse`, "");
    if (su.text.trim()) L.push(su.text, "");
    if (su.assets.length) {
      L.push(`### Actifs impactés`, "", `| Nom d'hôte | IP | Type | Propriétaire |`, `|---|---|---|---|`);
      su.assets.forEach((a) => L.push(`| ${a.hostname || "—"} | ${a.ip || "—"} | ${a.type || "—"} | ${a.owner || "—"} |`));
      L.push("");
    }
    if (su.impactLevel || su.impactDesc.trim()) {
      L.push(`### Impact`, "");
      if (su.impactLevel) L.push(`**Niveau d'impact :** ${su.impactLevel}`);
      if (su.impactDesc.trim()) L.push("", su.impactDesc);
      L.push("");
    }
  }

  if (has(t.vector, t.logs, t.notes) || t.mitre.length || t.iocs.length || t.timeline.length) {
    L.push(`## Analyse technique`, "");
    if (t.vector) L.push(`**Vecteur d'attaque :** ${t.vector}`, "");
    if (t.mitre.length) {
      L.push(`### Techniques MITRE ATT&CK`, "", `| Tactique | ID technique | Nom de la technique |`, `|---|---|---|`);
      t.mitre.forEach((x) => L.push(`| ${x.tactic || "—"} | ${x.id || "—"} | ${x.name || "—"} |`));
      L.push("");
    }
    if (t.iocs.length) {
      L.push(`### Indicateurs de compromission`, "", `| Type | Valeur | Description | Confiance |`, `|---|---|---|---|`);
      t.iocs.forEach((x) => L.push(`| ${x.type || "—"} | \`${x.value || "—"}\` | ${x.desc || "—"} | ${x.confidence || "—"} |`));
      L.push("");
    }
    if (t.timeline.length) {
      L.push(`### Chronologie des événements`, "");
      [...t.timeline].sort((a, b) => (a.time || "").localeCompare(b.time || ""))
        .forEach((x) => L.push(`- **${fmtDate(x.time) || "—"}** ${x.source ? `_(${x.source})_` : ""} — ${x.event || ""}`));
      L.push("");
    }
    if (t.logs.trim()) L.push(`### Preuves (logs)`, "", "```", t.logs, "```", "");
    if (t.notes.trim()) L.push(`### Notes d'analyste`, "", t.notes, "");
  }

  if (has(inv.narrative, inv.fpAnalysis, inv.rootCause) || inv.queries.length) {
    L.push(`## Investigation`, "");
    if (inv.narrative.trim()) L.push(inv.narrative, "");
    if (inv.queries.length) {
      L.push(`### Requêtes utilisées`, "");
      inv.queries.forEach((q) => L.push(`**${q.tool || "Requête"}**${q.desc ? ` — ${q.desc}` : ""}`, "", "```", q.query || "", "```", ""));
    }
    if (inv.fpAnalysis.trim()) L.push(`### Analyse de faux positif`, "", inv.fpAnalysis, "");
    if (inv.rootCause.trim()) L.push(`### Cause racine`, "", inv.rootCause, "");
  }

  if (rem.containment.length || rem.recommendations.length || rem.lessons.trim()) {
    L.push(`## Confinement & remédiation`, "");
    if (rem.containment.length) {
      L.push(`### Actions de confinement`, "", `| Action | Responsable | Statut |`, `|---|---|---|`);
      rem.containment.forEach((c) => L.push(`| ${c.action || "—"} | ${c.responsible || "—"} | ${c.status || "—"} |`));
      L.push("");
    }
    if (rem.recommendations.length) {
      L.push(`### Recommandations de remédiation`, "", `| Priorité | Recommandation | Responsable |`, `|---|---|---|`);
      rem.recommendations.forEach((c) => L.push(`| ${c.priority || "—"} | ${c.recommendation || "—"} | ${c.owner || "—"} |`));
      L.push("");
    }
    if (rem.lessons.trim()) L.push(`### Enseignements tirés`, "", rem.lessons, "");
  }

  if (ref.relatedTickets.trim() || ref.external.length) {
    L.push(`## Références`, "");
    if (ref.relatedTickets.trim()) L.push(`**Tickets liés :** ${splitCsv(ref.relatedTickets).join(", ")}`, "");
    if (ref.external.length) {
      L.push(`### Références externes`, "");
      ref.external.forEach((x) => L.push(`- **${x.type || "Réf"} :** ${x.value || "—"}${x.desc ? ` — ${x.desc}` : ""}`));
      L.push("");
    }
  }

  return L.join("\n");
}

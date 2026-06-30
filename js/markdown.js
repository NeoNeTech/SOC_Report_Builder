// ============================================================
// MARKDOWN — convert state into a clean Markdown report string
// ============================================================
import { state } from "./state.js";
import { fmtDate, splitCsv } from "./util.js";

export function buildMarkdown() {
  const { meta: m, summary: su, technical: t, investigation: inv, remediation: rem, references: ref } = state;
  const L = [];
  const has = (...v) => v.some((x) => (Array.isArray(x) ? x.length : String(x || "").trim() !== ""));

  L.push(`# Security Investigation Report`, "");
  L.push(`| Field | Value |`, `|---|---|`);
  L.push(`| **Ticket ID** | ${m.ticketId || "—"} |`);
  L.push(`| **Severity** | ${m.severity || "—"} |`);
  L.push(`| **Status** | ${m.status || "—"} |`);
  L.push(`| **Detection Date** | ${fmtDate(m.detectionDate) || "—"} |`);
  L.push(`| **Analyst** | ${m.analyst || "—"} |`);
  L.push(`| **Team** | ${m.team || "—"} |`);
  const tools = [...m.tools]; if (m.toolsOther.trim()) tools.push(...splitCsv(m.toolsOther));
  if (tools.length) L.push(`| **Source Tools** | ${tools.join(", ")} |`);
  if (m.tags.trim()) L.push(`| **Tags** | ${splitCsv(m.tags).join(", ")} |`);
  L.push("");

  if (has(su.text, su.impactLevel, su.impactDesc) || su.assets.length) {
    L.push(`## Executive Summary`, "");
    if (su.text.trim()) L.push(su.text, "");
    if (su.assets.length) {
      L.push(`### Affected Assets`, "", `| Hostname | IP | Type | Owner |`, `|---|---|---|---|`);
      su.assets.forEach((a) => L.push(`| ${a.hostname || "—"} | ${a.ip || "—"} | ${a.type || "—"} | ${a.owner || "—"} |`));
      L.push("");
    }
    if (su.impactLevel || su.impactDesc.trim()) {
      L.push(`### Impact`, "");
      if (su.impactLevel) L.push(`**Impact Level:** ${su.impactLevel}`);
      if (su.impactDesc.trim()) L.push("", su.impactDesc);
      L.push("");
    }
  }

  if (has(t.vector, t.logs, t.notes) || t.mitre.length || t.iocs.length || t.timeline.length) {
    L.push(`## Technical Analysis`, "");
    if (t.vector) L.push(`**Attack Vector:** ${t.vector}`, "");
    if (t.mitre.length) {
      L.push(`### MITRE ATT&CK Techniques`, "", `| Tactic | Technique ID | Technique Name |`, `|---|---|---|`);
      t.mitre.forEach((x) => L.push(`| ${x.tactic || "—"} | ${x.id || "—"} | ${x.name || "—"} |`));
      L.push("");
    }
    if (t.iocs.length) {
      L.push(`### Indicators of Compromise`, "", `| Type | Value | Description | Confidence |`, `|---|---|---|---|`);
      t.iocs.forEach((x) => L.push(`| ${x.type || "—"} | \`${x.value || "—"}\` | ${x.desc || "—"} | ${x.confidence || "—"} |`));
      L.push("");
    }
    if (t.timeline.length) {
      L.push(`### Timeline of Events`, "");
      [...t.timeline].sort((a, b) => (a.time || "").localeCompare(b.time || ""))
        .forEach((x) => L.push(`- **${fmtDate(x.time) || "—"}** ${x.source ? `_(${x.source})_` : ""} — ${x.event || ""}`));
      L.push("");
    }
    if (t.logs.trim()) L.push(`### Log Evidence`, "", "```", t.logs, "```", "");
    if (t.notes.trim()) L.push(`### Analyst Notes`, "", t.notes, "");
  }

  if (has(inv.narrative, inv.fpAnalysis, inv.rootCause) || inv.queries.length) {
    L.push(`## Investigation`, "");
    if (inv.narrative.trim()) L.push(inv.narrative, "");
    if (inv.queries.length) {
      L.push(`### Queries Used`, "");
      inv.queries.forEach((q) => L.push(`**${q.tool || "Query"}**${q.desc ? ` — ${q.desc}` : ""}`, "", "```", q.query || "", "```", ""));
    }
    if (inv.fpAnalysis.trim()) L.push(`### False Positive Analysis`, "", inv.fpAnalysis, "");
    if (inv.rootCause.trim()) L.push(`### Root Cause`, "", inv.rootCause, "");
  }

  if (rem.containment.length || rem.recommendations.length || rem.lessons.trim()) {
    L.push(`## Containment & Remediation`, "");
    if (rem.containment.length) {
      L.push(`### Containment Actions`, "", `| Action | Responsible | Status |`, `|---|---|---|`);
      rem.containment.forEach((c) => L.push(`| ${c.action || "—"} | ${c.responsible || "—"} | ${c.status || "—"} |`));
      L.push("");
    }
    if (rem.recommendations.length) {
      L.push(`### Remediation Recommendations`, "", `| Priority | Recommendation | Owner |`, `|---|---|---|`);
      rem.recommendations.forEach((c) => L.push(`| ${c.priority || "—"} | ${c.recommendation || "—"} | ${c.owner || "—"} |`));
      L.push("");
    }
    if (rem.lessons.trim()) L.push(`### Lessons Learned`, "", rem.lessons, "");
  }

  if (ref.relatedTickets.trim() || ref.external.length) {
    L.push(`## References`, "");
    if (ref.relatedTickets.trim()) L.push(`**Related Tickets:** ${splitCsv(ref.relatedTickets).join(", ")}`, "");
    if (ref.external.length) {
      L.push(`### External References`, "");
      ref.external.forEach((x) => L.push(`- **${x.type || "Ref"}:** ${x.value || "—"}${x.desc ? ` — ${x.desc}` : ""}`));
      L.push("");
    }
  }

  return L.join("\n");
}

// ============================================================
// PREVIEW — renders the live report document + progress bar
// ============================================================
import { state } from "./state.js";
import { esc, slug, fmtDate, hasAny, splitCsv, icons } from "./util.js";

const REQUIRED = [
  () => state.meta.ticketId, () => state.meta.severity, () => state.meta.status,
  () => state.meta.detectionDate, () => state.meta.analyst, () => state.summary.text,
];

export function updateProgress() {
  const filled = REQUIRED.filter((f) => String(f() || "").trim() !== "").length;
  const pct = Math.round((filled / REQUIRED.length) * 100);
  document.getElementById("progressFill").style.width = pct + "%";
  document.getElementById("progressLabel").textContent = pct + "%";
}

// list of all source tools (checkboxes + free text)
function allTools() {
  const t = [...state.meta.tools];
  if (state.meta.toolsOther.trim()) t.push(...splitCsv(state.meta.toolsOther));
  return t;
}

export function renderDoc() {
  const doc = document.getElementById("doc");
  const { meta: m, summary: su, technical: t, investigation: inv, remediation: rem, references: ref } = state;

  const anyData =
    hasAny(m.ticketId, m.analyst, m.severity, su.text, t.logs) ||
    su.assets.length || t.mitre.length || t.iocs.length || t.timeline.length ||
    inv.queries.length || rem.containment.length || rem.recommendations.length || ref.external.length;

  if (!anyData) {
    doc.innerHTML = `<div class="doc-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <p>Start filling the form to preview your report</p>
    </div>`;
    return;
  }

  let h = "";
  let n = 0;
  const secHead = (title) => `<h2><span class="num">${(++n).toString().padStart(2, "0")}</span> ${esc(title)}</h2>`;

  // ---- HEADER ----
  const sevClass = "sev-" + slug(m.severity || "info");
  const tools = allTools();
  h += `<div class="rpt-head">
    <div class="rpt-head-top">
      <svg class="shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <h1>Security Investigation Report</h1>
    </div>
    <div class="rpt-meta-grid">
      <div class="rpt-meta-item"><span class="k">Ticket:</span><span class="v">${esc(m.ticketId) || "—"}</span></div>
      <div class="rpt-meta-item"><span class="k">Severity:</span>${m.severity ? `<span class="badge ${sevClass}"><span class="bdot"></span>${esc(m.severity)}</span>` : '<span class="v">—</span>'}</div>
      <div class="rpt-meta-item"><span class="k">Analyst:</span><span class="v">${esc(m.analyst) || "—"}</span></div>
      <div class="rpt-meta-item"><span class="k">Status:</span>${m.status ? `<span class="badge status-badge"><span class="bdot"></span>${esc(m.status)}</span>` : '<span class="v">—</span>'}</div>
      <div class="rpt-meta-item"><span class="k">Detected:</span><span class="v">${fmtDate(m.detectionDate) || "—"}</span></div>
      <div class="rpt-meta-item"><span class="k">Team:</span><span class="v">${esc(m.team) || "—"}</span></div>
    </div>
  </div>`;

  // ---- OVERVIEW (tools + tags) ----
  if (m.tags.trim() || tools.length) {
    h += `<div class="doc-section">${secHead("Incident Overview")}`;
    if (tools.length) h += `<div class="doc-field"><div class="lbl">Source Tools</div><div class="chips">${tools.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div></div>`;
    if (m.tags.trim()) h += `<div class="doc-field"><div class="lbl">Tags</div><div class="chips">${splitCsv(m.tags).map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div></div>`;
    h += `</div>`;
  }

  // ---- EXECUTIVE SUMMARY ----
  if (hasAny(su.text, su.impactLevel, su.impactDesc) || su.assets.length) {
    h += `<div class="doc-section">${secHead("Executive Summary")}`;
    if (su.text.trim()) h += `<p class="doc-p">${esc(su.text)}</p>`;
    if (su.assets.length) {
      h += `<h3>Affected Assets</h3><table class="doc-table"><thead><tr><th>Hostname</th><th>IP Address</th><th>Type</th><th>Owner</th></tr></thead><tbody>`;
      su.assets.forEach((a) => { h += `<tr><td>${esc(a.hostname) || "—"}</td><td class="mono">${esc(a.ip) || "—"}</td><td>${esc(a.type) || "—"}</td><td>${esc(a.owner) || "—"}</td></tr>`; });
      h += `</tbody></table>`;
    }
    if (su.impactLevel || su.impactDesc.trim()) {
      h += `<h3>Impact</h3>`;
      if (su.impactLevel) h += `<div class="doc-field"><span class="badge ${"sev-" + slug(su.impactLevel)}"><span class="bdot"></span>${esc(su.impactLevel)} impact</span></div>`;
      if (su.impactDesc.trim()) h += `<p class="doc-p">${esc(su.impactDesc)}</p>`;
    }
    h += `</div>`;
  }

  // ---- TECHNICAL ANALYSIS ----
  if (hasAny(t.vector, t.logs, t.notes) || t.mitre.length || t.iocs.length || t.timeline.length) {
    h += `<div class="doc-section">${secHead("Technical Analysis")}`;
    if (t.vector) h += `<div class="doc-field"><div class="lbl">Attack Vector</div><div class="doc-p">${esc(t.vector)}</div></div>`;
    if (t.mitre.length) {
      h += `<h3>MITRE ATT&CK Techniques</h3><div class="mitre-grid">`;
      t.mitre.forEach((x) => { h += `<div class="mitre-badge"><span class="ttac">${esc(x.tactic) || "—"}</span><span class="tid">${esc(x.id) || "—"}</span><span class="tname">${esc(x.name) || ""}</span></div>`; });
      h += `</div>`;
    }
    if (t.iocs.length) {
      h += `<h3>Indicators of Compromise</h3><table class="doc-table"><thead><tr><th>Type</th><th>Value</th><th>Description</th><th>Confidence</th></tr></thead><tbody>`;
      t.iocs.forEach((x) => { h += `<tr><td>${esc(x.type) || "—"}</td><td class="mono">${esc(x.value) || "—"}</td><td>${esc(x.desc) || "—"}</td><td class="conf-${slug(x.confidence)}">${esc(x.confidence) || "—"}</td></tr>`; });
      h += `</tbody></table>`;
    }
    if (t.timeline.length) {
      const sorted = [...t.timeline].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      h += `<h3>Timeline of Events</h3><div class="timeline">`;
      sorted.forEach((x) => { h += `<div class="tl-item"><div><span class="tl-time">${fmtDate(x.time) || "—"}</span>${x.source ? `<span class="tl-src">${esc(x.source)}</span>` : ""}</div><div class="tl-desc">${esc(x.event) || ""}</div></div>`; });
      h += `</div>`;
    }
    if (t.logs.trim()) h += `<h3>Log Evidence</h3><div class="code-block">${esc(t.logs)}</div>`;
    if (t.notes.trim()) h += `<h3>Analyst Notes</h3><p class="doc-p">${esc(t.notes)}</p>`;
    h += `</div>`;
  }

  // ---- INVESTIGATION ----
  if (hasAny(inv.narrative, inv.fpAnalysis, inv.rootCause) || inv.queries.length) {
    h += `<div class="doc-section">${secHead("Investigation")}`;
    if (inv.narrative.trim()) h += `<p class="doc-p">${esc(inv.narrative)}</p>`;
    if (inv.queries.length) {
      h += `<h3>Queries Used</h3>`;
      inv.queries.forEach((q) => { h += `<div class="doc-field"><div class="lbl">${esc(q.tool) || "Query"}${q.desc ? ` — ${esc(q.desc)}` : ""}</div><div class="code-block">${esc(q.query) || ""}</div></div>`; });
    }
    if (inv.fpAnalysis.trim()) h += `<h3>False Positive Analysis</h3><p class="doc-p">${esc(inv.fpAnalysis)}</p>`;
    if (inv.rootCause.trim()) h += `<h3>Root Cause</h3><p class="doc-p">${esc(inv.rootCause)}</p>`;
    h += `</div>`;
  }

  // ---- REMEDIATION ----
  if (rem.containment.length || rem.recommendations.length || rem.lessons.trim()) {
    h += `<div class="doc-section">${secHead("Containment & Remediation")}`;
    if (rem.containment.length) {
      h += `<h3>Containment Actions</h3><table class="doc-table"><thead><tr><th>Action</th><th>Responsible</th><th>Status</th></tr></thead><tbody>`;
      rem.containment.forEach((c) => { h += `<tr><td>${esc(c.action) || "—"}</td><td>${esc(c.responsible) || "—"}</td><td>${c.status ? `<span class="st-pill st-${slug(c.status)}">${esc(c.status)}</span>` : "—"}</td></tr>`; });
      h += `</tbody></table>`;
    }
    if (rem.recommendations.length) {
      h += `<h3>Remediation Recommendations</h3><table class="doc-table"><thead><tr><th>Priority</th><th>Recommendation</th><th>Owner</th></tr></thead><tbody>`;
      rem.recommendations.forEach((c) => { h += `<tr><td>${c.priority ? `<span class="prio prio-${slug(c.priority)}">${esc(c.priority)}</span>` : "—"}</td><td>${esc(c.recommendation) || "—"}</td><td>${esc(c.owner) || "—"}</td></tr>`; });
      h += `</tbody></table>`;
    }
    if (rem.lessons.trim()) h += `<h3>Lessons Learned</h3><p class="doc-p">${esc(rem.lessons)}</p>`;
    h += `</div>`;
  }

  // ---- REFERENCES ----
  if (ref.relatedTickets.trim() || ref.external.length) {
    h += `<div class="doc-section">${secHead("References")}`;
    if (ref.relatedTickets.trim()) h += `<div class="doc-field"><div class="lbl">Related Tickets</div><div class="chips">${splitCsv(ref.relatedTickets).map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div></div>`;
    if (ref.external.length) {
      h += `<h3>External References</h3><table class="doc-table"><thead><tr><th>Type</th><th>Reference</th><th>Description</th></tr></thead><tbody>`;
      ref.external.forEach((x) => {
        const isUrl = /^https?:\/\//i.test(x.value || "");
        const valCell = isUrl ? `<a class="ref-link" href="${esc(x.value)}" target="_blank" rel="noopener">${esc(x.value)}</a>` : `<span class="ref-link">${esc(x.value) || "—"}</span>`;
        h += `<tr><td>${esc(x.type) || "—"}</td><td>${valCell}</td><td>${esc(x.desc) || "—"}</td></tr>`;
      });
      h += `</tbody></table>`;
    }
    h += `</div>`;
  }

  doc.innerHTML = h;
  icons();
}

// ============================================================
// PREVIEW — rendu du document live + barre de progression
// ============================================================
import { state } from "./state.js";
import {
  SEVERITY_LEVEL, IMPACT_LEVEL, CONFIDENCE_LEVEL,
  CONTAIN_STATUS_KEY, PRIORITY_LEVEL, TLP_LEVEL, CLASSIFICATION_LEVEL,
} from "./config.js";
import { esc, fmtDate, hasAny, splitCsv, icons } from "./util.js";
import { computeMetrics, formatDuration } from "./lint.js";

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
      <p>Remplissez le formulaire pour prévisualiser votre rapport</p>
    </div>`;
    return;
  }

  let h = "";
  let n = 0;
  const secHead = (title) => `<h2><span class="num">${(++n).toString().padStart(2, "0")}</span> ${esc(title)}</h2>`;

  // ---- bandeau de classification ----
  if (m.classification) {
    h += `<div class="rpt-classif cl-${CLASSIFICATION_LEVEL[m.classification] || "np"}">${esc(m.classification)}</div>`;
  }

  // ---- en-tête ----
  const sevClass = "sev-" + (SEVERITY_LEVEL[m.severity] || "info");
  const tools = allTools();
  const b = state.branding;
  h += `<div class="rpt-head">
    <div class="rpt-head-top">
      <svg class="shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      <div class="rpt-head-titles">
        <h1>Rapport d'investigation de sécurité</h1>
        ${b.orgName ? `<span class="rpt-org">${esc(b.orgName)}</span>` : ""}
      </div>
      ${b.logo ? `<div class="rpt-logo-box"><img class="rpt-logo" src="${esc(b.logo)}" alt="logo" /></div>` : ""}
    </div>
    <div class="rpt-meta-grid">
      <div class="rpt-meta-item"><span class="k">Ticket :</span><span class="v">${esc(m.ticketId) || "—"}</span></div>
      <div class="rpt-meta-item"><span class="k">Sévérité :</span>${m.severity ? `<span class="badge ${sevClass}"><span class="bdot"></span>${esc(m.severity)}</span>` : '<span class="v">—</span>'}</div>
      <div class="rpt-meta-item"><span class="k">Analyste :</span><span class="v">${esc(m.analyst) || "—"}</span></div>
      <div class="rpt-meta-item"><span class="k">Statut :</span>${m.status ? `<span class="badge status-badge"><span class="bdot"></span>${esc(m.status)}</span>` : '<span class="v">—</span>'}</div>
      <div class="rpt-meta-item"><span class="k">Détecté :</span><span class="v">${fmtDate(m.detectionDate) || "—"}</span></div>
      <div class="rpt-meta-item"><span class="k">Équipe :</span><span class="v">${esc(m.team) || "—"}</span></div>
      <div class="rpt-meta-item"><span class="k">Classif. :</span><span class="v">${esc(m.classification) || "—"}</span></div>
      <div class="rpt-meta-item"><span class="k">TLP :</span>${m.tlp ? `<span class="tlp-badge tlp-${TLP_LEVEL[m.tlp] || "clear"}">${esc(m.tlp)}</span>` : '<span class="v">—</span>'}</div>
    </div>
  </div>`;

  // ---- indicateurs de délai ----
  const met = computeMetrics(state);
  if (met.ttd != null || met.ttc != null || met.ttr != null) {
    const cell = (label, ms) => `<div class="metric"><div class="metric-label">${label}</div><div class="metric-val">${formatDuration(ms) || "—"}</div></div>`;
    h += `<div class="rpt-metrics">
      ${cell("Temps de détection", met.ttd)}
      ${cell("Temps de confinement", met.ttc)}
      ${cell("Temps de résolution", met.ttr)}
    </div>`;
  }

  // ---- vue d'ensemble ----
  if (m.tags.trim() || tools.length) {
    h += `<div class="doc-section">${secHead("Vue d'ensemble de l'incident")}`;
    if (tools.length) h += `<div class="doc-field"><div class="lbl">Outils source</div><div class="chips">${tools.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div></div>`;
    if (m.tags.trim()) h += `<div class="doc-field"><div class="lbl">Étiquettes</div><div class="chips">${splitCsv(m.tags).map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div></div>`;
    h += `</div>`;
  }

  // ---- synthèse ----
  if (hasAny(su.text, su.impactLevel, su.impactDesc) || su.assets.length) {
    h += `<div class="doc-section">${secHead("Synthèse")}`;
    if (su.text.trim()) h += `<p class="doc-p">${esc(su.text)}</p>`;
    if (su.assets.length) {
      h += `<h3>Actifs impactés</h3><table class="doc-table"><thead><tr><th>Nom d'hôte</th><th>Adresse IP</th><th>Type</th><th>Propriétaire</th></tr></thead><tbody>`;
      su.assets.forEach((a) => { h += `<tr><td>${esc(a.hostname) || "—"}</td><td class="mono">${esc(a.ip) || "—"}</td><td>${esc(a.type) || "—"}</td><td>${esc(a.owner) || "—"}</td></tr>`; });
      h += `</tbody></table>`;
    }
    if (su.impactLevel || su.impactDesc.trim()) {
      h += `<h3>Impact</h3>`;
      if (su.impactLevel) h += `<div class="doc-field"><span class="badge ${"sev-" + (IMPACT_LEVEL[su.impactLevel] || "none")}"><span class="bdot"></span>Impact ${esc(su.impactLevel)}</span></div>`;
      if (su.impactDesc.trim()) h += `<p class="doc-p">${esc(su.impactDesc)}</p>`;
    }
    h += `</div>`;
  }

  // ---- analyse technique ----
  if (hasAny(t.vector, t.logs, t.notes) || t.mitre.length || t.iocs.length || t.timeline.length) {
    h += `<div class="doc-section">${secHead("Analyse technique")}`;
    if (t.vector) h += `<div class="doc-field"><div class="lbl">Vecteur d'attaque</div><div class="doc-p">${esc(t.vector)}</div></div>`;
    if (t.mitre.length) {
      h += `<h3>Techniques MITRE ATT&CK</h3><div class="mitre-grid">`;
      t.mitre.forEach((x) => { h += `<div class="mitre-badge"><span class="ttac">${esc(x.tactic) || "—"}</span><span class="tid">${esc(x.id) || "—"}</span><span class="tname">${esc(x.name) || ""}</span></div>`; });
      h += `</div>`;
    }
    if (t.iocs.length) {
      h += `<h3>Indicateurs de compromission</h3><table class="doc-table"><thead><tr><th>Type</th><th>Valeur</th><th>Description</th><th>Confiance</th></tr></thead><tbody>`;
      t.iocs.forEach((x) => { h += `<tr><td>${esc(x.type) || "—"}</td><td class="mono">${esc(x.value) || "—"}</td><td>${esc(x.desc) || "—"}</td><td class="conf-${CONFIDENCE_LEVEL[x.confidence] || ""}">${esc(x.confidence) || "—"}</td></tr>`; });
      h += `</tbody></table>`;
    }
    if (t.timeline.length) {
      const sorted = [...t.timeline].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      h += `<h3>Chronologie des événements</h3><div class="timeline">`;
      sorted.forEach((x) => { h += `<div class="tl-item"><div><span class="tl-time">${fmtDate(x.time) || "—"}</span>${x.source ? `<span class="tl-src">${esc(x.source)}</span>` : ""}</div><div class="tl-desc">${esc(x.event) || ""}</div></div>`; });
      h += `</div>`;
    }
    if (t.logs.trim()) h += `<h3>Preuves (logs)</h3><div class="code-block">${esc(t.logs)}</div>`;
    if (t.notes.trim()) h += `<h3>Notes d'analyste</h3><p class="doc-p">${esc(t.notes)}</p>`;
    h += `</div>`;
  }

  // ---- investigation ----
  if (hasAny(inv.narrative, inv.fpAnalysis, inv.rootCause) || inv.queries.length) {
    h += `<div class="doc-section">${secHead("Investigation")}`;
    if (inv.narrative.trim()) h += `<p class="doc-p">${esc(inv.narrative)}</p>`;
    if (inv.queries.length) {
      h += `<h3>Requêtes utilisées</h3>`;
      inv.queries.forEach((q) => { h += `<div class="doc-field"><div class="lbl">${esc(q.tool) || "Requête"}${q.desc ? ` — ${esc(q.desc)}` : ""}</div><div class="code-block">${esc(q.query) || ""}</div></div>`; });
    }
    if (inv.fpAnalysis.trim()) h += `<h3>Analyse de faux positif</h3><p class="doc-p">${esc(inv.fpAnalysis)}</p>`;
    if (inv.rootCause.trim()) h += `<h3>Cause racine</h3><p class="doc-p">${esc(inv.rootCause)}</p>`;
    h += `</div>`;
  }

  // ---- confinement & remédiation ----
  if (rem.containment.length || rem.recommendations.length || rem.lessons.trim()) {
    h += `<div class="doc-section">${secHead("Confinement & remédiation")}`;
    if (rem.containment.length) {
      h += `<h3>Actions de confinement</h3><table class="doc-table"><thead><tr><th>Action</th><th>Responsable</th><th>Statut</th></tr></thead><tbody>`;
      rem.containment.forEach((c) => { h += `<tr><td>${esc(c.action) || "—"}</td><td>${esc(c.responsible) || "—"}</td><td>${c.status ? `<span class="st-pill st-${CONTAIN_STATUS_KEY[c.status] || "planned"}">${esc(c.status)}</span>` : "—"}</td></tr>`; });
      h += `</tbody></table>`;
    }
    if (rem.recommendations.length) {
      h += `<h3>Recommandations de remédiation</h3><table class="doc-table"><thead><tr><th>Priorité</th><th>Recommandation</th><th>Responsable</th></tr></thead><tbody>`;
      rem.recommendations.forEach((c) => { h += `<tr><td>${c.priority ? `<span class="prio prio-${PRIORITY_LEVEL[c.priority] || ""}">${esc(c.priority)}</span>` : "—"}</td><td>${esc(c.recommendation) || "—"}</td><td>${esc(c.owner) || "—"}</td></tr>`; });
      h += `</tbody></table>`;
    }
    if (rem.lessons.trim()) h += `<h3>Enseignements tirés</h3><p class="doc-p">${esc(rem.lessons)}</p>`;
    h += `</div>`;
  }

  // ---- références ----
  if (ref.relatedTickets.trim() || ref.external.length) {
    h += `<div class="doc-section">${secHead("Références")}`;
    if (ref.relatedTickets.trim()) h += `<div class="doc-field"><div class="lbl">Tickets liés</div><div class="chips">${splitCsv(ref.relatedTickets).map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div></div>`;
    if (ref.external.length) {
      h += `<h3>Références externes</h3><table class="doc-table"><thead><tr><th>Type</th><th>Référence</th><th>Description</th></tr></thead><tbody>`;
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

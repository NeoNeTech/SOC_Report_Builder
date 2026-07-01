// ============================================================
// PDF — rapport natif basé texte, généré avec jsPDF (+ AutoTable).
// Texte sélectionnable, vraie pagination, marquages Classification/TLP.
// ============================================================
import { state } from "./state.js";
import { fmtDate, splitCsv } from "./util.js";
import { toast } from "./ui.js";
import {
  SEVERITY_LEVEL, PRIORITY_LEVEL, CONFIDENCE_LEVEL, TLP_LEVEL, CLASSIFICATION_LEVEL,
} from "./config.js";
import { defangValue } from "./exporters.js";
import { computeMetrics, formatDuration } from "./lint.js";

// palette (impression)
const INK = [28, 37, 51];
const MUTED = [110, 120, 135];
const LINE = [212, 218, 226];
const NAVY = [15, 22, 35];
const ACCENT = [13, 140, 128];
const WHITE = [255, 255, 255];

const SEV_COLOR = {
  critical: [212, 55, 60], high: [206, 124, 44], medium: [190, 146, 32],
  low: [70, 128, 200], info: MUTED, none: MUTED,
};
const CONF_COLOR = { high: [212, 55, 60], medium: [190, 146, 32], low: [58, 150, 110] };
const TLP_COLOR = { red: [185, 28, 28], amber: [180, 83, 9], green: [21, 128, 61], clear: [120, 120, 130] };
const CLASSIF_COLOR = { np: [75, 85, 99], dr: [180, 83, 9], secret: [185, 28, 28] };

const sevColor = (v) => SEV_COLOR[SEVERITY_LEVEL[v]] || MUTED;
const prioColor = (v) => SEV_COLOR[PRIORITY_LEVEL[v]] || MUTED;
const confColor = (v) => CONF_COLOR[CONFIDENCE_LEVEL[v]] || INK;
const tlpColor = (v) => TLP_COLOR[TLP_LEVEL[v]] || MUTED;

const M = 16, PW = 210, PH = 297, CW = PW - M * 2, BOTTOM = PH - M;

function hasData() {
  const s = state;
  return Boolean(
    s.meta.ticketId || s.meta.analyst || s.meta.severity || s.summary.text.trim() ||
    s.technical.logs.trim() || s.summary.assets.length || s.technical.mitre.length ||
    s.technical.iocs.length || s.technical.timeline.length || s.investigation.queries.length ||
    s.remediation.containment.length || s.remediation.recommendations.length || s.references.external.length
  );
}

export async function exportPdf() {
  if (!window.jspdf) { toast("Bibliothèque PDF en cours de chargement…", true); return; }
  if (!hasData()) { toast("Rien à exporter pour l'instant", true); return; }

  const overlay = document.getElementById("pdfOverlay");
  overlay.classList.add("show");
  await new Promise((r) => setTimeout(r, 40));

  try {
    build();
    toast("PDF exporté");
  } catch (err) {
    console.error(err);
    toast("Échec de l'export PDF", true);
  } finally {
    overlay.classList.remove("show");
  }
}

function build() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");
  const hasTable = typeof doc.autoTable === "function";
  const { meta: m, summary: su, technical: t, investigation: inv, remediation: rem, references: ref } = state;
  const classifLevel = CLASSIFICATION_LEVEL[m.classification];

  let y = 0;
  let sectionNo = 0;

  const setFont = (style = "normal", size = 10, color = INK, font = "helvetica") => {
    doc.setFont(font, style); doc.setFontSize(size); doc.setTextColor(...color);
  };
  const ensure = (h) => { if (y + h > BOTTOM) { doc.addPage(); y = M; } };

  function paragraph(text, { size = 10, color = INK, style = "normal", gap = 2, font = "helvetica", lh = 4.8 } = {}) {
    if (!text) return;
    setFont(style, size, color, font);
    const lines = doc.splitTextToSize(String(text), CW);
    for (const line of lines) { ensure(lh); doc.text(line, M, y); y += lh; }
    y += gap;
  }

  function sectionTitle(title) {
    sectionNo++;
    ensure(13); y += 3;
    const num = String(sectionNo).padStart(2, "0");
    setFont("bold", 13, MUTED); doc.text(num, M, y);
    setFont("bold", 13, INK); doc.text(title, M + 9, y);
    y += 2.5;
    doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.line(M, y, M + CW, y);
    y += 5;
  }

  function subHeading(text) {
    ensure(8); y += 1.5;
    setFont("bold", 10.5, INK); doc.text(text, M, y);
    y += 4.5;
  }

  function labeledValue(label, value) {
    ensure(8);
    setFont("bold", 7.5, MUTED); doc.text(label.toUpperCase(), M, y); y += 4;
    paragraph(value, { size: 10, gap: 1.5 });
  }

  function monoBlock(text) {
    if (!text || !String(text).trim()) return;
    const size = 8, lh = 3.8, padX = 2.5, padY = 2.5;
    setFont("normal", size, INK, "courier");
    const lines = doc.splitTextToSize(String(text), CW - padX * 2);
    let i = 0;
    while (i < lines.length) {
      ensure(lh + padY * 2);
      const avail = Math.floor((BOTTOM - y - padY * 2) / lh);
      const chunk = lines.slice(i, i + Math.max(1, avail));
      const boxH = chunk.length * lh + padY * 2;
      doc.setFillColor(245, 247, 250); doc.setDrawColor(...LINE); doc.setLineWidth(0.2);
      doc.roundedRect(M, y, CW, boxH, 1.2, 1.2, "FD");
      setFont("normal", size, [40, 50, 65], "courier");
      let ty = y + padY + lh - 1;
      for (const line of chunk) { doc.text(line, M + padX, ty); ty += lh; }
      y += boxH + 2;
      i += chunk.length;
    }
  }

  function table(head, body, opts = {}) {
    if (!body.length) return;
    if (!hasTable) { simpleTable(head, body); return; }
    ensure(14);
    doc.autoTable({
      head: [head], body, startY: y, margin: { left: M, right: M },
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2, textColor: INK, lineColor: LINE, lineWidth: 0.15, overflow: "linebreak", valign: "top" },
      headStyles: { fillColor: [241, 244, 248], textColor: MUTED, fontStyle: "bold", fontSize: 7.5, lineColor: LINE, lineWidth: 0.15 },
      columnStyles: opts.columnStyles || {},
      didParseCell: opts.didParseCell,
    });
    y = doc.lastAutoTable.finalY + 3;
  }

  function simpleTable(head, body) {
    paragraph(head.join("  |  "), { size: 8, style: "bold", color: MUTED, gap: 1 });
    body.forEach((r) => paragraph(r.join("  |  "), { size: 8.5, gap: 1 }));
    y += 2;
  }

  function chip(x, yTop, text, color) {
    setFont("bold", 7.5, WHITE);
    const w = doc.getTextWidth(String(text).toUpperCase()) + 5;
    doc.setFillColor(...color); doc.roundedRect(x, yTop, w, 5, 1, 1, "F");
    doc.setTextColor(...WHITE); doc.text(String(text).toUpperCase(), x + 2.5, yTop + 3.5);
  }

  // ---------- header banner ----------
  const b = state.branding;
  const tools = [...m.tools]; if (m.toolsOther.trim()) tools.push(...splitCsv(m.toolsOther));
  const headTop = classifLevel ? 6 : 0;
  doc.setFillColor(...NAVY); doc.rect(0, headTop, PW, 30, "F");
  setFont("bold", 15, WHITE); doc.text("RAPPORT D'INVESTIGATION DE SÉCURITÉ", M, headTop + 13);
  setFont("normal", 9, [170, 180, 195]);
  const subtitle = `${b.orgName ? b.orgName + "   •   " : ""}Ticket ${m.ticketId || "—"}   •   ${fmtDate(m.detectionDate) || "Date —"}`;
  doc.text(subtitle, M, headTop + 20);

  // organisation logo, on a white chip at the right of the banner
  if (b.logo) {
    const ratio = b.logoRatio || 1;
    const maxH = 15, maxW = 46, pad = 1.5;
    let lh = maxH, lw = lh * ratio;
    if (lw > maxW) { lw = maxW; lh = lw / ratio; }
    const boxW = lw + pad * 2, boxH = lh + pad * 2;
    const bx = PW - M - boxW, by = headTop + (30 - boxH) / 2;
    doc.setFillColor(255, 255, 255); doc.roundedRect(bx, by, boxW, boxH, 1, 1, "F");
    const fmt = /^data:image\/(jpe?g)/i.test(b.logo) ? "JPEG" : "PNG";
    try { doc.addImage(b.logo, fmt, bx + pad, by + pad, lw, lh); } catch (e) { /* image illisible : on ignore */ }
  }
  y = headTop + 38;

  const metaRows = [
    ["Sévérité", m.severity || "—"], ["Statut", m.status || "—"],
    ["Classification", m.classification || "—"], ["TLP", m.tlp || "—"],
    ["Analyste", m.analyst || "—"], ["Équipe", m.team || "—"],
  ];
  const colX = [M, M + CW / 2];
  for (let i = 0; i < metaRows.length; i += 2) {
    ensure(7);
    for (let c = 0; c < 2; c++) {
      const item = metaRows[i + c];
      if (!item) continue;
      const x = colX[c];
      setFont("bold", 7.5, MUTED); doc.text(item[0].toUpperCase(), x, y);
      if (item[0] === "Sévérité" && m.severity) chip(x + 26, y - 3.4, m.severity, sevColor(m.severity));
      else if (item[0] === "TLP" && m.tlp) chip(x + 26, y - 3.4, m.tlp, tlpColor(m.tlp));
      else { setFont("bold", 9.5, INK); doc.text(String(item[1]), x + 26, y); }
    }
    y += 6;
  }
  if (tools.length) { y += 1; labeledValue("Outils source", tools.join(", ")); }
  if (m.tags.trim()) { labeledValue("Étiquettes", splitCsv(m.tags).join(", ")); }

  // indicateurs de délai
  const met = computeMetrics(state);
  if (met.ttd != null || met.ttc != null || met.ttr != null) {
    const parts = [
      met.ttd != null ? `Détection : ${formatDuration(met.ttd)}` : null,
      met.ttc != null ? `Confinement : ${formatDuration(met.ttc)}` : null,
      met.ttr != null ? `Résolution : ${formatDuration(met.ttr)}` : null,
    ].filter(Boolean).join("      ");
    y += 1; labeledValue("Indicateurs de délai", parts);
  }
  y += 2;

  // ---------- Synthèse ----------
  if (su.text.trim() || su.assets.length || su.impactLevel || su.impactDesc.trim()) {
    sectionTitle("Synthèse");
    if (su.text.trim()) paragraph(su.text);
    if (su.assets.length) {
      subHeading("Actifs impactés");
      table(["Nom d'hôte", "Adresse IP", "Type", "Propriétaire"],
        su.assets.map((a) => [a.hostname || "—", a.ip || "—", a.type || "—", a.owner || "—"]),
        { columnStyles: { 1: { font: "courier", fontSize: 8 } } });
    }
    if (su.impactLevel || su.impactDesc.trim()) {
      subHeading("Impact");
      if (su.impactLevel) labeledValue("Niveau d'impact", su.impactLevel);
      if (su.impactDesc.trim()) paragraph(su.impactDesc);
    }
  }

  // ---------- Analyse technique ----------
  if (t.vector || t.mitre.length || t.iocs.length || t.timeline.length || t.logs.trim() || t.notes.trim()) {
    sectionTitle("Analyse technique");
    if (t.vector) labeledValue("Vecteur d'attaque", t.vector);
    if (t.mitre.length) {
      subHeading("Techniques MITRE ATT&CK");
      table(["Tactique", "ID technique", "Nom de la technique"],
        t.mitre.map((x) => [x.tactic || "—", x.id || "—", x.name || "—"]),
        { columnStyles: { 1: { font: "courier", fontSize: 8, fontStyle: "bold" } } });
    }
    if (t.iocs.length) {
      subHeading("Indicateurs de compromission");
      const fmt = state.prefs && state.prefs.defang ? defangValue : (v) => v;
      table(["Type", "Valeur", "Description", "Conf."],
        t.iocs.map((x) => [x.type || "—", x.value ? fmt(x.value) : "—", x.desc || "—", x.confidence || "—"]),
        {
          columnStyles: { 1: { font: "courier", fontSize: 7.5 }, 3: { halign: "center", cellWidth: 18 } },
          didParseCell: (d) => { if (d.section === "body" && d.column.index === 3 && d.cell.raw && d.cell.raw !== "—") { d.cell.styles.textColor = confColor(d.cell.raw); d.cell.styles.fontStyle = "bold"; } },
        });
    }
    if (t.timeline.length) {
      subHeading("Chronologie des événements");
      [...t.timeline].sort((a, b) => (a.time || "").localeCompare(b.time || "")).forEach((x) => {
        ensure(8);
        setFont("bold", 8.5, ACCENT, "courier");
        const time = fmtDate(x.time) || "—";
        doc.text(time, M, y);
        if (x.source) { setFont("normal", 8, MUTED); doc.text(x.source, M + doc.getTextWidth(time) + 3, y); }
        y += 4;
        paragraph(x.event || "", { size: 9.5, gap: 2.5 });
      });
    }
    if (t.logs.trim()) { subHeading("Preuves (logs)"); monoBlock(t.logs); }
    if (t.notes.trim()) { subHeading("Notes d'analyste"); paragraph(t.notes); }
  }

  // ---------- Investigation ----------
  if (inv.narrative.trim() || inv.queries.length || inv.fpAnalysis.trim() || inv.rootCause.trim()) {
    sectionTitle("Investigation");
    if (inv.narrative.trim()) paragraph(inv.narrative);
    if (inv.queries.length) {
      subHeading("Requêtes utilisées");
      inv.queries.forEach((q) => {
        const label = (q.tool || "Requête") + (q.desc ? ` — ${q.desc}` : "");
        setFont("bold", 8.5, INK); ensure(6); doc.text(label, M, y); y += 4;
        monoBlock(q.query || "");
      });
    }
    if (inv.fpAnalysis.trim()) { subHeading("Analyse de faux positif"); paragraph(inv.fpAnalysis); }
    if (inv.rootCause.trim()) { subHeading("Cause racine"); paragraph(inv.rootCause); }
  }

  // ---------- Confinement & remédiation ----------
  if (rem.containment.length || rem.recommendations.length || rem.lessons.trim()) {
    sectionTitle("Confinement & remédiation");
    if (rem.containment.length) {
      subHeading("Actions de confinement");
      table(["Action", "Responsable", "Statut"],
        rem.containment.map((c) => [c.action || "—", c.responsible || "—", c.status || "—"]),
        { columnStyles: { 1: { cellWidth: 32 }, 2: { cellWidth: 26 } } });
    }
    if (rem.recommendations.length) {
      subHeading("Recommandations de remédiation");
      table(["Priorité", "Recommandation", "Responsable"],
        rem.recommendations.map((c) => [c.priority || "—", c.recommendation || "—", c.owner || "—"]),
        {
          columnStyles: { 0: { cellWidth: 24 }, 2: { cellWidth: 28 } },
          didParseCell: (d) => { if (d.section === "body" && d.column.index === 0 && d.cell.raw && d.cell.raw !== "—") { d.cell.styles.textColor = prioColor(d.cell.raw); d.cell.styles.fontStyle = "bold"; } },
        });
    }
    if (rem.lessons.trim()) { subHeading("Enseignements tirés"); paragraph(rem.lessons); }
  }

  // ---------- Références ----------
  if (ref.relatedTickets.trim() || ref.external.length) {
    sectionTitle("Références");
    if (ref.relatedTickets.trim()) labeledValue("Tickets liés", splitCsv(ref.relatedTickets).join(", "));
    if (ref.external.length) {
      subHeading("Références externes");
      table(["Type", "Référence", "Description"],
        ref.external.map((x) => [x.type || "—", x.value || "—", x.desc || "—"]),
        { columnStyles: { 1: { font: "courier", fontSize: 7.5 } } });
    }
  }

  // ---------- marquages (classification/TLP) + pieds de page ----------
  const pages = doc.getNumberOfPages();
  const marking = m.classification ? (m.classification.toUpperCase() + (m.tlp ? "   •   " + m.tlp : "")) : "";
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    if (classifLevel) {
      const col = CLASSIF_COLOR[classifLevel];
      doc.setFillColor(...col);
      doc.rect(0, 0, PW, 6, "F"); doc.rect(0, PH - 6, PW, 6, "F");
      setFont("bold", 8, WHITE);
      doc.text(marking, PW / 2 - doc.getTextWidth(marking) / 2, 4.1);
      doc.text(marking, PW / 2 - doc.getTextWidth(marking) / 2, PH - 1.9);
    }
    const footY = classifLevel ? PH - 9 : PH - 7;
    doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(M, footY - 3.5, M + CW, footY - 3.5);
    setFont("normal", 7.5, MUTED);
    doc.text("CONFIDENTIEL — Rapport d'investigation de sécurité", M, footY);
    const right = `${m.ticketId ? m.ticketId + "  •  " : ""}Page ${p} / ${pages}`;
    doc.text(right, M + CW - doc.getTextWidth(right), footY);
  }

  const tid = (m.ticketId || "SOC-Report").replace(/[^\w.-]+/g, "-");
  const dt = m.detectionDate ? new Date(m.detectionDate) : new Date();
  const dstr = isNaN(dt) ? "" : dt.toISOString().slice(0, 10);
  doc.save(`${tid}_${dstr}_Rapport_Investigation.pdf`);
}

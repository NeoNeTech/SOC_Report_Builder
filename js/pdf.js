// ============================================================
// PDF — native, text-based report built with jsPDF (+ AutoTable).
// Produces selectable text and real multi-page pagination.
// No html2canvas / no color-mix parsing => robust.
// ============================================================
import { state } from "./state.js";
import { fmtDate, splitCsv } from "./util.js";
import { toast } from "./ui.js";

// palette (print-friendly)
const INK = [28, 37, 51];
const MUTED = [110, 120, 135];
const LINE = [212, 218, 226];
const NAVY = [15, 22, 35];
const ACCENT = [13, 140, 128];
const WHITE = [255, 255, 255];
const SEV = {
  Critical: [212, 55, 60], High: [206, 124, 44], Medium: [190, 146, 32],
  Low: [70, 128, 200], Informational: MUTED, None: MUTED,
};
const CONF = { High: [212, 55, 60], Medium: [190, 146, 32], Low: [58, 150, 110] };

const M = 16;                 // page margin (mm)
const PW = 210, PH = 297;     // A4
const CW = PW - M * 2;        // content width
const BOTTOM = PH - M;        // bottom limit before footer

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
  if (!window.jspdf) { toast("PDF library still loading…", true); return; }
  if (!hasData()) { toast("Nothing to export yet", true); return; }

  const overlay = document.getElementById("pdfOverlay");
  overlay.classList.add("show");
  await new Promise((r) => setTimeout(r, 40)); // let the overlay paint

  try {
    build();
    toast("PDF exported");
  } catch (err) {
    console.error(err);
    toast("PDF export failed", true);
  } finally {
    overlay.classList.remove("show");
  }
}

function build() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");
  const hasTable = typeof doc.autoTable === "function";
  const { meta: m, summary: su, technical: t, investigation: inv, remediation: rem, references: ref } = state;

  let y = 0;
  let sectionNo = 0;

  // ---------- primitives ----------
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
    ensure(13);
    y += 3;
    setFont("bold", 13, INK);
    const num = String(sectionNo).padStart(2, "0");
    doc.setTextColor(...MUTED); doc.text(num, M, y);
    doc.setTextColor(...INK); doc.text(title, M + 9, y);
    y += 2.5;
    doc.setDrawColor(...LINE); doc.setLineWidth(0.3); doc.line(M, y, M + CW, y);
    y += 5;
  }

  function subHeading(text) {
    ensure(8); y += 1.5;
    setFont("bold", 10.5, INK);
    doc.text(text, M, y);
    y += 4.5;
  }

  function labeledValue(label, value) {
    ensure(8);
    setFont("bold", 7.5, MUTED);
    doc.text(label.toUpperCase(), M, y); y += 4;
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

  // ---------- header banner ----------
  const tools = [...m.tools]; if (m.toolsOther.trim()) tools.push(...splitCsv(m.toolsOther));
  doc.setFillColor(...NAVY); doc.rect(0, 0, PW, 30, "F");
  // shield mark
  doc.setDrawColor(...ACCENT); doc.setFillColor(...ACCENT);
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...WHITE);
  doc.text("SECURITY INVESTIGATION REPORT", M, 14);
  setFont("normal", 9, [170, 180, 195]);
  doc.text(`Ticket ${m.ticketId || "—"}   •   ${fmtDate(m.detectionDate) || "Date —"}`, M, 21);
  y = 38;

  // meta grid (two columns)
  const metaRows = [
    ["Severity", m.severity || "—"], ["Status", m.status || "—"],
    ["Analyst", m.analyst || "—"], ["Team", m.team || "—"],
  ];
  const colX = [M, M + CW / 2];
  for (let i = 0; i < metaRows.length; i += 2) {
    ensure(7);
    for (let c = 0; c < 2; c++) {
      const item = metaRows[i + c];
      if (!item) continue;
      const x = colX[c];
      setFont("bold", 7.5, MUTED); doc.text(item[0].toUpperCase(), x, y);
      if (item[0] === "Severity" && m.severity) {
        chip(x + 22, y - 3.4, m.severity, SEV[m.severity] || MUTED);
      } else {
        setFont("bold", 9.5, INK); doc.text(String(item[1]), x + 22, y);
      }
    }
    y += 6;
  }
  if (tools.length) { y += 1; labeledValue("Source tools", tools.join(", ")); }
  if (m.tags.trim()) { labeledValue("Tags", splitCsv(m.tags).join(", ")); }
  y += 2;

  function chip(x, yTop, text, color) {
    setFont("bold", 7.5, WHITE);
    const w = doc.getTextWidth(text.toUpperCase()) + 5;
    doc.setFillColor(...color); doc.roundedRect(x, yTop, w, 5, 1, 1, "F");
    doc.setTextColor(...WHITE); doc.text(text.toUpperCase(), x + 2.5, yTop + 3.5);
  }

  // ---------- Executive Summary ----------
  if (su.text.trim() || su.assets.length || su.impactLevel || su.impactDesc.trim()) {
    sectionTitle("Executive Summary");
    if (su.text.trim()) paragraph(su.text);
    if (su.assets.length) {
      subHeading("Affected Assets");
      table(["Hostname", "IP Address", "Type", "Owner"],
        su.assets.map((a) => [a.hostname || "—", a.ip || "—", a.type || "—", a.owner || "—"]),
        { columnStyles: { 1: { font: "courier", fontSize: 8 } } });
    }
    if (su.impactLevel || su.impactDesc.trim()) {
      subHeading("Impact");
      if (su.impactLevel) labeledValue("Impact level", su.impactLevel);
      if (su.impactDesc.trim()) paragraph(su.impactDesc);
    }
  }

  // ---------- Technical Analysis ----------
  if (t.vector || t.mitre.length || t.iocs.length || t.timeline.length || t.logs.trim() || t.notes.trim()) {
    sectionTitle("Technical Analysis");
    if (t.vector) labeledValue("Attack vector", t.vector);
    if (t.mitre.length) {
      subHeading("MITRE ATT&CK Techniques");
      table(["Tactic", "Technique ID", "Technique Name"],
        t.mitre.map((x) => [x.tactic || "—", x.id || "—", x.name || "—"]),
        { columnStyles: { 1: { font: "courier", fontSize: 8, fontStyle: "bold" } } });
    }
    if (t.iocs.length) {
      subHeading("Indicators of Compromise");
      table(["Type", "Value", "Description", "Conf."],
        t.iocs.map((x) => [x.type || "—", x.value || "—", x.desc || "—", x.confidence || "—"]),
        {
          columnStyles: { 1: { font: "courier", fontSize: 7.5 }, 3: { halign: "center", cellWidth: 16 } },
          didParseCell: (d) => { if (d.section === "body" && d.column.index === 3) { const c = CONF[d.cell.raw]; if (c) { d.cell.styles.textColor = c; d.cell.styles.fontStyle = "bold"; } } },
        });
    }
    if (t.timeline.length) {
      subHeading("Timeline of Events");
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
    if (t.logs.trim()) { subHeading("Log Evidence"); monoBlock(t.logs); }
    if (t.notes.trim()) { subHeading("Analyst Notes"); paragraph(t.notes); }
  }

  // ---------- Investigation ----------
  if (inv.narrative.trim() || inv.queries.length || inv.fpAnalysis.trim() || inv.rootCause.trim()) {
    sectionTitle("Investigation");
    if (inv.narrative.trim()) paragraph(inv.narrative);
    if (inv.queries.length) {
      subHeading("Queries Used");
      inv.queries.forEach((q) => {
        const label = (q.tool || "Query") + (q.desc ? ` — ${q.desc}` : "");
        setFont("bold", 8.5, INK); ensure(6); doc.text(label, M, y); y += 4;
        monoBlock(q.query || "");
      });
    }
    if (inv.fpAnalysis.trim()) { subHeading("False Positive Analysis"); paragraph(inv.fpAnalysis); }
    if (inv.rootCause.trim()) { subHeading("Root Cause"); paragraph(inv.rootCause); }
  }

  // ---------- Containment & Remediation ----------
  if (rem.containment.length || rem.recommendations.length || rem.lessons.trim()) {
    sectionTitle("Containment & Remediation");
    if (rem.containment.length) {
      subHeading("Containment Actions");
      table(["Action", "Responsible", "Status"],
        rem.containment.map((c) => [c.action || "—", c.responsible || "—", c.status || "—"]),
        { columnStyles: { 1: { cellWidth: 32 }, 2: { cellWidth: 26 } } });
    }
    if (rem.recommendations.length) {
      subHeading("Remediation Recommendations");
      table(["Priority", "Recommendation", "Owner"],
        rem.recommendations.map((c) => [c.priority || "—", c.recommendation || "—", c.owner || "—"]),
        {
          columnStyles: { 0: { cellWidth: 22 }, 2: { cellWidth: 28 } },
          didParseCell: (d) => { if (d.section === "body" && d.column.index === 0) { const c = SEV[d.cell.raw]; if (c) { d.cell.styles.textColor = c; d.cell.styles.fontStyle = "bold"; } } },
        });
    }
    if (rem.lessons.trim()) { subHeading("Lessons Learned"); paragraph(rem.lessons); }
  }

  // ---------- References ----------
  if (ref.relatedTickets.trim() || ref.external.length) {
    sectionTitle("References");
    if (ref.relatedTickets.trim()) labeledValue("Related tickets", splitCsv(ref.relatedTickets).join(", "));
    if (ref.external.length) {
      subHeading("External References");
      table(["Type", "Reference", "Description"],
        ref.external.map((x) => [x.type || "—", x.value || "—", x.desc || "—"]),
        { columnStyles: { 1: { font: "courier", fontSize: 7.5 } } });
    }
  }

  // ---------- footers ----------
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...LINE); doc.setLineWidth(0.2); doc.line(M, PH - 11, M + CW, PH - 11);
    setFont("normal", 7.5, MUTED);
    doc.text("CONFIDENTIAL — Security Investigation Report", M, PH - 7);
    const right = `${m.ticketId ? m.ticketId + "  •  " : ""}Page ${p} / ${pages}`;
    doc.text(right, M + CW - doc.getTextWidth(right), PH - 7);
  }

  // ---------- save ----------
  const tid = (m.ticketId || "SOC-Report").replace(/[^\w.-]+/g, "-");
  const dt = m.detectionDate ? new Date(m.detectionDate) : new Date();
  const dstr = isNaN(dt) ? "" : dt.toISOString().slice(0, 10);
  doc.save(`${tid}_${dstr}_Investigation_Report.pdf`);
}

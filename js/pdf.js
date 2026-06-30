// ============================================================
// PDF — capture the rendered document and paginate into A4
// ============================================================
import { state } from "./state.js";
import { toast } from "./ui.js";

export async function exportPdf() {
  const docEl = document.getElementById("doc");
  if (docEl.querySelector(".doc-empty")) { toast("Nothing to export yet", true); return; }
  if (!window.html2canvas || !window.jspdf) { toast("PDF libraries still loading…", true); return; }

  const overlay = document.getElementById("pdfOverlay");
  overlay.classList.add("show");
  try {
    const bg = getComputedStyle(docEl).backgroundColor;
    const canvas = await window.html2canvas(docEl, { scale: 2, backgroundColor: bg, useCORS: true, logging: false });

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    // Slice the tall image across pages: each page shifts the image up
    // by one usable page height. The image is clipped to the page bounds.
    const usable = pageH - margin * 2;
    let page = 0;
    let heightLeft = imgH;
    while (heightLeft > 0) {
      if (page > 0) pdf.addPage();
      const pos = margin - page * usable;
      pdf.addImage(imgData, "JPEG", margin, pos, imgW, imgH);
      heightLeft -= usable;
      page++;
    }

    const tid = (state.meta.ticketId || "SOC-Report").replace(/[^\w.-]+/g, "-");
    const dt = state.meta.detectionDate ? new Date(state.meta.detectionDate) : new Date();
    const dstr = isNaN(dt) ? "" : dt.toISOString().slice(0, 10);
    pdf.save(`${tid}_${dstr}_Investigation_Report.pdf`);
    toast("PDF exported");
  } catch (err) {
    console.error(err);
    toast("PDF export failed", true);
  } finally {
    overlay.classList.remove("show");
  }
}

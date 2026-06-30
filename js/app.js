// ============================================================
// APP — bootstrap: wire toolbar, subscribe renders to the bus
// ============================================================
import { resetState } from "./state.js";
import { on, CHANGE } from "./bus.js";
import { initForm, renderForm } from "./form.js";
import { renderDoc, updateProgress } from "./preview.js";
import { buildMarkdown } from "./markdown.js";
import { exportPdf } from "./pdf.js";
import { saveDraft, loadDraftFile } from "./draft.js";
import { initThehive } from "./thehive.js";
import { toast, confirmModal } from "./ui.js";
import { icons } from "./util.js";

const $ = (id) => document.getElementById(id);

// Single render entry point — preview + progress always stay in sync.
function render() {
  renderDoc();
  updateProgress();
}
on(CHANGE, render);

// Re-render the whole form (after New / Load / Import) and the preview.
function fullRender() {
  renderForm();
  render();
}

function wireToolbar() {
  $("btnNew").onclick = () =>
    confirmModal("Start a new report?", "This will clear all fields. Save a draft first if needed.", () => {
      resetState();
      fullRender();
      toast("New report started");
    });

  $("btnSave").onclick = saveDraft;

  $("btnLoad").onclick = () => $("fileInput").click();
  $("fileInput").onchange = (e) => {
    loadDraftFile(e.target.files[0], fullRender);
    e.target.value = "";
  };

  $("btnMd").onclick = async () => {
    const md = buildMarkdown();
    try {
      await navigator.clipboard.writeText(md);
      toast("Markdown copied to clipboard");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = md; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast("Markdown copied"); }
      catch { toast("Copy failed", true); }
      ta.remove();
    }
  };

  $("btnPdf").onclick = exportPdf;
  $("btnPdf2").onclick = exportPdf;

  const themeBtn = $("btnTheme");
  themeBtn.onclick = () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    themeBtn.innerHTML = next === "dark" ? '<i data-lucide="moon"></i>' : '<i data-lucide="sun"></i>';
    icons();
  };

  const mobileBtn = $("btnMobileToggle");
  mobileBtn.onclick = () => {
    document.body.classList.toggle("show-preview");
    const showing = document.body.classList.contains("show-preview");
    mobileBtn.innerHTML = showing ? '<i data-lucide="pencil"></i> Edit Form' : '<i data-lucide="eye"></i> See Preview';
    icons();
  };
}

function boot() {
  initForm();
  initThehive(fullRender);
  wireToolbar();
  render();
  icons();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

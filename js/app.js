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
import { TEMPLATES, applyTemplate } from "./templates.js";
import { toast, confirmModal } from "./ui.js";
import { icons, esc } from "./util.js";

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
    confirmModal("Démarrer un nouveau rapport ?", "Tous les champs seront effacés. Enregistrez un brouillon au besoin.", () => {
      resetState();
      fullRender();
      toast("Nouveau rapport démarré");
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
      toast("Markdown copié dans le presse-papiers");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = md; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast("Markdown copié"); }
      catch { toast("Échec de la copie", true); }
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
    mobileBtn.innerHTML = showing ? '<i data-lucide="pencil"></i> Éditer' : '<i data-lucide="eye"></i> Voir l\'aperçu';
    icons();
  };
}

function wireTemplates() {
  const menu = $("templatesMenu");
  const btn = $("btnTemplates");
  menu.innerHTML =
    `<div class="menu-label">Partir d'un playbook</div>` +
    TEMPLATES.map((t) =>
      `<button class="menu-item" data-tpl="${t.id}"><i data-lucide="${t.icon}"></i><span><span class="mi-title">${esc(t.name)}</span><span class="mi-desc">${esc(t.desc)}</span></span></button>`
    ).join("");
  icons();

  btn.onclick = (e) => { e.stopPropagation(); menu.classList.toggle("show"); };
  menu.onclick = (e) => {
    const item = e.target.closest("[data-tpl]");
    if (!item) return;
    const tpl = TEMPLATES.find((x) => x.id === item.getAttribute("data-tpl"));
    if (tpl) { applyTemplate(tpl); fullRender(); toast(`Modèle « ${tpl.name} » appliqué`); }
    menu.classList.remove("show");
  };
  document.addEventListener("click", () => menu.classList.remove("show"));
}

function boot() {
  initForm();
  initThehive(fullRender);
  wireToolbar();
  wireTemplates();
  render();
  icons();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

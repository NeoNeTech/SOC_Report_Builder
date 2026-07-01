// ============================================================
// APP — bootstrap: wire toolbar, subscribe renders to the bus
// ============================================================
import { state, resetState, hydrate, hasContent } from "./state.js";
import { on, CHANGE, emitChange } from "./bus.js";
import { initForm, renderForm, openSection } from "./form.js";
import { renderDoc, updateProgress } from "./preview.js";
import { buildMarkdown } from "./markdown.js";
import { exportPdf } from "./pdf.js";
import { saveDraft, loadDraftFile } from "./draft.js";
import { initThehive } from "./thehive.js";
import { initSettings } from "./settings.js";
import { TEMPLATES, applyTemplate } from "./templates.js";
import { SECTION_META } from "./schema.js";
import { runLint } from "./lint.js";
import { exportIocCsv, exportStix, exportNavigatorLayer } from "./exporters.js";
import {
  saveAutosave, loadAutosave, clearAutosave, isStorageAvailable,
  snapshotToHistory, listHistory, getFromHistory, deleteFromHistory, clearHistory,
} from "./storage.js";
import { toast, confirmModal, openOverlay, closeOverlay } from "./ui.js";
import { icons, esc, fmtDate } from "./util.js";

const $ = (id) => document.getElementById(id);
const storageOn = isStorageAvailable();

// Single render entry point — preview + progress always stay in sync.
function render() {
  renderDoc();
  updateProgress();
  renderQualityBadge();
}
on(CHANGE, render);

// --- autosave (debounced) ---
let autosaveTimer;
function scheduleAutosave() {
  if (!storageOn) return;
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    if (saveAutosave(state)) {
      const now = new Date();
      $("autosaveStatus").textContent = `Enregistré ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    }
  }, 800);
}
on(CHANGE, scheduleAutosave);

// Re-render the whole form (after New / Load / Import) and the preview.
// Emitting CHANGE also triggers the autosave subscriber.
function fullRender() {
  renderForm();
  emitChange();
}

function wireToolbar() {
  $("btnNew").onclick = () =>
    confirmModal("Démarrer un nouveau rapport ?", "Le rapport courant sera archivé dans l'historique, puis les champs seront effacés.", () => {
      if (storageOn && hasContent()) snapshotToHistory(state);
      clearAutosave();
      resetState();
      fullRender();
      $("autosaveStatus").textContent = "";
      toast("Nouveau rapport démarré");
    });

  $("btnSave").onclick = () => {
    saveDraft();
    if (storageOn && hasContent()) snapshotToHistory(state);
  };

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

function wireExports() {
  const menu = $("exportMenu");
  const btn = $("btnExport");
  btn.onclick = (e) => { e.stopPropagation(); menu.classList.toggle("show"); };
  menu.onclick = (e) => {
    const item = e.target.closest("[data-export]");
    if (!item) return;
    const kind = item.getAttribute("data-export");
    let ok = false, okMsg = "", koMsg = "";
    if (kind === "ioc-csv") { ok = exportIocCsv(); okMsg = "IOC exportés (CSV)"; koMsg = "Aucun IOC à exporter"; }
    else if (kind === "ioc-stix") { ok = exportStix(); okMsg = "IOC exportés (STIX 2.1)"; koMsg = "Aucun IOC exportable à exporter"; }
    else if (kind === "navigator") { ok = exportNavigatorLayer(); okMsg = "Couche ATT&CK exportée"; koMsg = "Aucune technique MITRE à exporter"; }
    toast(ok ? okMsg : koMsg, !ok);
    menu.classList.remove("show");
  };
  document.addEventListener("click", () => menu.classList.remove("show"));
}

// --- contrôle qualité ---
const sectionTitle = (id) => (SECTION_META.find((s) => s.id === id) || {}).title || id;

function renderQualityBadge() {
  const issues = runLint(state);
  const errs = issues.filter((i) => i.level === "error").length;
  const warns = issues.filter((i) => i.level === "warn").length;
  const badge = $("qaBadge");
  const n = errs + warns;
  badge.textContent = n ? String(n) : "✓";
  badge.className = "qa-badge " + (errs ? "qa-badge-error" : warns ? "qa-badge-warn" : "qa-badge-ok");
}

function openQuality() {
  const issues = runLint(state);
  const body = $("qualityBody");
  if (!issues.length) {
    body.innerHTML = `<div class="qa-ok-msg"><i data-lucide="check-circle"></i> Aucune anomalie détectée — le rapport est complet et cohérent.</div>`;
  } else {
    const order = { error: 0, warn: 1, info: 2 };
    body.innerHTML = [...issues].sort((a, b) => order[a.level] - order[b.level]).map((i) =>
      `<button class="qa-item qa-${i.level}" data-sec="${i.section}"><span class="qa-dot"></span><span class="qa-msg">${esc(i.msg)}</span><span class="qa-sec">${esc(sectionTitle(i.section))}</span></button>`
    ).join("");
  }
  openOverlay("qualityOverlay");
  icons();
}

function wireQuality() {
  $("btnQuality").onclick = openQuality;
  $("qualityClose").onclick = () => closeOverlay("qualityOverlay");
  $("qualityBody").addEventListener("click", (e) => {
    const item = e.target.closest("[data-sec]");
    if (!item) return;
    closeOverlay("qualityOverlay");
    openSection(item.getAttribute("data-sec"));
  });
}

// --- historique ---
function renderHistoryList() {
  const list = listHistory();
  const el = $("historyList");
  if (!list.length) {
    el.innerHTML = `<div class="history-empty">Aucun instantané enregistré pour l'instant.</div>`;
    return;
  }
  el.innerHTML = list.map((h) =>
    `<div class="history-item">
      <div class="history-info">
        <span class="history-ticket">${esc(h.ticketId)}</span>
        <span class="history-meta">${esc(h.severity || "—")} · ${esc(fmtDate(new Date(h.savedAt).toISOString()))}</span>
      </div>
      <div class="history-actions">
        <button class="btn btn-ghost btn-icon" data-restore="${h.id}" title="Restaurer"><i data-lucide="rotate-ccw"></i></button>
        <button class="btn btn-ghost btn-icon" data-del="${h.id}" title="Supprimer"><i data-lucide="trash-2"></i></button>
      </div>
    </div>`
  ).join("");
  icons();
}

function wireHistory() {
  const open = () => { renderHistoryList(); openOverlay("historyOverlay"); };
  $("btnHistory").onclick = open;
  $("historyClose").onclick = () => closeOverlay("historyOverlay");
  $("historyDone").onclick = () => closeOverlay("historyOverlay");
  $("historyClear").onclick = () =>
    confirmModal("Vider l'historique ?", "Tous les instantanés locaux seront supprimés.", () => {
      clearHistory(); renderHistoryList(); toast("Historique vidé");
    });
  $("historyList").addEventListener("click", (e) => {
    const r = e.target.closest("[data-restore]");
    const d = e.target.closest("[data-del]");
    if (r) {
      const entry = getFromHistory(r.getAttribute("data-restore"));
      if (!entry) return;
      confirmModal("Restaurer cet instantané ?", "Le rapport courant sera remplacé (il est aussi auto-enregistré).", () => {
        if (storageOn && hasContent()) snapshotToHistory(state);
        hydrate(entry.state);
        fullRender();
        closeOverlay("historyOverlay");
        toast("Instantané restauré");
      });
    } else if (d) {
      deleteFromHistory(d.getAttribute("data-del"));
      renderHistoryList();
    }
  });
}

function boot() {
  // Récupération de la copie de travail auto-enregistrée
  if (storageOn) {
    const auto = loadAutosave();
    if (auto && auto.state && hasContent(auto.state)) {
      hydrate(auto.state);
      toast("Brouillon récupéré");
    }
  } else {
    $("autosaveStatus").textContent = "Sauvegarde auto indisponible";
  }

  initForm();
  initThehive(() => { fullRender(); });
  initSettings();
  wireToolbar();
  wireTemplates();
  wireExports();
  wireQuality();
  wireHistory();
  render();
  icons();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

// ============================================================
// FORM — renders the left panel and wires all input events.
// Emits CHANGE on the bus whenever state mutates.
// ============================================================
import { OPT, lookupMitre } from "./config.js";
import { SECTION_META, LIST_DEFS } from "./schema.js";
import { state, newId, setPath, getList, findRowWithPath } from "./state.js";
import { esc, optionList, field, icons } from "./util.js";
import { emitChange } from "./bus.js";
import { extractIocs } from "./ioc.js";
import { toast, openOverlay, closeOverlay } from "./ui.js";

const openSections = new Set(["metadata"]);
let panel;

// ---------- section body builders ----------
const builders = {
  metadata() {
    const m = state.meta;
    const checks = OPT.tools.map((t) => {
      const on = m.tools.includes(t);
      return `<label class="check ${on ? "checked" : ""}" data-tool="${esc(t)}">
        <span class="dot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M20 6L9 17l-5-5"/></svg></span>
        <input type="checkbox" ${on ? "checked" : ""}/> ${esc(t)}
      </label>`;
    }).join("");
    return `
      <div class="field-row cols-2">
        ${field("Identifiant du ticket", `<input data-bind="meta.ticketId" value="${esc(m.ticketId)}" placeholder="INC-2024-0512" />`, true)}
        ${field("Sévérité", `<select data-bind="meta.severity">${optionList(OPT.severity, m.severity)}</select>`, true)}
      </div>
      <div class="field-row cols-2">
        ${field("Classification", `<select data-bind="meta.classification">${optionList(OPT.classification, m.classification)}</select>`, true)}
        ${field("TLP", `<select data-bind="meta.tlp">${optionList(OPT.tlp, m.tlp)}</select>`, true)}
      </div>
      <div class="field-row cols-2">
        ${field("Statut", `<select data-bind="meta.status">${optionList(OPT.status, m.status)}</select>`, true)}
        ${field("Date de détection", `<input type="datetime-local" data-bind="meta.detectionDate" value="${esc(m.detectionDate)}" />`, true)}
      </div>
      <div class="field-row cols-2">
        ${field("Analyste", `<input data-bind="meta.analyst" value="${esc(m.analyst)}" placeholder="Jean Dupont" />`, true)}
        ${field("Équipe", `<input data-bind="meta.team" value="${esc(m.team)}" placeholder="SOC Niveau 2" />`)}
      </div>
      ${field("Étiquettes (séparées par des virgules)", `<input data-bind="meta.tags" value="${esc(m.tags)}" placeholder="hameçonnage, vol-identifiants, o365" />`)}
      ${field("Outils source", `<div class="checks">${checks}</div>`)}
      ${field("Autre outil", `<input data-bind="meta.toolsOther" value="${esc(m.toolsOther)}" placeholder="ex. Sentinel, Cortex XDR" />`)}
    `;
  },
  summary() {
    const s = state.summary;
    return `
      ${field("Synthèse", `<textarea data-bind="summary.text" rows="5" placeholder="Description en langage clair de l'incident : ce qui s'est passé, qui est concerné, état actuel...">${esc(s.text)}</textarea>`, true)}
      ${field("Actifs impactés", dynList("summary.assets"))}
      <div class="field-row cols-2">
        ${field("Niveau d'impact", `<select data-bind="summary.impactLevel">${optionList(OPT.impact, s.impactLevel)}</select>`)}
      </div>
      ${field("Description de l'impact", `<textarea data-bind="summary.impactDesc" placeholder="Décrire l'impact opérationnel, financier ou sur la confidentialité des données...">${esc(s.impactDesc)}</textarea>`)}
    `;
  },
  technical() {
    const t = state.technical;
    return `
      ${field("Vecteur d'attaque", `<select data-bind="technical.vector">${optionList(OPT.attackVector, t.vector)}</select>`)}
      ${field("Techniques MITRE ATT&CK", dynList("technical.mitre"))}
      <div class="field">
        <label class="field-label">Indicateurs de compromission (IOC)
          <button type="button" class="field-action" data-ioc-extract><i data-lucide="scan-search"></i> Extraire depuis un texte</button>
        </label>
        ${dynList("technical.iocs")}
      </div>
      ${field("Chronologie des événements", dynList("technical.timeline"))}
      ${field("Preuves (logs)", `<textarea class="mono" data-bind="technical.logs" rows="6" placeholder="Coller ici des extraits de logs bruts...">${esc(t.logs)}</textarea>`)}
      ${field("Captures / notes d'analyste", `<textarea data-bind="technical.notes" placeholder="Notes sur les preuves, captures référencées, observations...">${esc(t.notes)}</textarea>`)}
    `;
  },
  investigation() {
    const i = state.investigation;
    return `
      ${field("Déroulé de l'investigation", `<textarea data-bind="investigation.narrative" rows="6" placeholder="Description étape par étape de ce qui a été investigué et comment...">${esc(i.narrative)}</textarea>`)}
      ${field("Requêtes utilisées", dynList("investigation.queries"))}
      ${field("Analyse de faux positif", `<textarea data-bind="investigation.fpAnalysis" placeholder="Le cas échéant, expliquer pourquoi il pourrait s'agir d'un faux positif...">${esc(i.fpAnalysis)}</textarea>`)}
      ${field("Cause racine", `<textarea data-bind="investigation.rootCause" placeholder="Cause racine identifiée de l'incident...">${esc(i.rootCause)}</textarea>`)}
    `;
  },
  remediation() {
    const r = state.remediation;
    return `
      ${field("Actions de confinement", dynList("remediation.containment"))}
      ${field("Recommandations de remédiation", dynList("remediation.recommendations"))}
      ${field("Enseignements tirés", `<textarea data-bind="remediation.lessons" placeholder="Ce qui peut être amélioré en détection, réponse ou prévention...">${esc(r.lessons)}</textarea>`)}
    `;
  },
  references() {
    const r = state.references;
    return `
      ${field("Tickets liés (séparés par des virgules)", `<input data-bind="references.relatedTickets" value="${esc(r.relatedTickets)}" placeholder="INC-2024-0510, INC-2024-0498" />`)}
      ${field("Références externes", dynList("references.external"))}
    `;
  },
};

// ---------- dynamic list helpers ----------
function dynList(path) {
  const def = LIST_DEFS[path];
  const rows = getList(path).map((row) => dynRow(path, row)).join("");
  return `<div class="dyn-list" data-list="${path}">
    ${rows}
    <button type="button" class="btn-add" data-add="${path}"><i data-lucide="plus"></i> ${esc(def.addLabel)}</button>
  </div>`;
}

function dynRow(path, row) {
  const def = LIST_DEFS[path];
  const fields = def.cols.map((c) => {
    const val = row[c.key] ?? "";
    if (c.type === "select") return `<select data-row="${row._id}" data-key="${c.key}">${optionList(c.options, val)}</select>`;
    if (c.type === "textarea") return `<textarea data-row="${row._id}" data-key="${c.key}" rows="2" class="${c.mono ? "mono" : ""}" placeholder="${esc(c.ph || "")}">${esc(val)}</textarea>`;
    return `<input type="${c.type}" data-row="${row._id}" data-key="${c.key}" value="${esc(val)}" placeholder="${esc(c.ph || "")}" />`;
  }).join("");
  return `<div class="dyn-row" data-rowid="${row._id}">
    <span class="drag-handle"><i data-lucide="grip-vertical"></i></span>
    <div class="row-fields" style="grid-template-columns:${def.grid};">${fields}</div>
    <button type="button" class="row-del" data-del="${path}" data-delid="${row._id}"><i data-lucide="trash-2"></i></button>
  </div>`;
}

function rerenderList(path) {
  const listEl = panel.querySelector(`[data-list="${path}"]`);
  if (!listEl) return;
  const addBtn = listEl.querySelector(".btn-add");
  listEl.querySelectorAll(".dyn-row").forEach((n) => n.remove());
  const frag = document.createElement("div");
  frag.innerHTML = getList(path).map((r) => dynRow(path, r)).join("");
  [...frag.children].forEach((n) => listEl.insertBefore(n, addBtn));
  icons();
}

// ---------- full form render ----------
export function renderForm() {
  panel.innerHTML = SECTION_META.map((sec) => {
    const open = openSections.has(sec.id);
    return `<div class="section ${open ? "open" : ""}" data-accent="${sec.accent}" data-section="${sec.id}">
      <div class="section-header" data-toggle="${sec.id}">
        <span class="section-icon"><i data-lucide="${sec.icon}"></i></span>
        <div class="section-title"><h2>${esc(sec.title)}</h2><p>${esc(sec.desc)}</p></div>
        <span class="section-chev"><i data-lucide="chevron-down"></i></span>
      </div>
      <div class="section-body"><div class="section-body-inner"><div class="section-content">${builders[sec.id]()}</div></div></div>
    </div>`;
  }).join("");
  icons();
}

// ---------- event wiring (delegated) ----------
function onClick(e) {
  const toggle = e.target.closest("[data-toggle]");
  if (toggle) {
    const id = toggle.getAttribute("data-toggle");
    openSections.has(id) ? openSections.delete(id) : openSections.add(id);
    toggle.closest(".section").classList.toggle("open");
    return;
  }
  const chk = e.target.closest(".check[data-tool]");
  if (chk) {
    e.preventDefault();
    const tool = chk.getAttribute("data-tool");
    const arr = state.meta.tools;
    const idx = arr.indexOf(tool);
    idx >= 0 ? arr.splice(idx, 1) : arr.push(tool);
    chk.classList.toggle("checked");
    emitChange();
    return;
  }
  const add = e.target.closest("[data-add]");
  if (add) {
    const path = add.getAttribute("data-add");
    const row = { _id: newId() };
    LIST_DEFS[path].cols.forEach((c) => (row[c.key] = ""));
    getList(path).push(row);
    rerenderList(path);
    emitChange();
    return;
  }
  const del = e.target.closest("[data-del]");
  if (del) {
    const path = del.getAttribute("data-del");
    const rid = del.getAttribute("data-delid");
    const rowEl = del.closest(".dyn-row");
    rowEl.classList.add("removing");
    const list = getList(path);
    const i = list.findIndex((r) => r._id === rid);
    setTimeout(() => {
      if (i >= 0) list.splice(i, 1);
      rerenderList(path);
      emitChange();
    }, 200);
    return;
  }
  if (e.target.closest("[data-ioc-extract]")) {
    document.getElementById("iocInput").value = "";
    refreshIocPreview();
    openOverlay("iocOverlay");
  }
}

function onInput(e) {
  const el = e.target;
  const bind = el.getAttribute("data-bind");
  if (bind) { setPath(bind, el.value); emitChange(); return; }
  const rid = el.getAttribute("data-row");
  if (!rid) return;
  const found = findRowWithPath(rid);
  if (!found) return;
  const { row, path } = found;
  const key = el.getAttribute("data-key");
  row[key] = el.value;

  // Time-savers: auto-fill from a known MITRE id, auto-detect IOC type.
  if (path === "technical.mitre" && key === "id") {
    const hit = lookupMitre(el.value);
    if (hit) {
      row.name = hit.name; row.tactic = hit.tactic;
      const rowEl = el.closest(".dyn-row");
      const nameEl = rowEl.querySelector('[data-key="name"]');
      const tacEl = rowEl.querySelector('[data-key="tactic"]');
      if (nameEl) nameEl.value = hit.name;
      if (tacEl) tacEl.value = hit.tactic;
    }
  } else if (path === "technical.iocs" && key === "value") {
    const typeEl = el.closest(".dyn-row").querySelector('[data-key="type"]');
    if (typeEl && !typeEl.value) {
      const det = extractIocs(el.value)[0];
      if (det) { row.type = det.type; typeEl.value = det.type; }
    }
  }
  emitChange();
}

// ---------- IOC extraction modal ----------
let iocDetected = [];
function refreshIocPreview() {
  const input = document.getElementById("iocInput");
  const result = document.getElementById("iocResult");
  iocDetected = extractIocs(input.value);
  document.getElementById("iocCount").textContent = iocDetected.length;
  if (!iocDetected.length) {
    result.innerHTML = `<span class="extract-empty">${input.value.trim() ? "Aucun indicateur détecté." : "Les indicateurs détectés apparaîtront ici."}</span>`;
    return;
  }
  result.innerHTML = iocDetected
    .map((d) => `<div class="er-row"><span class="er-type">${esc(d.type)}</span><span class="er-val">${esc(d.value)}</span></div>`)
    .join("");
  icons();
}

function initIocModal() {
  document.getElementById("iocInput").addEventListener("input", refreshIocPreview);
  document.getElementById("iocClear").onclick = () => { document.getElementById("iocInput").value = ""; refreshIocPreview(); };
  document.getElementById("iocClose").onclick = () => closeOverlay("iocOverlay");
  document.getElementById("iocAdd").onclick = () => {
    if (iocDetected.length) {
      const list = getList("technical.iocs");
      iocDetected.forEach((d) => list.push({ _id: newId(), type: d.type, value: d.value, desc: "", confidence: "" }));
      openSections.add("technical");
      renderForm();
      emitChange();
      toast(`${iocDetected.length} IOC ajouté${iocDetected.length > 1 ? "s" : ""}`);
    }
    closeOverlay("iocOverlay");
  };
}

export function initForm() {
  panel = document.getElementById("formPanel");
  panel.addEventListener("click", onClick);
  panel.addEventListener("input", onInput);
  initIocModal();
  renderForm();
}

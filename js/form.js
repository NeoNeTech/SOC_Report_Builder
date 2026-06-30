// ============================================================
// FORM — renders the left panel and wires all input events.
// Emits CHANGE on the bus whenever state mutates.
// ============================================================
import { OPT } from "./config.js";
import { SECTION_META, LIST_DEFS } from "./schema.js";
import { state, newId, setPath, getList, findRow } from "./state.js";
import { esc, optionList, field, icons } from "./util.js";
import { emitChange } from "./bus.js";

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
        ${field("Ticket ID", `<input data-bind="meta.ticketId" value="${esc(m.ticketId)}" placeholder="INC-2024-0512" />`, true)}
        ${field("Severity", `<select data-bind="meta.severity">${optionList(OPT.severity, m.severity)}</select>`, true)}
      </div>
      <div class="field-row cols-2">
        ${field("Status", `<select data-bind="meta.status">${optionList(OPT.status, m.status)}</select>`, true)}
        ${field("Detection Date", `<input type="datetime-local" data-bind="meta.detectionDate" value="${esc(m.detectionDate)}" />`, true)}
      </div>
      <div class="field-row cols-2">
        ${field("Analyst Name", `<input data-bind="meta.analyst" value="${esc(m.analyst)}" placeholder="John Doe" />`, true)}
        ${field("Team", `<input data-bind="meta.team" value="${esc(m.team)}" placeholder="SOC Tier 2" />`)}
      </div>
      ${field("Tags (comma-separated)", `<input data-bind="meta.tags" value="${esc(m.tags)}" placeholder="phishing, credential-theft, o365" />`)}
      ${field("Source Tools", `<div class="checks">${checks}</div>`)}
      ${field("Other tool", `<input data-bind="meta.toolsOther" value="${esc(m.toolsOther)}" placeholder="e.g. Sentinel, Cortex XDR" />`)}
    `;
  },
  summary() {
    const s = state.summary;
    return `
      ${field("Summary", `<textarea data-bind="summary.text" rows="5" placeholder="Plain-language description of the incident: what happened, who was affected, and current status...">${esc(s.text)}</textarea>`, true)}
      ${field("Affected Assets", dynList("summary.assets"))}
      <div class="field-row cols-2">
        ${field("Impact Level", `<select data-bind="summary.impactLevel">${optionList(OPT.impact, s.impactLevel)}</select>`)}
      </div>
      ${field("Impact Description", `<textarea data-bind="summary.impactDesc" placeholder="Describe operational, financial or data-confidentiality impact...">${esc(s.impactDesc)}</textarea>`)}
    `;
  },
  technical() {
    const t = state.technical;
    return `
      ${field("Attack Vector", `<select data-bind="technical.vector">${optionList(OPT.attackVector, t.vector)}</select>`)}
      ${field("MITRE ATT&CK Techniques", dynList("technical.mitre"))}
      ${field("Indicators of Compromise (IOC)", dynList("technical.iocs"))}
      ${field("Timeline of Events", dynList("technical.timeline"))}
      ${field("Log Evidence", `<textarea class="mono" data-bind="technical.logs" rows="6" placeholder="Paste raw log snippets here...">${esc(t.logs)}</textarea>`)}
      ${field("Screenshots / Analyst Notes", `<textarea data-bind="technical.notes" placeholder="Notes about evidence, screenshots referenced, observations...">${esc(t.notes)}</textarea>`)}
    `;
  },
  investigation() {
    const i = state.investigation;
    return `
      ${field("Investigation Narrative", `<textarea data-bind="investigation.narrative" rows="6" placeholder="Step-by-step description of what was investigated and how...">${esc(i.narrative)}</textarea>`)}
      ${field("Queries Used", dynList("investigation.queries"))}
      ${field("False Positive Analysis", `<textarea data-bind="investigation.fpAnalysis" placeholder="If applicable, explain why this could be a false positive...">${esc(i.fpAnalysis)}</textarea>`)}
      ${field("Root Cause", `<textarea data-bind="investigation.rootCause" placeholder="Identified root cause of the incident...">${esc(i.rootCause)}</textarea>`)}
    `;
  },
  remediation() {
    const r = state.remediation;
    return `
      ${field("Containment Actions", dynList("remediation.containment"))}
      ${field("Remediation Recommendations", dynList("remediation.recommendations"))}
      ${field("Lessons Learned", `<textarea data-bind="remediation.lessons" placeholder="What can be improved in detection, response or prevention...">${esc(r.lessons)}</textarea>`)}
    `;
  },
  references() {
    const r = state.references;
    return `
      ${field("Related Tickets (comma-separated)", `<input data-bind="references.relatedTickets" value="${esc(r.relatedTickets)}" placeholder="INC-2024-0510, INC-2024-0498" />`)}
      ${field("External References", dynList("references.external"))}
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
  }
}

function onInput(e) {
  const el = e.target;
  const bind = el.getAttribute("data-bind");
  if (bind) { setPath(bind, el.value); emitChange(); return; }
  const rid = el.getAttribute("data-row");
  if (rid) {
    const row = findRow(rid);
    if (row) { row[el.getAttribute("data-key")] = el.value; emitChange(); }
  }
}

export function initForm() {
  panel = document.getElementById("formPanel");
  panel.addEventListener("click", onClick);
  panel.addEventListener("input", onInput);
  renderForm();
}

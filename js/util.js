// ============================================================
// UTIL — shared helpers (escaping, formatting, html builders)
// ============================================================

export const esc = (s) =>
  String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// slug used for CSS modifier classes: "Hash SHA256" -> "hashsha256"
export const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");

export function fmtDate(s) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d)) return esc(s);
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function fmtDateShort(s) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d)) return esc(s);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

// epoch millis (TheHive) or ISO -> datetime-local string "YYYY-MM-DDTHH:mm"
export function toDatetimeLocal(v) {
  if (v == null || v === "") return "";
  const d = new Date(typeof v === "number" ? v : v);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// <option> list with empty default and current selection
export const optionList = (arr, sel) =>
  `<option value="">—</option>` + arr.map((o) => `<option ${o === sel ? "selected" : ""}>${esc(o)}</option>`).join("");

// labelled field wrapper
export function field(label, control, required) {
  return `<div class="field"><label class="field-label">${esc(label)}${required ? '<span class="req">*</span>' : ""}</label>${control}</div>`;
}

// true if any of the provided values has content (arrays count by length)
export const hasAny = (...vals) =>
  vals.some((v) => (Array.isArray(v) ? v.length : String(v || "").trim() !== ""));

// comma-separated string -> trimmed non-empty array
export const splitCsv = (s) => String(s || "").split(",").map((x) => x.trim()).filter(Boolean);

// refresh lucide icons if the library is present
export function icons() {
  if (window.lucide) window.lucide.createIcons();
}

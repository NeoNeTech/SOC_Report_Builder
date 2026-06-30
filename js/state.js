// ============================================================
// STATE — in-memory model + dotted-path access
// `state` is an exported live binding: reassigning it via
// replaceState() propagates to every importing module.
// ============================================================
import { LIST_PATHS } from "./schema.js";

export function blankState() {
  return {
    meta: { ticketId: "", severity: "", status: "", detectionDate: "", analyst: "", team: "", tags: "", tools: [], toolsOther: "" },
    summary: { text: "", assets: [], impactLevel: "", impactDesc: "" },
    technical: { vector: "", mitre: [], iocs: [], timeline: [], logs: "", notes: "" },
    investigation: { narrative: "", queries: [], fpAnalysis: "", rootCause: "" },
    remediation: { containment: [], recommendations: [], lessons: "" },
    references: { relatedTickets: "", external: [] },
  };
}

export let state = blankState();

let _uid = 0;
export const newId = () => "r" + ++_uid;

export function resetState() {
  state = blankState();
  _uid = 0;
}

// Replace whole state (used by Load Draft / TheHive import after merge)
export function replaceState(next) {
  state = next;
}

// --- dotted-path access (operates on the current `state`) ---
function ref(path) {
  const parts = path.split(".");
  let o = state;
  for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]];
  return [o, parts[parts.length - 1]];
}
export function setPath(path, val) { const [o, k] = ref(path); o[k] = val; }
export function getList(path) { const [o, k] = ref(path); return o[k]; }

// Ensure every dynamic-list row owns a stable _id (after import/load).
export function ensureRowIds() {
  for (const p of LIST_PATHS) getList(p).forEach((r) => { if (!r._id) r._id = newId(); });
}

// Find a row by its _id across all dynamic lists.
export function findRow(rowId) {
  for (const p of LIST_PATHS) {
    const row = getList(p).find((r) => r._id === rowId);
    if (row) return row;
  }
  return null;
}

// Merge a loaded object into a clean state shape (defensive against bad JSON).
export function mergeIntoBlank(loaded) {
  const s = blankState();
  if (!loaded || typeof loaded !== "object") return s;
  for (const k in s) {
    if (loaded[k] && typeof loaded[k] === "object") {
      for (const kk in s[k]) if (kk in loaded[k]) s[k][kk] = loaded[k][kk];
    }
  }
  return s;
}

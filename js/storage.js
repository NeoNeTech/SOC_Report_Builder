// ============================================================
// STORAGE — autosave + historique (localStorage)
// L'autosave conserve la copie de travail (récupérée au rechargement).
// L'historique garde des instantanés explicites (Enregistrer / Nouveau).
// ============================================================
const K_AUTO = "socrb.autosave.v1";
const K_HIST = "socrb.history.v1";
const HIST_MAX = 15;

export function isStorageAvailable() {
  try {
    const k = "__socrb_test__";
    localStorage.setItem(k, "1"); localStorage.removeItem(k);
    return true;
  } catch { return false; }
}

function safeSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

// ---- autosave (copie de travail) ----
export function saveAutosave(state) {
  return safeSet(K_AUTO, JSON.stringify({ savedAt: Date.now(), state }));
}
export function loadAutosave() {
  try { const raw = localStorage.getItem(K_AUTO); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function clearAutosave() { try { localStorage.removeItem(K_AUTO); } catch { /* noop */ } }

// ---- historique (instantanés) ----
export function listHistory() {
  try { const raw = localStorage.getItem(K_HIST); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
// Écrit l'historique ; en cas de dépassement de quota, évince les plus anciens.
function writeHistory(list) {
  let arr = list.slice(0, HIST_MAX);
  while (arr.length) {
    if (safeSet(K_HIST, JSON.stringify(arr))) return true;
    arr = arr.slice(0, arr.length - 1); // liste triée du plus récent au plus ancien
  }
  try { localStorage.removeItem(K_HIST); } catch { /* noop */ }
  return false;
}
export function snapshotToHistory(state) {
  const entry = {
    id: "h" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    savedAt: Date.now(),
    ticketId: state.meta.ticketId || "(sans ticket)",
    severity: state.meta.severity || "",
    // deep clone via JSON pour figer l'instantané
    state: JSON.parse(JSON.stringify(state)),
  };
  const list = listHistory();
  list.unshift(entry);
  writeHistory(list);
  return entry;
}
export function getFromHistory(id) { return listHistory().find((e) => e.id === id) || null; }
export function deleteFromHistory(id) { writeHistory(listHistory().filter((e) => e.id !== id)); }
export function clearHistory() { try { localStorage.removeItem(K_HIST); } catch { /* noop */ } }

// ============================================================
// DRAFT — save state to JSON file / load JSON back in
// ============================================================
import { state, replaceState, mergeIntoBlank, ensureRowIds } from "./state.js";
import { toast } from "./ui.js";

export function saveDraft() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(state.meta.ticketId || "soc-report").replace(/[^\w.-]+/g, "-")}_draft.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast("Brouillon enregistré en JSON");
}

// onLoaded() is called after a successful import so the app can re-render.
export function loadDraftFile(file, onLoaded) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      replaceState(mergeIntoBlank(parsed));
      ensureRowIds();
      onLoaded();
      toast("Brouillon chargé");
    } catch (err) {
      console.error(err);
      toast("Fichier JSON invalide", true);
    }
  };
  reader.readAsText(file);
}

// ============================================================
// SETTINGS — report branding (logo + organisation name).
// Logo is stored as a data URL in state.branding and therefore
// travels with saved/loaded JSON drafts.
// ============================================================
import { state } from "./state.js";
import { emitChange } from "./bus.js";
import { toast, openOverlay, closeOverlay } from "./ui.js";
import { esc, icons } from "./util.js";

const MAX_BYTES = 2 * 1024 * 1024; // 2 Mo

export function initSettings() {
  const $ = (id) => document.getElementById(id);

  function renderLogoPreview() {
    const box = $("setLogoPreview");
    if (state.branding.logo) {
      box.innerHTML = `<img src="${esc(state.branding.logo)}" alt="logo" />`;
      $("setLogoRemove").hidden = false;
    } else {
      box.innerHTML = `<span class="set-logo-empty">Aucun logo</span>`;
      $("setLogoRemove").hidden = true;
    }
  }

  function syncUI() {
    $("setOrg").value = state.branding.orgName || "";
    $("setDefang").checked = !!state.prefs.defang;
    renderLogoPreview();
  }

  $("btnSettings").onclick = () => { syncUI(); openOverlay("settingsOverlay"); };
  $("settingsClose").onclick = () => closeOverlay("settingsOverlay");
  $("settingsDone").onclick = () => closeOverlay("settingsOverlay");

  $("setOrg").oninput = (e) => { state.branding.orgName = e.target.value; emitChange(); };
  $("setDefang").onchange = (e) => { state.prefs.defang = e.target.checked; emitChange(); };

  $("setLogoInput").onchange = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast("Choisissez un fichier image", true); return; }
    if (file.size > MAX_BYTES) { toast("Logo trop volumineux (max 2 Mo)", true); return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const img = new Image();
      img.onload = () => {
        state.branding.logo = dataUrl;
        state.branding.logoRatio = img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
        renderLogoPreview();
        emitChange();
        toast("Logo ajouté");
      };
      img.onerror = () => toast("Image invalide", true);
      img.src = dataUrl;
    };
    reader.onerror = () => toast("Lecture du fichier impossible", true);
    reader.readAsDataURL(file);
  };

  $("setLogoRemove").onclick = () => {
    state.branding.logo = "";
    state.branding.logoRatio = 0;
    renderLogoPreview();
    emitChange();
    toast("Logo retiré");
  };

  icons();
}

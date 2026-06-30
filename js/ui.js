// ============================================================
// UI — toast notifications + confirm modal
// ============================================================
let toastTimer;

export function toast(msg, isError = false) {
  const el = document.getElementById("toast");
  document.getElementById("toastMsg").textContent = msg;
  el.classList.toggle("error", isError);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

export function confirmModal(title, msg, onOk) {
  const ov = document.getElementById("confirmOverlay");
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmMsg").textContent = msg;
  ov.classList.add("show");
  const ok = document.getElementById("confirmOk");
  const cancel = document.getElementById("confirmCancel");
  const close = () => { ov.classList.remove("show"); ok.onclick = null; cancel.onclick = null; };
  ok.onclick = () => { close(); onOk(); };
  cancel.onclick = close;
}

// Generic overlay open/close by element id
export const openOverlay = (id) => document.getElementById(id).classList.add("show");
export const closeOverlay = (id) => document.getElementById(id).classList.remove("show");

// ============================================================
// BUS — tiny pub/sub so modules stay decoupled
// ============================================================
const target = new EventTarget();

export const emit = (name, detail) => target.dispatchEvent(new CustomEvent(name, { detail }));
export const on = (name, fn) => target.addEventListener(name, (e) => fn(e.detail));

// Convenience: fired whenever form state changes and the UI must refresh.
export const CHANGE = "state:change";
export const emitChange = () => emit(CHANGE);

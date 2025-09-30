// Simple shared store for admin socket data and subscriptions
// Events mirrored from server: grupAlumnesList, alumnesActivity, normesWeb,
// historialWebAlumne, eachBrowserLastUsage, historialHostsSortedByUsage,
// alumnesMachine, updateAlumnesMachine

const state = {
  grupAlumnesList: null,
  alumnesActivity: null,
  normesWeb: null,
  historialWebAlumne: {},
  eachBrowserLastUsage: {},
  historialHostsSortedByUsage: {},
  alumnesMachine: null,
};

const listeners = new Map(); // event -> Set<fn>
function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => off(event, fn);
}
function off(event, fn) {
  const set = listeners.get(event);
  if (set) set.delete(fn);
}
function emit(event, payload) {
  const set = listeners.get(event);
  if (!set) return;
  for (const fn of Array.from(set)) {
    try {
      fn(payload);
    } catch (e) {
      console.warn(`[STORE] Listener error for ${event}:`, e);
    }
  }
}

let adminSocket = null;
let detachFns = [];

function attachAdminSocket(sock) {
  if (!sock) return;
  if (adminSocket === sock) return;
  // Detach previous
  for (const d of detachFns) {
    try {
      d();
    } catch (_) {}
  }
  detachFns = [];
  adminSocket = sock;

  const onEvt = (ev, handler) => {
    sock.on(ev, handler);
    detachFns.push(() => sock.off(ev, handler));
  };

  onEvt("grupAlumnesList", (data) => {
    state.grupAlumnesList = data || {};
    emit("grupAlumnesList", state.grupAlumnesList);
  });

  onEvt("alumnesActivity", (data) => {
    state.alumnesActivity = data || {};
    emit("alumnesActivity", state.alumnesActivity);
  });

  onEvt("normesWeb", (data) => {
    state.normesWeb = data || [];
    emit("normesWeb", state.normesWeb);
  });

  onEvt("historialWebAlumne", (data) => {
    if (data && data.alumne) state.historialWebAlumne[data.alumne] = data;
    emit("historialWebAlumne", data);
  });

  onEvt("eachBrowserLastUsage", (data) => {
    if (data && data.alumne) state.eachBrowserLastUsage[data.alumne] = data;
    emit("eachBrowserLastUsage", data);
  });

  onEvt("historialHostsSortedByUsage", (data) => {
    if (data && data.alumne)
      state.historialHostsSortedByUsage[data.alumne] = data;
    emit("historialHostsSortedByUsage", data);
  });

  onEvt("alumnesMachine", (data) => {
    state.alumnesMachine = data || {};
    emit("alumnesMachine", state.alumnesMachine);
  });

  onEvt("updateAlumnesMachine", (data) => {
    emit("updateAlumnesMachine", data);
  });
}

function getState() {
  return state;
}

function getSocket() {
  return adminSocket || window.socket || null;
}

function requestInitialData(origin = "store") {
  const s = getSocket();
  if (!s) return false;
  try {
    s.emit("getInitialData");
    return true;
  } catch (e) {
    console.warn("[STORE] Error emetent getInitialData", e);
    return false;
  }
}

export {
  on,
  off,
  emit,
  attachAdminSocket,
  getState,
  getSocket,
  requestInitialData,
};

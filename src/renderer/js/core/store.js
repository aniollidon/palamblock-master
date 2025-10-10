/**
 * Store - Gestor d'estat global centralitzat per PalamMaster
 * Proporciona un sistema reactiu d'esdeveniments per sincronitzar dades
 * provinents del servidor via WebSocket
 */

// Estat global de l'aplicació
const state = {
  grupAlumnesList: null,
  alumnesActivity: null,
  normesWeb: null,
  historialWebAlumne: {},
  eachBrowserLastUsage: {},
  historialHostsSortedByUsage: {},
  alumnesMachine: null,
};

// Mapa de listeners: event -> Set<callback>
const listeners = new Map();

// Socket administrador connectat
let adminSocket = null;

// Funcions de cleanup per desconnectar listeners del socket
let detachFns = [];

/**
 * Subscriu una funció callback a un esdeveniment
 * @param {string} event - Nom de l'esdeveniment
 * @param {function} fn - Funció callback
 * @returns {function} - Funció per cancel·lar la subscripció
 */
export function on(event, fn) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event).add(fn);
  
  // Retorna funció d'unsubscribe
  return () => off(event, fn);
}

/**
 * Cancel·la la subscripció d'una funció callback
 * @param {string} event - Nom de l'esdeveniment
 * @param {function} fn - Funció callback a eliminar
 */
export function off(event, fn) {
  const set = listeners.get(event);
  if (set) {
    set.delete(fn);
  }
}

/**
 * Emet un esdeveniment a tots els listeners subscrits
 * @param {string} event - Nom de l'esdeveniment
 * @param {any} payload - Dades a enviar
 */
export function emit(event, payload) {
  const set = listeners.get(event);
  if (!set || set.size === 0) return;

  for (const fn of Array.from(set)) {
    try {
      fn(payload);
    } catch (error) {
      console.warn(`[STORE] Error executant listener per '${event}':`, error);
    }
  }
}

/**
 * Adjunta un socket d'administració i configura els listeners
 * @param {Socket} sock - Instància del socket.io
 */
export function attachAdminSocket(sock) {
  if (!sock) {
    console.warn('[STORE] Socket nul passat a attachAdminSocket');
    return;
  }
  
  if (adminSocket === sock) {
    console.log('[STORE] Socket ja adjuntat');
    return;
  }

  // Desconnectar listeners anteriors
  detachAdminSocket();

  adminSocket = sock;
  console.log('[STORE] Adjuntant nou socket admin');

  // Helper per registrar esdeveniments
  const onEvt = (event, handler) => {
    sock.on(event, handler);
    detachFns.push(() => sock.off(event, handler));
  };

  // Registrar esdeveniments del servidor
  onEvt('grupAlumnesList', (data) => {
    state.grupAlumnesList = data || {};
    emit('grupAlumnesList', state.grupAlumnesList);
  });

  onEvt('alumnesActivity', (data) => {
    state.alumnesActivity = data || {};
    emit('alumnesActivity', state.alumnesActivity);
  });

  onEvt('normesWeb', (data) => {
    state.normesWeb = data || [];
    emit('normesWeb', state.normesWeb);
  });

  onEvt('historialWebAlumne', (data) => {
    if (data?.alumne) {
      state.historialWebAlumne[data.alumne] = data;
    }
    emit('historialWebAlumne', data);
  });

  onEvt('eachBrowserLastUsage', (data) => {
    if (data?.alumne) {
      state.eachBrowserLastUsage[data.alumne] = data;
    }
    emit('eachBrowserLastUsage', data);
  });

  onEvt('historialHostsSortedByUsage', (data) => {
    if (data?.alumne) {
      state.historialHostsSortedByUsage[data.alumne] = data;
    }
    emit('historialHostsSortedByUsage', data);
  });

  onEvt('alumnesMachine', (data) => {
    state.alumnesMachine = data || {};
    emit('alumnesMachine', state.alumnesMachine);
  });

  onEvt('updateAlumnesMachine', (data) => {
    emit('updateAlumnesMachine', data);
  });

  console.log('[STORE] Socket admin adjuntat amb èxit');
}

/**
 * Desconnecta el socket actual i neteja listeners
 */
export function detachAdminSocket() {
  if (detachFns.length === 0) return;

  console.log('[STORE] Desconnectant socket admin');

  for (const detachFn of detachFns) {
    try {
      detachFn();
    } catch (error) {
      console.warn('[STORE] Error desconnectant listener:', error);
    }
  }

  detachFns = [];
  adminSocket = null;
}

/**
 * Retorna l'estat complet del store
 * @returns {object} - Estat global
 */
export function getState() {
  return { ...state };
}

/**
 * Retorna el socket administrador actual
 * @returns {Socket|null}
 */
export function getSocket() {
  return adminSocket || window.socket || null;
}

/**
 * Sol·licita les dades inicials al servidor
 * @param {string} origin - Origen de la petició (per debug)
 * @returns {boolean} - True si s'ha pogut emetre la petició
 */
export function requestInitialData(origin = 'store') {
  const socket = getSocket();
  
  if (!socket) {
    console.warn('[STORE] No hi ha socket disponible per requestInitialData');
    return false;
  }

  try {
    console.log(`[STORE] Sol·licitant dades inicials (origen: ${origin})`);
    socket.emit('getInitialData');
    return true;
  } catch (error) {
    console.error('[STORE] Error emetent getInitialData:', error);
    return false;
  }
}

/**
 * Neteja tot l'estat del store
 */
export function clearState() {
  state.grupAlumnesList = null;
  state.alumnesActivity = null;
  state.normesWeb = null;
  state.historialWebAlumne = {};
  state.eachBrowserLastUsage = {};
  state.historialHostsSortedByUsage = {};
  state.alumnesMachine = null;

  console.log('[STORE] Estat netejat');
}

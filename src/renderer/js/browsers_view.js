import {
  drawHistorialWeb,
  drawHistorialStats,
  drawHistorialHostsSortedByUsage,
} from "./sidebar.js";
import { drawAlumnesActivity, preparaAlumnesGrups } from "./browsers.js";
import { setnormesWebInfo } from "./dialogs.js";
import { warnNormesWeb } from "./warnings.js";
import { socket as exportedSocket, initializeSocket } from "./socket.js";

// --- Debug util ---
function debugLog(...args) {
  console.log("%c[BROWSERS_VIEW]", "color:#8a2be2;font-weight:bold", ...args);
}

function errorSendLog(e) {
  console.error("[BROWSERS_VIEW] Error intern:", e);
  fetch(`${window.authManager?.serverUrl}/api/v1/error/front`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: e.stack }),
  }).catch(() => {});
}

let socketRef = exportedSocket;
let grupsLoaded = false;
let initialDataRequested = false;
let lastRefreshTs = 0;

function requestInitialData(origin) {
  if (!socketRef) return;
  if (initialDataRequested) {
    debugLog("Skip getInitialData duplicat", { origin });
    return;
  }
  initialDataRequested = true;
  debugLog("EMIT getInitialData", {
    origin,
    id: socketRef.id,
    connected: socketRef.connected,
  });
  try {
    socketRef.emit("getInitialData");
  } catch (e) {
    console.warn("[BROWSERS_VIEW] Error emetent getInitialData", e);
    try {
      socketRef.emit("getGrupAlumnesList");
    } catch (_) {}
  }
}

window.__palamBrowsersViewStatus = {
  loadedAt: new Date().toISOString(),
  get socketId() {
    return socketRef?.id;
  },
  get connected() {
    return !!socketRef?.connected;
  },
  get grupsLoaded() {
    return grupsLoaded;
  },
  get initialDataRequested() {
    return initialDataRequested;
  },
};
window.forceBrowsersInitialData = () => requestInitialData("manual");
debugLog("MÒDUL CARREGAT", {
  hasSocket: !!socketRef,
  id: socketRef?.id,
  connected: socketRef?.connected,
});

function registerSocketHandlers() {
  if (!socketRef) return;
  if (registerSocketHandlers._done) return;
  registerSocketHandlers._done = true;

  socketRef.on("alumnesActivity", (data) => {
    debugLog("EVENT alumnesActivity", data ? Object.keys(data).length : 0);
    try {
      drawAlumnesActivity(data);
    } catch (e) {
      errorSendLog(e);
    }
  });

  socketRef.on("grupAlumnesList", (data) => {
    grupsLoaded = true;
    if (data) {
      const grups = Object.keys(data);
      debugLog("EVENT grupAlumnesList", {
        grups: grups.length,
        sample: grups.slice(0, 5),
      });
    } else debugLog("EVENT grupAlumnesList buit");
    try {
      preparaAlumnesGrups(data);
    } catch (e) {
      errorSendLog(e);
    }
  });

  socketRef.on("normesWeb", (data) => {
    debugLog(
      "EVENT normesWeb",
      Array.isArray(data) ? data.length : typeof data
    );
    try {
      setnormesWebInfo(data);
      warnNormesWeb(data);
    } catch (e) {
      errorSendLog(e);
    }
  });

  socketRef.on("historialWebAlumne", (data) => {
    debugLog("EVENT historialWebAlumne", data?.alumne, data?.historial?.length);
    try {
      drawHistorialWeb(data.alumne, data.historial, data.query);
    } catch (e) {
      errorSendLog(e);
    }
  });

  socketRef.on("eachBrowserLastUsage", (data) => {
    debugLog(
      "EVENT eachBrowserLastUsage",
      data?.alumne,
      data?.lastUsage && Object.keys(data.lastUsage).length
    );
    try {
      drawHistorialStats(data.alumne, data.lastUsage);
    } catch (e) {
      errorSendLog(e);
    }
  });

  socketRef.on("historialHostsSortedByUsage", (data) => {
    debugLog(
      "EVENT historialHostsSortedByUsage",
      data?.alumne,
      data?.sortedHistorial?.length,
      data?.days
    );
    try {
      drawHistorialHostsSortedByUsage(
        data.alumne,
        data.sortedHistorial,
        data.days
      );
    } catch (e) {
      errorSendLog(e);
    }
  });

  socketRef.on("connect", () => {
    debugLog("EVENT connect", { id: socketRef.id });
  });
  socketRef.on("connect_error", (err) => {
    debugLog("EVENT connect_error", err.message);
    if (window.authManager) window.authManager.showLogin();
  });
}

// Inicialització segons estat actual del socket
if (socketRef) {
  debugLog("Socket present al carregar", {
    id: socketRef.id,
    connected: socketRef.connected,
  });
  registerSocketHandlers();
  if (socketRef.connected)
    setTimeout(() => requestInitialData("present-connected"), 20);
  else socketRef.once("connect", () => requestInitialData("present-wait"));
} else {
  window.addEventListener("socket:ready", (ev) => {
    socketRef = ev.detail.socket;
    debugLog("Event socket:ready", {
      id: socketRef?.id,
      connected: socketRef?.connected,
    });
    registerSocketHandlers();
    if (socketRef?.connected) requestInitialData("socket-ready");
    else
      socketRef.once("connect", () => requestInitialData("socket-ready-wait"));
  });
  setTimeout(async () => {
    if (!socketRef) {
      try {
        socketRef = await initializeSocket();
        if (socketRef) {
          debugLog("Lazy init socket", {
            id: socketRef.id,
            connected: socketRef.connected,
          });
          registerSocketHandlers();
          if (socketRef.connected) requestInitialData("lazy-init");
          else
            socketRef.once("connect", () =>
              requestInitialData("lazy-init-wait")
            );
        }
      } catch (e) {
        debugLog("Lazy init error", e.message);
      }
    }
  }, 120);
}

// Polling d'enganxat tardà (per si exportedSocket s'assigna després)
if (!socketRef) {
  let attempts = 0;
  const maxAttempts = 60; // ~9s a 150ms
  const interval = setInterval(() => {
    attempts++;
    // Intenta forçar creació a partir de les credencials si tot existeix però no hi ha socket
    if (
      !exportedSocket &&
      window.authManager?.isAuthenticated &&
      window.updateSocketCredentials &&
      attempts === 5
    ) {
      debugLog("Intent forçar creació socket (attempt 5)");
      try {
        window.updateSocketCredentials(
          window.authManager.serverUrl,
          window.authManager.currentCredentials
        );
      } catch (e) {
        debugLog("Error forçant creació socket", e.message);
      }
    }

    if (exportedSocket && exportedSocket !== socketRef) {
      socketRef = exportedSocket;
      debugLog("Attach tardà", {
        id: socketRef?.id,
        connected: socketRef?.connected,
        attempts,
      });
      registerSocketHandlers();
      if (socketRef?.connected) requestInitialData("late-poll");
      else
        socketRef.once("connect", () => requestInitialData("late-poll-wait"));
      clearInterval(interval);
      return;
    }

    if (attempts % 10 === 0) {
      debugLog("Polling", {
        attempts,
        hasExported: !!exportedSocket,
        sameRef: exportedSocket === socketRef,
      });
    }

    if (attempts >= maxAttempts) {
      debugLog("Fi polling sense socket", {
        attempts,
        isAuth: !!window.authManager?.isAuthenticated,
      });
      // Últim recurs: si estem autenticats i podem, tornem a intentar crear
      if (
        !exportedSocket &&
        window.authManager?.isAuthenticated &&
        window.updateSocketCredentials
      ) {
        debugLog("Últim recurs: reintento creació socket final");
        try {
          window.updateSocketCredentials(
            window.authManager.serverUrl,
            window.authManager.currentCredentials
          );
        } catch {}
      }
      clearInterval(interval);
    }
  }, 150);
}

// Permet refrescar dades cada vegada que es torna a la vista (ignorant el flag)
export function refreshBrowsersData(reason = "view-reenter") {
  const now = Date.now();
  // Evita spam si es canvia molt ràpid (menys de 1200ms)
  if (now - lastRefreshTs < 1200) {
    debugLog("Refresh ignorat (massa ràpid)", { delta: now - lastRefreshTs });
    return;
  }
  lastRefreshTs = now;
  initialDataRequested = false; // reset guard
  grupsLoaded = false;
  debugLog("Refresh browsers data", { reason });
  if (socketRef) {
    if (socketRef.connected) requestInitialData("refresh");
    else socketRef.once("connect", () => requestInitialData("refresh-wait"));
  } else {
    debugLog("Refresh sense socket encara");
  }
}

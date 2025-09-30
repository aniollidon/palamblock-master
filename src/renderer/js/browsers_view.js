import {
  drawHistorialWeb,
  drawHistorialStats,
  drawHistorialHostsSortedByUsage,
} from "./sidebar.js";
import { drawAlumnesActivity, preparaAlumnesGrups } from "./browsers.js";
import { setnormesWebInfo } from "./dialogs.js";
import { warnNormesWeb } from "./warnings.js";
import { initializeSocket } from "./socket.js";
import { on as storeOn, off as storeOff, requestInitialData } from "./store.js";

// --- Debug util ---
function debugLog(...args) {
  console.log("%c[BROWSERS_VIEW]", "color:#8a2be2;font-weight:bold", ...args);
}

function errorSendLog(e) {
  console.error("[BROWSERS_VIEW] Error intern:", e);
  /*fetch(`${window.authManager?.serverUrl}/api/v1/error/front`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ error: e.stack }),
  }).catch(() => {});*/ // Desactivat per evitar spam
}

let unsubscribers = [];
let grupsLoaded = false;
let lastRefreshTs = 0;

function subscribe() {
  unsubscribers.push(
    storeOn("alumnesActivity", (data) => {
      debugLog("EVENT alumnesActivity", data ? Object.keys(data).length : 0);
      try {
        drawAlumnesActivity(data);
      } catch (e) {
        errorSendLog(e);
      }
    })
  );
  unsubscribers.push(
    storeOn("grupAlumnesList", (data) => {
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
    })
  );
  unsubscribers.push(
    storeOn("normesWeb", (data) => {
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
    })
  );
  unsubscribers.push(
    storeOn("historialWebAlumne", (data) => {
      debugLog(
        "EVENT historialWebAlumne",
        data?.alumne,
        data?.historial?.length
      );
      try {
        drawHistorialWeb(data.alumne, data.historial, data.query);
      } catch (e) {
        errorSendLog(e);
      }
    })
  );
  unsubscribers.push(
    storeOn("eachBrowserLastUsage", (data) => {
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
    })
  );
  unsubscribers.push(
    storeOn("historialHostsSortedByUsage", (data) => {
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
    })
  );
}

function unsubscribe() {
  for (const off of unsubscribers) {
    try {
      off();
    } catch (_) {}
  }
  unsubscribers = [];
}

window.__palamBrowsersViewStatus = {
  loadedAt: new Date().toISOString(),
  get grupsLoaded() {
    return grupsLoaded;
  },
};
window.forceBrowsersInitialData = () => requestInitialData("manual");
debugLog("MÒDUL CARREGAT", {
  hasSocket: !!window.socket,
});
// Lifecycle API
export async function mountBrowsersView() {
  await initializeSocket();
  subscribe();
  // Demana dades inicials un cop per muntatge
  requestInitialData("browsers-mount");
}

export function unmountBrowsersView() {
  unsubscribe();
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
  grupsLoaded = false;
  debugLog("Refresh browsers data", { reason });
  requestInitialData("refresh");
}

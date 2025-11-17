/**
 * Browsers View - Vista de gestió de navegadors dels alumnes
 * Mostra l'activitat dels alumnes, historial web, estadístiques
 */

import {
  drawHistorialWeb,
  drawHistorialStats,
  drawHistorialHostsSortedByUsage,
} from "./historial-view.js";
import { drawAlumnesActivity, preparaAlumnesGrups } from "./browsers-logic.js";
import { setnormesWebInfo } from "./normes-logic.js";
import { warnNormesWeb } from "./warnings-view.js";
import {
  on as storeOn,
  off as storeOff,
  requestInitialData,
} from "../../core/store.js";
import { getSocket } from "../../core/container-helpers.js";
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

// Estat local de la vista
let unsubscribers = [];
let grupsLoaded = false;
let lastRefreshTs = 0;

/**
 * Subscriu als esdeveniments del store
 */
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
      } else {
        debugLog("EVENT grupAlumnesList buit");
      }
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
        data?.historial?.length,
        data?.query
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
        data?.lastUsage?.length
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

/**
 * Desubscriu de tots els esdeveniments
 */
function unsubscribe() {
  for (const off of unsubscribers) {
    try {
      off();
    } catch (_) {}
  }
  unsubscribers = [];
}

/**
 * Inicialitza la vista de navegadors
 * @returns {object} - Objecte amb funció destroy
 */
export async function init() {
  debugLog("INICIALITZANT VISTA");

  // El socket ja està inicialitzat pel ServiceContainer
  // No cal fer res, només assegurar que existeix
  const socket = getSocket();
  if (!socket) {
    console.warn("[BROWSERS-VIEW] Socket no disponible");
    return;
  }

  // Subscriure als esdeveniments del store
  subscribe();

  // Sol·licitar dades inicials
  requestInitialData("browsers-mount");

  // Comprovació de seguretat: si després de 2 segons no tenim dades, tornar a sol·licitar
  setTimeout(() => {
    if (!grupsLoaded) {
      console.warn("[BROWSERS-VIEW] No s'han rebut grups després de 2s, reintentant...");
      requestInitialData("browsers-mount-retry");
    }
  }, 2000);

  // Event listener al selector de grups per demanar dades si no estan disponibles
  const grupSelector = document.getElementById("grupSelector");
  if (grupSelector) {
    const handleGrupSelectorFocus = () => {
      if (!grupsLoaded) {
        debugLog("Selector de grups clicat però dades no disponibles, sol·licitant...");
        requestInitialData("grupSelector-focus");
      }
    };
    grupSelector.addEventListener("focus", handleGrupSelectorFocus);
    grupSelector.addEventListener("click", handleGrupSelectorFocus);
  }

  // Exposar status global (per debugging)
  window.__palamBrowsersViewStatus = {
    loadedAt: new Date().toISOString(),
    get grupsLoaded() {
      return grupsLoaded;
    },
  };

  // Exposar funció per forçar refresh (debugging)
  window.forceBrowsersInitialData = () => requestInitialData("manual");

  // Retornar objecte amb destroy
  return { destroy };
}

/**
 * Destrueix la vista i neteja recursos
 */
export function destroy() {
  debugLog("DESTRUINT VISTA");

  // Desubscriure de tots els esdeveniments
  unsubscribe();

  // Netejar variables globals
  delete window.__palamBrowsersViewStatus;
  delete window.forceBrowsersInitialData;

  // Reset estat local
  grupsLoaded = false;
  lastRefreshTs = 0;
}

/**
 * Permet refrescar dades cada vegada que es torna a la vista
 * @param {string} reason - Raó del refresh
 */
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

// Compatibilitat amb API antiga (per si algun fitxer encara l'usa)
export { init as mountBrowsersView };
export { destroy as unmountBrowsersView };

/**
 * Screens View - Vista de gestió de pantalles dels alumnes
 * Mostra grid de pantalles, permet control remot, casting
 */

import {
  drawGridGrup_update,
  preparaSelectorGrups,
  setAlumnesMachine,
  setGrupAlumnesList,
} from "./screens-logic.js";
import {
  on as storeOn,
  off as storeOff,
  requestInitialData,
} from "../../core/store.js";
import { initCastSidebarListeners } from "./cast-view.js";
import { getSocket } from "../../core/container-helpers.js";

// --- Debug util ---
function debugLog(...args) {
  console.log("%c[SCREENS_VIEW]", "color:#9932cc;font-weight:bold", ...args);
}

// Estat local de la vista
let grups_disponibles = false;
let maquines_disponibles = false;
let unsubscribers = [];
let boundElements = new Map(); // Canviat a Map per guardar element -> handler

/**
 * Assegura que el socket està inicialitzat
 */
async function ensureSocket() {
  return getSocket();
}

/**
 * Enllaça esdeveniments DOM i store
 */
function bind() {
  // Power off all button
  const powerBtn = document.getElementById("globalGroupPowerOffButton");
  if (powerBtn && !boundElements.has(powerBtn)) {
    const handlePowerOff = async () => {
      const currentGrup = document.getElementById("grupSelector")?.value;
      const s = await ensureSocket();
      if (s && currentGrup) {
        debugLog("Power off all per grup:", currentGrup);
        s.emit("powerOffAll", { grup: currentGrup });
      }
    };
    powerBtn.addEventListener("click", handlePowerOff);
    boundElements.set(powerBtn, { event: "click", handler: handlePowerOff });
  }

  // Selector de grups - demanar dades si no estan disponibles
  const grupSelector = document.getElementById("grupSelector");
  if (grupSelector && !boundElements.has(grupSelector)) {
    const handleGrupSelectorFocus = () => {
      if (!grups_disponibles || !maquines_disponibles) {
        debugLog("Selector clicat però dades no disponibles, sol·licitant...");
        requestInitialData("grupSelector-focus");
      }
    };
    grupSelector.addEventListener("focus", handleGrupSelectorFocus);
    grupSelector.addEventListener("click", handleGrupSelectorFocus);
    boundElements.set(grupSelector, { event: "focus", handler: handleGrupSelectorFocus });
  }

  // Store listeners
  unsubscribers.push(
    storeOn("grupAlumnesList", (data) => {
      debugLog("EVENT grupAlumnesList");
      grups_disponibles = true;
      setGrupAlumnesList(data);
      if (grups_disponibles && maquines_disponibles) {
        preparaSelectorGrups();
      }
    })
  );

  unsubscribers.push(
    storeOn("alumnesMachine", (data) => {
      debugLog("EVENT alumnesMachine");
      maquines_disponibles = true;
      setAlumnesMachine(data);
      if (grups_disponibles && maquines_disponibles) {
        preparaSelectorGrups();
      }
    })
  );

  unsubscribers.push(
    storeOn("updateAlumnesMachine", (data) => {
      debugLog("EVENT updateAlumnesMachine");
      drawGridGrup_update(data);
    })
  );
}

/**
 * Enllaça el dropdown de navegació a navegadors
 * NOTA: Ja no cal aquest codi - el ViewManager gestiona automàticament
 * els clicks amb data-view-navigate
 */
function bindNavigation() {
  // Aquest codi ja no és necessari - mantenim la funció per compatibilitat
  // El ViewManager captura automàticament els clicks amb [data-view-navigate]
}

/**
 * Inicialitza la vista de pantalles
 * @returns {object} - Objecte amb funció destroy
 */
export async function init() {
  debugLog("INICIALITZANT VISTA");

  // Assegurar que el socket està inicialitzat
  await ensureSocket();

  // Enllaçar esdeveniments
  bind();

  // Sol·licitar dades inicials
  requestInitialData("screens-mount");

  // Comprovació de seguretat: si després de 2 segons no tenim dades, tornar a sol·licitar
  setTimeout(() => {
    if (!grups_disponibles || !maquines_disponibles) {
      console.warn(
        "[SCREENS-VIEW] No s'han rebut totes les dades després de 2s, reintentant...",
        { grups_disponibles, maquines_disponibles }
      );
      requestInitialData("screens-mount-retry");
    }
  }, 2000);

  // Inicialitzar listeners de cast sidebar (després d'un tick)
  setTimeout(() => {
    try {
      initCastSidebarListeners();
    } catch (error) {
      console.warn("[SCREENS_VIEW] Error inicialitzant cast sidebar:", error);
    }
  }, 0);

  // Enllaçar navegació (després d'un tick)
  setTimeout(() => {
    bindNavigation();
  }, 0);

  // Retornar objecte amb destroy
  return { destroy };
}

/**
 * Destrueix la vista i neteja recursos
 */
export function destroy() {
  debugLog("DESTRUINT VISTA");

  // Desubscriure de tots els esdeveniments del store
  for (const off of unsubscribers) {
    try {
      off();
    } catch (_) {}
  }
  unsubscribers = [];

  // Netejar event listeners d'elements enllaçats
  for (const [element, { event, handler }] of boundElements.entries()) {
    try {
      element.removeEventListener(event, handler);
    } catch (_) {}
  }
  boundElements.clear();

  // Reset estat local
  grups_disponibles = false;
  maquines_disponibles = false;
}

// Compatibilitat amb API antiga
export { init as initScreensWiring };
export { destroy as unmountScreensView };

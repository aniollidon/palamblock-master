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
  getState,
} from "../../core/store.js";
import { initCastSidebarListeners } from "./cast-view.js";
import { getSocket } from "../../core/container-helpers.js";
import { closeScreenshotsHistory } from "./screenshots-history.js";

// --- Debug util ---
function debugLog(...args) {
  console.log("%c[SCREENS_VIEW]", "color:#9932cc;font-weight:bold", ...args);
}

// Estat local de la vista
let grups_disponibles = false;
let maquines_disponibles = false;
let unsubscribers = [];
let boundElements = new Map(); // Canviat a Map per guardar element -> handler
let professorNetworkCheckInterval = null;

/**
 * Assegura que el socket està inicialitzat
 */
async function ensureSocket() {
  return getSocket();
}

/**
 * Comprova si l'ordinador del professor està a la xarxa esperada
 * i mostra/amaga l'avís corresponent.
 * @param {string} expectedNetwork - La xarxa esperada segons el servidor
 */
async function checkProfessorNetwork(expectedNetwork) {
  if (!window.electronAPI || !window.electronAPI.getCurrentSSID) return;

  try {
    const currentSSID = await window.electronAPI.getCurrentSSID();
    const container = document.querySelector(".informacions");
    const warningDiv = document.getElementById("network-warning-professor");
    if (!container || !warningDiv) return;

    if (currentSSID && currentSSID !== "unknown" && currentSSID !== expectedNetwork) {
      // Mostrar avís
      container.classList.remove("d-none");
      warningDiv.innerHTML = `<div class="alert alert-warning alert-dismissible fade show" role="alert">
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" style="vertical-align: 0px;" fill="#000000" viewBox="0 0 16 16">
          <path d="M10.706 3.294A12.6 12.6 0 0 0 8 3C5.259 3 2.723 3.882.663 5.379a.485.485 0 0 0-.048.736.52.52 0 0 0 .668.05A11.45 11.45 0 0 1 8 4q.946 0 1.852.148zM8 6c-1.905 0-3.68.56-5.166 1.526a.48.48 0 0 0-.063.745.525.525 0 0 0 .652.065 8.45 8.45 0 0 1 3.51-1.27zm2.596 1.404.785-.785q.947.362 1.785.907a.482.482 0 0 1 .063.745.525.525 0 0 1-.652.065 8.5 8.5 0 0 0-1.98-.932zM8 10l.933-.933a6.5 6.5 0 0 1 2.013.637c.285.145.326.524.1.75l-.015.015a.53.53 0 0 1-.611.09A5.5 5.5 0 0 0 8 10m4.905-4.905.747-.747q.886.451 1.685 1.03a.485.485 0 0 1 .047.737.52.52 0 0 1-.668.05 11.5 11.5 0 0 0-1.811-1.07M9.02 11.78c.238.14.236.464.04.66l-.707.706a.5.5 0 0 1-.707 0l-.707-.707c-.195-.195-.197-.518.04-.66A2 2 0 0 1 8 11.5c.374 0 .723.102 1.021.28zm4.355-9.905a.53.53 0 0 1 .75.75l-10.75 10.75a.53.53 0 0 1-.75-.75z"/>
        </svg>
        <strong>Avís: </strong>
        <span>El teu ordinador està connectat a la xarxa <em>${currentSSID}</em>. La xarxa esperada és <em>${expectedNetwork}</em>. És probable que fora d'aquesta xarxa no puguis veure les pantalles a temps real.
      </span>
      </div>`;
    } else {
      // Amagar avís (xarxa correcta o desconeguda)
      container.classList.add("d-none");
      warningDiv.innerHTML = "";
    }
  } catch (e) {
    debugLog("Error comprovant xarxa del professor:", e);
  }
}

/**
 * Inicia la comprovació periòdica de la xarxa del professor.
 * @param {string} expectedNetwork - La xarxa esperada
 */
function startProfessorNetworkCheck(expectedNetwork) {
  // Aturar comprovació anterior si existeix
  stopProfessorNetworkCheck();

  // Comprovar immediatament
  checkProfessorNetwork(expectedNetwork);

  // Comprovar cada 30 segons
  professorNetworkCheckInterval = setInterval(() => {
    checkProfessorNetwork(expectedNetwork);
  }, 30000);
}

/**
 * Atura la comprovació periòdica de la xarxa del professor.
 */
function stopProfessorNetworkCheck() {
  if (professorNetworkCheckInterval) {
    clearInterval(professorNetworkCheckInterval);
    professorNetworkCheckInterval = null;
  }
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

  // Escoltar expectedNetwork per iniciar comprovació de xarxa del professor
  unsubscribers.push(
    storeOn("expectedNetwork", (network) => {
      debugLog("EVENT expectedNetwork", network);
      if (network) {
        startProfessorNetworkCheck(network);
      }
    })
  );

  // Si ja tenim expectedNetwork al store (replay), iniciar comprovació
  const currentExpected = getState().expectedNetwork;
  if (currentExpected) {
    startProfessorNetworkCheck(currentExpected);
  }
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

  // Tancar modal d'historial si està obert
  closeScreenshotsHistory();

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

  // Aturar comprovació periòdica de xarxa del professor
  stopProfessorNetworkCheck();

  // Reset estat local
  grups_disponibles = false;
  maquines_disponibles = false;
}

// Compatibilitat amb API antiga
export { init as initScreensWiring };
export { destroy as unmountScreensView };

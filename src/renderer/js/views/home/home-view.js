/**
 * Home View - Vista principal de l'aplicació
 * Gestiona la pantalla d'inici amb botons de navegació
 */

import { isSuperUser } from "../../utils/validators.js";
import { $, addListener } from "../../utils/dom-helpers.js";

// Estat local de la vista
let cleanupFunctions = [];
let clickCount = 0;
let resetTimer = null;

const REQUIRED_CLICKS = 7; // Clics necessaris per activar mode super

/**
 * Inicialitza la vista home
 * @returns {object} - Objecte amb funció destroy
 */
export async function init() {
  console.log("[HOME] Inicialitzant vista...");

  // Actualitzar informació d'usuari
  updateUserInfo();

  // Configurar mode super (7 clics al logo)
  setupSuperMode();

  // Configurar botó de comprovar actualitzacions
  setupUpdateChecker();

  // Retornar objecte amb destroy
  return { destroy };
}

/**
 * Destrueix la vista i neteja recursos
 */
export function destroy() {
  console.log("[HOME] Destruint vista...");

  // Executar totes les funcions de neteja
  for (const cleanup of cleanupFunctions) {
    try {
      cleanup();
    } catch (error) {
      console.warn("[HOME] Error en cleanup:", error);
    }
  }

  cleanupFunctions = [];
  clickCount = 0;

  if (resetTimer) {
    clearTimeout(resetTimer);
    resetTimer = null;
  }
}

/**
 * Actualitza la informació d'usuari connectat
 */
function updateUserInfo() {
  const userInfo = $("#homeUserInfo");
  if (!userInfo) return;

  if (
    window.authManager?.isAuthenticated &&
    window.authManager?.currentCredentials?.username
  ) {
    userInfo.textContent = `Connectat com a ${window.authManager.currentCredentials.username}`;
  } else {
    userInfo.textContent = "No autenticat";
  }

  // Configurar enllaç de canviar credencials
  const changeCredsLink = $("#changeCredsLink");
  if (changeCredsLink) {
    const removeListener = addListener(changeCredsLink, "click", (e) => {
      e.preventDefault();
      window.authManager?.showLogin();
    });
    cleanupFunctions.push(removeListener);
  }
}

/**
 * Configura el mode super (7 clics al logo)
 */
function setupSuperMode() {
  const logo = $(".home-logo");
  if (!logo) return;

  // Trobar o crear element de pista
  let hint = $("#homeSuperHint");
  if (!hint) {
    hint = createSuperHint();
  }

  // Si ja som super, mostrar estat actiu
  if (isSuperUser()) {
    showSuperActive(hint);
  } else {
    hint.textContent = "";
    hint.className = "small mt-2 text-muted";
  }

  // Configurar listener de clics
  const removeListener = addListener(logo, "click", () =>
    handleLogoClick(hint)
  );
  cleanupFunctions.push(removeListener);
}

/**
 * Crea l'element de pista per al mode super
 * @returns {Element}
 */
function createSuperHint() {
  const hint = document.createElement("div");
  hint.id = "homeSuperHint";
  hint.className = "small mt-2 text-muted";

  // Inserir després del subtítol
  const headerBlock = $(".home-wrapper .text-center");
  const subtitle = headerBlock?.querySelector("p");

  if (subtitle?.parentElement) {
    subtitle.parentElement.insertBefore(hint, subtitle.nextSibling);
  } else if (headerBlock) {
    headerBlock.appendChild(hint);
  }

  return hint;
}

/**
 * Gestiona el clic al logo
 * @param {Element} hint - Element de pista
 */
function handleLogoClick(hint) {
  // Si ja som super, només mostrar estat actiu
  if (isSuperUser()) {
    showSuperActive(hint);
    return;
  }

  // Incrementar comptador
  clickCount += 1;

  // Reiniciar si no hi ha més clics en 2 segons
  if (resetTimer) clearTimeout(resetTimer);
  resetTimer = setTimeout(() => {
    clickCount = 0;
    if (!isSuperUser()) {
      hint.textContent = "";
      hint.className = "small mt-2 text-muted";
    }
  }, 2000);

  // Mostrar pista quan queden 3 clics o menys
  const remaining = REQUIRED_CLICKS - clickCount;
  if (remaining > 0 && remaining <= 3) {
    hint.textContent =
      remaining === 1
        ? "Un clic més per esdevenir super"
        : `Falten ${remaining} clics per esdevenir super`;
    hint.classList.remove("text-muted", "text-success", "fw-semibold");
    hint.classList.add("text-info");
  }

  // Activar mode super
  if (clickCount >= REQUIRED_CLICKS) {
    activateSuperMode(hint);
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }
  }
}

/**
 * Activa el mode super
 * @param {Element} hint - Element de pista
 */
function activateSuperMode(hint) {
  try {
    sessionStorage.setItem("pbk:super", "1");
    showSuperActive(hint);
    console.log("[HOME] Mode super activat");
  } catch (error) {
    console.warn("[HOME] Error activant mode super:", error);
  }
}

/**
 * Mostra l'estat actiu del mode super
 * @param {Element} hint - Element de pista
 */
function showSuperActive(hint) {
  if (!hint) return;

  hint.textContent = "Mode super actiu";
  hint.classList.remove("text-muted", "text-info");
  hint.classList.add("text-success", "fw-semibold");

  // Mostrar botó de Gestió
  const gestioBtn = $("#gestioButton");
  if (gestioBtn) {
    gestioBtn.style.display = "";
  }
}

/**
 * Configura el botó de comprovar actualitzacions
 */
function setupUpdateChecker() {
  const checkUpdatesBtn = $("#checkUpdatesBtn");
  const versionText = $("#versionText");

  if (checkUpdatesBtn && window.electronAPI?.getVersion) {
    // Mostrar versió actual
    window.electronAPI
      .getVersion()
      .then((version) => {
        if (versionText) {
          versionText.textContent = `v${version}`;
        }
      })
      .catch((error) => {
        console.warn("[HOME] Error obtenint versió:", error);
      });

    // Configurar listener per comprovar actualitzacions
    const removeListener = addListener(checkUpdatesBtn, "click", async () => {
      if (!window.electronAPI?.checkForUpdates) return;

      try {
        checkUpdatesBtn.disabled = true;
        checkUpdatesBtn.innerHTML =
          '<span class="spinner-border spinner-border-sm me-2"></span>Comprovant...';

        await window.electronAPI.checkForUpdates();

        // El resultat es mostrarà via events d'electron
        setTimeout(() => {
          checkUpdatesBtn.disabled = false;
          if (versionText) {
            checkUpdatesBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor"
                class="bi bi-arrow-repeat" viewBox="0 0 16 16">
                <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41m-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9" />
                <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5 5 0 0 0 8 3M3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9z" />
              </svg>
              ${versionText.textContent}
            `;
          }
        }, 2000);
      } catch (error) {
        console.error("[HOME] Error comprovant actualitzacions:", error);
        checkUpdatesBtn.disabled = false;
      }
    });

    cleanupFunctions.push(removeListener);
  }
}

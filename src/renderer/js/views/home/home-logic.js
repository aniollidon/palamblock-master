// Home view - Gestió de la pàgina principal
import { isSuperUser } from "../../utils/validators.js";

// Variables globals per al botó d'actualitzacions
let currentVersion = "";
let isChecking = false;

/**
 * Inicialitza la vista Home
 */
export function initHome() {
  console.log("[HOME] Inicialitzant vista Home...");

  // Mostrar botó de Gestió només per super users
  showGestionButtonIfSuperUser();

  // Mostrar la versió de l'aplicació
  displayAppVersion();

  // Configurar el botó de comprovar actualitzacions
  setupCheckUpdatesButton();

  // Configurar listeners d'events d'actualització
  setupUpdateListeners();
}

/**
 * Mostra el botó de Gestió si l'usuari és super user (local + servidor)
 */
function showGestionButtonIfSuperUser() {
  if (isSuperUser()) {
    const gestioBtn = document.getElementById("gestioButton");
    if (gestioBtn) {
      gestioBtn.style.display = "";
      console.log("[HOME] Botó de Gestió visible per super user");
    }
  }
}

/**
 * Mostra la versió de l'aplicació
 */
async function displayAppVersion() {
  if (!window.electronAPI || !window.electronAPI.getVersion) {
    console.warn("[HOME] API getVersion no disponible");
    return;
  }

  try {
    const version = await window.electronAPI.getVersion();
    currentVersion = version;

    const versionText = document.getElementById("versionText");
    if (versionText) {
      versionText.textContent = `v${version}`;
      console.log("[HOME] Versió mostrada:", version);
    }
  } catch (err) {
    console.error("[HOME] Error obtenint la versió:", err);
  }
}

/**
 * Configura el botó de comprovar actualitzacions
 */
function setupCheckUpdatesButton() {
  const checkUpdatesBtn = document.getElementById("checkUpdatesBtn");

  if (!checkUpdatesBtn) {
    console.warn("[HOME] Botó checkUpdatesBtn no trobat");
    return;
  }

  if (!window.electronAPI || !window.electronAPI.checkForUpdates) {
    console.warn("[HOME] API checkForUpdates no disponible");
    return;
  }

  checkUpdatesBtn.addEventListener("click", handleCheckUpdatesClick);
  console.log("[HOME] Listener del botó d'actualitzacions configurat");
}

/**
 * Gestiona el click al botó de comprovar actualitzacions
 */
async function handleCheckUpdatesClick() {
  if (isChecking) {
    console.log("[HOME] Ja s'està comprovant actualitzacions");
    return;
  }

  isChecking = true;
  const versionText = document.getElementById("versionText");
  const checkUpdatesBtn = document.getElementById("checkUpdatesBtn");
  const originalText = versionText.textContent;

  // Mostrar estat de càrrega
  versionText.textContent = "Comprovant...";
  checkUpdatesBtn.disabled = true;

  try {
    console.log("[HOME] Comprovant actualitzacions...");
    const result = await window.electronAPI.checkForUpdates();

    console.log("[HOME] Resultat de comprovar actualitzacions:", result);

    // Validar que el resultat no sigui null o undefined
    if (!result) {
      handleCheckError(
        "No s'ha rebut resposta del sistema d'actualitzacions",
        originalText,
        versionText
      );
      return;
    }

    if (result.success) {
      handleSuccessfulCheck(result, originalText, versionText);
    } else {
      handleCheckError(result.error, originalText, versionText);
    }
  } catch (err) {
    console.error("[HOME] Excepció comprovant actualitzacions:", err);
    handleCheckError(err.message, originalText, versionText);
  } finally {
    isChecking = false;
    checkUpdatesBtn.disabled = false;
  }
}

/**
 * Gestiona una comprovació d'actualitzacions exitosa
 */
function handleSuccessfulCheck(result, originalText, versionText) {
  // Validar que result tingui les propietats necessàries
  if (!result || typeof result !== "object") {
    handleCheckError(
      "Resposta invàlida del sistema d'actualitzacions",
      originalText,
      versionText
    );
    return;
  }

  if (
    result.updateInfo &&
    result.updateInfo.version &&
    result.updateInfo.version !== currentVersion
  ) {
    // Hi ha una actualització disponible
    versionText.textContent = `v${currentVersion} → v${result.updateInfo.version}`;

    if (typeof showSuccessToast === "function") {
      showSuccessToast(
        `Actualització disponible: v${result.updateInfo.version}`
      );
    } else {
      alert(`Actualització disponible: v${result.updateInfo.version}`);
    }

    setTimeout(() => {
      versionText.textContent = originalText;
    }, 5000);
  } else {
    // Ja tens l'última versió
    versionText.textContent = "Actualitzat ✓";

    if (typeof showSuccessToast === "function") {
      showSuccessToast("Estàs fent servir l'última versió");
    }

    setTimeout(() => {
      versionText.textContent = originalText;
    }, 3000);
  }
}

/**
 * Gestiona errors en la comprovació d'actualitzacions
 */
function handleCheckError(errorMessage, originalText, versionText) {
  console.error("[HOME] Error comprovant actualitzacions:", errorMessage);
  versionText.textContent = "Error ✗";

  if (typeof showErrorToast === "function") {
    showErrorToast(`Error: ${errorMessage || "No s'ha pogut comprovar"}`);
  }

  setTimeout(() => {
    versionText.textContent = originalText;
  }, 3000);
}

/**
 * Configura els listeners d'events d'actualització
 */
function setupUpdateListeners() {
  if (!window.electronAPI) {
    console.warn("[HOME] electronAPI no disponible per listeners");
    return;
  }

  // Actualització disponible
  if (window.electronAPI.onUpdateAvailable) {
    window.electronAPI.onUpdateAvailable((data) => {
      console.log("[HOME] Actualització disponible:", data);
      const versionText = document.getElementById("versionText");
      if (versionText && data.version) {
        versionText.textContent = `v${currentVersion} → v${data.version} 🎉`;
      }
    });
  }

  // Error d'actualització
  if (window.electronAPI.onUpdateError) {
    window.electronAPI.onUpdateError((data) => {
      console.error("[HOME] Error d'actualització:", data);
      if (typeof showErrorToast === "function") {
        showErrorToast("Error comprovant actualitzacions");
      }
      if (typeof showUpdateErrorModal === "function") {
        showUpdateErrorModal(data);
      }
    });
  }

  // Progrés de descàrrega
  if (window.electronAPI.onDownloadProgress) {
    window.electronAPI.onDownloadProgress((data) => {
      console.log("[HOME] Progrés de descàrrega:", data);
      const versionText = document.getElementById("versionText");
      if (versionText && data.percent) {
        versionText.textContent = `Descarregant ${data.percent.toFixed(0)}%`;
      }
    });
  }

  // Actualització descarregada
  if (window.electronAPI.onUpdateDownloaded) {
    window.electronAPI.onUpdateDownloaded((data) => {
      console.log("[HOME] Actualització descarregada:", data);
      if (typeof showSuccessToast === "function") {
        showSuccessToast(
          `v${data.version} descarregada! Reinicia per instal·lar.`
        );
      }
    });
  }

  console.log("[HOME] Listeners d'actualització configurats");
}

// ATENCIÓ: Aquest mòdul s'importa des de home-view.js. No té auto-inicialització.
// La inicialització de la vista home es fa a través de view-manager.js → home-view.js → init()

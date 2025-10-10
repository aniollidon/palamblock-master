/**
 * Punt d'entrada principal del renderer process de PalamMaster
 * Inicialitza el ViewManager i gestiona l'estat global de l'aplicació
 */

import { ViewManager } from "./core/view-manager.js";
import { AuthManager } from "./core/auth-manager.js";
import { initializeSocket } from "./utils/socket.js";

// Inicialització global
let viewManager = null;
let authManager = null;

/**
 * Inicialitza l'aplicació quan el DOM estigui llest
 */
async function initializeApp() {
  console.log("[MAIN] Inicialitzant PalamMaster...");

  try {
    // 1. Crear gestor d'autenticació
    authManager = new AuthManager();
    window.authManager = authManager; // Exposar globalment per compatibilitat

    // 2. Crear gestor de vistes
    viewManager = new ViewManager();
    window.viewManager = viewManager; // Exposar globalment per compatibilitat

    // 3. Escoltar esdeveniments d'autenticació (ABANS d'inicialitzar)
    window.addEventListener("auth:ready", handleAuthReady);
    window.addEventListener("auth:logout", handleLogout);

    // 4. Inicialitzar autenticació (carrega credencials guardades)
    await authManager.initialize();

    // 5. Si ja estem autenticats, carregar vista home
    if (authManager.isAuthenticated) {
      const main =
        document.getElementById("appMain") || document.querySelector("main");
      if (main && main.innerHTML.trim() === "") {
        await viewManager.loadView("home");
      }
    }

    // 6. Gestió global d'errors
    setupGlobalErrorHandling();

    console.log("[MAIN] Aplicació inicialitzada correctament");
  } catch (error) {
    console.error("[MAIN] Error inicialitzant aplicació:", error);
    showCriticalError(error);
  }
}

/**
 * Gestiona l'esdeveniment d'autenticació exitosa
 */
async function handleAuthReady(event) {
  console.log("[MAIN] Autenticació completada");

  try {
    // Inicialitzar connexió socket amb les credencials
    const credentials = event.detail?.credentials;
    if (credentials) {
      await initializeSocket();
    }

    // Carregar vista inicial només si el contenidor està buit
    const main =
      document.getElementById("appMain") || document.querySelector("main");
    if (main && main.innerHTML.trim() === "") {
      await viewManager.loadView("home");
    }
  } catch (error) {
    console.error("[MAIN] Error en handleAuthReady:", error);
  }
}

/**
 * Gestiona el logout
 */
function handleLogout() {
  console.log("[MAIN] Logout detectat, netejant estat...");

  // Netejar vista actual
  if (viewManager) {
    viewManager.clearCurrentView();
  }

  // Netejar contenidor principal
  const main =
    document.getElementById("appMain") || document.querySelector("main");
  if (main) {
    main.innerHTML = "";
  }
}

/**
 * Configura gestió global d'errors
 */
function setupGlobalErrorHandling() {
  // Errors JavaScript
  window.addEventListener("error", (event) => {
    console.error("[MAIN] Error global:", event.error);

    if (window.electronAPI?.logError) {
      window.electronAPI.logError(
        event.error?.message || "Unknown error",
        event.error?.stack || ""
      );
    }
  });

  // Promises sense catch
  window.addEventListener("unhandledrejection", (event) => {
    console.error("[MAIN] Promise rejection no gestionada:", event.reason);

    if (window.electronAPI?.logError) {
      window.electronAPI.logError(
        "Unhandled Promise Rejection",
        event.reason?.stack || String(event.reason)
      );
    }
  });
}

/**
 * Mostra un error crític que impedeix l'execució de l'app
 */
function showCriticalError(error) {
  const main =
    document.getElementById("appMain") || document.querySelector("main");
  if (main) {
    main.innerHTML = `
      <div class="d-flex flex-column justify-content-center align-items-center h-100">
        <div class="alert alert-danger" role="alert">
          <h4 class="alert-heading">Error crític</h4>
          <p>L'aplicació no s'ha pogut inicialitzar correctament.</p>
          <hr>
          <p class="mb-0"><small>${error.message}</small></p>
        </div>
        <button class="btn btn-primary mt-3" onclick="location.reload()">
          Recarregar aplicació
        </button>
      </div>
    `;
  }
}

// Iniciar l'aplicació quan el DOM estigui llest
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}

// Exposar API pública
export { viewManager, authManager };

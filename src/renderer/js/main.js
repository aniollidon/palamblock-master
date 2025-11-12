/**
 * Punt d'entrada principal del renderer process de PalamMaster
 * Inicialitza el ViewManager i gestiona l'estat global de l'aplicació
 */

import { ServiceContainer } from "./core/service-container.js";
import { ViewManager } from "./core/view-manager.js";
import { AuthManager } from "./core/auth-manager.js";
import { SocketManager } from "./core/socket.js";

// Crear el Service Container global
const container = new ServiceContainer();

// Funció helper per emetre esdeveniments
const emitEvent = (name, detail) => {
  window.dispatchEvent(new CustomEvent(name, { detail }));
};

/**
 * Registra tots els serveis al contenidor
 */
function registerServices() {
  // Servei: electronAPI (wrapper per accedir a window.electronAPI)
  container.register(
    "electronAPI",
    () => {
      return window.electronAPI || {};
    },
    { singleton: true }
  );

  // Servei: EventEmitter
  container.register("eventEmitter", () => emitEvent, { singleton: true });

  // Servei: AuthManager
  container.register(
    "authManager",
    (c) => {
      return new AuthManager({
        electronAPI: c.get("electronAPI"),
        emitEvent: c.get("eventEmitter"),
      });
    },
    { singleton: true, dependencies: ["electronAPI", "eventEmitter"] }
  );

  // Servei: SocketManager
  container.register(
    "socketManager",
    (c) => {
      const socketManager = new SocketManager({
        authManager: c.get("authManager"),
        emitEvent: c.get("eventEmitter"),
      });

      // Configurar la integració amb AuthManager
      const authManager = c.get("authManager");
      authManager.setSocketInitializer((serverUrl, credentials) => {
        socketManager.updateSocketCredentials(serverUrl, credentials);
      });

      return socketManager;
    },
    { singleton: true, dependencies: ["authManager", "eventEmitter"] }
  );

  // Servei: ViewManager
  container.register(
    "viewManager",
    (c) => {
      return new ViewManager({
        authManager: c.get("authManager"),
        emitEvent: c.get("eventEmitter"),
      });
    },
    { singleton: true, dependencies: ["authManager", "eventEmitter"] }
  );
}

// Inicialització global
let viewManager = null;
let authManager = null;
let socketManager = null;

/**
 * Inicialitza l'aplicació quan el DOM estigui llest
 */
async function initializeApp() {
  console.log("[MAIN] Inicialitzant PalamMaster...");

  try {
    // 1. Registrar tots els serveis
    registerServices();

    // 2. Obtenir serveis del contenidor
    authManager = container.get("authManager");
    viewManager = container.get("viewManager");
    socketManager = container.get("socketManager");

    // 3. Exposar globalment NOMÉS el contenidor (en lloc de cada servei)
    window.app = {
      container,
      // Getters per accés ràpid (deprecated, usar container.get())
      get authManager() {
        return container.get("authManager");
      },
      get viewManager() {
        return container.get("viewManager");
      },
      get socketManager() {
        return container.get("socketManager");
      },
    };

    // 4. També exposar individualment per compatibilitat legacy (DEPRECATED)
    window.authManager = authManager;
    window.viewManager = viewManager;

    // 5. Escoltar esdeveniments d'autenticació
    window.addEventListener("auth:ready", handleAuthReady);
    window.addEventListener("auth:logout", handleLogout);

    // 6. Inicialitzar autenticació (carrega credencials guardades)
    await authManager.initialize();

    // 7. Si ja estem autenticats, carregar vista home
    if (authManager.isAuthenticated) {
      const main =
        document.getElementById("appMain") || document.querySelector("main");
      if (main && main.innerHTML.trim() === "") {
        await viewManager.loadView("home");
      }
    }

    // 8. Gestió global d'errors
    setupGlobalErrorHandling();

    console.log("[MAIN] Aplicació inicialitzada correctament");
    console.log(
      "[MAIN] Serveis disponibles:",
      container.getRegisteredServices()
    );
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
    // El socket ja s'ha inicialitzat des d'AuthManager.initializeSocketConnectionWithValidation()
    // NO cal tornar-lo a inicialitzar aquí per evitar connexions duplicades

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

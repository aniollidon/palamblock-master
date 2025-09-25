// Electron initialization for PalamMaster
document.addEventListener("DOMContentLoaded", async () => {
  console.log("PalamMaster inicialment carregat");

  // Initialize connection status
  updateConnectionStatus(false);

  // Auth manager will be initialized by auth.js
  // Wait for it to be available
  const waitForAuth = () => {
    return new Promise((resolve) => {
      if (window.authManager) {
        resolve();
      } else {
        setTimeout(() => waitForAuth().then(resolve), 50);
      }
    });
  };

  await waitForAuth();

  // Load configuration if available
  if (
    window.electronAPI &&
    typeof window.electronAPI.getConfig === "function"
  ) {
    try {
      const config = await window.electronAPI.getConfig();
      console.log("Configuració carregada:", config);

      // Update UI with config values if needed
      if (config && config.server?.url) {
        console.log("Connectant a:", config.server.url);
      }
    } catch (error) {
      console.warn("Error carregant configuració:", error);
    }
  } else {
    console.log("Usant configuració per defecte (mode desenvolupament)");
  }

  // Setup connection status updates
  if (
    window.palamAPI &&
    typeof window.palamAPI.onConnectionStatusChange === "function"
  ) {
    try {
      window.palamAPI.onConnectionStatusChange((isConnected) => {
        updateConnectionStatus(isConnected);
      });
    } catch (error) {
      console.warn("Error configurant listeners de connexió:", error);
    }
  } else {
    console.log("API de connexió no disponible (mode desenvolupament)");
  }

  // Inicialitzar View Manager
  if (window.viewManager) {
    console.log("Inicialitzant View Manager...");
    window.viewManager.setupNavigationHandlers();
    // Ja no forcem 'browsers'; si ja estem autenticats, carreguem 'home' si està buit
    setTimeout(() => {
      const main = document.querySelector("main");
      if (window.authManager?.isAuthenticated) {
        if (main && main.innerHTML.trim() === "") {
          window.viewManager.loadView("home");
        }
      } else {
        // Esperem autenticació i llavors mostrem home
        window.addEventListener(
          "auth:ready",
          () => {
            if (main && main.innerHTML.trim() === "") {
              window.viewManager.loadView("home");
            }
          },
          { once: true }
        );
      }
    }, 120);
  }
});

function updateConnectionStatus(isConnected) {
  const statusElement = document.getElementById("connectionStatus");
  if (statusElement) {
    if (isConnected) {
      statusElement.innerHTML = '<i class="bi bi-wifi"></i> Connectat';
      statusElement.className = "badge bg-success";
    } else {
      statusElement.innerHTML = '<i class="bi bi-wifi-off"></i> Desconnectat';
      statusElement.className = "badge bg-danger";
    }
  }
}

// Setup global error handling
window.addEventListener("error", (event) => {
  console.error("Error global:", event.error);
  if (window.electronAPI && typeof window.electronAPI.logError === "function") {
    try {
      window.electronAPI.logError(event.error.message, event.error.stack);
    } catch (logError) {
      console.error("Error enviant log:", logError);
    }
  }
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Promise rejection no gestionada:", event.reason);
  if (window.electronAPI && typeof window.electronAPI.logError === "function") {
    try {
      window.electronAPI.logError("Unhandled Promise Rejection", event.reason);
    } catch (logError) {
      console.error("Error enviant log de rejection:", logError);
    }
  }
});

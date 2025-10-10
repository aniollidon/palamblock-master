/**
 * Socket Client - Gestió de la connexió WebSocket amb el servidor PalamSRV
 * Centralitza la creació, configuració i gestió del socket.io
 */

import { attachAdminSocket } from "../core/store.js";

// Configuració per defecte
const defaultConfig = {
  server: {
    url: "http://localhost:4000",
    port: 4000,
  },
  authentication: {
    username: "admin",
    token: "",
  },
};

// Estat del socket
let socket = null;
let currentServerUrl = null;
let currentCredentials = null;
let pendingConnection = false;

/**
 * Crea una nova connexió socket
 * @param {string} serverUrl - URL del servidor
 * @param {object} credentials - Credencials (username, token)
 * @returns {Socket|null}
 */
function createSocket(serverUrl, credentials) {
  if (pendingConnection) {
    console.log("[SOCKET] Connexió pendent, ignorant nou intent");
    return socket;
  }

  if (!credentials?.token) {
    console.log("[SOCKET] No es pot crear socket sense token");
    return null;
  }

  pendingConnection = true;

  // Desconnectar socket anterior si existeix
  if (socket) {
    try {
      socket.disconnect();
    } catch (error) {
      console.warn("[SOCKET] Error desconnectant socket anterior:", error);
    }
    socket = null;
  }

  currentServerUrl = serverUrl;
  currentCredentials = credentials;

  console.log(
    `[SOCKET] Creant connexió a ${serverUrl} (usuari: ${credentials.username})`
  );

  socket = io(serverUrl, {
    query: {
      user: credentials.username,
      authToken: credentials.token,
    },
    path: "/ws-admin",
    transports: ["websocket", "polling"],
    timeout: 10000,
    forceNew: true,
  });

  // Configurar event listeners
  setupSocketListeners();

  return socket;
}

/**
 * Configura els event listeners del socket
 */
function setupSocketListeners() {
  if (!socket) return;

  // Connexió exitosa
  socket.once("connect", () => {
    pendingConnection = false;
    console.log("[SOCKET] Connectat correctament");

    // Exposar socket globalment
    window.socket = socket;

    // Adjuntar al store
    try {
      attachAdminSocket(socket);
    } catch (error) {
      console.warn("[SOCKET] Error adjuntant socket al store:", error);
    }

    // Emetre esdeveniment
    try {
      window.dispatchEvent(
        new CustomEvent("socket:ready", {
          detail: { socket },
        })
      );
    } catch (error) {
      console.warn("[SOCKET] Error emetent esdeveniment socket:ready:", error);
    }
  });

  // Desconnexió
  socket.on("disconnect", (reason) => {
    console.log(`[SOCKET] Desconnectat (raó: ${reason})`);

    if (window.socket === socket) {
      window.socket = null;
    }

    // Si no és desconnexió voluntària, mostrar login
    if (reason !== "io client disconnect" && window.authManager) {
      handleUnexpectedDisconnect();
    }
  });

  // Errors del socket
  socket.on("error", (error) => {
    console.error("[SOCKET] Error:", error);

    const message = error?.message || error?.toString() || "";
    const isAuthError =
      /autenticaci[oó]?? fallida/i.test(message) || /auth/i.test(message);

    if (isAuthError) {
      handleAuthError("Autenticació fallida. Torna a iniciar sessió.");
    }
  });

  // Errors de connexió
  socket.on("connect_error", (error) => {
    pendingConnection = false;
    console.error("[SOCKET] Error de connexió:", error.message);

    const message = error?.message || error?.toString() || "";
    const isAuthError =
      /autenticaci[oó]?? fallida/i.test(message) || /auth/i.test(message);

    if (isAuthError) {
      handleAuthError("Autenticació fallida. Torna a iniciar sessió.");
    } else {
      handleConnectionError(
        "No s'ha pogut connectar amb el servidor. Verifica la configuració."
      );
    }
  });
}

/**
 * Gestiona una desconnexió inesperada
 */
function handleUnexpectedDisconnect() {
  console.log(
    "[SOCKET] Desconnexió inesperada, mostrant pantalla d'autenticació"
  );

  if (!window.authManager) return;

  window.authManager.isAuthenticated = false;
  window.authManager.authToken = null;
  window.authManager.showLogin();

  setTimeout(() => {
    try {
      window.authManager.showLoginError?.(
        "S'ha perdut la connexió amb el servidor. Torna a iniciar sessió."
      );
    } catch (error) {
      console.warn("[SOCKET] Error mostrant missatge d'error:", error);
    }
  }, 100);
}

/**
 * Gestiona un error d'autenticació
 * @param {string} message - Missatge d'error
 */
function handleAuthError(message) {
  try {
    socket?.disconnect();
  } catch (error) {
    console.warn("[SOCKET] Error desconnectant socket:", error);
  }

  if (window.socket === socket) {
    window.socket = null;
  }

  if (window.authManager) {
    window.authManager.isAuthenticated = false;
    window.authManager.authToken = null;
    window.authManager.showLogin();

    setTimeout(() => {
      try {
        window.authManager.showLoginError?.(message);
      } catch (error) {
        console.warn("[SOCKET] Error mostrant missatge d'error:", error);
      }
    }, 100);
  }
}

/**
 * Gestiona un error de connexió
 * @param {string} message - Missatge d'error
 */
function handleConnectionError(message) {
  try {
    socket?.disconnect();
  } catch (error) {
    console.warn("[SOCKET] Error desconnectant socket:", error);
  }

  if (window.socket === socket) {
    window.socket = null;
  }

  if (window.authManager) {
    window.authManager.isAuthenticated = false;
    window.authManager.authToken = null;
    window.authManager.showLogin();

    setTimeout(() => {
      try {
        window.authManager.showLoginError?.(message);
      } catch (error) {
        console.warn("[SOCKET] Error mostrant missatge d'error:", error);
      }
    }, 100);
  }
}

/**
 * Inicialitza el socket amb les credencials actuals
 * @returns {Socket|null}
 */
export async function initializeSocket() {
  // Comprovar autenticació
  if (!window.authManager?.isAuthenticated) {
    console.log("[SOCKET] No es pot inicialitzar (no autenticat)");
    return null;
  }

  // Reutilitzar socket existent si està disponible
  if (window.socket) {
    console.log("[SOCKET] Reutilitzant socket existent");
    return window.socket;
  }

  // Crear nou socket si tenim credencials
  if (currentServerUrl && currentCredentials) {
    return createSocket(currentServerUrl, currentCredentials);
  }

  // Intentar usar credencials de authManager
  if (window.authManager.serverUrl && window.authManager.currentCredentials) {
    return createSocket(
      window.authManager.serverUrl,
      window.authManager.currentCredentials
    );
  }

  console.warn("[SOCKET] No es pot inicialitzar (falten credencials)");
  return null;
}

/**
 * Actualitza les credencials del socket (crida des d'AuthManager)
 * @param {string} serverUrl - URL del servidor
 * @param {object} credentials - Credencials
 * @returns {Socket|null}
 */
export function updateSocketCredentials(serverUrl, credentials) {
  if (!window.authManager?.isAuthenticated) {
    console.log("[SOCKET] updateSocketCredentials ignorat (no autenticat)");
    return null;
  }

  return createSocket(serverUrl, credentials);
}

/**
 * Desconnecta el socket actual
 */
export function disconnectSocket() {
  if (!socket) return;

  try {
    socket.disconnect();
    console.log("[SOCKET] Desconnectat");
  } catch (error) {
    console.error("[SOCKET] Error desconnectant:", error);
  }

  socket = null;
  window.socket = null;
}

/**
 * Obté el socket actual
 * @returns {Socket|null}
 */
export function getSocket() {
  return socket || window.socket || null;
}

// Exposar funcions globalment per compatibilitat
window.updateSocketCredentials = updateSocketCredentials;

// Listener per autenticació
window.addEventListener("auth:ready", () => {
  if (window.authManager?.serverUrl && window.authManager?.currentCredentials) {
    updateSocketCredentials(
      window.authManager.serverUrl,
      window.authManager.currentCredentials
    );
  }
});

// Exportar socket directament per compatibilitat amb codi antic
export { socket };

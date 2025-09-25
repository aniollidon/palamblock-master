// Default configuration
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

// Socket instance (es crea només després d'autenticació)
let socket = null;
let currentServerUrl = null;
let currentCredentials = null;
let pendingConnection = false; // evita múltiples intents simultanis

// Initialize socket connection
function createSocket(serverUrl, credentials) {
  if (pendingConnection) {
    console.log("[SOCKET] Connexió pendent, s'ignora nou intent");
    return socket;
  }
  if (!credentials || !credentials.token) {
    console.log("[SOCKET] S'intenta crear socket sense token — ajornant");
    return null;
  }
  pendingConnection = true;

  if (socket) {
    try {
      socket.disconnect();
    } catch (_) {}
    socket = null;
  }

  currentServerUrl = serverUrl;
  currentCredentials = credentials;

  console.log(
    "[SOCKET] Creant connexió a:",
    serverUrl,
    "usuari:",
    credentials.username
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

  socket.once("connect", () => {
    pendingConnection = false;
    console.log("[SOCKET] Connectat correctament");
    try {
      // Notifica a qualsevol mòdul que el socket ja està llest
      window.dispatchEvent(
        new CustomEvent("socket:ready", { detail: { socket } })
      );
    } catch (e) {
      console.warn(
        "[SOCKET] No s'ha pogut emetre l'esdeveniment socket:ready",
        e
      );
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("[SOCKET] Desconnectat:", reason);
  });

  socket.on("connect_error", (error) => {
    pendingConnection = false;
    console.error("[SOCKET] Error de connexió:", error.message);
    if (window.authManager && !window.authManager.isAuthenticated) {
      // Manté el login visible
      window.authManager.showLogin();
    }
  });

  return socket;
}

// Global function to update socket credentials (called from auth manager)
window.updateSocketCredentials = function (serverUrl, credentials) {
  // Només crea/actualitza si ja estem autenticats
  if (!window.authManager || !window.authManager.isAuthenticated) {
    console.log("[SOCKET] updateSocketCredentials ignorat (no autenticat)");
    return null;
  }
  return createSocket(serverUrl, credentials);
};

async function initializeSocket() {
  // Update socket config if electron config is available
  if (!window.authManager || !window.authManager.isAuthenticated) {
    console.log("[SOCKET] initializeSocket: no autenticat encara");
    return null;
  }
  if (!socket && currentServerUrl && currentCredentials) {
    return createSocket(currentServerUrl, currentCredentials);
  }
  return socket;
}

export { socket, initializeSocket };

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
      // Exposa el socket globalment perquè els mòduls ESM i scripts clàssics comparteixin la mateixa instància
      window.socket = socket;
    } catch (_) {}
    // Enllaça el socket al store central (dinàmic, sense await dins handler)
    import("./store.js")
      .then((m) => {
        try {
          m.attachAdminSocket?.(socket);
        } catch (e) {
          console.warn("[SOCKET] attachAdminSocket error:", e?.message);
        }
      })
      .catch((e) =>
        console.warn("[SOCKET] No s'ha pogut adjuntar el store:", e?.message)
      );
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
    try {
      if (window.socket === socket) window.socket = null;
    } catch (_) {}
  });

  // Si el servidor emet algun error d'autenticació explícit
  socket.on("error", (err) => {
    const msg = (err && (err.message || err.toString())) || "";
    if (/autenticaci[oó]?? fallida/i.test(msg) || /auth/i.test(msg)) {
      try {
        socket.disconnect();
      } catch (_) {}
      try {
        if (window.socket === socket) window.socket = null;
      } catch (_) {}
      if (window.authManager) {
        window.authManager.isAuthenticated = false;
        window.authManager.authToken = null;
        try {
          window.authManager.showLogin();
          setTimeout(() => {
            try {
              window.authManager.showError?.(
                "Autenticació fallida. Torna a iniciar sessió."
              );
            } catch (_) {}
          }, 30);
        } catch (_) {}
      }
    }
  });

  socket.on("connect_error", (error) => {
    pendingConnection = false;
    console.error("[SOCKET] Error de connexió:", error.message);
    const msg = (error && (error.message || error.toString())) || "";
    const isAuthFail =
      /autenticaci[oó]?? fallida/i.test(msg) || /auth/i.test(msg);
    if (isAuthFail) {
      // Desactiva intents i força re-autenticació
      try {
        socket.disconnect();
      } catch (_) {}
      try {
        if (window.socket === socket) window.socket = null;
      } catch (_) {}
      if (window.authManager) {
        window.authManager.isAuthenticated = false;
        window.authManager.authToken = null;
        try {
          window.authManager.showLogin();
          setTimeout(() => {
            try {
              window.authManager.showError?.(
                "Autenticació fallida. Torna a iniciar sessió."
              );
            } catch (_) {}
          }, 30);
        } catch (_) {}
      }
      return;
    }
    // Altres errors de connexió: si no autenticat, mostra login
    if (window.authManager && !window.authManager.isAuthenticated) {
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
  // Si ja hi ha un socket global, reutilitza'l
  if (window.socket) return window.socket;
  if (!socket && currentServerUrl && currentCredentials) {
    return createSocket(currentServerUrl, currentCredentials);
  }
  return socket;
}

export { socket, initializeSocket };

// Quan l'autenticació està llesta, assegura la creació del socket a Home
window.addEventListener("auth:ready", () => {
  try {
    if (
      window.authManager?.serverUrl &&
      window.authManager?.currentCredentials
    ) {
      window.updateSocketCredentials?.(
        window.authManager.serverUrl,
        window.authManager.currentCredentials
      );
    }
  } catch (e) {
    console.warn("[SOCKET] Error creant socket en auth:ready", e);
  }
});

// Si per qualsevol motiu apareix un socket via altres camins, adjunta'l al store
window.addEventListener("socket:ready", (ev) => {
  const s = ev.detail?.socket || window.socket;
  if (!s) return;
  import("./store.js")
    .then((m) => m.attachAdminSocket?.(s))
    .catch(() => {});
});

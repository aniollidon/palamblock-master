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

// Socket instance - will be initialized by auth manager
let socket = null;
let currentServerUrl = "http://localhost:4000";
let currentCredentials = {
  username: "admin",
  token: "",
};

// Initialize socket connection
function createSocket(serverUrl, credentials) {
  if (socket) {
    socket.disconnect();
  }

  console.log("Creating socket connection to:", serverUrl);

  socket = io(serverUrl, {
    query: {
      user: credentials.username || "admin",
      authToken: credentials.token || "",
    },
    path: "/ws-admin",
    transports: ["websocket", "polling"],
    timeout: 10000,
    forceNew: true,
  });

  // Setup connection event handlers
  socket.on("connect", () => {
    console.log("Socket connected to server");
    if (window.authManager) {
      // Notify connection status change if auth manager is available
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected from server");
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error.message);
    // Don't redirect to login, let auth manager handle it
    if (window.authManager && !window.authManager.isAuthenticated) {
      window.authManager.showLogin();
    }
  });

  currentServerUrl = serverUrl;
  currentCredentials = credentials;

  return socket;
}

// Global function to update socket credentials (called from auth manager)
window.updateSocketCredentials = function (serverUrl, credentials) {
  return createSocket(serverUrl, credentials);
};

// Initialize with default config (will be updated by auth manager)
socket = createSocket(currentServerUrl, currentCredentials);

async function initializeSocket() {
  // Update socket config if electron config is available
  try {
    if (window.electronAPI && window.electronAPI.getConfig) {
      const config = await window.electronAPI.getConfig();
      if (config && config.server && config.server.url !== serverUrl) {
        console.log("Reconnecting with new config:", config.server.url);
        socket.disconnect();
        const newSocket = io(config.server.url, {
          query: {
            user: config.authentication?.username || authUser,
            authToken: config.authentication?.token || authToken,
          },
          path: "/ws-admin",
          transports: ["websocket", "polling"],
        });
        return newSocket;
      }
    }
  } catch (error) {
    console.warn("Error updating socket config:", error);
  }

  return socket;
}

export { socket, initializeSocket };

/**
 * Socket Client - Gestió de la connexió WebSocket amb el servidor PalamSRV
 * Centralitza la creació, configuració i gestió del socket.io
 */

import { attachAdminSocket, requestInitialData, getState } from "./store.js";

/**
 * SocketManager - Gestiona les connexions socket amb dependency injection
 */
export class SocketManager {
  /**
   * @param {Object} dependencies - Dependències injectades
   * @param {Object} dependencies.authManager - Gestor d'autenticació
   * @param {Function} dependencies.emitEvent - Funció per emetre esdeveniments globals
   */
  constructor(dependencies = {}) {
    this.socket = null;
    this.currentServerUrl = null;
    this.currentCredentials = null;
    this.pendingConnection = false;

    // Dependències injectades
    this.authManager = dependencies.authManager;
    this.emitEvent =
      dependencies.emitEvent ||
      ((name, detail) => {
        window.dispatchEvent(new CustomEvent(name, { detail }));
      });
  }

  /**
   * Crea una nova connexió socket
   * @param {string} serverUrl - URL del servidor
   * @param {object} credentials - Credencials (username, token)
   * @returns {Socket|null}
   */
  createSocket(serverUrl, credentials) {
    if (this.pendingConnection) {
      console.log("[SOCKET] Connexió pendent, ignorant nou intent");
      return this.socket;
    }

    if (!credentials?.token) {
      console.log("[SOCKET] No es pot crear socket sense token");
      return null;
    }

    this.pendingConnection = true;

    // Desconnectar socket anterior si existeix
    if (this.socket) {
      try {
        this.socket.disconnect();
      } catch (error) {
        console.warn("[SOCKET] Error desconnectant socket anterior:", error);
      }
      this.socket = null;
    }

    this.currentServerUrl = serverUrl;
    this.currentCredentials = credentials;

    console.log(
      `[SOCKET] Creant connexió a ${serverUrl} (usuari: ${credentials.username})`
    );

    this.socket = io(serverUrl, {
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
    this.setupSocketListeners();

    return this.socket;
  }

  /**
   * Configura els event listeners del socket
   */
  setupSocketListeners() {
    if (!this.socket) return;

    // Connexió exitosa
    this.socket.once("connect", () => {
      this.pendingConnection = false;
      console.log("[SOCKET] Connectat correctament");

      // Exposar socket globalment (compatibilitat)
      window.socket = this.socket;

      // Adjuntar al store
      try {
        attachAdminSocket(this.socket);
      } catch (error) {
        console.warn("[SOCKET] Error adjuntant socket al store:", error);
      }

      // Demanar el paquet inicial immediatament després d'adjuntar el socket al store
      try {
        requestInitialData("socket:connect");
      } catch (error) {
        console.warn("[SOCKET] Error sol·licitant dades inicials:", error);
      }

      // Fallback: si en un curt període no hem rebut grups, tornar a demanar
      setTimeout(() => {
        try {
          const state = getState();
          const grupsCount = state?.grupAlumnesList
            ? Object.keys(state.grupAlumnesList).length
            : 0;
          if (!grupsCount && this.socket?.connected) {
            console.log(
              "[SOCKET] Fallback: re-sol·licitant dades inicials (no s'han rebut grups)"
            );
            requestInitialData("socket:connect-fallback");
          }
        } catch (e) {
          console.warn("[SOCKET] Error al comprovar fallback de dades:", e);
        }
      }, 800);

      // Emetre esdeveniment
      this.emitEvent("socket:ready", { socket: this.socket });
    });

    // Desconnexió
    this.socket.on("disconnect", (reason) => {
      console.log(`[SOCKET] Desconnectat (raó: ${reason})`);

      if (window.socket === this.socket) {
        window.socket = null;
      }

      // Si no és desconnexió voluntària, mostrar login
      if (reason !== "io client disconnect") {
        this.handleUnexpectedDisconnect();
      }
    });

    // Errors del socket
    this.socket.on("error", (error) => {
      console.error("[SOCKET] Error:", error);

      const message = error?.message || error?.toString() || "";
      const isAuthError =
        /autenticaci[oó]n? fallida/i.test(message) || /auth/i.test(message);

      if (isAuthError) {
        this.handleAuthError("Autenticació fallida. Torna a iniciar sessió.");
      }
    });

    // Errors de connexió
    this.socket.on("connect_error", (error) => {
      this.pendingConnection = false;
      console.error("[SOCKET] Error de connexió:", error.message);

      const message = error?.message || error?.toString() || "";
      const isAuthError =
        /autenticaci[oó]n? fallida/i.test(message) || /auth/i.test(message);

      if (isAuthError) {
        this.handleAuthError("Autenticació fallida. Torna a iniciar sessió.");
      } else {
        this.handleConnectionError(
          "No s'ha pogut connectar amb el servidor. Verifica la configuració."
        );
      }
    });
  }

  /**
   * Gestiona una desconnexió inesperada
   */
  handleUnexpectedDisconnect() {
    console.log(
      "[SOCKET] Desconnexió inesperada, mostrant pantalla d'autenticació"
    );

    if (!this.authManager) return;

    this.authManager.isAuthenticated = false;
    this.authManager.authToken = null;
    this.authManager.showLogin();

    setTimeout(() => {
      try {
        this.authManager.showLoginError?.(
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
  handleAuthError(message) {
    try {
      this.socket?.disconnect();
    } catch (error) {
      console.warn("[SOCKET] Error desconnectant socket:", error);
    }

    if (window.socket === this.socket) {
      window.socket = null;
    }

    if (this.authManager) {
      this.authManager.isAuthenticated = false;
      this.authManager.authToken = null;
      this.authManager.showLogin();

      setTimeout(() => {
        try {
          this.authManager.showLoginError?.(message);
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
  handleConnectionError(message) {
    try {
      this.socket?.disconnect();
    } catch (error) {
      console.warn("[SOCKET] Error desconnectant socket:", error);
    }

    if (window.socket === this.socket) {
      window.socket = null;
    }

    if (this.authManager) {
      this.authManager.isAuthenticated = false;
      this.authManager.authToken = null;
      this.authManager.showLogin();

      setTimeout(() => {
        try {
          this.authManager.showLoginError?.(message);
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
  initializeSocket() {
    // Comprovar autenticació
    if (!this.authManager?.isAuthenticated) {
      console.log("[SOCKET] No es pot inicialitzar (no autenticat)");
      return null;
    }

    // Reutilitzar socket existent si està disponible
    if (window.socket) {
      console.log("[SOCKET] Reutilitzant socket existent");
      return window.socket;
    }

    // Crear nou socket si tenim credencials
    if (this.currentServerUrl && this.currentCredentials) {
      return this.createSocket(this.currentServerUrl, this.currentCredentials);
    }

    // Intentar usar credencials de authManager
    if (this.authManager.serverUrl && this.authManager.currentCredentials) {
      return this.createSocket(
        this.authManager.serverUrl,
        this.authManager.currentCredentials
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
  updateSocketCredentials(serverUrl, credentials) {
    if (!this.authManager?.isAuthenticated) {
      console.log("[SOCKET] updateSocketCredentials ignorat (no autenticat)");
      return null;
    }

    return this.createSocket(serverUrl, credentials);
  }

  /**
   * Desconnecta el socket actual
   */
  disconnectSocket() {
    if (!this.socket) return;

    try {
      this.socket.disconnect();
      console.log("[SOCKET] Desconnectat");
    } catch (error) {
      console.error("[SOCKET] Error desconnectant:", error);
    }

    this.socket = null;
    window.socket = null;
  }

  /**
   * Obté el socket actual
   * @returns {Socket|null}
   */
  getSocket() {
    return this.socket || window.socket || null;
  }
}

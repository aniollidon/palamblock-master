/**
 * AuthManager - Gestor d'autenticació per PalamMaster
 * Gestiona el login, logout, tokens i persistència de credencials
 */

import { md5 } from "../utils/md5.js";

export class AuthManager {
  /**
   * @param {Object} dependencies - Dependències injectades
   * @param {Object} dependencies.electronAPI - API d'Electron exposada via preload
   * @param {Function} dependencies.emitEvent - Funció per emetre esdeveniments globals
   */
  constructor(dependencies = {}) {
    this.isAuthenticated = false;
    this.currentCredentials = null;
    this.serverUrl = null;
    this.authToken = null;
    this.currentAbortController = null;

    // Modal elements (lazy loaded)
    this._modal = null;
    this._modalInstance = null;

    // Dependències injectades
    this.electronAPI = dependencies.electronAPI || window.electronAPI;
    this.emitEvent =
      dependencies.emitEvent ||
      ((name, detail) => {
        window.dispatchEvent(new CustomEvent(name, { detail }));
      });
  }

  /**
   * Inicialitza el gestor d'autenticació
   */
  async initialize() {
    console.log("[AUTH] Inicialitzant AuthManager...");

    // Carregar credencials guardades
    await this.loadSavedCredentials();

    // Configurar modal de login
    this.setupLoginModal();

    // Si no estem autenticats, mostrar login
    if (!this.isAuthenticated) {
      this.showLogin();
    }

    console.log("[AUTH] AuthManager inicialitzat");
  }

  /**
   * Carrega les credencials guardades de la configuració
   */
  async loadSavedCredentials() {
    try {
      if (!this.electronAPI?.getConfig) {
        console.log("[AUTH] API de configuració no disponible");
        this.setDefaultValues();
        return false;
      }

      const config = await this.electronAPI.getConfig();

      if (config?.authentication && config?.server) {
        this.serverUrl = config.server.url;
        this.currentCredentials = {
          username: config.authentication.username,
          token: config.authentication.token,
        };

        // Pre-omplir formulari
        this.prefillLoginForm(config);

        // Validar token si existeix
        if (this.currentCredentials.token) {
          return await this.validateToken();
        }
      }
    } catch (error) {
      console.warn("[AUTH] Error carregant credencials guardades:", error);
    }

    this.setDefaultValues();
    return false;
  }

  /**
   * Pre-omple el formulari de login amb les dades guardades
   */
  prefillLoginForm(config) {
    const serverUrlEl = document.getElementById("serverUrl");
    const usernameEl = document.getElementById("username");
    const passwordEl = document.getElementById("password");
    const rememberCheckbox = document.getElementById("rememberCredentials");

    if (serverUrlEl) {
      serverUrlEl.value = this.serverUrl || "http://localhost:4000";
    }
    if (usernameEl) {
      usernameEl.value = this.currentCredentials?.username || "admin";
    }

    // Restaurar contrasenya si està guardada (Base64 obfuscat)
    if (config.authentication?.passwordEnc && passwordEl) {
      try {
        const decoded = atob(config.authentication.passwordEnc);
        passwordEl.value = decoded;
        if (rememberCheckbox) rememberCheckbox.checked = true;
      } catch (e) {
        console.warn(
          "[AUTH] No s'ha pogut decodificar la contrasenya guardada"
        );
      }
    }
  }

  /**
   * Estableix valors per defecte al formulari
   */
  setDefaultValues() {
    const serverUrlEl = document.getElementById("serverUrl");
    const usernameEl = document.getElementById("username");

    if (serverUrlEl) serverUrlEl.value = "http://localhost:4000";
    if (usernameEl) usernameEl.value = "admin";
  }

  /**
   * Valida el token guardat
   */
  async validateToken() {
    if (!this.serverUrl || !this.currentCredentials?.token) {
      return false;
    }

    console.log(
      `[AUTH] Validant token per ${this.currentCredentials.username}`
    );

    // Marcar com autenticat (si el socket falla, ja ho gestionarà ell)
    this.isAuthenticated = true;
    this.authToken = this.currentCredentials.token;

    // Inicialitzar socket
    this.initializeSocketConnection();

    return true;
  }

  /**
   * Configura els event listeners del modal de login
   */
  setupLoginModal() {
    const loginForm = document.getElementById("loginForm");
    const testConnectionBtn = document.getElementById("testConnectionBtn");

    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.performLogin();
      });
    }

    if (testConnectionBtn) {
      testConnectionBtn.addEventListener("click", () => {
        this.testConnection();
      });
    }

    // Tancar modal quan el socket es connecti
    window.addEventListener("socket:ready", () => {
      if (this.isAuthenticated) {
        this.hideLogin();
        this.showLoginSpinner(false);
        this.emitAuthReady();
      }
    });

    // Mostrar error si el socket falla autenticació
    window.addEventListener("socket:auth-error", (event) => {
      // Invalidar credencials
      this.isAuthenticated = false;
      this.authToken = null;

      // Obrir modal si no està obert
      this.showLogin();
      this.showLoginSpinner(false);

      // Mostrar error
      this.showLoginError(
        event.detail?.error || "Error d'autenticació amb el servidor"
      );
    });
  }

  /**
   * Mostra el modal de login
   */
  showLogin() {
    const modal = document.getElementById("loginModal");
    if (!modal) {
      console.error("[AUTH] Modal de login no trobat!");
      return;
    }

    if (!this._modalInstance) {
      this._modalInstance = new bootstrap.Modal(modal, {
        backdrop: "static",
        keyboard: false,
      });
    }

    this._modalInstance.show();
  }

  /**
   * Amaga el modal de login
   */
  hideLogin() {
    if (this._modalInstance) {
      this._modalInstance.hide();
    }
  }

  /**
   * Executa el login
   */
  async performLogin() {
    const serverUrl = document.getElementById("serverUrl")?.value;
    const username = document.getElementById("username")?.value;
    const password = document.getElementById("password")?.value;
    const rememberCredentials = document.getElementById(
      "rememberCredentials"
    )?.checked;

    // Validacions
    if (!serverUrl || !username || !password) {
      this.showLoginError("Omple tots els camps");
      return;
    }

    // Mostrar spinner
    this.showLoginSpinner(true);
    this.hideLoginError();

    // Cancel·lar petició anterior si existeix
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.currentAbortController = new AbortController();

    try {
      // Calcular MD5 de la contrasenya (igual que la versió web)
      const clauMd5 = md5(password);

      // Fer login via API amb el format que espera el servidor
      const response = await fetch(`${serverUrl}/api/v1/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: username, clauMd5 }),
        signal: this.currentAbortController.signal,
      });

      if (!response.ok) {
        throw new Error("Credencials incorrectes o servidor no disponible");
      }

      const data = await response.json();

      // El servidor retorna { authToken: "..." }
      if (!data.authToken) {
        throw new Error("No s'ha rebut token del servidor");
      }

      // Guardar credencials
      this.serverUrl = serverUrl;
      this.authToken = data.authToken;
      this.currentCredentials = { username, token: data.authToken };
      this.isAuthenticated = true;

      // Persistir configuració
      await this.saveCredentials(rememberCredentials ? password : null);

      // Inicialitzar socket (async, no esperem)
      this.initializeSocketConnection();

      // El modal es tancarà quan el socket es connecti (veure setupSocketListeners)
      console.log("[AUTH] Login exitós, esperant connexió socket...");
    } catch (error) {
      console.error("[AUTH] Error en login:", error);
      this.showLoginSpinner(false);

      if (error.name === "AbortError") {
        return; // Petició cancel·lada
      }

      this.showLoginError(error.message);
      this.showLoginSpinner(false);
    }
  }

  /**
   * Prova la connexió amb el servidor
   */
  async testConnection() {
    const serverUrl = document.getElementById("serverUrl")?.value;

    if (!serverUrl) {
      this.showLoginError("Introdueix una URL de servidor");
      return;
    }

    this.showLoginSpinner(true);
    this.hideLoginError();

    // Cancel·lar petició anterior si existeix
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.currentAbortController = new AbortController();

    try {
      // Test amb credencials buides (retornarà 401 però prova connectivitat)
      const response = await fetch(`${serverUrl}/api/v1/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: "", clauMd5: "" }),
        signal: this.currentAbortController.signal,
      });

      // Qualsevol resposta (fins i tot 401) significa que el servidor és accessible
      this.showLoginSuccess("Connexió OK - Servidor PalamSRV accessible");
    } catch (error) {
      if (error.name === "AbortError") {
        return; // Petició cancel·lada
      }
      this.showLoginError(`Error de connexió: ${error.message}`);
    } finally {
      this.showLoginSpinner(false);
      this.currentAbortController = null;
    }
  }

  /**
   * Guarda les credencials a la configuració
   */
  async saveCredentials(password = null) {
    if (!this.electronAPI?.setConfig) {
      console.warn(
        "[AUTH] No es poden guardar credencials (API no disponible)"
      );
      return;
    }

    try {
      const config = {
        server: { url: this.serverUrl },
        authentication: {
          username: this.currentCredentials.username,
          token: this.authToken,
        },
      };

      // Guardar contrasenya ofuscada (NO és segur, només conveniència)
      if (password) {
        config.authentication.passwordEnc = btoa(password);
      }

      await this.electronAPI.setConfig(config);
      console.log("[AUTH] Credencials guardades");
    } catch (error) {
      console.error("[AUTH] Error guardant credencials:", error);
    }
  }

  /**
   * Tanca la sessió
   */
  async logout() {
    console.log("[AUTH] Tancant sessió...");

    this.isAuthenticated = false;
    this.authToken = null;
    this.currentCredentials = null;

    // Netejar configuració
    if (this.electronAPI?.setConfig) {
      await this.electronAPI.setConfig({
        server: { url: this.serverUrl },
        authentication: {},
      });
    }

    // Emetre esdeveniment de logout
    this.emitEvent("auth:logout");

    // Mostrar login
    this.showLogin();
  }

  /**
   * Emet l'esdeveniment d'autenticació completada
   */
  emitAuthReady() {
    this.emitEvent("auth:ready", { credentials: this.getCredentials() });
  }

  /**
   * Inicialitza la connexió socket (serà injectat externament)
   * @param {Function} socketInitializer - Funció per inicialitzar el socket
   */
  setSocketInitializer(socketInitializer) {
    this.socketInitializer = socketInitializer;
  }

  /**
   * Inicialitza la connexió socket
   */
  initializeSocketConnection() {
    if (this.socketInitializer) {
      this.socketInitializer(this.serverUrl, this.currentCredentials);
    }
  }

  /**
   * Retorna les credencials actuals
   */
  getCredentials() {
    return {
      serverUrl: this.serverUrl,
      username: this.currentCredentials?.username,
      token: this.authToken,
    };
  }

  /**
   * Mostra un error al modal de login
   */
  showLoginError(message) {
    const alertEl = document.getElementById("loginAlert");
    const messageEl = document.getElementById("loginErrorMessage");

    if (alertEl && messageEl) {
      messageEl.textContent = message;
      alertEl.classList.remove("d-none");
    }
  }

  /**
   * Amaga l'error del modal de login
   */
  hideLoginError() {
    const alertEl = document.getElementById("loginAlert");
    if (alertEl) {
      alertEl.classList.add("d-none");
    }
  }

  /**
   * Mostra un missatge d'èxit
   */
  showLoginSuccess(message) {
    const alertEl = document.getElementById("loginAlert");
    const messageEl = document.getElementById("loginErrorMessage");

    if (alertEl && messageEl) {
      alertEl.classList.remove("alert-danger", "d-none");
      alertEl.classList.add("alert-success");
      messageEl.textContent = message;

      setTimeout(() => {
        alertEl.classList.add("d-none");
        alertEl.classList.remove("alert-success");
        alertEl.classList.add("alert-danger");
      }, 3000);
    }
  }

  /**
   * Mostra/amaga el spinner de càrrega
   */
  showLoginSpinner(show) {
    const spinner = document.getElementById("loginSpinner");
    const form = document.getElementById("loginForm");
    const loginBtn = document.getElementById("loginBtn");

    if (spinner && form) {
      if (show) {
        spinner.classList.remove("d-none");
        form.classList.add("d-none");
        if (loginBtn) loginBtn.disabled = true;
      } else {
        spinner.classList.add("d-none");
        form.classList.remove("d-none");
        if (loginBtn) loginBtn.disabled = false;
      }
    }
  }
}

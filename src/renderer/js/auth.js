// Authentication manager for PalamMaster
class AuthManager {
  constructor() {
    this.isAuthenticated = false;
    this.currentCredentials = null;
    this.serverUrl = null;
    this.authToken = null;
    // Plain password is only stored in-memory; if user chooses to remember it
    // we persist a Base64 representation (weak obfuscation, NOT secure) in config.
    // SECURITY NOTE: Storing a reversible password locally is a risk. Consider
    // using OS keychain / encrypted storage in a future iteration.
    this.savedPlainPassword = null;

    this.initializeAuth();
  }

  async initializeAuth() {
    // Load saved credentials if available
    await this.loadSavedCredentials();

    // Setup login modal handlers
    this.setupLoginModal();

    // Check if we need to show login
    if (!this.isAuthenticated) {
      this.showLogin();
    }
  }

  async loadSavedCredentials() {
    try {
      if (window.electronAPI && window.electronAPI.getConfig) {
        const config = await window.electronAPI.getConfig();
        if (config && config.authentication && config.server) {
          this.serverUrl = config.server.url;
          this.currentCredentials = {
            username: config.authentication.username,
            token: config.authentication.token,
          };

          // Pre-fill login form if elements exist
          const serverUrlEl = document.getElementById("serverUrl");
          const usernameEl = document.getElementById("username");

          if (serverUrlEl) {
            serverUrlEl.value = this.serverUrl || "http://localhost:4000";
          }
          if (usernameEl) {
            usernameEl.value = this.currentCredentials.username || "admin";
          }

          // Restore remembered password if present
          const passwordEl = document.getElementById("password");
          const rememberCheckbox = document.getElementById(
            "rememberCredentials"
          );
          if (config.authentication.passwordEnc && passwordEl) {
            try {
              const decoded = atob(config.authentication.passwordEnc);
              passwordEl.value = decoded;
              this.savedPlainPassword = decoded;
              if (rememberCheckbox) rememberCheckbox.checked = true;
            } catch (e) {
              console.warn(
                "[AUTH] No s'ha pogut decodificar la contrasenya guardada",
                e
              );
            }
          }

          // If we have a token, try to validate it
          if (this.currentCredentials.token) {
            return await this.validateToken();
          }
        }
      }
    } catch (error) {
      console.warn("Error loading saved credentials:", error);
    }

    // Set default values if elements exist
    const serverUrlEl = document.getElementById("serverUrl");
    const usernameEl = document.getElementById("username");

    if (serverUrlEl) {
      serverUrlEl.value = "http://localhost:4000";
    }
    if (usernameEl) {
      usernameEl.value = "admin";
    }

    return false;
  }

  async validateToken() {
    if (!this.serverUrl || !this.currentCredentials?.token) {
      console.log(
        `🔍 [AUTH] No es pot validar token - serverUrl: ${
          this.serverUrl
        }, token: ${this.currentCredentials?.token ? "PRESENT" : "ABSENT"}`
      );
      return false;
    }

    console.log(
      `🔍 [AUTH] Validant token per usuari: ${this.currentCredentials.username}`
    );
    console.log(
      `🔗 [AUTH] URL validació: ${this.serverUrl}/api/v1/admin/validate`
    );

    // Skip validation since API doesn't have validate endpoint
    // Just assume saved tokens are valid and let socket connection handle validation
    console.log(`✅ [AUTH] Credencials trobades - assumint token vàlid`);

    this.isAuthenticated = true;
    this.authToken = this.currentCredentials.token;
    this.hideLogin();
    try {
      window.dispatchEvent(
        new CustomEvent("auth:ready", {
          detail: { credentials: this.getCredentials() },
        })
      );
    } catch (e) {
      console.warn("[AUTH] No s'ha pogut emetre auth:ready", e);
    }
    // Si ja estem autenticats per token reutilitzat, mostra la vista d'inici
    if (window.viewManager) {
      window.viewManager.loadView("home");
    }
    // Defer socket connection (wait a tick so window.updateSocketCredentials exists)
    setTimeout(() => {
      if (window.updateSocketCredentials) {
        window.updateSocketCredentials(this.serverUrl, this.currentCredentials);
      }
    }, 50);
    return true;

    return false;
  }

  setupLoginModal() {
    const loginForm = document.getElementById("loginForm");
    const testConnectionBtn = document.getElementById("testConnectionBtn");
    const loginBtn = document.getElementById("loginBtn");
    const passwordEl = document.getElementById("password");

    if (!loginForm || !testConnectionBtn || !loginBtn || !passwordEl) {
      console.warn("Login modal elements not found, deferring setup");
      return;
    }

    // Test connection button
    testConnectionBtn.addEventListener("click", async () => {
      const serverUrl = document.getElementById("serverUrl").value;
      await this.testConnection(serverUrl);
    });

    // Login form submission
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      await this.performLogin();
    });

    // Enter key handling
    passwordEl.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.performLogin();
      }
    });
  }

  async testConnection(serverUrl) {
    if (!serverUrl || serverUrl.trim() === "") {
      this.showError("Si us plau, introdueix la URL del servidor");
      return;
    }

    // Ensure serverUrl has protocol
    if (!serverUrl.startsWith("http://") && !serverUrl.startsWith("https://")) {
      serverUrl = "http://" + serverUrl;
    }

    console.log(`🔗 [AUTH] Test connexió a: ${serverUrl}/api/v1/admin/login`);
    this.showSpinner("Provant connexió...");

    try {
      // Test connection with empty credentials (should return 401 but proves server is reachable)
      const response = await fetch(`${serverUrl}/api/v1/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user: "", clauMd5: "" }),
      });

      console.log(`📊 [AUTH] Resposta test connexió:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
      });

      // Any response (even 401) means server is reachable
      this.hideSpinner();
      this.showSuccess(`Connexió OK - Servidor PalamSRV accessible`);
    } catch (error) {
      console.error(`❌ [AUTH] Error test connexió:`, error);
      this.hideSpinner();
      this.showError(`Error de connexió: ${error.message}`);
    }
  }

  async performLogin() {
    let serverUrl = document.getElementById("serverUrl").value;
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const rememberCredentials = document.getElementById(
      "rememberCredentials"
    ).checked;

    if (!serverUrl || !username || !password) {
      this.showError("Si us plau, omple tots els camps");
      return;
    }

    // Ensure serverUrl has protocol
    if (!serverUrl.startsWith("http://") && !serverUrl.startsWith("https://")) {
      serverUrl = "http://" + serverUrl;
    }

    console.log(`🔑 [AUTH] Intentant login a: ${serverUrl}/api/v1/admin/login`);
    console.log(`👤 [AUTH] Usuari: ${username}`);
    console.log(`💾 [AUTH] Recordar credencials: ${rememberCredentials}`);

    this.showSpinner("Autenticant...");

    // Calculate MD5 hash of password (same as original web version)
    const clauMd5 = md5(password);

    const loginPayload = {
      user: username,
      clauMd5: clauMd5,
    };

    console.log(`📤 [AUTH] Payload de login:`, {
      user: username,
      clauMd5: "***MD5***",
    });

    try {
      const response = await fetch(`${serverUrl}/api/v1/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginPayload),
      });

      console.log(`📊 [AUTH] Resposta login:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url,
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`📥 [AUTH] Dades rebudes del login:`, {
          ...data,
          authToken: data.authToken ? "***TOKEN***" : "NO_TOKEN",
        });

        // Check if we have authToken (same logic as original web version)
        if (data.authToken) {
          console.log(`✅ [AUTH] Login correcte! Guardant credencials...`);

          // Save credentials
          this.serverUrl = serverUrl;
          this.currentCredentials = {
            username: username,
            token: data.authToken,
          };
          this.authToken = data.authToken;
          this.isAuthenticated = true;

          // Save to config if requested
          if (rememberCredentials) {
            console.log(`💾 [AUTH] Guardant credencials a la configuració...`);
            // Store plain password in memory for saveCredentials(); persisted encoded.
            this.savedPlainPassword = password;
            await this.saveCredentials();
          } else {
            // If user unchecked, ensure we clear any previously stored password
            this.savedPlainPassword = null;
            await this.saveCredentials(/*clearPassword=*/ true);
          }

          // Update socket connection
          console.log(`🔌 [AUTH] Actualitzant connexió socket...`);
          await this.updateSocketConnection(); // ara només si autenticat

          this.hideLogin();
          this.showSuccess("Autenticació correcta!");
          try {
            window.dispatchEvent(
              new CustomEvent("auth:ready", {
                detail: { credentials: this.getCredentials() },
              })
            );
          } catch (e) {
            console.warn("[AUTH] No s'ha pogut emetre auth:ready (login)", e);
          }
          if (window.viewManager) {
            window.viewManager.loadView("home");
          }
        } else {
          console.error(`❌ [AUTH] Login fallit - no authToken:`, data);
          throw new Error("Credencials incorrectes");
        }
      } else {
        const errorText = await response.text();
        console.error(`❌ [AUTH] Error HTTP ${response.status}:`, errorText);
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`❌ [AUTH] Error login:`, error);
      this.hideSpinner();
      this.showError(`Error d'autenticació: ${error.message}`);
    }
  }

  async saveCredentials() {
    if (!window.electronAPI || !window.electronAPI.setConfig) {
      return;
    }

    try {
      const config = (await window.electronAPI.getConfig()) || {};

      config.server = {
        ...config.server,
        url: this.serverUrl,
        port: new URL(this.serverUrl).port || 4000,
      };

      config.authentication = {
        ...config.authentication,
        username: this.currentCredentials.username,
        token: this.currentCredentials.token,
        // Persist Base64 version of password only if user opted in
        ...(this.savedPlainPassword
          ? { passwordEnc: btoa(this.savedPlainPassword) }
          : { passwordEnc: undefined }),
      };

      await window.electronAPI.setConfig(config);
    } catch (error) {
      console.warn("Error saving credentials:", error);
    }
  }

  async updateSocketConnection() {
    if (!this.isAuthenticated || !this.currentCredentials?.token) {
      console.log(
        "[AUTH] updateSocketConnection ignorat (no autenticat o sense token)"
      );
      return;
    }
    if (window.updateSocketCredentials) {
      window.updateSocketCredentials(this.serverUrl, this.currentCredentials);
    } else {
      console.log("[AUTH] updateSocketCredentials no disponible encara");
    }
  }

  showLogin() {
    const loginModal = new bootstrap.Modal(
      document.getElementById("loginModal"),
      {
        backdrop: "static",
        keyboard: false,
      }
    );
    loginModal.show();
  }

  hideLogin() {
    const loginModalEl = document.getElementById("loginModal");
    const loginModal = bootstrap.Modal.getInstance(loginModalEl);

    // Force hide immediately
    if (loginModal) {
      loginModal.hide();
    }

    // Also directly hide the modal element
    if (loginModalEl) {
      loginModalEl.style.display = "none";
      loginModalEl.classList.remove("show");
      loginModalEl.setAttribute("aria-hidden", "true");
    }

    // Aggressive cleanup of all modal-related elements and classes
    const cleanup = () => {
      // Remove ALL modal backdrops
      const backdrops = document.querySelectorAll(".modal-backdrop");
      backdrops.forEach((backdrop) => backdrop.remove());

      // Clean up body classes and styles
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";

      // Remove any lingering modal classes
      document.documentElement.classList.remove("modal-open");
    };

    // Run cleanup immediately and after a delay
    cleanup();
    setTimeout(cleanup, 100);
    setTimeout(cleanup, 300);
    setTimeout(cleanup, 500);
  }

  showSpinner(message) {
    const spinner = document.getElementById("loginSpinner");
    const spinnerText = spinner.querySelector("p");
    if (spinnerText) {
      spinnerText.textContent = message;
    }
    spinner.classList.remove("d-none");

    document.getElementById("loginBtn").disabled = true;
    document.getElementById("testConnectionBtn").disabled = true;
  }

  hideSpinner() {
    document.getElementById("loginSpinner").classList.add("d-none");
    document.getElementById("loginBtn").disabled = false;
    document.getElementById("testConnectionBtn").disabled = false;
  }

  showError(message) {
    const alert = document.getElementById("loginAlert");
    const errorMessage = document.getElementById("loginErrorMessage");

    errorMessage.textContent = message;
    alert.classList.remove("d-none", "alert-success");
    alert.classList.add("alert-danger");

    // Hide after 5 seconds
    setTimeout(() => {
      alert.classList.add("d-none");
    }, 5000);
  }

  showSuccess(message) {
    const alert = document.getElementById("loginAlert");
    const errorMessage = document.getElementById("loginErrorMessage");

    errorMessage.textContent = message;
    alert.classList.remove("d-none", "alert-danger");
    alert.classList.add("alert-success");

    // Hide after 3 seconds
    setTimeout(() => {
      alert.classList.add("d-none");
    }, 3000);
  }

  logout() {
    this.isAuthenticated = false;
    this.currentCredentials = null;
    this.authToken = null;
    this.savedPlainPassword = null;

    // Clear saved credentials
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");

    // Best-effort removal of stored password in config
    if (window.electronAPI?.getConfig && window.electronAPI?.setConfig) {
      (async () => {
        try {
          const cfg = (await window.electronAPI.getConfig()) || {};
          if (cfg.authentication && cfg.authentication.passwordEnc) {
            delete cfg.authentication.passwordEnc;
            await window.electronAPI.setConfig(cfg);
          }
        } catch (e) {
          console.warn(
            "[AUTH] No s'ha pogut eliminar la contrasenya guardada:",
            e
          );
        }
      })();
    }

    // Show login again
    this.showLogin();
  }

  getCredentials() {
    return {
      serverUrl: this.serverUrl,
      username: this.currentCredentials?.username,
      token: this.authToken,
    };
  }
}

// Make AuthManager globally available
window.AuthManager = AuthManager;

// Initialize authentication manager
let authManager;

document.addEventListener("DOMContentLoaded", () => {
  authManager = new AuthManager();

  // Make auth manager globally available
  window.authManager = authManager;
});

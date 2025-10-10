/**
 * Auth View - Vista del modal d'autenticació
 * Gestiona la UI del login modal
 */

/**
 * Inicialitza la vista d'autenticació
 * @param {object} authManager - Instància de AuthManager
 * @returns {object} - Objecte amb funció destroy
 */
export async function init(authManager) {
  console.log("[AUTH_VIEW] Inicialitzant vista d'autenticació...");

  if (!authManager) {
    throw new Error("[AUTH_VIEW] AuthManager és requerit");
  }

  // Setup form validation
  setupFormValidation();

  // Setup keyboard shortcuts
  const keyboardCleanup = setupKeyboardShortcuts(authManager);

  // Setup focus management
  const focusCleanup = setupFocusManagement();

  // Return destroy function
  return {
    destroy() {
      console.log("[AUTH_VIEW] Destruint vista d'autenticació...");
      keyboardCleanup();
      focusCleanup();
    },
  };
}

/**
 * Configura la validació del formulari de login
 */
function setupFormValidation() {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  const usernameInput = document.getElementById("loginUsername");
  const passwordInput = document.getElementById("loginPassword");

  // Validació en temps real
  if (usernameInput) {
    usernameInput.addEventListener("input", () => {
      validateUsername(usernameInput);
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("input", () => {
      validatePassword(passwordInput);
    });
  }
}

/**
 * Valida el camp d'usuari
 */
function validateUsername(input) {
  const value = input.value.trim();
  const feedback = input.parentElement.querySelector(".invalid-feedback");

  if (value.length === 0) {
    input.classList.remove("is-valid");
    input.classList.add("is-invalid");
    if (feedback) feedback.textContent = "L'usuari és obligatori";
    return false;
  }

  if (value.length < 3) {
    input.classList.remove("is-valid");
    input.classList.add("is-invalid");
    if (feedback)
      feedback.textContent = "L'usuari ha de tenir almenys 3 caràcters";
    return false;
  }

  input.classList.remove("is-invalid");
  input.classList.add("is-valid");
  return true;
}

/**
 * Valida el camp de contrasenya
 */
function validatePassword(input) {
  const value = input.value;
  const feedback = input.parentElement.querySelector(".invalid-feedback");

  if (value.length === 0) {
    input.classList.remove("is-valid");
    input.classList.add("is-invalid");
    if (feedback) feedback.textContent = "La contrasenya és obligatòria";
    return false;
  }

  input.classList.remove("is-invalid");
  input.classList.add("is-valid");
  return true;
}

/**
 * Configura els shortcuts de teclat
 */
function setupKeyboardShortcuts(authManager) {
  const handleKeydown = (e) => {
    // Enter per enviar el formulari
    if (
      e.key === "Enter" &&
      document.getElementById("loginModal")?.classList.contains("show")
    ) {
      e.preventDefault();
      const loginButton = document.getElementById("loginButton");
      if (loginButton && !loginButton.disabled) {
        loginButton.click();
      }
    }

    // Escape per tancar el modal (si està autenticat)
    if (e.key === "Escape" && authManager.isAuthenticated) {
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("loginModal")
      );
      modal?.hide();
    }
  };

  document.addEventListener("keydown", handleKeydown);

  // Return cleanup function
  return () => {
    document.removeEventListener("keydown", handleKeydown);
  };
}

/**
 * Configura la gestió del focus
 */
function setupFocusManagement() {
  const modal = document.getElementById("loginModal");
  if (!modal) return () => {};

  const handleShown = () => {
    // Focus al camp d'usuari quan s'obre el modal
    const usernameInput = document.getElementById("loginUsername");
    if (usernameInput) {
      setTimeout(() => usernameInput.focus(), 100);
    }
  };

  modal.addEventListener("shown.bs.modal", handleShown);

  // Return cleanup function
  return () => {
    modal.removeEventListener("shown.bs.modal", handleShown);
  };
}

/**
 * Mostra un error al formulari de login
 * @param {string} message - Missatge d'error
 */
export function showLoginError(message) {
  const errorDiv = document.getElementById("loginError");
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
  }
}

/**
 * Amaga l'error del formulari de login
 */
export function hideLoginError() {
  const errorDiv = document.getElementById("loginError");
  if (errorDiv) {
    errorDiv.textContent = "";
    errorDiv.style.display = "none";
  }
}

/**
 * Mostra l'indicador de càrrega al botó de login
 * @param {boolean} loading - Si s'està carregant
 */
export function setLoginLoading(loading) {
  const loginButton = document.getElementById("loginButton");
  const spinner = loginButton?.querySelector(".spinner-border");
  const buttonText = loginButton?.querySelector(".button-text");

  if (!loginButton) return;

  if (loading) {
    loginButton.disabled = true;
    if (spinner) spinner.classList.remove("d-none");
    if (buttonText) buttonText.textContent = "Connectant...";
  } else {
    loginButton.disabled = false;
    if (spinner) spinner.classList.add("d-none");
    if (buttonText) buttonText.textContent = "Entrar";
  }
}

/**
 * Neteja el formulari de login
 */
export function clearLoginForm() {
  const usernameInput = document.getElementById("loginUsername");
  const passwordInput = document.getElementById("loginPassword");

  if (usernameInput) {
    usernameInput.value = "";
    usernameInput.classList.remove("is-valid", "is-invalid");
  }

  if (passwordInput) {
    passwordInput.value = "";
    passwordInput.classList.remove("is-valid", "is-invalid");
  }

  hideLoginError();
}

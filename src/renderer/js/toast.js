// Sistema de toasts global per tota l'aplicació
// Proporciona notificacions visuals no intrusives

/**
 * Mostra un toast (notificació temporal)
 * @param {string} text - Text a mostrar
 * @param {number} timeoutMs - Durada en mil·lisegons (per defecte 3000)
 * @param {string} type - Tipus de toast: 'info', 'success', 'warning', 'error' (per defecte 'info')
 */
function showToast(text, type = "info", timeoutMs = 4000) {
  console.log("Toast [", type, "]:", text);
  // Crear contenidor de toasts si no existeix
  let toastContainer = document.getElementById("global-toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "global-toast-container";
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  // Determinar color segons el tipus
  const colors = {
    info: { bg: "#333333", border: "#555" },
    success: { bg: "#28a745", border: "#1e7e34" },
    warning: { bg: "#ffc107", border: "#e0a800" },
    error: { bg: "#dc3546", border: "#bd2130" },
  };
  const color = colors[type] || colors.info;

  const toast = document.createElement("div");
  toast.className = "toast-item";
  toast.style.cssText = `
    background: ${color.bg};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    border: 1px solid ${color.border};
    text-align: center;
    opacity: 0;
    transform: translateY(-20px);
    transition: all 0.3s ease;
    pointer-events: auto;
    word-wrap: break-word;
    margin-bottom: 8px;
    max-width: 400px;
  `;
  toast.textContent = text;

  // Afegir toast al contenidor
  toastContainer.appendChild(toast);

  // Animar entrada
  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  }, 10);

  // Animar sortida i eliminar
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-20px)";
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
        // Eliminar contenidor si està buit
        if (toastContainer.children.length === 0) {
          toastContainer.remove();
        }
      }
    }, 300);
  }, timeoutMs);
}

/**
 * Mostra un toast d'èxit
 * @param {string} text - Text a mostrar
 * @param {number} timeoutMs - Durada en mil·lisegons
 */
function showSuccessToast(text, timeoutMs = 2000) {
  showToast(text, "success", timeoutMs);
}

/**
 * Mostra un toast d'advertència
 * @param {string} text - Text a mostrar
 * @param {number} timeoutMs - Durada en mil·lisegons
 */
function showWarningToast(text, timeoutMs = 4000) {
  showToast(text, "warning", timeoutMs);
}

/**
 * Mostra un toast d'error
 * @param {string} text - Text a mostrar
 * @param {number} timeoutMs - Durada en mil·lisegons
 */
function showErrorToast(text, timeoutMs = 4000) {
  showToast(text, "error", timeoutMs);
}

/**
 * Funció auxiliar per detectar si una sidebar està visible
 * Útil per ajustar la posició dels toasts
 */
function isSidebarVisible() {
  const sidebar =
    document.querySelector('.sidebar-panel[style*="display: flex"]') ||
    document.querySelector('.sidebar-panel[style*="display: block"]') ||
    document.querySelector('#castSidebar[style*="display: flex"]');
  return !!sidebar;
}

// Fer les funcions globals
if (typeof window !== "undefined") {
  window.showToast = showToast;
  window.showSuccessToast = showSuccessToast;
  window.showWarningToast = showWarningToast;
  window.showErrorToast = showErrorToast;
}

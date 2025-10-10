/**
 * DOM Helpers - Utilitats per manipular el DOM de forma segura i eficient
 */

/**
 * Selecciona un element del DOM de forma segura
 * @param {string} selector - Selector CSS
 * @param {Element} context - Context de cerca (opcional, per defecte document)
 * @returns {Element|null}
 */
export function $(selector, context = document) {
  try {
    return context.querySelector(selector);
  } catch (error) {
    console.warn(`[DOM] Error amb selector '${selector}':`, error);
    return null;
  }
}

/**
 * Selecciona múltiples elements del DOM
 * @param {string} selector - Selector CSS
 * @param {Element} context - Context de cerca
 * @returns {Array<Element>}
 */
export function $$(selector, context = document) {
  try {
    return Array.from(context.querySelectorAll(selector));
  } catch (error) {
    console.warn(`[DOM] Error amb selector '${selector}':`, error);
    return [];
  }
}

/**
 * Crea un element amb atributs i fills opcionals
 * @param {string} tag - Nom del tag HTML
 * @param {object} attrs - Atributs de l'element
 * @param {Array<Element|string>} children - Fills de l'element
 * @returns {Element}
 */
export function createElement(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);

  // Establir atributs
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "className") {
      element.className = value;
    } else if (key === "style" && typeof value === "object") {
      Object.assign(element.style, value);
    } else if (key.startsWith("on") && typeof value === "function") {
      // Event listeners
      const eventName = key.substring(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else {
      element.setAttribute(key, value);
    }
  }

  // Afegir fills
  for (const child of children) {
    if (typeof child === "string") {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Element) {
      element.appendChild(child);
    }
  }

  return element;
}

/**
 * Esborra tots els fills d'un element
 * @param {Element} element - Element a netejar
 */
export function clearElement(element) {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Mostra un element (elimina classe d-none o hidden)
 * @param {Element|string} element - Element o selector
 */
export function showElement(element) {
  const el = typeof element === "string" ? $(element) : element;
  if (!el) return;

  el.classList.remove("d-none", "hidden");
  el.style.display = "";
}

/**
 * Amaga un element (afegeix classe d-none)
 * @param {Element|string} element - Element o selector
 */
export function hideElement(element) {
  const el = typeof element === "string" ? $(element) : element;
  if (!el) return;

  el.classList.add("d-none");
}

/**
 * Alterna la visibilitat d'un element
 * @param {Element|string} element - Element o selector
 */
export function toggleElement(element) {
  const el = typeof element === "string" ? $(element) : element;
  if (!el) return;

  if (el.classList.contains("d-none") || el.style.display === "none") {
    showElement(el);
  } else {
    hideElement(el);
  }
}

/**
 * Afegeix un event listener amb auto-neteja
 * @param {Element} element - Element
 * @param {string} event - Nom de l'esdeveniment
 * @param {function} handler - Handler
 * @param {object} options - Opcions addEventListener
 * @returns {function} - Funció per eliminar el listener
 */
export function addListener(element, event, handler, options = {}) {
  if (!element || !event || typeof handler !== "function") {
    console.warn("[DOM] addListener: paràmetres invàlids");
    return () => {};
  }

  element.addEventListener(event, handler, options);

  return () => {
    element.removeEventListener(event, handler, options);
  };
}

/**
 * Delegació d'esdeveniments (event delegation)
 * @param {Element} parent - Element pare
 * @param {string} event - Nom de l'esdeveniment
 * @param {string} selector - Selector dels fills
 * @param {function} handler - Handler
 * @returns {function} - Funció per eliminar el listener
 */
export function delegate(parent, event, selector, handler) {
  const listener = (e) => {
    const target = e.target.closest(selector);
    if (target && parent.contains(target)) {
      handler.call(target, e);
    }
  };

  parent.addEventListener(event, listener);

  return () => {
    parent.removeEventListener(event, listener);
  };
}

/**
 * Espera que un element aparegui al DOM
 * @param {string} selector - Selector CSS
 * @param {number} timeout - Temps màxim d'espera (ms)
 * @returns {Promise<Element>}
 */
export function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = $(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = $(selector);
      if (el) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(
        new Error(`Element '${selector}' no trobat després de ${timeout}ms`)
      );
    }, timeout);
  });
}

/**
 * Insereix HTML de forma segura (evitant XSS si és necessari)
 * @param {Element} element - Element contenidor
 * @param {string} html - HTML a inserir
 * @param {boolean} sanitize - Si cal netejar HTML
 */
export function setInnerHTML(element, html, sanitize = false) {
  if (!element) return;

  if (sanitize) {
    // Versió simple de sanitització (millor usar DOMPurify en producció)
    const div = document.createElement("div");
    div.textContent = html;
    element.innerHTML = div.innerHTML;
  } else {
    element.innerHTML = html;
  }
}

/**
 * Desplaça la vista fins a un element
 * @param {Element|string} element - Element o selector
 * @param {object} options - Opcions de scrollIntoView
 */
export function scrollToElement(element, options = {}) {
  const el = typeof element === "string" ? $(element) : element;
  if (!el) return;

  const defaultOptions = {
    behavior: "smooth",
    block: "start",
    ...options,
  };

  el.scrollIntoView(defaultOptions);
}

/**
 * Comprova si un element és visible al viewport
 * @param {Element} element - Element a comprovar
 * @returns {boolean}
 */
export function isElementInViewport(element) {
  if (!element) return false;

  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <=
      (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Obté el valor d'un input de forma segura
 * @param {string} selector - Selector de l'input
 * @param {string} defaultValue - Valor per defecte
 * @returns {string}
 */
export function getInputValue(selector, defaultValue = "") {
  const input = $(selector);
  return input?.value?.trim() || defaultValue;
}

/**
 * Estableix el valor d'un input
 * @param {string} selector - Selector de l'input
 * @param {string} value - Valor a establir
 */
export function setInputValue(selector, value) {
  const input = $(selector);
  if (input) {
    input.value = value;
  }
}

/**
 * Crea i mostra un modal de Bootstrap
 * @param {string} modalId - ID del modal
 * @param {object} options - Opcions del modal
 * @returns {object|null} - Instància del modal de Bootstrap
 */
export function createBootstrapModal(modalId, options = {}) {
  const modalEl = $(`#${modalId}`);
  if (!modalEl) {
    console.warn(`[DOM] Modal '${modalId}' no trobat`);
    return null;
  }

  try {
    return new bootstrap.Modal(modalEl, options);
  } catch (error) {
    console.error(`[DOM] Error creant modal '${modalId}':`, error);
    return null;
  }
}

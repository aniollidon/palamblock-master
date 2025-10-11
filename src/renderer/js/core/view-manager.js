/**
 * ViewManager - Gestor de múltiples vistes amb arquitectura SPA
 * Gestiona la navegació, lifecycle (init/destroy) i transicions entre vistes
 */
export class ViewManager {
  /**
   * @param {Object} dependencies - Dependències injectades
   * @param {Object} dependencies.authManager - Gestor d'autenticació
   * @param {Function} dependencies.emitEvent - Funció per emetre esdeveniments globals
   */
  constructor(dependencies = {}) {
    this.currentView = null;
    this.currentInstance = null;
    this.viewInstances = new Map();

    // Dependències injectades
    this.authManager = dependencies.authManager;
    this.emitEvent =
      dependencies.emitEvent ||
      ((name, detail) => {
        window.dispatchEvent(new CustomEvent(name, { detail }));
      });

    // Configuració de vistes disponibles
    this.views = {
      home: {
        title: "PalamBlock Admin",
        templateFile: "views/home.html",
      },
      browsers: {
        title: "PalamBlock Admin - Navegadors",
        templateFile: "views/browsers.html",
      },
      screens: {
        title: "PalamBlock Admin - Pantalles",
        templateFile: "views/screens.html",
      },
      gestio: {
        title: "PalamBlock Admin - Gestió",
        templateFile: "views/gestio.html",
      },
    };

    // Configurar navegació global
    this.setupNavigationHandlers();
  }

  /**
   * Configura els handlers globals de navegació per delegació d'esdeveniments
   */
  setupNavigationHandlers() {
    document.addEventListener("click", (e) => {
      const target = e.target.closest("[data-view-navigate]");
      if (target) {
        e.preventDefault();
        const viewName = target.dataset.viewNavigate;
        this.loadView(viewName);
      }
    });
  }

  /**
   * Carrega una vista per nom
   * @param {string} viewName - Nom de la vista a carregar
   * @param {object} options - Opcions addicionals (params, etc.)
   */
  async loadView(viewName, options = {}) {
    if (!this.views[viewName]) {
      console.error(`[VIEW] Vista '${viewName}' no existeix`);
      return;
    }

    console.log(`[VIEW] Carregant vista: ${viewName}`);

    try {
      // 1. Destruir vista actual
      await this.destroyCurrentView();

      // 2. Canviar títol de la finestra
      document.title = this.views[viewName].title;

      // 3. Carregar HTML de la plantilla
      const html = await this.loadTemplate(this.views[viewName].templateFile);

      // 4. Injectar HTML al contenidor principal
      const mainContent =
        document.getElementById("appMain") || document.querySelector("main");
      if (!mainContent) {
        throw new Error("Contenidor principal #appMain no trobat");
      }
      mainContent.innerHTML = html;

      // 5. Inicialitzar la vista específica (lògica migrada de l'antic view-manager)
      await this.initializeView(viewName, options);

      // 6. Actualitzar estat
      this.currentView = viewName;

      // 7. Emetre esdeveniment de canvi de vista
      this.emitEvent("view:changed", { view: viewName, options });

      console.log(`[VIEW] Vista '${viewName}' carregada correctament`);
    } catch (error) {
      console.error(`[VIEW] Error carregant vista '${viewName}':`, error);
      this.showErrorView(error.message);
    }
  }

  /**
   * Inicialitza una vista específica amb la seva lògica pròpia
   * @param {string} viewName - Nom de la vista
   * @param {object} options - Opcions de la vista
   */
  async initializeView(viewName, options = {}) {
    switch (viewName) {
      case "home": {
        const homeViewModule = await import("../views/home/home-view.js");
        this.currentInstance = await homeViewModule.init(options);
        this.viewInstances.set("home", this.currentInstance);

        // Actualitzar info d'usuari si està disponible
        this.updateHomeUserInfo();
        break;
      }

      case "browsers": {
        const browsersViewModule = await import(
          "../views/browsers/browsers-view.js"
        );
        this.currentInstance = await browsersViewModule.init(options);
        this.viewInstances.set("browsers", this.currentInstance);
        break;
      }

      case "screens": {
        const screensViewModule = await import(
          "../views/screens/screens-view.js"
        );
        this.currentInstance = await screensViewModule.init(options);
        this.viewInstances.set("screens", this.currentInstance);
        break;
      }

      case "gestio": {
        const gestioViewModule = await import("../views/gestio/gestio-view.js");
        this.currentInstance = await gestioViewModule.init(options);
        this.viewInstances.set("gestio", this.currentInstance);

        // Configurar navegació de gestió
        this.setupGestioNavigation();
        break;
      }

      default:
        console.warn(
          `[VIEW] No hi ha inicialització específica per a la vista '${viewName}'`
        );
    }

    // Executar scripts inline si hi ha (per compatibilitat amb plantilles antigues)
    this.executeInlineScripts();
  }

  /**
   * Actualitza la informació d'usuari a la vista home
   */
  updateHomeUserInfo() {
    const userInfoElement = document.getElementById("userInfo");
    if (!userInfoElement) return;

    if (this.authManager?.currentCredentials?.username) {
      userInfoElement.textContent = `Usuari: ${
        this.authManager.currentCredentials.username || "Administrador"
      }`;
    }
  }

  /**
   * Executa scripts inline dins de les plantilles carregades (compatibilitat legacy)
   */
  executeInlineScripts() {
    const mainContent =
      document.getElementById("appMain") || document.querySelector("main");
    if (!mainContent) return;

    const scripts = mainContent.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");

      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }

      if (oldScript.type) {
        newScript.type = oldScript.type;
      }

      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }

  /**
   * Configura la navegació específica de la vista de gestió
   */
  setupGestioNavigation() {
    document.addEventListener("click", (e) => {
      const target = e.target.closest("[data-gestio-section]");
      if (target) {
        e.preventDefault();
        const section = target.dataset.gestioSection;
        this.loadGestioSection(section);
      }
    });
  }

  /**
   * Carrega una secció de gestió
   */
  async loadGestioSection(section) {
    console.log(`[VIEW] Carregant secció de gestió: ${section}`);
    // TODO: Implementar càrrega de seccions de gestió
  }

  /**
   * Carrega una plantilla HTML
   * @param {string} templateFile - Ruta al fitxer de plantilla
   * @returns {Promise<string>} - Contingut HTML
   */
  async loadTemplate(templateFile) {
    const response = await fetch(templateFile);
    if (!response.ok) {
      throw new Error(
        `Error carregant plantilla: ${response.status} ${response.statusText}`
      );
    }
    return await response.text();
  }

  /**
   * Destrueix la vista actual si existeix
   */
  async destroyCurrentView() {
    if (!this.currentView || !this.currentInstance) {
      return;
    }

    console.log(`[VIEW] Destruint vista: ${this.currentView}`);

    try {
      if (typeof this.currentInstance.destroy === "function") {
        await this.currentInstance.destroy();
      }
    } catch (error) {
      console.error(
        `[VIEW] Error destruint vista '${this.currentView}':`,
        error
      );
    }

    this.currentInstance = null;
  }

  /**
   * Neteja la vista actual sense carregar-ne una de nova
   */
  async clearCurrentView() {
    await this.destroyCurrentView();

    const mainContent =
      document.getElementById("appMain") || document.querySelector("main");
    if (mainContent) {
      mainContent.innerHTML = "";
    }

    this.currentView = null;
  }

  /**
   * Mostra una vista d'error
   * @param {string} errorMessage - Missatge d'error a mostrar
   */
  showErrorView(errorMessage) {
    const mainContent =
      document.getElementById("appMain") || document.querySelector("main");
    if (!mainContent) return;

    mainContent.innerHTML = `
      <div class="d-flex justify-content-center align-items-center" style="height: 100vh;">
        <div class="text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" 
               class="bi bi-exclamation-triangle text-warning mb-3" viewBox="0 0 16 16">
            <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.2.2 0 0 1-.054.06.1.1 0 0 1-.066.017H1.146a.1.1 0 0 1-.066-.017.2.2 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057m1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767z"/>
            <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
          </svg>
          <h4>Error carregant la vista</h4>
          <p class="text-muted">${this.escapeHtml(errorMessage)}</p>
          <button class="btn btn-primary" data-view-navigate="home">
            Torna a l'inici
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Escapa HTML per evitar XSS
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Retorna el nom de la vista actual
   */
  getCurrentView() {
    return this.currentView;
  }

  /**
   * Navega a una vista (alias de loadView)
   */
  navigateTo(viewName, options = {}) {
    return this.loadView(viewName, options);
  }
}

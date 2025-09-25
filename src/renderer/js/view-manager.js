// View Manager - Gestió de múltiples vistes a Electron
class ViewManager {
  constructor() {
    this.currentView = "browsers";
    this.views = {
      browsers: {
        title: "PalamBlock Admin - Navegadors",
        templateFile: "views/browsers.html",
      },
      screens: {
        title: "PalamBlock Admin - Pantalles",
        templateFile: "views/screens.html",
      },
    };
    this.viewInstances = new Map();
  }

  async loadView(viewName) {
    if (!this.views[viewName]) {
      console.error(`❌ [VIEW] Vista ${viewName} no existeix`);
      return;
    }

    console.log(`🔄 [VIEW] Carregant vista: ${viewName}`);

    try {
      // Canvia el títol de la finestra
      document.title = this.views[viewName].title;

      // Destrueix la vista anterior si existeix
      if (this.currentView && this.viewInstances.has(this.currentView)) {
        const currentInstance = this.viewInstances.get(this.currentView);
        if (currentInstance && typeof currentInstance.destroy === "function") {
          currentInstance.destroy();
        }
      }

      // Carrega el contingut de la vista
      const response = await fetch(this.views[viewName].templateFile);
      const html = await response.text();

      // Substitueix el contingut principal
      const mainContent = document.querySelector("main");
      mainContent.innerHTML = html;

      // Executa la inicialització específica de la vista
      await this.initializeView(viewName);

      this.currentView = viewName;
      console.log(`✅ [VIEW] Vista ${viewName} carregada correctament`);
    } catch (error) {
      console.error(`❌ [VIEW] Error carregant vista ${viewName}:`, error);
      this.showErrorView(error.message);
    }
  }

  async initializeView(viewName) {
    switch (viewName) {
      case "browsers":
        // La vista de navegadors és un mòdul procedural (no classe)
        // Ens assegurem que el mòdul estigui carregat i, si hi ha una funció
        // d'inicialització global, la cridem.
        try {
          await import("./browsers_view.js"); // cachejada si ja està
        } catch (e) {
          console.warn("[VIEW] No s'ha pogut importar browsers_view.js:", e);
        }

        // Si en el futur definim window.initBrowsersView la cridem
        if (typeof window.initBrowsersView === "function") {
          try {
            window.initBrowsersView();
          } catch (e) {
            console.error("[VIEW] Error executant initBrowsersView:", e);
          }
        }

        // Guardem un placeholder com a instància amb destroy no-op
        if (!this.viewInstances.has("browsers")) {
          this.viewInstances.set("browsers", { destroy: () => {} });
        }
        break;

      case "screens":
        // Inicialitza el codi de pantalles
        if (!window.screensViewInstance) {
          window.screensViewInstance = new ScreensView();
        }
        window.screensViewInstance.init();
        this.viewInstances.set("screens", window.screensViewInstance);
        break;
    }
  }

  showErrorView(errorMessage) {
    const mainContent = document.querySelector("main");
    mainContent.innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="height: 100vh;">
                <div class="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" class="bi bi-exclamation-triangle text-warning mb-3" viewBox="0 0 16 16">
                        <path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.15.15 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.2.2 0 0 1-.054.06.1.1 0 0 1-.066.017H1.146a.1.1 0 0 1-.066-.017.2.2 0 0 1-.054-.06.18.18 0 0 1 .002-.183L7.884 2.073a.15.15 0 0 1 .054-.057m1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767z"/>
                        <path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0M7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0z"/>
                    </svg>
                    <h4>Error carregant la vista</h4>
                    <p class="text-muted">${errorMessage}</p>
                    <button class="btn btn-primary" onclick="window.viewManager.loadView('browsers')">
                        Torna als navegadors
                    </button>
                </div>
            </div>
        `;
  }

  navigateTo(viewName) {
    this.loadView(viewName);
  }

  getCurrentView() {
    return this.currentView;
  }

  setupNavigationHandlers() {
    // Setup del botó de pantalles
    const screensButton = document.getElementById("globalGroupScreensButton");
    if (screensButton) {
      screensButton.onclick = () => this.navigateTo("screens");
    }
  }
}

// Instància global
window.viewManager = new ViewManager();

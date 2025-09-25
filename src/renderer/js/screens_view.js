// Screens View - Gestió de pantalles (unificada)
class ScreensView {
  constructor() {
    this.initialized = false;
    this.screenStates = new Map();
    this.selectedGroup = null;
    this.socket = null; // s'establirà després de l'autenticació
  }

  init() {
    if (this.initialized) return;
    console.log("🖥️ [SCREENS] Inicialitzant vista de pantalles");
    // Intenta obtenir el socket immediatament
    this.tryAttachSocket();
    // Escolta quan el socket estigui llest (esdeveniment personalitzat de socket.js)
    window.addEventListener("socket:ready", (ev) => {
      if (!this.socket) {
        this.socket = ev.detail.socket;
        this.afterSocketReady();
      }
    });
    this.initialized = true; // marquem inicialitzat encara que el socket arribi després
  }

  async tryAttachSocket() {
    if (window.socket) {
      this.socket = window.socket;
      this.afterSocketReady();
      return;
    }
    // Lazy import per evitar dependència circular si cal
    try {
      const mod = await import("./socket.js");
      if (!this.socket && mod && (mod.socket || mod.initializeSocket)) {
        if (mod.socket) this.socket = mod.socket;
        if (!this.socket && mod.initializeSocket) {
          try {
            this.socket = await mod.initializeSocket();
          } catch (_) {}
        }
        if (this.socket) this.afterSocketReady();
      }
    } catch (e) {
      console.warn("[SCREENS] No s'ha pogut obtenir el socket encara", e);
    }
  }

  afterSocketReady() {
    this.setupEventHandlers();
    this.loadScreensData();
  }

  setupEventHandlers() {
    const screenOnButton = document.getElementById("screenOnButton");
    const screenOffButton = document.getElementById("screenOffButton");
    if (screenOnButton)
      screenOnButton.addEventListener("click", () =>
        this.setScreensState(true)
      );
    if (screenOffButton)
      screenOffButton.addEventListener("click", () =>
        this.setScreensState(false)
      );

    const brightnessRange = document.getElementById("brightnessRange");
    const brightnessValue = document.getElementById("brightnessValue");
    const brightnessUpButton = document.getElementById("brightnessUpButton");
    const brightnessDownButton = document.getElementById(
      "brightnessDownButton"
    );

    if (brightnessRange && brightnessValue) {
      brightnessRange.addEventListener("input", (e) => {
        const value = e.target.value;
        brightnessValue.textContent = value;
        this.setBrightness(parseInt(value));
      });
    }
    if (brightnessUpButton)
      brightnessUpButton.addEventListener("click", () => {
        const currentValue = parseInt(brightnessRange.value);
        const newValue = Math.min(100, currentValue + 10);
        brightnessRange.value = newValue;
        brightnessValue.textContent = newValue;
        this.setBrightness(newValue);
      });
    if (brightnessDownButton)
      brightnessDownButton.addEventListener("click", () => {
        const currentValue = parseInt(brightnessRange.value);
        const newValue = Math.max(10, currentValue - 10);
        brightnessRange.value = newValue;
        brightnessValue.textContent = newValue;
        this.setBrightness(newValue);
      });

    if (this.socket) {
      this.socket.on("screen-status-update", (data) =>
        this.handleScreenStatusUpdate(data)
      );
      this.socket.on("brightness-update", (data) =>
        this.handleBrightnessUpdate(data)
      );
    } else {
      console.log("[SCREENS] Socket no disponible encara, listeners diferits");
    }
  }

  loadScreensData() {
    const grupSelector = document.getElementById("grupSelector");
    if (grupSelector && grupSelector.selectedIndex > 0)
      this.selectedGroup = grupSelector.value;
    if (!this.selectedGroup) {
      this.showNoGroupSelected();
      return;
    }
    this.requestScreensStatus();
  }

  showNoGroupSelected() {
    const screenStatus = document.getElementById("screenStatus");
    if (screenStatus) {
      screenStatus.className = "alert alert-warning";
      screenStatus.innerHTML =
        "<strong>Selecciona un grup</strong> per veure l'estat de les pantalles.";
    }
    const screensGrid = document.getElementById("screensGrid");
    if (screensGrid) screensGrid.innerHTML = "";
  }

  requestScreensStatus() {
    if (!this.socket || !this.selectedGroup) return;
    this.socket.emit("get-screens-status", { groupId: this.selectedGroup });
    const screenStatus = document.getElementById("screenStatus");
    if (screenStatus) {
      screenStatus.className = "alert alert-info";
      screenStatus.innerHTML =
        "<strong>Carregant estat de pantalles del grup...</strong>";
    }
  }

  handleScreenStatusUpdate(data) {
    if (data.groupId !== this.selectedGroup) return;
    if (data.screens)
      data.screens.forEach((screen) =>
        this.screenStates.set(screen.id, screen)
      );
    this.updateScreensDisplay(data.screens || []);
  }

  updateScreensDisplay(screens) {
    const screensGrid = document.getElementById("screensGrid");
    const screenStatus = document.getElementById("screenStatus");
    if (!screensGrid || !screenStatus) return;
    if (screens.length === 0) {
      screenStatus.className = "alert alert-warning";
      screenStatus.innerHTML =
        "<strong>No hi ha ordinadors connectats</strong> en aquest grup.";
      screensGrid.innerHTML = "";
      return;
    }
    const onlineScreens = screens.filter((s) => s.online).length;
    screenStatus.className = "alert alert-success";
    screenStatus.innerHTML = `<strong>${onlineScreens} de ${screens.length} ordinadors connectats</strong>`;
    screensGrid.innerHTML = screens
      .map(
        (screen) => `
      <div class="col-md-4 col-lg-3 mb-3">
        <div class="card ${
          screen.online ? "border-success" : "border-secondary"
        }">
          <div class="card-body">
            <h6 class="card-title d-flex align-items-center">
              <div class="status-indicator ${
                screen.online ? "online" : "offline"
              } me-2"></div>
              ${screen.name || screen.id}
            </h6>
            <div class="small text-muted">
              <div>IP: ${screen.ip || "N/A"}</div>
              <div>Pantalla: ${screen.screenOn ? "Encesa" : "Apagada"}</div>
              <div>Lluminositat: ${screen.brightness || 50}%</div>
            </div>
            <div class="mt-2">
              <div class="btn-group btn-group-sm w-100">
                <button class="btn ${
                  screen.screenOn ? "btn-success" : "btn-outline-success"
                }" onclick="window.screensViewInstance.toggleScreen('${
          screen.id
        }', true)" ${!screen.online ? "disabled" : ""}>On</button>
                <button class="btn ${
                  !screen.screenOn ? "btn-danger" : "btn-outline-danger"
                }" onclick="window.screensViewInstance.toggleScreen('${
          screen.id
        }', false)" ${!screen.online ? "disabled" : ""}>Off</button>
              </div>
            </div>
          </div>
        </div>
      </div>`
      )
      .join("");
  }

  setScreensState(turnOn) {
    if (!this.socket || !this.selectedGroup) return;
    this.socket.emit("set-screens-state", {
      groupId: this.selectedGroup,
      state: turnOn,
    });
    this.showActionFeedback(
      turnOn ? "Encenent pantalles..." : "Apagant pantalles..."
    );
  }
  setBrightness(level) {
    if (!this.socket || !this.selectedGroup) return;
    this.socket.emit("set-brightness", {
      groupId: this.selectedGroup,
      brightness: level,
    });
  }
  toggleScreen(screenId, turnOn) {
    if (!this.socket) return;
    this.socket.emit("toggle-screen", { screenId, state: turnOn });
  }
  handleBrightnessUpdate(data) {
    if (data.groupId === this.selectedGroup && data.brightness !== undefined) {
      const brightnessRange = document.getElementById("brightnessRange");
      const brightnessValue = document.getElementById("brightnessValue");
      if (brightnessRange && brightnessValue) {
        brightnessRange.value = data.brightness;
        brightnessValue.textContent = data.brightness;
      }
    }
  }
  showActionFeedback(message) {
    const screenStatus = document.getElementById("screenStatus");
    if (screenStatus) {
      screenStatus.className = "alert alert-info";
      screenStatus.innerHTML = `<strong>${message}</strong>`;
      setTimeout(() => this.requestScreensStatus(), 2000);
    }
  }
  destroy() {
    if (this.socket) {
      this.socket.off("screen-status-update");
      this.socket.off("brightness-update");
    }
    this.initialized = false;
  }
}

window.ScreensView = ScreensView;

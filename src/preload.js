const { contextBridge, ipcRenderer, desktopCapturer } = require("electron");

// Exposa APIs segures al renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  getVersion: () => ipcRenderer.invoke("get-version"),
  showMessageBox: (options) => ipcRenderer.invoke("show-message-box", options),
  getConfig: () => ipcRenderer.invoke("get-config"),
  setConfig: (config) => ipcRenderer.invoke("set-config", config),
  logError: (message, stack) => ipcRenderer.invoke("log-error", message, stack),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  // Desktop capture sources (for fallback when getDisplayMedia is not supported)
  getDesktopSources: (options) =>
    desktopCapturer.getSources(options || { types: ["screen"] }),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  onUpdateStatus: (callback) =>
    ipcRenderer.on("update-status", (event, data) => callback(data)),
  onUpdateAvailable: (callback) =>
    ipcRenderer.on("update-available", (event, data) => callback(data)),
  onUpdateDownloaded: (callback) =>
    ipcRenderer.on("update-downloaded", (event, data) => callback(data)),
  onDownloadProgress: (callback) =>
    ipcRenderer.on("download-progress", (event, data) => callback(data)),
  onUpdateError: (callback) =>
    ipcRenderer.on("update-error", (event, data) => callback(data)),

  // APIs per a la comunicació amb el servidor PalamSRV
  onServerMessage: (callback) => ipcRenderer.on("server-message", callback),
  removeServerListeners: () => ipcRenderer.removeAllListeners("server-message"),

  // Detecció de xarxa WiFi actual (per comprovar xarxa esperada)
  getCurrentSSID: () => ipcRenderer.invoke("get-current-ssid"),

  exportScreenshotArchive: (options) => ipcRenderer.invoke("screenshot-archive-export", options),
  openScreenshotArchive: (file) => ipcRenderer.invoke("screenshot-archive-open", file),
  screenshotArchiveImage: (id, name) => ipcRenderer.invoke("screenshot-archive-image", id, name),
  closeScreenshotArchive: (id) => ipcRenderer.invoke("screenshot-archive-close", id),
  cancelScreenshotArchive: () => ipcRenderer.invoke("screenshot-archive-cancel"),
  clearScreenshotArchives: () => ipcRenderer.invoke("screenshot-archive-clear"),
  onScreenshotArchiveProgress: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("screenshot-archive-progress", listener);
    return () => ipcRenderer.removeListener("screenshot-archive-progress", listener);
  },
});

// APIs específiques per PalamBlock
contextBridge.exposeInMainWorld("palamAPI", {
  // Comunicació amb servidor
  connectToServer: (serverUrl, credentials) =>
    ipcRenderer.invoke("connect-server", serverUrl, credentials),
  disconnectFromServer: () => ipcRenderer.invoke("disconnect-server"),
  onConnectionStatusChange: (callback) =>
    ipcRenderer.on("connection-status-change", callback),

  // Gestió d'alumnes
  getAlumnes: () => ipcRenderer.invoke("get-alumnes"),
  updateAlumne: (alumneId, data) =>
    ipcRenderer.invoke("update-alumne", alumneId, data),

  // Gestió de normes
  getNormes: () => ipcRenderer.invoke("get-normes"),
  updateNorma: (normaId, data) =>
    ipcRenderer.invoke("update-norma", normaId, data),

  // Historial
  getHistorial: (alumneId, filters) =>
    ipcRenderer.invoke("get-historial", alumneId, filters),

  // Esdeveniments en temps real
  onAlumneUpdate: (callback) => ipcRenderer.on("alumne-update", callback),
  onNormaUpdate: (callback) => ipcRenderer.on("norma-update", callback),
  onHistorialUpdate: (callback) => ipcRenderer.on("historial-update", callback),

  // Neteja listeners
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners("alumne-update");
    ipcRenderer.removeAllListeners("norma-update");
    ipcRenderer.removeAllListeners("historial-update");
    ipcRenderer.removeAllListeners("connection-status-change");
  },
});

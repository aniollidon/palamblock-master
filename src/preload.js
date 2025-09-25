const { contextBridge, ipcRenderer } = require("electron");

// Exposa APIs segures al renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  getVersion: () => ipcRenderer.invoke("get-version"),
  showMessageBox: (options) => ipcRenderer.invoke("show-message-box", options),
  getConfig: () => ipcRenderer.invoke("get-config"),
  setConfig: (config) => ipcRenderer.invoke("set-config", config),
  logError: (message, stack) => ipcRenderer.invoke("log-error", message, stack),

  // APIs per a la comunicació amb el servidor PalamSRV
  onServerMessage: (callback) => ipcRenderer.on("server-message", callback),
  removeServerListeners: () => ipcRenderer.removeAllListeners("server-message"),
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

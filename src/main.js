const {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  dialog,
  shell,
  session,
} = require("electron");
const path = require("path");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

// Configuració del logger per l'autoUpdater
log.transports.file.level = "info";
autoUpdater.logger = log;

let mainWindow;

function createWindow() {
  // Crea la finestra principal de l'aplicació
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, "preload.js"),
      // Enable getDisplayMedia in Electron contexts
      // Note: handled via permission request below
    },
    // Icona de l'aplicació: nou logo palamblock
    icon: path.join(__dirname, "renderer", "images", "palamblock-logo.png"),
    show: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
  });

  // Carrega l'index.html
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  // Mostra la finestra quan estigui llesta
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();

    // Comprova actualitzacions en producció (no en mode desenvolupament)
    if (!process.argv.includes("--dev")) {
      setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify();
      }, 3000);
    }

    // Obre DevTools en mode desenvolupament
    if (process.argv.includes("--dev")) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Gestiona el tancament de la finestra
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Configura el menú
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: "Fitxer",
      submenu: [
        {
          label: "Configuració",
          accelerator: "CmdOrCtrl+,",
          click: () => {
            // Obre la finestra de configuració
            openConfigWindow();
          },
        },
        { type: "separator" },
        {
          label: "Sortir",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: "Editar",
      submenu: [
        { label: "Desfer", accelerator: "CmdOrCtrl+Z", role: "undo" },
        { label: "Refer", accelerator: "Shift+CmdOrCtrl+Z", role: "redo" },
        { type: "separator" },
        { label: "Tallar", accelerator: "CmdOrCtrl+X", role: "cut" },
        { label: "Copiar", accelerator: "CmdOrCtrl+C", role: "copy" },
        { label: "Enganxar", accelerator: "CmdOrCtrl+V", role: "paste" },
      ],
    },
    {
      label: "Vista",
      submenu: [
        { label: "Recarregar", accelerator: "CmdOrCtrl+R", role: "reload" },
        {
          label: "Forçar recàrrega",
          accelerator: "CmdOrCtrl+Shift+R",
          role: "forceReload",
        },
        {
          label: "Eines de desenvolupador",
          accelerator: "F12",
          role: "toggleDevTools",
        },
        { type: "separator" },
        {
          label: "Pantalla completa",
          accelerator: "F11",
          role: "togglefullscreen",
        },
      ],
    },
    {
      label: "Finestra",
      submenu: [
        { label: "Minimitzar", accelerator: "CmdOrCtrl+M", role: "minimize" },
        { label: "Tancar", accelerator: "CmdOrCtrl+W", role: "close" },
      ],
    },
    {
      label: "Ajuda",
      submenu: [
        {
          label: "Sobre PalamMaster",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "Sobre PalamMaster",
              message: "PalamMaster v1.0.0",
              detail:
                "Aplicació d'administració per PalamBlock\n\nDesenvolguda pel equip PalamBlock",
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function openConfigWindow() {
  // Implementar finestra de configuració en el futur
  dialog.showMessageBox(mainWindow, {
    type: "info",
    title: "Configuració",
    message: "Finestra de configuració",
    detail: "La configuració s'implementarà en una versió futura.",
  });
}

// Aquesta funció s'executarà quan Electron hagi acabat d'inicialitzar-se
app.whenReady().then(() => {
  // Allow screen capture permissions abans de crear finestres
  const ses = session.defaultSession;
  try {
    // Handler específic per a getDisplayMedia (requerit per Electron >= 16)
    if (typeof ses.setDisplayMediaRequestHandler === "function") {
      ses.setDisplayMediaRequestHandler((request, callback) => {
        // Retornar les fonts de pantalla disponibles
        const { desktopCapturer } = require("electron");
        desktopCapturer
          .getSources({ types: ["screen", "window"] })
          .then((sources) => {
            // Aprovar la petició amb la primera font de pantalla
            if (sources.length > 0) {
              callback({ video: sources[0], audio: "loopback" });
            } else {
              callback({});
            }
          })
          .catch((err) => {
            console.error("Error obtenint sources:", err);
            callback({});
          });
      });
    }

    ses.setPermissionRequestHandler(
      (webContents, permission, callback, details) => {
        try {
          console.log(
            "Permission request:",
            permission,
            details?.mediaTypes || details
          );
        } catch {}

        // Permet captura de pantalla (getDisplayMedia)
        if (permission === "display-capture") {
          return callback(true);
        }

        // Permet captura de media (vídeo/àudio)
        if (permission === "media") {
          return callback(true);
        }

        // Per defecte denega
        return callback(false);
      }
    );

    // Opcional: permet abans de demanar (check) per a display-capture
    if (typeof ses.setPermissionCheckHandler === "function") {
      ses.setPermissionCheckHandler(
        (webContents, permission, requestingOrigin, details) => {
          if (permission === "display-capture") return true;
          if (permission === "media") return true;
          return false;
        }
      );
    }
  } catch (e) {
    console.warn("No s'ha pogut establir els gestors de permisos:", e);
  }

  createWindow();
});

// Surt quan totes les finestres estan tancades
app.on("window-all-closed", () => {
  // En macOS és comú que les aplicacions i la seva barra de menú
  // romanguin actives fins que l'usuari surt explícitament amb Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // En macOS és comú tornar a crear una finestra quan
  // es fa clic a la icona del dock i no hi ha altres finestres obertes
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle("get-version", () => {
  return app.getVersion();
});

ipcMain.handle("show-message-box", async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

// Gestió de configuració
const fs = require("fs");
const configPath = path.join(app.getPath("userData"), "config.json");

ipcMain.handle("get-config", () => {
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, "utf8");
      return JSON.parse(configData);
    }
  } catch (error) {
    console.error("Error llegint configuració:", error);
  }
  return null;
});

ipcMain.handle("set-config", (event, config) => {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error("Error guardant configuració:", error);
    throw error;
  }
});

ipcMain.handle("log-error", (event, message, stack) => {
  console.error("Error des del renderer:", message);
  if (stack) {
    console.error("Stack trace:", stack);
  }
  return true;
});

// Open in default browser
ipcMain.handle("open-external", async (event, url) => {
  try {
    if (typeof url !== "string" || url.length === 0) return false;
    await shell.openExternal(url);
    return true;
  } catch (e) {
    console.error("open-external failed:", e);
    return false;
  }
});

// ========================================
// AUTO-UPDATER - Gestió d'actualitzacions
// ========================================

autoUpdater.on("checking-for-update", () => {
  log.info("Comprovant actualitzacions...");
  if (mainWindow) {
    mainWindow.webContents.send("update-status", {
      status: "checking",
      message: "Comprovant actualitzacions...",
    });
  }
});

autoUpdater.on("update-available", (info) => {
  log.info("Actualització disponible:", info.version);
  if (mainWindow) {
    mainWindow.webContents.send("update-available", {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
    });
  }
});

autoUpdater.on("update-not-available", (info) => {
  log.info("Aplicació actualitzada. Versió actual:", info.version);
  if (mainWindow) {
    mainWindow.webContents.send("update-status", {
      status: "up-to-date",
      message: "L'aplicació està actualitzada",
      version: info.version,
    });
  }
});

autoUpdater.on("error", (err) => {
  log.error("Error en actualització:", err);
  if (mainWindow) {
    mainWindow.webContents.send("update-error", {
      message: err.message || "Error desconegut",
      stack: err.stack,
    });
  }
});

autoUpdater.on("download-progress", (progressObj) => {
  const logMessage = `Velocitat: ${Math.round(
    progressObj.bytesPerSecond / 1024
  )} KB/s - Descarregat: ${progressObj.percent.toFixed(2)}% (${Math.round(
    progressObj.transferred / 1024 / 1024
  )}MB/${Math.round(progressObj.total / 1024 / 1024)}MB)`;
  log.info(logMessage);
  if (mainWindow) {
    mainWindow.webContents.send("download-progress", {
      percent: progressObj.percent,
      bytesPerSecond: progressObj.bytesPerSecond,
      transferred: progressObj.transferred,
      total: progressObj.total,
    });
  }
});

autoUpdater.on("update-downloaded", (info) => {
  log.info("Actualització descarregada. Versió:", info.version);
  if (mainWindow) {
    mainWindow.webContents.send("update-downloaded", {
      version: info.version,
      releaseNotes: info.releaseNotes,
    });
  }

  // Mostra diàleg per instal·lar
  dialog
    .showMessageBox(mainWindow, {
      type: "info",
      title: "Actualització disponible",
      message: `Nova versió ${info.version} descarregada`,
      detail: "L'aplicació es reiniciarà per completar la instal·lació.",
      buttons: ["Instal·lar ara", "Instal·lar més tard"],
      defaultId: 0,
      cancelId: 1,
    })
    .then((result) => {
      if (result.response === 0) {
        setImmediate(() => autoUpdater.quitAndInstall());
      }
    });
});

// IPC handlers per actualitzacions
ipcMain.handle("check-for-updates", async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      success: true,
      updateInfo: result.updateInfo,
    };
  } catch (error) {
    log.error("Error comprovant actualitzacions:", error);
    return {
      success: false,
      error: error.message,
    };
  }
});

ipcMain.handle("install-update", () => {
  autoUpdater.quitAndInstall();
});

// Cast sidebar logic for /admin/screens
// Mostra i amaga la sidebar, gestiona la previsualització i la captura de pantalla

// Socket per cast (ws-cast) - ara es crea després de l'autenticació
let castSocket = null;

function initCastSocket() {
  if (castSocket) return castSocket;
  if (!window.authManager || !window.authManager.isAuthenticated) {
    return null; // esperem autenticació
  }
  // Reutilitza mateix origen (assumim mateix host que admin) i envia query si hi ha token
  try {
    const credentials = window.authManager.getCredentials();
    const baseUrl = window.authManager.serverUrl || undefined;
    castSocket = io(baseUrl, {
      path: "/ws-cast",
      transports: ["websocket", "polling"],
      query: credentials?.token
        ? { user: credentials.username, authToken: credentials.token }
        : {},
    });
    // Notificació opcional
    castSocket.on("connect", () =>
      console.log("[CAST] Connectat canal cast (ws-cast)")
    );
    castSocket.on("connect_error", (e) =>
      console.warn("[CAST] Error connexió cast:", e.message)
    );
  } catch (e) {
    console.warn("[CAST] No s'ha pogut crear castSocket encara", e);
  }
  return castSocket;
}

// Intent immediat i també quan el socket principal estigui llest
window.addEventListener("socket:ready", () => {
  if (!castSocket) initCastSocket();
});
// També quan auth es valida (token reutilitzat)
window.addEventListener("auth:ready", () => {
  if (!castSocket) initCastSocket();
});
setTimeout(() => initCastSocket(), 200); // fallback lazy

// Variables d'estat per cast
let screenStream = null;
let isBroadcasting = false;
let currentRoom = null;
const peersByViewerId = new Map();
let currentKind = null; // 'webrtc' | 'url' | null
let pendingShare = null; // { kind, url?, interactive? }

// Override per emetre a un alumne específic (sense seleccionar grup)
let overrideRoom = null; // nom de l'alumne si estem en mode individual iniciat des del grid

function getCurrentTargetRoom() {
  const grupSelector = document.getElementById("grupSelector");
  return overrideRoom || grupSelector?.value;
}

// Variables per gestionar dades d'alumnes (importades de screens.js)
let currentGrupAlumnesList = {};
let currentAlumnesMachines = {};

// Elements per toast i modals (assumim que existeixen)
let toastEl = null;
let modalEl = null;
let modalCancel = null;
let modalConfirm = null;

// Intentar trobar elements de toast i modal si existeixen
document.addEventListener("DOMContentLoaded", () => {
  toastEl = document.getElementById("toast");
  modalEl = document.getElementById("modal");
  modalCancel = document.getElementById("modalCancel");
  modalConfirm = document.getElementById("modalConfirm");
});

// Helper per mostrar la sidebar
function showSidebar() {
  const castSidebarContainer = document.getElementById("castSidebarContainer");
  const castSidebar = document.getElementById("castSidebar");

  if (castSidebarContainer && !castSidebarContainer.contains(castSidebar)) {
    castSidebarContainer.appendChild(castSidebar);
  }
  if (castSidebarContainer) castSidebarContainer.style.display = "block";
  if (castSidebar) castSidebar.style.display = "flex";
}

// Helper per amagar la sidebar
function hideSidebar() {
  const castSidebar = document.getElementById("castSidebar");
  const castSidebarContainer = document.getElementById("castSidebarContainer");

  if (castSidebar) castSidebar.style.display = "none";
  if (castSidebarContainer) castSidebarContainer.style.display = "none";
  stopPreview();

  // Reinicia mode override
  if (overrideRoom) {
    overrideRoom = null;
    const castStudentScreenDropdown = document.getElementById(
      "castStudentScreenDropdown"
    );
    const dropdownWrapper = castStudentScreenDropdown?.parentElement;
    if (dropdownWrapper) dropdownWrapper.style.display = "";
  }
}

// Funció per inicialitzar event listeners (es crida cada vegada que es carrega la vista)
export function initCastSidebarListeners() {
  const grupSelector = document.getElementById("grupSelector");
  const castButton = document.getElementById("globalGroupCastButton");
  const castSidebarClose = document.getElementById("castSidebarClose");
  const castScreenTab = document.getElementById("castScreenTab");
  const castUrlTab = document.getElementById("castUrlTab");
  const castMessageTab = document.getElementById("castMessageTab");
  const castShareUrlButton = document.getElementById("castShareUrlButton");
  const castShareMessageButton = document.getElementById(
    "castShareMessageButton"
  );
  const castStopButton = document.getElementById("castStopButton");
  const castShareScreenButton = document.getElementById(
    "castShareScreenButton"
  );
  const castScreenTabPane = document.getElementById("castScreenTabPane");
  const castUrlTabPane = document.getElementById("castUrlTabPane");
  const castMessageTabPane = document.getElementById("castMessageTabPane");
  const castUrlInput = document.getElementById("castUrlInput");
  const castUrlInteractiu = document.getElementById("castUrlInteractiu");
  const castMessageText = document.getElementById("castMessageText");
  const castMessageTime = document.getElementById("castMessageTime");
  const castSidebarTitle = document.getElementById("castSidebarTitle");
  const castStudentScreenDropdown = document.getElementById(
    "castStudentScreenDropdown"
  );

  // Marcar si ja s'han inicialitzat per evitar duplicats
  if (castButton && castButton.dataset._castInit) return;
  if (castButton) castButton.dataset._castInit = "1";

  // Quan canvia el grup, actualitza el botó i el títol
  if (grupSelector) {
    grupSelector.addEventListener("change", () => {
      if (overrideRoom) return;
      const castSidebarContainer = document.getElementById(
        "castSidebarContainer"
      );
      const castSidebar = document.getElementById("castSidebar");
      if (castSidebar && castSidebar.style.display === "flex") {
        const grup = grupSelector.value;
        if (isBroadcasting && currentRoom) {
          if (currentKind === "url")
            showToast(`Emetent URL a la sala: ${currentRoom}`);
          else showToast(`Emetent a la sala: ${currentRoom}`);
        } else {
          if (castSidebarTitle) {
            castSidebarTitle.textContent = grup ? `Emet a ${grup}` : "Emet a";
          }
        }
      }
      updateStudentDropdown();
    });
  }

  // Toggle sidebar només si hi ha grup
  if (castButton) {
    castButton.addEventListener("click", () => {
      // Mode grup: assegura que no estem en override
      overrideRoom = null;
      const dropdownWrapper = castStudentScreenDropdown?.parentElement;
      if (dropdownWrapper) dropdownWrapper.style.display = "";

      const grup = grupSelector?.value;
      if (!grup) return;

      const castSidebarContainer = document.getElementById(
        "castSidebarContainer"
      );
      const castSidebar = document.getElementById("castSidebar");

      if (
        castSidebar &&
        castSidebar.style.display !== "none" &&
        castSidebarContainer &&
        castSidebarContainer.style.display !== "none"
      ) {
        hideSidebar();
        return;
      }

      showSidebar();
      if (castSidebarTitle) castSidebarTitle.textContent = `Emet a ${grup}`;

      if (castScreenTab) castScreenTab.classList.add("active");
      if (castUrlTab) castUrlTab.classList.remove("active");
      if (castMessageTab) castMessageTab.classList.remove("active");
      if (castScreenTabPane) castScreenTabPane.classList.add("show", "active");
      if (castUrlTabPane) castUrlTabPane.classList.remove("show", "active");
      if (castMessageTabPane)
        castMessageTabPane.classList.remove("show", "active");

      updateStudentDropdown();
    });
  }

  // Tancar sidebar
  if (castSidebarClose) {
    castSidebarClose.addEventListener("click", () => hideSidebar());
  }

  // Pestanyes
  if (castScreenTab) {
    castScreenTab.addEventListener("click", () => {
      if (castScreenTab) castScreenTab.classList.add("active");
      if (castUrlTab) castUrlTab.classList.remove("active");
      if (castMessageTab) castMessageTab.classList.remove("active");
      if (castScreenTabPane) castScreenTabPane.classList.add("show", "active");
      if (castUrlTabPane) castUrlTabPane.classList.remove("show", "active");
      if (castMessageTabPane)
        castMessageTabPane.classList.remove("show", "active");
    });
  }

  if (castUrlTab) {
    castUrlTab.addEventListener("click", () => {
      if (castUrlTab) castUrlTab.classList.add("active");
      if (castScreenTab) castScreenTab.classList.remove("active");
      if (castMessageTab) castMessageTab.classList.remove("active");
      if (castUrlTabPane) castUrlTabPane.classList.add("show", "active");
      if (castScreenTabPane)
        castScreenTabPane.classList.remove("show", "active");
      if (castMessageTabPane)
        castMessageTabPane.classList.remove("show", "active");
    });
  }

  if (castMessageTab) {
    castMessageTab.addEventListener("click", () => {
      if (castMessageTab) castMessageTab.classList.add("active");
      if (castScreenTab) castScreenTab.classList.remove("active");
      if (castUrlTab) castUrlTab.classList.remove("active");
      if (castMessageTabPane)
        castMessageTabPane.classList.add("show", "active");
      if (castScreenTabPane)
        castScreenTabPane.classList.remove("show", "active");
      if (castUrlTabPane) castUrlTabPane.classList.remove("show", "active");
    });
  }

  // Compartir URL amb emissió real i verificació prèvia
  if (castShareUrlButton) {
    castShareUrlButton.addEventListener("click", async () => {
      const targetRoom = getCurrentTargetRoom();
      if (!targetRoom) {
        alert("Selecciona un grup o alumne abans d'emetre");
        return;
      }

      if (isBroadcasting) {
        alert("Ja estàs emetent. Atura l'emissió actual primer.");
        return;
      }

      const url = castUrlInput?.value.trim();
      if (!url) {
        alert("Introdueix una URL");
        return;
      }

      if (!isValidHttpUrl(url)) {
        alert("Introdueix una URL vàlida (http/https)");
        return;
      }

      // Comprova si és un document de Google Drive
      if (
        url.startsWith("https://drive.google.com") ||
        url.startsWith("https://docs.google.com")
      ) {
        const confirmGoogleDoc = await showConfirmGoogleDocModal();
        if (!confirmGoogleDoc) {
          showToast("Emissió cancel·lada");
          return;
        }
      }

      const interactive = !!castUrlInteractiu?.checked;

      // Preparar dades de compartició
      const choice = { kind: "url", url: url, interactive: interactive };
      pendingShare = choice;

      // Comprova si ja hi ha emissor i demana confirmació
      let proceed = true;
      let noViewers = false;
      await new Promise((resolve) => {
        castSocket.emit("check-room", { room: targetRoom }, async (resp) => {
          if (resp && resp.hasBroadcaster) {
            proceed = await showConfirmReplaceModal();
          }
          if (
            resp &&
            (resp.hasViewers === false ||
              resp.viewers === 0 ||
              resp.viewerCount === 0)
          ) {
            noViewers = true;
          }
          resolve();
        });
      });

      if (!proceed) {
        showToast("Operació cancel·lada");
        pendingShare = null;
        return;
      }

      currentRoom = targetRoom;
      currentKind = "url";

      // Mostrar previsualització amb iframe
      showIframePreview(url);

      if (noViewers) {
        showToast(
          "No hi ha ningú connectat ara mateix. L'emissió quedarà preparada fins que s'uneixi algú."
        );
      }

      // Sol·licitar unió com a emissor d'URL
      castSocket.emit("broadcaster-join-request", {
        room: currentRoom,
        kind: "url",
        url: url,
        interactive: interactive,
      });
    });
  }

  // Emetre missatge (utilitza emissió URL oculta)
  if (castShareMessageButton) {
    castShareMessageButton.addEventListener("click", async () => {
      const targetRoom = getCurrentTargetRoom();
      if (!targetRoom) {
        alert("Selecciona un grup o alumne abans d'emetre");
        return;
      }
      if (isBroadcasting) {
        alert("Ja estàs emetent. Atura l'emissió actual primer.");
        return;
      }
      const txt = (castMessageText?.value || "").trim();
      if (!txt) {
        alert("Introdueix un missatge");
        return;
      }
      let secs = parseInt(castMessageTime?.value || "10", 10);
      if (isNaN(secs) || secs < 0) secs = 0;
      const base = window.authManager?.serverUrl || "";
      const url = `${base}/cast/misssatge.html?text=${encodeURIComponent(
        txt
      )}&temps=${secs}`;

      // Preparar dades de compartició
      const choice = { kind: "url", url: url, interactive: false };
      pendingShare = choice;

      // Comprova si ja hi ha emissor
      let proceed = true;
      let noViewers = false;
      await new Promise((resolve) => {
        castSocket.emit("check-room", { room: targetRoom }, async (resp) => {
          if (resp && resp.hasBroadcaster) {
            proceed = await showConfirmReplaceModal();
          }
          if (
            resp &&
            (resp.hasViewers === false ||
              resp.viewers === 0 ||
              resp.viewerCount === 0)
          ) {
            noViewers = true;
          }
          resolve();
        });
      });
      if (!proceed) {
        showToast("Operació cancel·lada");
        pendingShare = null;
        return;
      }

      currentRoom = targetRoom;
      currentKind = "url";

      // Previsualització (iframe) del missatge
      showIframePreview(url);
      if (noViewers) {
        showToast(
          "No hi ha ningú connectat ara mateix. L'emissió quedarà preparada fins que s'uneixi algú."
        );
      }

      castSocket.emit("broadcaster-join-request", {
        room: currentRoom,
        kind: "url",
        url: url,
        interactive: false,
      });

      // Auto aturar emissió si hi ha temps definit
      if (secs > 0) {
        setTimeout(() => {
          const castPreviewIframe =
            document.getElementById("castPreviewIframe");
          if (
            isBroadcasting &&
            currentKind === "url" &&
            currentRoom === targetRoom &&
            castPreviewIframe?.src.includes("misssatge.html")
          ) {
            stopCast();
            showToast("Emissió de missatge finalitzada");
          }
        }, secs * 1000 + 500);
      }
    });
  }

  // Atura emissió real
  if (castStopButton) {
    castStopButton.addEventListener("click", () => {
      stopCast();
      showToast("Emissió aturada");
    });
  }

  // Compartir pantalla amb emissió real i verificació prèvia
  if (castShareScreenButton) {
    castShareScreenButton.addEventListener("click", async () => {
      const targetRoom = getCurrentTargetRoom();
      if (!targetRoom) {
        alert("Selecciona un grup o alumne abans d'emetre");
        return;
      }
      if (isBroadcasting) {
        alert("Ja estàs emetent. Atura l'emissió actual primer.");
        return;
      }

      // 1) Obtenir pantalla immediatament dins del gest
      try {
        screenStream = await getScreenStream();
      } catch (err) {
        console.error("Error obtenint pantalla", err);
        showToast(
          "No s'ha pogut obtenir la pantalla. Revisa permisos del navegador."
        );
        const reason = err?.name || err?.message || "";
        alert(
          reason && /NotAllowed|Permission|denied/i.test(String(reason))
            ? "Has cancel·lat o el navegador ha denegat la captura de pantalla."
            : "No s'ha pogut obtenir la pantalla. Pot ser que Electron bloquegi la captura o l'àudio."
        );
        return;
      }

      // Mostrar previsualització i preparar onended
      try {
        await showVideoPreview(screenStream);
      } catch (_) {}
      const videoTrack = screenStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          stopCast();
          showToast("Compartició aturada");
        };
      }

      // 2) Comprovar sala i confirmació fora del gest
      let proceed = true;
      let noViewers = false;
      pendingShare = { kind: "webrtc" };
      await new Promise((resolve) => {
        castSocket.emit("check-room", { room: targetRoom }, async (resp) => {
          if (resp && resp.hasBroadcaster) {
            proceed = await showConfirmReplaceModal();
          }
          if (
            resp &&
            (resp.hasViewers === false ||
              resp.viewers === 0 ||
              resp.viewerCount === 0)
          ) {
            noViewers = true;
          }
          resolve();
        });
      });

      if (!proceed) {
        try {
          const tracks = screenStream.getTracks();
          tracks.forEach((t) => t.stop());
        } catch {}
        stopPreview();
        showToast("Operació cancel·lada");
        pendingShare = null;
        return;
      }

      currentRoom = targetRoom;
      currentKind = "webrtc";
      if (noViewers) {
        showToast(
          "No hi ha ningú connectat ara mateix. L'emissió quedarà preparada fins que s'uneixi algú."
        );
      }

      castSocket.emit("broadcaster-join-request", {
        room: currentRoom,
        kind: "webrtc",
      });
    });
  }
}

// Cridar init quan el DOM estigui llest o quan es carregui la vista
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCastSidebarListeners);
} else {
  initCastSidebarListeners();
}

// Funció per obrir la sidebar per un alumne concret (emissió individual)
export function openCastSidebarForStudent(alumne) {
  overrideRoom = alumne;
  const castStudentScreenDropdown = document.getElementById(
    "castStudentScreenDropdown"
  );

  // Amaga dropdown d'alumnes (no té sentit en mode individual)
  const dropdownWrapper = castStudentScreenDropdown?.parentElement;
  if (dropdownWrapper) dropdownWrapper.style.display = "none";

  const castSidebarContainer = document.getElementById("castSidebarContainer");
  const castSidebarTitle = document.getElementById("castSidebarTitle");

  const isOpen =
    castSidebarContainer && castSidebarContainer.style.display !== "none";

  if (!isOpen) {
    toggleSidebar();
  }

  // Actualitzar títol sempre
  if (castSidebarTitle) {
    castSidebarTitle.textContent = `Emet a ${alumne}`;
  }

  // Assegurar que només el tab de pantalla està actiu
  const castScreenTab = document.getElementById("castScreenTab");
  const castUrlTab = document.getElementById("castUrlTab");
  const castMessageTab = document.getElementById("castMessageTab");
  const castScreenTabPane = document.getElementById("castScreenTabPane");
  const castUrlTabPane = document.getElementById("castUrlTabPane");
  const castMessageTabPane = document.getElementById("castMessageTabPane");

  if (castScreenTab) castScreenTab.classList.remove("active");
  if (castUrlTab) castUrlTab.classList.remove("active");
  if (castMessageTab) castMessageTab.classList.remove("active");
  if (castScreenTabPane) castScreenTabPane.classList.remove("show", "active");
  if (castUrlTabPane) castUrlTabPane.classList.remove("show", "active");
  if (castMessageTabPane) castMessageTabPane.classList.remove("show", "active");

  if (castScreenTab) castScreenTab.classList.add("active");
  if (castScreenTabPane) castScreenTabPane.classList.add("show", "active");
}

function stopPreview() {
  const castPreviewContainer = document.getElementById("castPreviewContainer");
  const castPreview = document.getElementById("castPreview");
  const castPreviewIframe = document.getElementById("castPreviewIframe");

  if (!castPreviewContainer) return;

  castPreviewContainer.style.display = "none";

  // Netejar vídeo
  if (castPreview.srcObject) {
    const tracks = castPreview.srcObject.getTracks();
    tracks.forEach((track) => track.stop());
    castPreview.srcObject = null;
  }
  castPreview.src = "";
  castPreview.style.display = "none";

  // Netejar iframe
  if (castPreviewIframe) {
    castPreviewIframe.src = "";
    castPreviewIframe.style.display = "none";
  }
}

// Funció per mostrar previsualització de vídeo (pantalla compartida)
function showVideoPreview(stream) {
  const castPreviewContainer = document.getElementById("castPreviewContainer");
  const castPreview = document.getElementById("castPreview");
  const castPreviewIframe = document.getElementById("castPreviewIframe");

  if (!castPreviewContainer || !castPreview) return;

  // Ocultar iframe i mostrar vídeo
  if (castPreviewIframe) castPreviewIframe.style.display = "none";
  castPreview.style.display = "block";

  castPreviewContainer.style.display = "block";
  castPreview.srcObject = stream;

  return castPreview.play().catch((e) => {
    console.warn("Error reproduint previsualització de vídeo:", e);
  });
}

// Funció per mostrar previsualització d'iframe (URL o pantalla d'alumne)
function showIframePreview(url) {
  const castPreviewContainer = document.getElementById("castPreviewContainer");
  const castPreview = document.getElementById("castPreview");
  const castPreviewIframe = document.getElementById("castPreviewIframe");

  if (!castPreviewContainer || !castPreviewIframe) return;

  // Ocultar vídeo i mostrar iframe
  if (castPreview) {
    castPreview.style.display = "none";
    if (castPreview.srcObject) {
      const tracks = castPreview.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      castPreview.srcObject = null;
    }
  }

  castPreviewIframe.style.display = "block";
  castPreviewContainer.style.display = "block";
  castPreviewIframe.src = url;
}

// Funcions per mostrar missatges (toasts i errors)
function showToast(text, type = "info") {
  if (toastEl) {
    toastEl.textContent = text;
    toastEl.classList.add("show");
    setTimeout(() => {
      toastEl.classList.remove("show");
    }, 3000);
  } else {
    console.log("Toast:", text);
  }
}

function showErrorToast(text) {
  showToast(text, "error");
}

function showWarningToast(text) {
  showToast(text, "warning");
}

// Funcions auxiliars per cast
async function getScreenStream() {
  if (
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getDisplayMedia !== "function"
  ) {
    throw new DOMException("Screen capture no suportada", "NotSupportedError");
  }

  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: "always" },
      audio: false,
    });
    return stream;
  } catch (e1) {
    throw e1;
  }
}

function isValidHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function showConfirmReplaceModal() {
  return new Promise((resolve) => {
    if (!modalEl) {
      // Si no hi ha modal, crear un modal temporal
      resolve(createTemporaryConfirmModal());
      return;
    }
    const onCancel = () => {
      cleanup();
      resolve(false);
    };
    const onConfirm = () => {
      cleanup();
      resolve(true);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    function cleanup() {
      modalEl.classList.add("hidden");
      modalCancel && modalCancel.removeEventListener("click", onCancel);
      modalConfirm && modalConfirm.removeEventListener("click", onConfirm);
      document.removeEventListener("keydown", onKey, true);
    }
    modalCancel && modalCancel.addEventListener("click", onCancel);
    modalConfirm && modalConfirm.addEventListener("click", onConfirm);
    document.addEventListener("keydown", onKey, true);
    modalEl.classList.remove("hidden");
    try {
      modalConfirm && modalConfirm.focus();
    } catch {}
  });
}

function createTemporaryConfirmModal() {
  return new Promise((resolve) => {
    const result = confirm(
      "Hi ha algú emetent en aquesta sala. Vols substituir-lo?"
    );
    resolve(result);
  });
}

function showConfirmGoogleDocModal() {
  return new Promise((resolve) => {
    const result = confirm(
      "⚠️ AVÍS: Document de Google Drive\n\n" +
        "Els alumnes veuran aquest document com a usuari sense sessió iniciada.\n\n" +
        "Assegura't que el document tingui permisos d'accés públic o compartit " +
        "amb tothom que necessiti veure'l.\n\n" +
        "Vols continuar amb l'emissió?"
    );
    resolve(result);
  });
}

// Funció per actualitzar la llista d'alumnes connectats al dropdown
function updateStudentDropdown() {
  const castStudentScreenMenu = document.getElementById(
    "castStudentScreenMenu"
  );
  const grupSelector = document.getElementById("grupSelector");

  if (!castStudentScreenMenu) return;

  const grup = grupSelector?.value;

  // Netejar menu actual
  castStudentScreenMenu.innerHTML = `
    <li><h6 class="dropdown-header">Emet pantalla d'alumne</h6></li>
    <li><hr class="dropdown-divider"></li>
  `;

  if (!grup || !currentGrupAlumnesList[grup]) {
    castStudentScreenMenu.innerHTML +=
      '<li><span class="dropdown-item-text text-muted">Selecciona un grup primer</span></li>';
    return;
  }

  const alumnesConnectats = [];
  const grupAlumnes = currentGrupAlumnesList[grup].alumnes;

  // Buscar alumnes connectats
  for (let alumne in grupAlumnes) {
    if (
      currentAlumnesMachines[alumne] &&
      Object.keys(currentAlumnesMachines[alumne]).length > 0
    ) {
      const maquina = Object.values(currentAlumnesMachines[alumne])[0];
      if (maquina && maquina.connected && maquina.ip) {
        alumnesConnectats.push({ nom: alumne, ip: maquina.ip });
      }
    }
  }

  if (alumnesConnectats.length === 0) {
    castStudentScreenMenu.innerHTML +=
      '<li><span class="dropdown-item-text text-muted">Cap alumne connectat.</span></li>';
    return;
  }

  // Afegir alumnes connectats al menu
  alumnesConnectats.forEach((alumne) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.className = "dropdown-item";
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-display me-2" viewBox="0 0 16 16">
        <path d="M0 4s0-2 2-2h12s2 0 2 2v6s0 2-2 2h-4q0 1 .25 1.5H11a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1h.75Q6 13 6 12H2s-2 0-2-2zm1.398-.855a.76.76 0 0 0-.254.302A1.5 1.5 0 0 0 1 4.01V10c0 .325.078.502.145.602q.105.156.302.254a1.5 1.5 0 0 0 .538.143L2.01 11H14c.325 0 .502-.078.602-.145a.76.76 0 0 0 .254-.302 1.5 1.5 0 0 0 .143-.538L15 9.99V4c0-.325-.078-.502-.145-.602a.76.76 0 0 0-.302-.254A1.5 1.5 0 0 0 13.99 3H2c-.325 0-.502.078-.602.145"/>
      </svg>
      ${alumne.nom}
    `;
    button.onclick = () => shareStudentScreen(alumne.nom, alumne.ip);
    li.appendChild(button);
    castStudentScreenMenu.appendChild(li);
  });
}

// Funció per gestionar dades importades des de screens.js
function updateStudentData(grupAlumnesList, alumnesMachines) {
  currentGrupAlumnesList = grupAlumnesList || {};
  currentAlumnesMachines = alumnesMachines || {};
  updateStudentDropdown();
}

// Fer la funció global perquè pugui ser cridada des de screens.js
export { updateStudentData as updateCastStudentData };

// Funció per emetre la pantalla d'un alumne
async function shareStudentScreen(alumneNom, alumneIp) {
  const grupSelector = document.getElementById("grupSelector");
  const grup = grupSelector?.value;
  if (!grup) {
    showErrorToast("Selecciona un grup abans d'emetre");
    return;
  }

  if (isBroadcasting) {
    showErrorToast("Ja estàs emetent. Atura l'emissió actual primer.");
    return;
  }

  // Construir URL de l'alumne (mateix format que els iframes de screens.js)
  const studentUrl = `http://${alumneIp}:6080/vnc_iframe.html?password=fpb123&view=true&reconnect&name=${alumneNom}`;

  // Preparar dades de compartició
  const choice = { kind: "url", url: studentUrl, interactive: false };
  pendingShare = choice;

  // Comprova si ja hi ha emissor i demana confirmació
  let proceed = true;
  await new Promise((resolve) => {
    castSocket.emit("check-room", { room: grup }, async (resp) => {
      if (resp && resp.hasBroadcaster) {
        proceed = await showConfirmReplaceModal();
      }
      resolve();
    });
  });

  if (!proceed) {
    showToast("Operació cancel·lada");
    pendingShare = null;
    return;
  }

  currentRoom = grup;
  currentKind = "url";

  // Mostrar previsualització amb iframe
  showIframePreview(studentUrl);

  showToast(`Emetent pantalla de ${alumneNom} al grup`);

  // Sol·licitar unió com a emissor d'URL
  castSocket.emit("broadcaster-join-request", {
    room: currentRoom,
    kind: "url",
    url: studentUrl,
    interactive: false,
  });
}

function stopCast(localOnly = false) {
  // Aturar streams locals
  if (screenStream) {
    screenStream.getTracks().forEach((t) => t.stop());
    screenStream = null;
  }

  // Netejar previsualització completa
  stopPreview();

  // Tancar connexions WebRTC
  for (const [, pc] of peersByViewerId) {
    try {
      pc.close();
    } catch {}
  }
  peersByViewerId.clear();

  // Notificar servidor si cal
  if (isBroadcasting && !localOnly) {
    castSocket.emit("stop-broadcast");
  }

  // Resetar estat
  isBroadcasting = false;
  currentKind = null;
  currentRoom = null;
  pendingShare = null;
}

function createPeerConnectionForViewer(viewerId) {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      castSocket.emit("ice-candidate", {
        room: currentRoom,
        toViewerId: viewerId,
        candidate: event.candidate,
      });
    }
  };

  pc.onconnectionstatechange = () => {
    if (
      pc.connectionState === "failed" ||
      pc.connectionState === "disconnected" ||
      pc.connectionState === "closed"
    ) {
      try {
        pc.close();
      } catch {}
      peersByViewerId.delete(viewerId);
    }
  };

  return pc;
}

// Event listeners del socket cast (enllaç segur i tardà)
function bindCastSocketHandlersOnce() {
  if (!castSocket) return;
  if (window.__castHandlersBound) return;
  window.__castHandlersBound = true;

  castSocket.on("broadcaster-accepted", () => {
    isBroadcasting = true;
    if (currentKind === "url") {
      showToast(`Emetent URL al grup: ${currentRoom}`);
    } else {
      showToast(`Emetent pantalla al grup: ${currentRoom}`);
    }
  });

  castSocket.on("viewer-offer", async ({ viewerId, sdp }) => {
    if (!screenStream || currentKind !== "webrtc") return;
    let pc = peersByViewerId.get(viewerId);
    if (!pc) {
      pc = createPeerConnectionForViewer(viewerId);
      peersByViewerId.set(viewerId, pc);
    }

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    for (const track of screenStream.getTracks()) {
      pc.addTrack(track, screenStream);
    }
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    castSocket.emit("broadcaster-answer", {
      room: currentRoom,
      toViewerId: viewerId,
      sdp: pc.localDescription,
    });
  });

  castSocket.on("ice-candidate", async ({ viewerId, candidate }) => {
    const pc = peersByViewerId.get(viewerId);
    if (!pc || !candidate) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn("Error afegint ICE candidate", e);
    }
  });

  castSocket.on("viewer-left", ({ viewerId }) => {
    const pc = peersByViewerId.get(viewerId);
    if (pc) {
      try {
        pc.close();
      } catch {}
      peersByViewerId.delete(viewerId);
    }
  });

  castSocket.on("force-disconnect", () => {
    stopCast(true);
    showToast(
      "Algú altre està emetent en aquesta sala. S'ha aturat la teva emissió.",
      "warning"
    );
  });

  castSocket.on("replace-required", async () => {
    // Auto-acceptar substitució mantenint el tipus de compartició
    const payload = { room: currentRoom, confirm: true };
    const share = pendingShare || { kind: currentKind };
    if (share && share.kind === "url") {
      payload.kind = "url";
      payload.url = share.url;
      payload.interactive = !!share.interactive;
    } else {
      payload.kind = "webrtc";
    }
    castSocket.emit("confirm-replace", payload);
    showToast("Substituint emissor existent...");
  });

  castSocket.on("replace-declined", () => {
    stopCast(true);
    showErrorToast("Substitució rebutjada");
  });
}

// Intenta vincular ara i també quan auth/socket estiguin llestos
bindCastSocketHandlersOnce();
window.addEventListener("auth:ready", () => {
  if (!window.__castHandlersBound) {
    initCastSocket();
    bindCastSocketHandlersOnce();
  }
});
window.addEventListener("socket:ready", () => {
  if (!window.__castHandlersBound) {
    initCastSocket();
    bindCastSocketHandlersOnce();
  }
});
setTimeout(() => {
  if (!window.__castHandlersBound) {
    initCastSocket();
    bindCastSocketHandlersOnce();
  }
}, 300);

// Gestió de tancar pàgina
window.addEventListener("beforeunload", (e) => {
  if (isBroadcasting) {
    e.preventDefault();
    e.returnValue = "";
  }
});

window.addEventListener("pagehide", () => {
  if (isBroadcasting) {
    try {
      castSocket.emit("stop-broadcast");
    } catch {}
  }
});

// Rebre notificació de tancament de missatge des de l'iframe
window.addEventListener("message", (ev) => {
  const d = ev.data;
  if (!d || d.type !== "palam-message-close") return;
  if (
    isBroadcasting &&
    currentKind === "url" &&
    castPreviewIframe?.src.includes("misssatge.html")
  ) {
    stopCast();
    showToast("Missatge tancat");
  }
});

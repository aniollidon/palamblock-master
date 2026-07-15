/**
 * Screenshots History Viewer
 * Modal + reproductor de captures de pantalla històriques.
 */

import { createBootstrapModal, cleanupOrphanBootstrapBackdrops } from "../../utils/dom-helpers.js";
import { getAuthManager } from "../../core/container-helpers.js";

// ─── Injecta el modal al DOM un sol cop ─────────────────────────
let modalInjected = false;

function ensureModalInDOM() {
  if (modalInjected || document.getElementById("modalScreenshotsHistory")) {
    modalInjected = true;
    return;
  }

  const modalHTML = `
<div class="modal fade" id="modalScreenshotsHistory" tabindex="-1" aria-labelledby="modalScreenshotsHistoryLabel" aria-hidden="true">
  <div class="modal-dialog modal-xl modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="modalScreenshotsHistoryLabel">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-clock-history" viewBox="0 0 16 16">
            <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 0 0-.439-.27l.493-.87a8.025 8.025 0 0 1 .979.654l-.615.789a6.996 6.996 0 0 0-.418-.302zm1.834 1.79a6.99 6.99 0 0 0-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zm.744 1.352a7.08 7.08 0 0 0-.214-.468l.893-.45a7.976 7.976 0 0 1 .45 1.088l-.95.313a7.023 7.023 0 0 0-.179-.483zm.53 2.507a6.991 6.991 0 0 0-.1-1.025l.985-.17c.067.386.106.778.116 1.17l-1 .025zm-.131 1.538c.033-.17.06-.339.081-.51l.993.123a7.957 7.957 0 0 1-.23 1.155l-.964-.267c.046-.165.086-.332.12-.501zm-.952 2.379c.184-.29.346-.594.486-.908l.914.405c-.16.36-.345.706-.555 1.038l-.845-.535zm-.964 1.205c.122-.122.239-.248.35-.378l.758.653a8.073 8.073 0 0 1-.401.432l-.707-.707z"></path>
            <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0v1z"></path>
            <path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z"></path>
            </svg>
          Historial de captures — <span id="screenshotsHistAlumneName">...</span>
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body" style="min-height:400px;">
        <div id="screenshotsHistLoading" class="text-center py-5">
          <div class="spinner-border" role="status"><span class="visually-hidden">Carregant...</span></div>
          <p class="mt-2">Carregant sessions...</p>
        </div>
        <div id="screenshotsHistContent" style="display:none;">
          <div class="mb-3">
            <label class="form-label">Sessió</label>
            <div class="d-flex gap-1">
              <select class="form-select form-select-sm" id="screenshotsHistSessionSelect"></select>
              <button class="btn btn-sm btn-outline-secondary" id="screenshotsHistRefreshBtn" title="Refrescar">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-arrow-repeat" viewBox="0 0 16 16"><path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41m-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9"/><path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5 5 0 0 0 8 3M3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9z"/></svg>
              </button>
            </div>
          </div>
          <div id="screenshotsHistSessionInfo" class="mb-2 small text-muted"></div>
          <div id="screenshotsHistEmpty" class="text-center py-4 text-muted" style="display:none;"><p>No hi ha captures en aquesta sessió.</p></div>
          <div id="screenshotsHistPlayer" style="display:none;">
            <div class="text-center mb-2 position-relative" id="screenshotsHistImageContainer" style="background:#000;border-radius:6px;overflow:hidden;cursor:pointer;">
              <img id="screenshotsHistImage" src="" alt="Captura" style="max-width:100%;max-height:55vh;object-fit:contain;" />
              <div id="screenshotsHistTimestamp" class="position-absolute bottom-0 start-0 m-2 px-2 py-1 bg-dark bg-opacity-75 rounded small text-white"></div>
              <button id="screenshotsHistFullscreenBtn" class="btn btn-sm btn-dark position-absolute top-0 end-0 m-2" title="Pantalla completa">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrows-fullscreen" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707m4.344 0a.5.5 0 0 1 .707 0l4.096 4.096V11.5a.5.5 0 1 1 1 0v3.975a.5.5 0 0 1-.5.5H11.5a.5.5 0 0 1 0-1h2.768l-4.096-4.096a.5.5 0 0 1 0-.707m0-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707m-4.344 0a.5.5 0 0 1-.707 0L1.025 1.732V4.5a.5.5 0 0 1-1 0V.525a.5.5 0 0 1 .5-.5H4.5a.5.5 0 0 1 0 1H1.732l4.096 4.096a.5.5 0 0 1 0 .707"/></svg>
              </button>
            </div>
            <div class="d-flex align-items-center gap-2 flex-wrap mb-2 p-2 bg-light rounded">
              <button id="screenshotsHistPrevBtn" class="btn btn-sm btn-outline-secondary" title="Anterior">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-skip-start-fill" viewBox="0 0 16 16"><path d="M4 4a.5.5 0 0 1 1 0v3.248l6.267-3.636c.54-.313 1.232.066 1.232.696v7.384c0 .63-.692 1.01-1.232.697L5 8.753V12a.5.5 0 0 1-1 0z"/></svg>
              </button>
              <button id="screenshotsHistPlayBtn" class="btn btn-sm btn-primary" title="Reproduir / Pausa">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/></svg>
              </button>
              <button id="screenshotsHistNextBtn" class="btn btn-sm btn-outline-secondary" title="Següent">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-skip-end-fill" viewBox="0 0 16 16"><path d="M12.5 4a.5.5 0 0 0-1 0v3.248L5.233 3.612C4.693 3.3 4 3.678 4 4.308v7.384c0 .63.692 1.01 1.233.697L11.5 8.753V12a.5.5 0 0 0 1 0z"/></svg>
              </button>
              <span class="text-muted mx-1">|</span>
              <span class="small" id="screenshotsHistFrameInfo">0 / 0</span>
              <span class="text-muted mx-1">|</span>
              <label class="small mb-0">Velocitat:</label>
              <select id="screenshotsHistSpeedSelect" class="form-select form-select-sm" style="width:auto;">
                <option value="2000">Lent (2s)</option>
                <option value="500" selected>Normal (0,5s)</option>
                <option value="200">Ràpid (0,2s)</option>
              </select>
            </div>
            <div class="mb-2"><input type="range" class="form-range" id="screenshotsHistProgressBar" min="0" max="100" value="0" style="cursor:pointer;" /></div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tancar</button>
      </div>
    </div>
  </div>
</div>
<div id="screenshotsHistFullscreenOverlay" class="screenshots-hist-fs-overlay" style="display:none;">
  <img id="screenshotsHistFullscreenImg" src="" alt="Captura pantalla completa"
    style="position:absolute;top:0;left:0;user-select:none;" />
  <div id="screenshotsHistFullscreenTimestamp" class="screenshots-hist-fs-timestamp">...</div>
  <button id="screenshotsHistFullscreenClose" class="screenshots-hist-fs-close" title="Tancar (ESC)">✕</button>
  <div id="screenshotsHistFullscreenControls" class="screenshots-hist-fs-controls visible">
    <button id="screenshotsHistFsPrevBtn" class="screenshots-hist-fs-ctrl-btn" title="Anterior">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M4 4a.5.5 0 0 1 1 0v3.248l6.267-3.636c.54-.313 1.232.066 1.232.696v7.384c0 .63-.692 1.01-1.232.697L5 8.753V12a.5.5 0 0 1-1 0z"/></svg>
    </button>
    <button id="screenshotsHistFsPlayBtn" class="screenshots-hist-fs-ctrl-btn" title="Reproduir / Pausa">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/></svg>
    </button>
    <button id="screenshotsHistFsNextBtn" class="screenshots-hist-fs-ctrl-btn" title="Següent">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16"><path d="M12.5 4a.5.5 0 0 0-1 0v3.248L5.233 3.612C4.693 3.3 4 3.678 4 4.308v7.384c0 .63.692 1.01 1.233.697L11.5 8.753V12a.5.5 0 0 0 1 0z"/></svg>
    </button>
    <span id="screenshotsHistFsFrameInfo" class="screenshots-hist-fs-frameinfo">0 / 0</span>
  </div>
</div>`;

  const container = document.createElement("div");
  container.innerHTML = modalHTML;
  document.body.appendChild(container);
  modalInjected = true;
  debugLog("Modal injectat al DOM");
}

// ─── Constants ──────────────────────────────────────────────────
const PLAYBACK_SPEEDS = {
  slow: 2000,
  normal: 500,
  fast: 200,
};

// ─── Estat ───────────────────────────────────────────────────────
let currentData = null;       // Dades de listScreenshots
let currentAlumne = null;
let currentMachineId = null;
let currentSessionId = null;
let currentImages = [];       // Array de {filename, timestamp, size, url}
let currentFrameIndex = 0;
let isPlaying = false;
let playbackTimer = null;
let playbackSpeed = PLAYBACK_SPEEDS.normal;
let modalInstance = null;

// ─── Helpers ────────────────────────────────────────────────────

function debugLog(...args) {
  console.log("%c[SCREENSHOTS_HIST]", "color:#e67e22;font-weight:bold", ...args);
}

function formatTimestamp(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleString("ca-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function formatDateShort(isoString) {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleDateString("ca-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function formatTimeShort(isoString) {
  if (!isoString) return "--:--";
  const d = new Date(isoString);
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function isToday(isoString) {
  if (!isoString) return false;
  const d = new Date(isoString);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

function formatSessionLabel(session) {
  const images = session.images || [];
  let timeRange = "--:-- – --:--";
  if (images.length > 0) {
    timeRange = formatTimeShort(images[0].timestamp) + "–" + formatTimeShort(images[images.length - 1].timestamp);
  }
  const name = session.displayName || session.user || session.sessionId || "?";
  let label = timeRange + " " + name;
  // Afegir data si la sessió no és d'avui
  if (!isToday(session.startedAt) && session.startedAt) {
    const d = new Date(session.startedAt);
    const dateStr = String(d.getDate()).padStart(2, '0') + "/" + String(d.getMonth() + 1).padStart(2, '0') + "/" + d.getFullYear();
    label += " · " + dateStr;
  }
  return label;
}

function getBaseUrl() {
  const auth = getAuthManager();
  return auth?.serverUrl || "";
}

function getAuthToken() {
  const auth = getAuthManager();
  return auth?.authToken || "";
}

function resolveImageUrl(relativeUrl) {
  if (!relativeUrl) return "";
  if (relativeUrl.startsWith("http")) return relativeUrl;
  return getBaseUrl() + relativeUrl;
}

// ─── DOM refs ────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function dom() {
  return {
    modalLabel: $("screenshotsHistAlumneName"),
    loading: $("screenshotsHistLoading"),
    content: $("screenshotsHistContent"),
    sessionSelect: $("screenshotsHistSessionSelect"),
    refreshBtn: $("screenshotsHistRefreshBtn"),
    sessionInfo: $("screenshotsHistSessionInfo"),
    empty: $("screenshotsHistEmpty"),
    player: $("screenshotsHistPlayer"),
    image: $("screenshotsHistImage"),
    timestamp: $("screenshotsHistTimestamp"),
    fullscreenBtn: $("screenshotsHistFullscreenBtn"),
    prevBtn: $("screenshotsHistPrevBtn"),
    playBtn: $("screenshotsHistPlayBtn"),
    nextBtn: $("screenshotsHistNextBtn"),
    frameInfo: $("screenshotsHistFrameInfo"),
    speedSelect: $("screenshotsHistSpeedSelect"),
    progressBar: $("screenshotsHistProgressBar"),
    imageContainer: $("screenshotsHistImageContainer"),
    fullscreenOverlay: $("screenshotsHistFullscreenOverlay"),
    fullscreenImg: $("screenshotsHistFullscreenImg"),
    fullscreenTimestamp: $("screenshotsHistFullscreenTimestamp"),
    fullscreenClose: $("screenshotsHistFullscreenClose"),
    fullscreenControls: $("screenshotsHistFullscreenControls"),
    fsPrevBtn: $("screenshotsHistFsPrevBtn"),
    fsPlayBtn: $("screenshotsHistFsPlayBtn"),
    fsNextBtn: $("screenshotsHistFsNextBtn"),
    fsFrameInfo: $("screenshotsHistFsFrameInfo"),
  };
}

// ─── API ─────────────────────────────────────────────────────────

async function fetchScreenshots(alumne) {
  const baseUrl = getBaseUrl();
  if (!baseUrl) throw new Error("URL del servidor no configurada");

  const url = `${baseUrl}/api/v1/screenshots/${encodeURIComponent(alumne)}`;
  const res = await fetch(url, {
    headers: { "Authorization": `Bearer ${getAuthToken()}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Refresc ────────────────────────────────────────────────────

async function refreshCurrentSession() {
  if (!currentAlumne) return;
  const d = dom();
  stopPlayback();

  // Desa selecció actual
  const savedOption = d.sessionSelect.selectedOptions[0];
  const savedMachineId = savedOption ? savedOption.getAttribute("data-machine") : null;
  const savedSessionId = d.sessionSelect.value;

  try {
    const resp = await fetchScreenshots(currentAlumne);
    if (resp.status !== "OK") return;
    currentData = resp.data;

    // Reconstruir llista plana
    const flatSessions = flattenAndSortSessions(currentData.machines);
    populateFlatSessionSelect(flatSessions);

    // Restaurar selecció
    if (savedMachineId && savedSessionId) {
      for (const opt of d.sessionSelect.options) {
        if (opt.value === savedSessionId && opt.getAttribute("data-machine") === savedMachineId) {
          d.sessionSelect.value = savedSessionId;
          onSessionChange();
          break;
        }
      }
    }
  } catch (err) {
    console.error("[SCREENSHOTS_HIST] Error refrescant:", err);
  }
}

// ─── Selecció de sessió (plana, sense selector de màquina) ──────

/**
 * Aplana totes les sessions de totes les màquines en un sol array,
 * afegint machineId a cada sessió, i ordena per startedAt desc.
 */
function flattenAndSortSessions(machines) {
  const flat = [];
  for (const [machineId, machineData] of Object.entries(machines)) {
    const sessions = machineData.sessions || [];
    for (const session of sessions) {
      flat.push({
        ...session,
        _machineId: machineId,
      });
    }
  }
  flat.sort((a, b) => {
    const da = a.startedAt ? new Date(a.startedAt).getTime() : 0;
    const db = b.startedAt ? new Date(b.startedAt).getTime() : 0;
    return db - da; // més recent primer
  });
  return flat;
}

function populateFlatSessionSelect(flatSessions) {
  const d = dom();
  d.sessionSelect.innerHTML = "";
  if (flatSessions.length === 0) {
    d.sessionSelect.innerHTML = '<option value="">Cap sessió</option>';
    hidePlayer();
    return;
  }
  for (const session of flatSessions) {
    const opt = document.createElement("option");
    opt.value = session.sessionId;
    opt.setAttribute("data-machine", session._machineId);
    opt.textContent = formatSessionLabel(session) + ` (${session.imageCount} img)`;
    d.sessionSelect.appendChild(opt);
  }
  d.sessionSelect.value = flatSessions[0].sessionId;
  onSessionChange();
}

function onSessionChange() {
  const d = dom();
  const selectedOpt = d.sessionSelect.selectedOptions[0];
  const machineId = selectedOpt ? selectedOpt.getAttribute("data-machine") : null;
  const sessionId = d.sessionSelect.value;
  if (!machineId || !sessionId || !currentData) return;

  currentMachineId = machineId;
  currentSessionId = sessionId;

  const sessions = currentData.machines[machineId]?.sessions || [];
  const session = sessions.find(s => s.sessionId === sessionId);
  if (!session) return;

  // Info de la sessió
  const userInfo = session.displayName || session.user || "Sense usuari temporal";
  const timeRange = formatTimeShort(session.images?.[0]?.timestamp) + " – " + formatTimeShort(session.images?.[session.images.length - 1]?.timestamp);
  d.sessionInfo.innerHTML = `<strong>${userInfo}</strong> · ${timeRange} · ${session.imageCount} captures`;

  currentImages = session.images || [];
  currentFrameIndex = 0;
  stopPlayback();

  if (currentImages.length === 0) {
    d.empty.style.display = "block";
    d.player.style.display = "none";
    return;
  }

  d.empty.style.display = "none";
  d.player.style.display = "block";
  goToFrame(0);
}

function hidePlayer() {
  const d = dom();
  d.player.style.display = "none";
  d.empty.style.display = "block";
  d.sessionInfo.innerHTML = "";
  currentImages = [];
}

// ─── Navegació / Reproductor ─────────────────────────────────────

function goToFrame(index) {
  if (currentImages.length === 0) return;
  currentFrameIndex = Math.max(0, Math.min(index, currentImages.length - 1));

  const img = currentImages[currentFrameIndex];
  const d = dom();
  d.image.src = resolveImageUrl(img.url);
  d.timestamp.textContent = formatTimestamp(img.timestamp);
  d.frameInfo.textContent = `${currentFrameIndex + 1} / ${currentImages.length}`;
  d.progressBar.value = currentImages.length > 1
    ? Math.round((currentFrameIndex / (currentImages.length - 1)) * 100)
    : 0;

  // Sincronitzar fullscreen si està obert
  syncFullscreenImage();
}

function syncFullscreenImage() {
  const d = dom();
  if (d.fullscreenOverlay.style.display !== "block") return;
  if (currentImages.length === 0) return;
  const img = currentImages[currentFrameIndex];

  // Reset zoom/pan en canviar de frame
  resetFullscreenTransform();

  d.fullscreenImg.src = resolveImageUrl(img.url);
  d.fullscreenTimestamp.textContent = formatTimestamp(img.timestamp);
  updateFullscreenFrameInfo();

  // Reaplicar transformació quan la nova imatge es carregui
  d.fullscreenImg.onload = () => {
    fsImgNaturalW = d.fullscreenImg.naturalWidth;
    fsImgNaturalH = d.fullscreenImg.naturalHeight;
    applyFullscreenTransform(true);
  };
  if (d.fullscreenImg.complete) {
    fsImgNaturalW = d.fullscreenImg.naturalWidth;
    fsImgNaturalH = d.fullscreenImg.naturalHeight;
    applyFullscreenTransform(true);
  }
}

function startPlayback() {
  if (isPlaying || currentImages.length === 0) return;
  isPlaying = true;
  updatePlayButton();
  scheduleNextFrame();
}

function stopPlayback() {
  isPlaying = false;
  if (playbackTimer) {
    clearTimeout(playbackTimer);
    playbackTimer = null;
  }
  updatePlayButton();
}

function scheduleNextFrame() {
  if (!isPlaying) return;
  playbackTimer = setTimeout(() => {
    if (currentFrameIndex >= currentImages.length - 1) {
      stopPlayback(); // Final del vídeo
      return;
    }
    goToFrame(currentFrameIndex + 1);
    scheduleNextFrame();
  }, playbackSpeed);
}

function togglePlayPause() {
  if (isPlaying) {
    stopPlayback();
  } else {
    // Si estem al final, recomença
    if (currentFrameIndex >= currentImages.length - 1) {
      currentFrameIndex = 0;
      goToFrame(0);
    }
    startPlayback();
  }
}

function updatePlayButton() {
  const d = dom();
  const playHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16">
    <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/>
  </svg>`;
  const pauseHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16">
    <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5"/>
  </svg>`;

  if (isPlaying) {
    d.playBtn.innerHTML = pauseHTML;
  } else {
    d.playBtn.innerHTML = playHTML;
  }
  // Sincronitzar botó del fullscreen
  updateFullscreenPlayButton();
}

// ─── Fullscreen ──────────────────────────────────────────────────

let fsControlsTimer = null;
const FS_CONTROLS_HIDE_DELAY = 3000; // ms d'inactivitat abans d'amagar
const FS_ZOOM_MIN = 1;        // Zoom mínim: la imatge sempre omple la pantalla
const FS_ZOOM_MAX = 8;
const FS_ZOOM_STEP = 0.2;

let fsZoom = FS_ZOOM_MIN;
let fsPanX = 0;  // px de desplaçament respecte al centre
let fsPanY = 0;
let fsImgNaturalW = 0;
let fsImgNaturalH = 0;

function openImageFullscreen() {
  if (currentImages.length === 0) return;
  const d = dom();
  const img = currentImages[currentFrameIndex];

  // Reset de zoom i pan
  fsZoom = FS_ZOOM_MIN;
  fsPanX = 0;
  fsPanY = 0;

  d.fullscreenImg.src = resolveImageUrl(img.url);
  d.fullscreenTimestamp.textContent = formatTimestamp(img.timestamp);
  d.fullscreenOverlay.style.display = "block";

  // Quan la imatge es carregui, obtenim les dimensions naturals
  d.fullscreenImg.onload = () => {
    fsImgNaturalW = d.fullscreenImg.naturalWidth;
    fsImgNaturalH = d.fullscreenImg.naturalHeight;
    applyFullscreenTransform(true);
  };
  // Per si la imatge ja està en caché
  if (d.fullscreenImg.complete) {
    fsImgNaturalW = d.fullscreenImg.naturalWidth;
    fsImgNaturalH = d.fullscreenImg.naturalHeight;
    applyFullscreenTransform(true);
  }

  updateFullscreenFrameInfo();
  updateFullscreenPlayButton();

  showFullscreenControls();

  // Entrar a pantalla completa real (API del navegador)
  d.fullscreenOverlay.requestFullscreen().catch(err => {
    console.warn("[SCREENSHOTS_HIST] No s'ha pogut entrar a pantalla completa:", err);
  });
}

function closeImageFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  hideFullscreenOverlay();
}

function hideFullscreenOverlay() {
  const d = dom();
  d.fullscreenOverlay.style.display = "none";
  clearFullscreenControlsTimer();
}

// ─── Zoom i pan ──────────────────────────────────────────────────

function resetFullscreenTransform() {
  fsZoom = FS_ZOOM_MIN;
  fsPanX = 0;
  fsPanY = 0;
}

function applyFullscreenTransform(resetPan) {
  const d = dom();
  if (!fsImgNaturalW || !fsImgNaturalH) return;
  if (resetPan) { fsPanX = 0; fsPanY = 0; }

  // Clampar el pan perquè la imatge mai deixi espai buit al viewport
  clampPanToImageBounds();

  // Escala "fit to screen" com a base
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const fitScale = Math.min(vw / fsImgNaturalW, vh / fsImgNaturalH);
  const totalScale = fitScale * fsZoom;

  // La imatge escalada a mida real
  const scaledW = fsImgNaturalW * totalScale;
  const scaledH = fsImgNaturalH * totalScale;

  // Posició centrada + pan
  const left = (vw - scaledW) / 2 + fsPanX;
  const top = (vh - scaledH) / 2 + fsPanY;

  d.fullscreenImg.style.width = fsImgNaturalW + "px";
  d.fullscreenImg.style.height = fsImgNaturalH + "px";
  d.fullscreenImg.style.maxWidth = "none";
  d.fullscreenImg.style.maxHeight = "none";
  d.fullscreenImg.style.transformOrigin = "top left";
  d.fullscreenImg.style.position = "absolute";
  d.fullscreenImg.style.top = top + "px";
  d.fullscreenImg.style.left = left + "px";
  d.fullscreenImg.style.transform = `scale(${totalScale})`;
}

function clampPanToImageBounds() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const fitScale = Math.min(vw / fsImgNaturalW, vh / fsImgNaturalH);
  const totalScale = fitScale * fsZoom;
  const scaledW = fsImgNaturalW * totalScale;
  const scaledH = fsImgNaturalH * totalScale;

  // La imatge sempre ha de cobrir el viewport: els marges de la imatge
  // no poden entrar dins del viewport (no pot quedar espai negre als costats).
  // Això vol dir que el vora esquerre de la imatge ha de ser <= 0
  // i el vora dret >= vw. El mateix per dalt/baix.
  const maxPanX = Math.max(0, (scaledW - vw) / 2);
  const maxPanY = Math.max(0, (scaledH - vh) / 2);

  // Quan scaledW <= vw, la imatge és més petita que el viewport en amplada,
  // llavors el pan horitzontal es limita perquè no quedi espai negre.
  if (scaledW <= vw) {
    // La imatge es centra horitzontalment, no es pot moure
    fsPanX = 0;
  } else {
    fsPanX = Math.max(-maxPanX, Math.min(maxPanX, fsPanX));
  }

  if (scaledH <= vh) {
    fsPanY = 0;
  } else {
    fsPanY = Math.max(-maxPanY, Math.min(maxPanY, fsPanY));
  }
}

function zoomFullscreen(delta, clientX, clientY) {
  const oldZoom = fsZoom;
  fsZoom = Math.max(FS_ZOOM_MIN, Math.min(FS_ZOOM_MAX, fsZoom + delta));

  if (fsZoom === oldZoom) return;

  // Zoom cap al punt on hi ha el cursor
  if (clientX !== undefined && clientY !== undefined) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fitScale = Math.min(vw / fsImgNaturalW, vh / fsImgNaturalH);

    const oldTotalScale = fitScale * oldZoom;
    const newTotalScale = fitScale * fsZoom;

    // Centre de la pantalla
    const cx = vw / 2;
    const cy = vh / 2;

    // Punt relatiu al centre de la pantalla
    const relX = clientX - cx;
    const relY = clientY - cy;

    // Ajustar pan per mantenir el punt sota el cursor
    fsPanX = (fsPanX - relX) * (newTotalScale / oldTotalScale) + relX;
    fsPanY = (fsPanY - relY) * (newTotalScale / oldTotalScale) + relY;
  }

  applyFullscreenTransform(false);
}

// ─── Controls del fullscreen ────────────────────────────────────

function updateFullscreenFrameInfo() {
  const d = dom();
  if (currentImages.length > 0) {
    d.fsFrameInfo.textContent = `${currentFrameIndex + 1} / ${currentImages.length}`;
  }
}

function updateFullscreenPlayButton() {
  const d = dom();
  const btn = d.fsPlayBtn;
  if (isPlaying) {
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5"/></svg>`;
    btn.title = "Pausa";
  } else {
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/></svg>`;
    btn.title = "Reproduir";
  }
}

function fsGoToFrame(index) {
  goToFrame(index);
  updateFullscreenFrameInfo();
  updateFullscreenPlayButton();
}

// ─── Auto-ocultació dels controls ───────────────────────────────

function showFullscreenControls() {
  const d = dom();
  if (!d.fullscreenControls) return;
  d.fullscreenControls.classList.add("visible");
  d.fullscreenControls.classList.remove("hidden");
  d.fullscreenClose.classList.add("visible");
  d.fullscreenClose.classList.remove("hidden");
  d.fullscreenTimestamp.classList.add("visible");
  d.fullscreenTimestamp.classList.remove("hidden");
  resetFullscreenControlsTimer();
}

function hideFullscreenControls() {
  const d = dom();
  if (!d.fullscreenControls) return;
  d.fullscreenControls.classList.add("hidden");
  d.fullscreenControls.classList.remove("visible");
  d.fullscreenClose.classList.add("hidden");
  d.fullscreenClose.classList.remove("visible");
  d.fullscreenTimestamp.classList.add("hidden");
  d.fullscreenTimestamp.classList.remove("visible");
}

function resetFullscreenControlsTimer() {
  clearFullscreenControlsTimer();
  fsControlsTimer = setTimeout(hideFullscreenControls, FS_CONTROLS_HIDE_DELAY);
}

function clearFullscreenControlsTimer() {
  if (fsControlsTimer) {
    clearTimeout(fsControlsTimer);
    fsControlsTimer = null;
  }
}

// ─── Bindings del fullscreen ────────────────────────────────────

let fsIsDragging = false;
let fsHasDragged = false;
let fsDragStartX = 0;
let fsDragStartY = 0;
let fsPanStartX = 0;
let fsPanStartY = 0;

function bindFullscreenEvents() {
  const d = dom();

  // Tancar fullscreen
  d.fullscreenClose.addEventListener("click", closeImageFullscreen);

  // ═══ Zoom amb roda del ratolí ═══
  d.fullscreenOverlay.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? FS_ZOOM_STEP : -FS_ZOOM_STEP;
    zoomFullscreen(delta, e.clientX, e.clientY);
    showFullscreenControls();
  }, { passive: false });

  // ═══ Pan amb drag (clic i arrossegar) ═══
  d.fullscreenOverlay.addEventListener("mousedown", (e) => {
    // No iniciar drag si es clica als controls
    if (e.target.closest("#screenshotsHistFullscreenControls") ||
        e.target.closest("#screenshotsHistFullscreenClose") ||
        e.target.closest("#screenshotsHistFullscreenTimestamp")) {
      return;
    }
    fsIsDragging = true;
    fsHasDragged = false;
    fsDragStartX = e.clientX;
    fsDragStartY = e.clientY;
    fsPanStartX = fsPanX;
    fsPanStartY = fsPanY;
    d.fullscreenOverlay.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", (e) => {
    if (!fsIsDragging) return;
    const dx = e.clientX - fsDragStartX;
    const dy = e.clientY - fsDragStartY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      fsHasDragged = true;
    }
    fsPanX = fsPanStartX + dx;
    fsPanY = fsPanStartY + dy;
    applyFullscreenTransform(false);
  });

  window.addEventListener("mouseup", () => {
    if (fsIsDragging) {
      fsIsDragging = false;
      d.fullscreenOverlay.style.cursor = "";
    }
  });

  // Clic al fons fosc tanca (només si no s'ha fet drag)
  d.fullscreenOverlay.addEventListener("click", (e) => {
    if (e.target === d.fullscreenOverlay && !fsHasDragged) {
      closeImageFullscreen();
    }
    fsHasDragged = false;
  });

  // ═══ Navegació dins del fullscreen ═══
  d.fsPrevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fsGoToFrame(currentFrameIndex - 1);
    showFullscreenControls();
  });
  d.fsNextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    fsGoToFrame(currentFrameIndex + 1);
    showFullscreenControls();
  });
  d.fsPlayBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePlayPause();
    updateFullscreenPlayButton();
    showFullscreenControls();
  });

  // ═══ Auto-ocultació dels controls ═══
  d.fullscreenOverlay.addEventListener("mousemove", () => {
    showFullscreenControls();
  });
  d.fullscreenOverlay.addEventListener("touchstart", () => {
    showFullscreenControls();
  });

  // Detectar sortida del fullscreen real (ESC del navegador)
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
      hideFullscreenOverlay();
    }
  });

  // ═══ Teclat dins del fullscreen ═══
  d.fullscreenOverlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      // El navegador ja surt del fullscreen amb ESC
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      fsGoToFrame(currentFrameIndex + 1);
      showFullscreenControls();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      fsGoToFrame(currentFrameIndex - 1);
      showFullscreenControls();
    } else if (e.key === " ") {
      e.preventDefault();
      togglePlayPause();
      updateFullscreenPlayButton();
      showFullscreenControls();
    }
  });

  // Redimensionar: reaplicar transform quan canvia la mida de la pantalla
  window.addEventListener("resize", () => {
    if (d.fullscreenOverlay.style.display === "block") {
      applyFullscreenTransform(false);
    }
  });
}

// Cridar un cop
let fullscreenBound = false;

// ─── Bindings ────────────────────────────────────────────────────

let bound = false;

function bindEvents() {
  if (bound) return;
  bound = true;

  const d = dom();

  d.sessionSelect.addEventListener("change", onSessionChange);
  d.refreshBtn.addEventListener("click", refreshCurrentSession);

  d.playBtn.addEventListener("click", togglePlayPause);
  d.prevBtn.addEventListener("click", () => {
    stopPlayback();
    goToFrame(currentFrameIndex - 1);
  });
  d.nextBtn.addEventListener("click", () => {
    stopPlayback();
    goToFrame(currentFrameIndex + 1);
  });

  d.speedSelect.addEventListener("change", () => {
    playbackSpeed = parseInt(d.speedSelect.value, 10) || PLAYBACK_SPEEDS.normal;
    // Si s'està reproduint, reiniciar el timer amb la nova velocitat
    if (isPlaying) {
      if (playbackTimer) clearTimeout(playbackTimer);
      scheduleNextFrame();
    }
  });

  d.progressBar.addEventListener("input", () => {
    stopPlayback();
    const pct = parseInt(d.progressBar.value, 10);
    const idx = currentImages.length > 1
      ? Math.round((pct / 100) * (currentImages.length - 1))
      : 0;
    goToFrame(idx);
  });

  d.fullscreenBtn.addEventListener("click", openImageFullscreen);
  d.imageContainer.addEventListener("click", (e) => {
    if (e.target === d.fullscreenBtn || d.fullscreenBtn.contains(e.target)) return;
    openImageFullscreen();
  });

  if (!fullscreenBound) {
    bindFullscreenEvents();
    fullscreenBound = true;
  }

  // Tecles: Escape per tancar fullscreen, Espai per play/pause, fletxes per navegar
  document.addEventListener("keydown", handleKeyDown);
}

function handleKeyDown(e) {
  const d = dom();
  // Només si el modal és visible
  const modalEl = document.getElementById("modalScreenshotsHistory");
  if (!modalEl || !modalEl.classList.contains("show")) return;

  // Si estem en fullscreen, deixem que el listener del overlay gestioni les tecles
  if (document.fullscreenElement === d.fullscreenOverlay || d.fullscreenOverlay.style.display === "block") {
    // No fem res aquí: el keydown del fullscreenOverlay i el fullscreenchange del document ho gestionen
    // Per evitar que Bootstrap tanqui el modal amb ESC, prevenim la propagació
    if (e.key === "Escape" && document.fullscreenElement) {
      e.stopPropagation();
      e.preventDefault();
    }
    return;
  }

  // No processar tecles si l'usuari està escrivint en un input
  if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA") return;

  if (e.key === " ") {
    e.preventDefault();
    togglePlayPause();
  } else if (e.key === "ArrowRight") {
    stopPlayback();
    goToFrame(currentFrameIndex + 1);
  } else if (e.key === "ArrowLeft") {
    stopPlayback();
    goToFrame(currentFrameIndex - 1);
  }
}

// ─── API pública ─────────────────────────────────────────────────

/**
 * Obre el modal d'historial de captures per a un alumne.
 * @param {string} alumne - Nom de l'alumne
 */
export async function openScreenshotsHistory(alumne) {
  debugLog("Obrint historial per:", alumne);

  ensureModalInDOM();

  currentAlumne = alumne;

  // Mostrar modal
  const modalEl = document.getElementById("modalScreenshotsHistory");
  if (!modalEl) {
    console.error("[SCREENSHOTS_HIST] Modal no trobat al DOM");
    return;
  }

  if (!modalInstance) {
    modalInstance = createBootstrapModal("modalScreenshotsHistory");
  }

  const d = dom();
  d.modalLabel.textContent = alumne;
  d.loading.style.display = "block";
  d.content.style.display = "none";
  d.player.style.display = "none";
  d.empty.style.display = "none";
  d.fullscreenOverlay.style.display = "none";
  stopPlayback();
  currentImages = [];
  currentData = null;

  bindEvents();

  // Netejar fullscreen si el modal es tanca (Bootstrap dismiss)
  modalEl.addEventListener("hidden.bs.modal", () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    hideFullscreenOverlay();
    stopPlayback();
  }, { once: true });

  modalInstance.show();

  // Carregar dades
  try {
    const resp = await fetchScreenshots(alumne);
    if (resp.status !== "OK") {
      console.error("[SCREENSHOTS_HIST] Error de l'API:", resp.message);
      d.loading.innerHTML = `<p class="text-danger">Error: ${resp.message || "Desconegut"}</p>`;
      return;
    }
    currentData = resp.data;
    d.loading.style.display = "none";
    d.content.style.display = "block";

    // Construir llista plana de sessions
    const flatSessions = flattenAndSortSessions(currentData.machines || {});
    if (flatSessions.length === 0) {
      d.sessionSelect.innerHTML = '<option value="">Cap sessió</option>';
      d.sessionInfo.innerHTML = "Aquest alumne no té captures de pantalla.";
      return;
    }

    populateFlatSessionSelect(flatSessions);
  } catch (err) {
    console.error("[SCREENSHOTS_HIST] Error carregant:", err);
    d.loading.innerHTML = `<p class="text-danger">Error carregant dades: ${err.message}</p>`;
  }
}

/**
 * Neteja recursos quan es tanca el modal.
 */
export function closeScreenshotsHistory() {
  stopPlayback();
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  hideFullscreenOverlay();
  currentData = null;
  currentImages = [];
  cleanupOrphanBootstrapBackdrops();
}

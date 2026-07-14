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
          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">Màquina</label>
              <select class="form-select form-select-sm" id="screenshotsHistMachineSelect"></select>
            </div>
            <div class="col-md-6">
              <label class="form-label">Sessió</label>
              <div class="d-flex gap-1">
                <select class="form-select form-select-sm" id="screenshotsHistSessionSelect"></select>
                <button class="btn btn-sm btn-outline-secondary" id="screenshotsHistRefreshBtn" title="Refrescar">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-arrow-repeat" viewBox="0 0 16 16"><path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41m-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9"/><path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5 5 0 0 0 8 3M3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9z"/></svg>
                </button>
              </div>
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
            <div id="screenshotsHistThumbnails" class="d-flex gap-1 overflow-auto pb-2" style="max-height:100px;"></div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tancar</button>
      </div>
    </div>
  </div>
</div>
<div id="screenshotsHistFullscreenOverlay" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;z-index:9999;overflow:auto;cursor:grab;">
  <div id="screenshotsHistFullscreenWrapper" style="display:flex;align-items:flex-start;justify-content:center;min-width:100%;min-height:100%;">
    <img id="screenshotsHistFullscreenImg" src="" alt="Captura pantalla completa" style="display:block;cursor:grab;user-select:none;" draggable="false" />
  </div>
  <button id="screenshotsHistFullscreenClose" class="btn btn-sm btn-dark position-fixed top-0 end-0 m-3" title="Tancar" style="z-index:1;">✕</button>
  <div id="screenshotsHistFullscreenTimestamp" class="position-fixed bottom-0 start-0 m-3 px-2 py-1 bg-dark bg-opacity-75 rounded small text-white" style="z-index:1;"></div>
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

function formatSessionLabel(session) {
  const images = session.images || [];
  let timeRange = "--:-- – --:--";
  if (images.length > 0) {
    timeRange = formatTimeShort(images[0].timestamp) + "–" + formatTimeShort(images[images.length - 1].timestamp);
  }
  const name = session.displayName || session.user || session.sessionId || "?";
  return timeRange + " " + name;
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
    machineSelect: $("screenshotsHistMachineSelect"),
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
    thumbnails: $("screenshotsHistThumbnails"),
    imageContainer: $("screenshotsHistImageContainer"),
    fullscreenOverlay: $("screenshotsHistFullscreenOverlay"),
    fullscreenWrapper: $("screenshotsHistFullscreenWrapper"),
    fullscreenImg: $("screenshotsHistFullscreenImg"),
    fullscreenTimestamp: $("screenshotsHistFullscreenTimestamp"),
    fullscreenClose: $("screenshotsHistFullscreenClose"),
    fullscreenZoomInBtn: $("screenshotsHistFullscreenZoomInBtn"),
    fullscreenZoomOutBtn: $("screenshotsHistFullscreenZoomOutBtn"),
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

  // Desa seleccions actuals
  const savedMachineId = d.machineSelect.value;
  const savedSessionId = d.sessionSelect.value;

  try {
    const resp = await fetchScreenshots(currentAlumne);
    if (resp.status !== "OK") return;
    currentData = resp.data;

    // Restaura seleccions
    populateMachineSelect(currentData.machines);

    if (savedMachineId && currentData.machines[savedMachineId]) {
      d.machineSelect.value = savedMachineId;
      onMachineChange();
      if (savedSessionId) {
        const sessions = currentData.machines[savedMachineId]?.sessions || [];
        const found = sessions.find(s => s.sessionId === savedSessionId);
        if (found) {
          d.sessionSelect.value = savedSessionId;
          onSessionChange();
        }
      }
    }
  } catch (err) {
    console.error("[SCREENSHOTS_HIST] Error refrescant:", err);
  }
}

// ─── Selecció de màquina/sessió ──────────────────────────────────

function populateMachineSelect(machines) {
  const d = dom();
  d.machineSelect.innerHTML = "";
  const machineIds = Object.keys(machines);
  if (machineIds.length === 0) {
    d.machineSelect.innerHTML = '<option value="">Cap màquina</option>';
    return;
  }
  for (const mid of machineIds) {
    const opt = document.createElement("option");
    opt.value = mid;
    opt.textContent = mid;
    d.machineSelect.appendChild(opt);
  }
  d.machineSelect.value = machineIds[0];
  onMachineChange();
}

function onMachineChange() {
  const d = dom();
  const machineId = d.machineSelect.value;
  if (!machineId || !currentData || !currentData.machines[machineId]) return;
  currentMachineId = machineId;

  const sessions = currentData.machines[machineId].sessions || [];
  d.sessionSelect.innerHTML = "";
  if (sessions.length === 0) {
    d.sessionSelect.innerHTML = '<option value="">Cap sessió</option>';
    hidePlayer();
    return;
  }
  for (const session of sessions) {
    const opt = document.createElement("option");
    opt.value = session.sessionId;
    opt.textContent = formatSessionLabel(session) + ` (${session.imageCount} img)`;
    d.sessionSelect.appendChild(opt);
  }
  d.sessionSelect.value = sessions[0].sessionId;
  onSessionChange();
}

function onSessionChange() {
  const d = dom();
  const machineId = d.machineSelect.value;
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
  renderThumbnails();
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

  // Highlight thumbnail actiu
  highlightThumbnail(currentFrameIndex);
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
  if (isPlaying) {
    d.playBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16">
      <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5"/>
    </svg>`;
  } else {
    d.playBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16">
      <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/>
    </svg>`;
  }
}

// ─── Thumbnails ──────────────────────────────────────────────────

function renderThumbnails() {
  const d = dom();
  d.thumbnails.innerHTML = "";
  if (currentImages.length === 0) return;

  for (let i = 0; i < currentImages.length; i++) {
    const img = currentImages[i];
    const thumb = document.createElement("img");
    thumb.src = resolveImageUrl(img.url);
    thumb.setAttribute("data-frame", i);
    thumb.style.cssText = "width:60px;height:34px;object-fit:cover;border-radius:3px;cursor:pointer;border:2px solid transparent;flex-shrink:0;";
    if (i === currentFrameIndex) {
      thumb.style.borderColor = "#0d6efd";
    }
    thumb.title = formatTimestamp(img.timestamp);
    thumb.addEventListener("click", () => {
      stopPlayback();
      goToFrame(i);
    });
    d.thumbnails.appendChild(thumb);
  }
}

function highlightThumbnail(index) {
  const allThumbs = document.querySelectorAll("#screenshotsHistThumbnails img");
  allThumbs.forEach((t, i) => {
    t.style.borderColor = (i === index) ? "#0d6efd" : "transparent";
  });
}

// ─── Fullscreen ──────────────────────────────────────────────────

let fullscreenZoom = 1;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let scrollStartX = 0;
let scrollStartY = 0;

function openImageFullscreen() {
  if (currentImages.length === 0) return;
  const d = dom();
  const img = currentImages[currentFrameIndex];
  fullscreenZoom = 1;
  d.fullscreenImg.src = resolveImageUrl(img.url);
  d.fullscreenImg.style.width = "auto";
  d.fullscreenImg.style.height = "auto";
  d.fullscreenImg.style.maxWidth = "none";
  d.fullscreenImg.style.maxHeight = "none";
  d.fullscreenImg.style.transform = "scale(1)";
  d.fullscreenImg.style.transformOrigin = "top left";
  d.fullscreenTimestamp.textContent = formatTimestamp(img.timestamp);
  d.fullscreenOverlay.style.display = "block";
  d.fullscreenOverlay.scrollTop = 0;
  d.fullscreenOverlay.scrollLeft = 0;
}

function closeImageFullscreen() {
  const d = dom();
  d.fullscreenOverlay.style.display = "none";
  fullscreenZoom = 1;
  isDragging = false;
}

function zoomFullscreen(delta) {
  const d = dom();
  fullscreenZoom = Math.max(0.25, Math.min(5, fullscreenZoom + delta));
  d.fullscreenImg.style.transform = `scale(${fullscreenZoom})`;
}

// ─── Bindings del fullscreen ────────────────────────────────────

function bindFullscreenEvents() {
  const d = dom();

  d.fullscreenClose.addEventListener("click", closeImageFullscreen);

  // Clic al fons fosc tanca (però no si s'està fent drag)
  d.fullscreenOverlay.addEventListener("click", (e) => {
    if (e.target === d.fullscreenOverlay && !isDragging) {
      closeImageFullscreen();
    }
  });

  // Roda del ratolí → zoom
  d.fullscreenOverlay.addEventListener("wheel", (e) => {
    e.preventDefault();
    zoomFullscreen(e.deltaY < 0 ? 0.15 : -0.15);
  }, { passive: false });

  // Drag per desplaçar-se
  d.fullscreenOverlay.addEventListener("mousedown", (e) => {
    if (e.target === d.fullscreenClose || d.fullscreenClose.contains(e.target)) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    scrollStartX = d.fullscreenOverlay.scrollLeft;
    scrollStartY = d.fullscreenOverlay.scrollTop;
    d.fullscreenOverlay.style.cursor = "grabbing";
    d.fullscreenImg.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = dragStartX - e.clientX;
    const dy = dragStartY - e.clientY;
    d.fullscreenOverlay.scrollLeft = scrollStartX + dx;
    d.fullscreenOverlay.scrollTop = scrollStartY + dy;
  });

  window.addEventListener("mouseup", () => {
    if (isDragging) {
      setTimeout(() => { isDragging = false; }, 50);
    }
    d.fullscreenOverlay.style.cursor = "grab";
    d.fullscreenImg.style.cursor = "grab";
  });

  // Escape per tancar
  d.fullscreenOverlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeImageFullscreen();
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

  d.machineSelect.addEventListener("change", onMachineChange);
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

  if (d.fullscreenOverlay.style.display === "block") {
    if (e.key === "Escape") {
      closeImageFullscreen();
    } else if (e.key === "ArrowRight") {
      goToFrame(currentFrameIndex + 1);
    } else if (e.key === "ArrowLeft") {
      goToFrame(currentFrameIndex - 1);
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

    // Si no hi ha màquines, mostrar missatge
    const machineIds = Object.keys(currentData.machines || {});
    if (machineIds.length === 0) {
      d.machineSelect.innerHTML = '<option value="">Cap màquina amb captures</option>';
      d.sessionSelect.innerHTML = '<option value="">Cap sessió</option>';
      d.sessionInfo.innerHTML = "Aquest alumne no té captures de pantalla.";
      return;
    }

    populateMachineSelect(currentData.machines);
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
  currentData = null;
  currentImages = [];
  cleanupOrphanBootstrapBackdrops();
}

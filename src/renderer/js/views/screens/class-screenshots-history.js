import { createBootstrapModal } from "../../utils/dom-helpers.js";
import { getAuthManager } from "../../core/container-helpers.js";
import { openScreenshotsHistory } from "./screenshots-history.js";
import {
  buildMachineTimelines,
  findRecentCapture,
  TIMELINE_STEP_MS,
} from "./class-screenshots-timeline.mjs";
import { createGridZoom } from "./grid-zoom.mjs";

const MODAL_ID = "modalClassScreenshotsHistory";
let modalInstance = null;
let currentSessions = [];
let eventsBound = false;
let currentSession = null;
let cards = [];
let currentTime = 0;
let playbackTimer = null;
let loadVersion = 0;
const historyGridZoom = createGridZoom();

function getBaseUrl() {
  return getAuthManager()?.serverUrl || "";
}

function getAuthToken() {
  return getAuthManager()?.authToken || "";
}

function formatTimestamp(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ca-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function ensureModal() {
  if (document.getElementById(MODAL_ID)) return;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <div class="modal fade" id="${MODAL_ID}" tabindex="-1" aria-labelledby="${MODAL_ID}Label" aria-hidden="true">
      <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="${MODAL_ID}Label">Historial de captures de la classe</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tancar"></button>
          </div>
          <div class="modal-body">
            <div class="d-flex gap-2 align-items-end mb-3">
              <div class="flex-grow-1">
                <label class="form-label" for="${MODAL_ID}SessionSelect">Sessió de classe</label>
                <select class="form-select" id="${MODAL_ID}SessionSelect"></select>
              </div>
              <button type="button" class="btn btn-outline-secondary" id="${MODAL_ID}Refresh">Actualitzar</button>
            </div>
            <div id="${MODAL_ID}Loading" class="text-center py-4" style="display:none;">
              <div class="spinner-border" role="status"><span class="visually-hidden">Carregant...</span></div>
              <p class="mt-2 mb-0">Cercant sessions de classe...</p>
            </div>
            <div id="${MODAL_ID}Error" class="alert alert-danger" style="display:none;"></div>
            <div id="${MODAL_ID}Empty" class="text-center py-4 text-muted" style="display:none;">
              No s’han trobat sessions de classe amb captures.
            </div>
            <div id="${MODAL_ID}SessionInfo" class="small text-muted mb-2"></div>
            <div id="${MODAL_ID}Timeline" style="display:none;">
              <div class="d-flex align-items-center gap-2 flex-wrap mb-2">
                <button type="button" class="btn btn-sm btn-outline-secondary" id="${MODAL_ID}Previous">−30 s</button>
                <button type="button" class="btn btn-sm btn-primary" id="${MODAL_ID}Play">Reproduir</button>
                <button type="button" class="btn btn-sm btn-outline-secondary" id="${MODAL_ID}Next">+30 s</button>
                <label class="small" for="${MODAL_ID}Speed">Velocitat:</label>
                <select class="form-select form-select-sm" id="${MODAL_ID}Speed" style="width:auto;">
                  <option value="2000">Lenta (2 s / pas)</option>
                  <option value="500" selected>Normal (0,5 s / pas)</option>
                  <option value="200">Ràpida (0,2 s / pas)</option>
                </select>
                <span id="${MODAL_ID}CurrentTime" class="small fw-semibold" aria-live="polite"></span>
              </div>
              <label class="form-label small" for="${MODAL_ID}Progress">Instant de la sessió</label>
              <input type="range" class="form-range" id="${MODAL_ID}Progress" min="0" max="0" step="1" value="0">
              <div class="d-flex justify-content-between small text-muted mb-3">
                <span id="${MODAL_ID}StartTime"></span>
                <span id="${MODAL_ID}EndTime"></span>
              </div>
            </div>
            <div id="${MODAL_ID}Captures" class="class-screenshots-grid"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tancar</button>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrapper);
}

function getElement(name) {
  return document.getElementById(`${MODAL_ID}${name}`);
}

function formatClassSession(session) {
  return `${formatTimestamp(session.startedAt)} – ${formatTimestamp(session.endedAt)} · ` +
    `${session.groupId} (${session.usersConnected} usuaris connectats)`;
}

function renderSelectedSession() {
  stopPlayback();
  const select = getElement("SessionSelect");
  const selected = currentSessions.find(session => session.id === select.value);
  const captures = getElement("Captures");
  const empty = getElement("Empty");
  const info = getElement("SessionInfo");

  currentSession = selected || null;
  cards = [];
  captures.replaceChildren();
  getElement("Timeline").style.display = "none";
  if (!selected) {
    empty.style.display = currentSessions.length === 0 ? "block" : "none";
    info.textContent = "";
    return;
  }

  empty.style.display = selected.images.length === 0 ? "block" : "none";
  info.textContent = `${selected.images.length} captures · ` +
    `${selected.sessions.length} trams individuals`;

  const start = Date.parse(selected.startedAt);
  const end = Date.parse(selected.endedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    throw new Error("L'interval de la sessió de classe és invàlid");
  }
  currentTime = start;
  for (const timeline of buildMachineTimelines(selected.images)) {
    const card = document.createElement("div");
    card.className = "class-screenshots-card border rounded p-2";
    const user = document.createElement("div");
    user.className = "fw-semibold text-truncate";
    const machine = document.createElement("div");
    machine.className = "small text-muted text-truncate mb-1";
    machine.textContent = `Màquina ${timeline.machineId}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "class-screenshots-preview d-flex align-items-center justify-content-center p-0";
    const preview = document.createElement("img");
    preview.alt = "";
    preview.loading = "eager";
    const placeholder = document.createElement("span");
    placeholder.className = "small p-2";
    button.append(preview, placeholder);
    const timestamp = document.createElement("div");
    timestamp.className = "small text-muted mt-1";
    const cardState = { timeline, user, button, preview, placeholder, timestamp, image: undefined };
    preview.addEventListener("load", () => {
      preview.style.display = "";
      placeholder.style.display = "none";
    });
    preview.addEventListener("error", () => {
      preview.style.display = "none";
      placeholder.textContent = "No s'ha pogut carregar la captura";
      placeholder.style.display = "";
    });
    button.addEventListener("click", () => {
      if (cardState.image) openMachineSession(cardState.image);
    });
    card.append(user, machine, button, timestamp);
    captures.appendChild(card);
    cards.push(cardState);
  }

  const progress = getElement("Progress");
  progress.max = String(end - start);
  progress.disabled = start === end;
  getElement("StartTime").textContent = formatTimestamp(selected.startedAt);
  getElement("EndTime").textContent = formatTimestamp(selected.endedAt);
  getElement("Timeline").style.display = selected.images.length ? "block" : "none";
  renderTime(start);
}

function renderTime(time) {
  if (!currentSession) return;
  const start = Date.parse(currentSession.startedAt);
  const end = Date.parse(currentSession.endedAt);
  currentTime = Math.max(start, Math.min(end, time));
  getElement("Progress").value = String(currentTime - start);
  getElement("Progress").setAttribute("aria-valuetext", formatTimestamp(currentTime));
  getElement("CurrentTime").textContent = formatTimestamp(currentTime);
  getElement("Previous").disabled = currentTime <= start;
  getElement("Next").disabled = currentTime >= end;
  getElement("Play").disabled = start === end;

  for (const card of cards) {
    const image = findRecentCapture(card.timeline.captures, currentTime);
    card.user.textContent = image?.userLabel || card.timeline.alumne;
    card.button.disabled = !image;
    card.button.setAttribute("aria-label", image
      ? `Obrir l'historial de ${image.userLabel || image.alumne}, màquina ${card.timeline.machineId}`
      : `Sense captura recent de ${card.timeline.alumne}, màquina ${card.timeline.machineId}`);
    card.timestamp.textContent = image ? `Captura: ${formatTimestamp(image.timestamp)}` : "Sense captura recent";
    if (card.image === image) continue;
    card.image = image;
    if (image) {
      card.placeholder.textContent = "Carregant captura...";
      card.placeholder.style.display = "";
      card.preview.style.display = "none";
      card.preview.alt = `Captura de ${image.userLabel || image.alumne}`;
      card.preview.src = getBaseUrl() + image.url;
    } else {
      card.preview.removeAttribute("src");
      card.preview.style.display = "none";
      card.placeholder.textContent = "Sense captura recent";
      card.placeholder.style.display = "";
    }
  }
}

function stopPlayback() {
  if (playbackTimer !== null) clearTimeout(playbackTimer);
  playbackTimer = null;
  const button = getElement("Play");
  if (button) button.textContent = "Reproduir";
}

function schedulePlayback() {
  const delay = Number(getElement("Speed").value);
  playbackTimer = setTimeout(() => {
    playbackTimer = null;
    if (!currentSession) return;
    renderTime(currentTime + TIMELINE_STEP_MS);
    if (currentTime >= Date.parse(currentSession.endedAt)) stopPlayback();
    else schedulePlayback();
  }, delay);
}

function togglePlayback() {
  if (!currentSession) return;
  if (playbackTimer !== null) {
    stopPlayback();
    return;
  }
  if (currentTime >= Date.parse(currentSession.endedAt)) {
    renderTime(Date.parse(currentSession.startedAt));
  }
  getElement("Play").textContent = "Pausar";
  schedulePlayback();
}

async function loadClassSessions(groupId) {
  const version = ++loadVersion;
  stopPlayback();
  currentSession = null;
  cards = [];
  const loading = getElement("Loading");
  const error = getElement("Error");
  const select = getElement("SessionSelect");
  currentSessions = [];
  select.replaceChildren();
  getElement("Empty").style.display = "none";
  getElement("SessionInfo").textContent = "";
  getElement("Timeline").style.display = "none";
  loading.style.display = "block";
  error.style.display = "none";
  getElement("Captures").replaceChildren();

  try {
    const baseUrl = getBaseUrl();
    if (!baseUrl) throw new Error("URL del servidor no configurada");
    const response = await fetch(
      `${baseUrl}/api/v1/screenshots/groups/${encodeURIComponent(groupId)}/sessions`,
      { headers: { Authorization: `Bearer ${getAuthToken()}` } }
    );
    const result = await response.json();
    if (version !== loadVersion) return;
    if (!response.ok || result.status !== "OK") {
      throw new Error(result.message || `HTTP ${response.status}`);
    }

    const sessions = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result.data?.sessions)
        ? result.data.sessions
        : null;
    if (!sessions) {
      const shape = result.data && typeof result.data === "object"
        ? Object.keys(result.data).join(", ") || "objecte buit"
        : typeof result.data;
      throw new Error(`Format de resposta de sessions inesperat (${shape})`);
    }

    currentSessions = sessions;
    select.replaceChildren();
    for (const session of currentSessions) {
      const option = document.createElement("option");
      option.value = session.id;
      option.textContent = formatClassSession(session);
      select.appendChild(option);
    }
    getElement("Empty").style.display = currentSessions.length === 0 ? "block" : "none";
    if (currentSessions.length > 0) renderSelectedSession();
  } catch (loadError) {
    if (version !== loadVersion) return;
    console.error("[CLASS_SCREENSHOTS_HIST] Error carregant sessions:", loadError);
    error.textContent = `No s’han pogut carregar les sessions: ${loadError.message}`;
    error.style.display = "block";
  } finally {
    if (version === loadVersion) loading.style.display = "none";
  }
}

function openMachineSession(image) {
  const modalElement = document.getElementById(MODAL_ID);
  modalElement.addEventListener("hidden.bs.modal", () => {
    openScreenshotsHistory(image.alumne, {
      machineId: image.machineId,
      sessionId: image.sessionId,
      timestamp: image.timestamp,
    });
  }, { once: true });
  modalInstance.hide();
}

function bindEvents() {
  if (eventsBound) return;
  eventsBound = true;
  historyGridZoom.attach(getElement("Captures"));
  getElement("SessionSelect").addEventListener("change", () => {
    try {
      getElement("Error").style.display = "none";
      renderSelectedSession();
    } catch (error) {
      stopPlayback();
      console.error("[CLASS_SCREENSHOTS_HIST] Error mostrant sessió:", error);
      getElement("Error").textContent = `No s'ha pogut mostrar la sessió: ${error.message}`;
      getElement("Error").style.display = "block";
    }
  });
  getElement("Previous").addEventListener("click", () => renderTime(currentTime - TIMELINE_STEP_MS));
  getElement("Next").addEventListener("click", () => renderTime(currentTime + TIMELINE_STEP_MS));
  getElement("Play").addEventListener("click", togglePlayback);
  getElement("Speed").addEventListener("change", () => {
    if (playbackTimer !== null) {
      clearTimeout(playbackTimer);
      schedulePlayback();
    }
  });
  getElement("Progress").addEventListener("input", event => {
    if (currentSession) renderTime(Date.parse(currentSession.startedAt) + Number(event.target.value));
  });
  document.getElementById(MODAL_ID).addEventListener("hidden.bs.modal", () => {
    stopPlayback();
    loadVersion++;
  });
  getElement("Refresh").addEventListener("click", () => {
    const groupId = getElement("SessionSelect").dataset.groupId;
    if (groupId) loadClassSessions(groupId);
  });
}

export async function openClassScreenshotsHistory(groupId) {
  ensureModal();
  bindEvents();
  const modalElement = document.getElementById(MODAL_ID);
  if (!modalInstance) modalInstance = createBootstrapModal(MODAL_ID);

  modalElement.querySelector(".modal-title").textContent =
    `Historial de captures — ${groupId}`;
  const select = getElement("SessionSelect");
  select.dataset.groupId = groupId;
  getElement("Error").style.display = "none";
  getElement("Empty").style.display = "none";
  getElement("SessionInfo").textContent = "";
  modalInstance.show();
  await loadClassSessions(groupId);
}

export function closeClassScreenshotsHistory() {
  if (modalInstance) modalInstance.hide();
}

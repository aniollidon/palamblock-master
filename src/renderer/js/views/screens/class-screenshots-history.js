import { createBootstrapModal } from "../../utils/dom-helpers.js";
import { getAuthManager } from "../../core/container-helpers.js";
import { openScreenshotsHistory } from "./screenshots-history.js";

const MODAL_ID = "modalClassScreenshotsHistory";
let modalInstance = null;
let currentSessions = [];
let eventsBound = false;

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
            <div id="${MODAL_ID}Captures" class="d-flex flex-column gap-2"></div>
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
  const select = getElement("SessionSelect");
  const selected = currentSessions.find(session => session.id === select.value);
  const captures = getElement("Captures");
  const empty = getElement("Empty");
  const info = getElement("SessionInfo");

  captures.replaceChildren();
  if (!selected) {
    empty.style.display = currentSessions.length === 0 ? "block" : "none";
    info.textContent = "";
    return;
  }

  empty.style.display = selected.images.length === 0 ? "block" : "none";
  info.textContent = `${selected.images.length} captures · ` +
    `${selected.sessions.length} sessions individuals`;

  for (const image of selected.images) {
    const row = document.createElement("div");
    row.className = "d-flex align-items-center gap-3 border rounded p-2 flex-wrap";

    const preview = document.createElement("img");
    preview.src = getBaseUrl() + image.url;
    preview.alt = `Captura de ${image.userLabel || image.alumne}`;
    preview.loading = "lazy";
    preview.style.cssText = "width:160px;height:90px;object-fit:contain;background:#111;border-radius:4px;";
    row.appendChild(preview);

    const details = document.createElement("div");
    details.className = "flex-grow-1";
    const timestamp = document.createElement("div");
    timestamp.className = "fw-semibold";
    timestamp.textContent = formatTimestamp(image.timestamp);
    const user = document.createElement("div");
    user.textContent = image.userLabel || image.alumne;
    const machine = document.createElement("div");
    machine.className = "small text-muted";
    machine.textContent = `Màquina ${image.machineId}`;
    details.append(timestamp, user, machine);
    row.appendChild(details);

    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.className = "btn btn-sm btn-outline-primary";
    openButton.textContent = "Entrar a la sessió";
    openButton.addEventListener("click", () => openMachineSession(image));
    row.appendChild(openButton);
    captures.appendChild(row);
  }
}

async function loadClassSessions(groupId) {
  const loading = getElement("Loading");
  const error = getElement("Error");
  const select = getElement("SessionSelect");
  currentSessions = [];
  select.replaceChildren();
  getElement("Empty").style.display = "none";
  getElement("SessionInfo").textContent = "";
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
    console.error("[CLASS_SCREENSHOTS_HIST] Error carregant sessions:", loadError);
    error.textContent = `No s’han pogut carregar les sessions: ${loadError.message}`;
    error.style.display = "block";
  } finally {
    loading.style.display = "none";
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
  getElement("SessionSelect").addEventListener("change", renderSelectedSession);
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

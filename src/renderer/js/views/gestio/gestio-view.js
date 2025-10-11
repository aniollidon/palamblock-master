/**
 * Gestio View - Vista de gestió d'alumnes, grups i professors
 *
 * Aquesta vista gestiona la UI del mode super:
 * - Renderització de taules
 * - Gestió de modals
 * - Filtres i cerca
 * - Events dels botons
 */

import * as GestioLogic from "./gestio-logic.js";
import { getSocket } from "../../core/container-helpers.js";

// Variables globals
let grupAlumnesData = {};
let professorsData = [];
let modalAlumneInstance = null;
let modalGrupInstance = null;
let modalProfessorInstance = null;
let socketListener = null;
let socketListenerAdmins = null;

// Event handlers (per cleanup)
const eventHandlers = {
  nouAlumne: null,
  nouGrup: null,
  nouProfessor: null,
  submitAlumne: null,
  submitGrup: null,
  submitProfessor: null,
  cercaAlumnes: null,
  filtreGrupAlumnes: null,
  filtreEstatAlumnes: null,
  cercaGrups: null,
  filtreEstatGrups: null,
  cercaProfessors: null,
};

// Exposar GestioAPI globalment per compatibilitat
window.GestioAPI = GestioLogic;

// ============================================
// LIFECYCLE FUNCTIONS (per view-manager)
// ============================================

/**
 * Inicialitza la vista de gestió
 * @returns {object} - Objecte amb funció destroy
 */
export async function init() {
  console.log("[GESTIO_VIEW] Inicialitzant vista de gestió...");

  mountGestioView();

  return { destroy: unmountGestioView };
}

export function mountGestioView() {
  // Només inicialitzar si estem a la vista del mode super
  if (!document.getElementById("gestioTabs")) {
    console.warn("[GESTIO] gestioTabs no trobat");
    return;
  }

  console.log("Inicialitzant Super Mode UI...");

  // Inicialitzar modals (dispose primer per si ja existien)
  const modalAlumneEl = document.getElementById("modalAlumne");
  const modalGrupEl = document.getElementById("modalGrup");
  const modalProfessorEl = document.getElementById("modalProfessor");

  if (modalAlumneEl) {
    // Dispose de la instància anterior si existeix
    if (modalAlumneInstance) {
      modalAlumneInstance.dispose();
    }
    modalAlumneInstance = new bootstrap.Modal(modalAlumneEl);
  }
  if (modalGrupEl) {
    // Dispose de la instància anterior si existeix
    if (modalGrupInstance) {
      modalGrupInstance.dispose();
    }
    modalGrupInstance = new bootstrap.Modal(modalGrupEl);
  }
  if (modalProfessorEl) {
    // Dispose de la instància anterior si existeix
    if (modalProfessorInstance) {
      modalProfessorInstance.dispose();
    }
    modalProfessorInstance = new bootstrap.Modal(modalProfessorEl);
  }

  // Event listeners
  setupEventListeners();

  // Sol·licitar dades inicials
  requestInitialData();
}

export function unmountGestioView() {
  console.log("Desmuntant Super Mode UI...");

  // Netejar event listeners
  const btnNouAlumne = document.getElementById("btnNouAlumne");
  const btnNouGrup = document.getElementById("btnNouGrup");
  const btnNouProfessor = document.getElementById("btnNouProfessor");
  const formAlumne = document.getElementById("formAlumne");
  const formGrup = document.getElementById("formGrup");
  const formProfessor = document.getElementById("formProfessor");
  const cercaAlumnes = document.getElementById("cercaAlumnes");
  const filtreGrupAlumnes = document.getElementById("filtreGrupAlumnes");
  const filtreEstatAlumnes = document.getElementById("filtreEstatAlumnes");
  const cercaGrups = document.getElementById("cercaGrups");
  const filtreEstatGrups = document.getElementById("filtreEstatGrups");
  const cercaProfessors = document.getElementById("cercaProfessors");

  if (btnNouAlumne && eventHandlers.nouAlumne) {
    btnNouAlumne.removeEventListener("click", eventHandlers.nouAlumne);
  }
  if (btnNouGrup && eventHandlers.nouGrup) {
    btnNouGrup.removeEventListener("click", eventHandlers.nouGrup);
  }
  if (btnNouProfessor && eventHandlers.nouProfessor) {
    btnNouProfessor.removeEventListener("click", eventHandlers.nouProfessor);
  }
  if (formAlumne && eventHandlers.submitAlumne) {
    formAlumne.removeEventListener("submit", eventHandlers.submitAlumne);
  }
  if (formGrup && eventHandlers.submitGrup) {
    formGrup.removeEventListener("submit", eventHandlers.submitGrup);
  }
  if (formProfessor && eventHandlers.submitProfessor) {
    formProfessor.removeEventListener("submit", eventHandlers.submitProfessor);
  }
  if (cercaAlumnes && eventHandlers.cercaAlumnes) {
    cercaAlumnes.removeEventListener("input", eventHandlers.cercaAlumnes);
  }
  if (filtreGrupAlumnes && eventHandlers.filtreGrupAlumnes) {
    filtreGrupAlumnes.removeEventListener(
      "change",
      eventHandlers.filtreGrupAlumnes
    );
  }
  if (filtreEstatAlumnes && eventHandlers.filtreEstatAlumnes) {
    filtreEstatAlumnes.removeEventListener(
      "change",
      eventHandlers.filtreEstatAlumnes
    );
  }
  if (cercaGrups && eventHandlers.cercaGrups) {
    cercaGrups.removeEventListener("input", eventHandlers.cercaGrups);
  }
  if (filtreEstatGrups && eventHandlers.filtreEstatGrups) {
    filtreEstatGrups.removeEventListener(
      "change",
      eventHandlers.filtreEstatGrups
    );
  }
  if (cercaProfessors && eventHandlers.cercaProfessors) {
    cercaProfessors.removeEventListener("input", eventHandlers.cercaProfessors);
  }

  // Reset event handlers
  Object.keys(eventHandlers).forEach((key) => {
    eventHandlers[key] = null;
  });

  // Netejar listeners del socket
  const socket = getSocket();
  if (socketListener && socket) {
    socket.off("grupAlumnesList", socketListener);
    socketListener = null;
  }
  if (socketListenerAdmins && socket) {
    socket.off("adminsList", socketListenerAdmins);
    socketListenerAdmins = null;
  }

  // Netejar modals
  if (modalAlumneInstance) {
    modalAlumneInstance.dispose();
    modalAlumneInstance = null;
  }
  if (modalGrupInstance) {
    modalGrupInstance.dispose();
    modalGrupInstance = null;
  }
  if (modalProfessorInstance) {
    modalProfessorInstance.dispose();
    modalProfessorInstance = null;
  }

  // Netejar backdrops que puguin quedar
  const backdrops = document.querySelectorAll(".modal-backdrop");
  backdrops.forEach((backdrop) => backdrop.remove());

  // Eliminar classe del body que Bootstrap afegeix
  document.body.classList.remove("modal-open");
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("padding-right");

  // Reiniciar dades
  grupAlumnesData = {};
}

// ============================================
// INICIALITZACIÓ
// ============================================

/**
 * Configurar event listeners
 */
function setupEventListeners() {
  // Botons de creació
  eventHandlers.nouAlumne = obrirModalNouAlumne;
  eventHandlers.nouGrup = obrirModalNouGrup;
  eventHandlers.nouProfessor = nouProfessor;

  document
    .getElementById("btnNouAlumne")
    ?.addEventListener("click", eventHandlers.nouAlumne);
  document
    .getElementById("btnNouGrup")
    ?.addEventListener("click", eventHandlers.nouGrup);
  document
    .getElementById("btnNouProfessor")
    ?.addEventListener("click", eventHandlers.nouProfessor);

  // Formularis
  eventHandlers.submitAlumne = handleSubmitAlumne;
  eventHandlers.submitGrup = handleSubmitGrup;
  eventHandlers.submitProfessor = handleSubmitProfessor;

  document
    .getElementById("formAlumne")
    ?.addEventListener("submit", eventHandlers.submitAlumne);
  document
    .getElementById("formGrup")
    ?.addEventListener("submit", eventHandlers.submitGrup);
  document
    .getElementById("formProfessor")
    ?.addEventListener("submit", eventHandlers.submitProfessor);

  // Filtres i cerca
  eventHandlers.cercaAlumnes = filtrarAlumnes;
  eventHandlers.filtreGrupAlumnes = filtrarAlumnes;
  eventHandlers.filtreEstatAlumnes = filtrarAlumnes;
  eventHandlers.cercaGrups = filtrarGrups;
  eventHandlers.filtreEstatGrups = filtrarGrups;
  eventHandlers.cercaProfessors = renderitzarTaulaProfessors;

  document
    .getElementById("cercaAlumnes")
    ?.addEventListener("input", eventHandlers.cercaAlumnes);
  document
    .getElementById("filtreGrupAlumnes")
    ?.addEventListener("change", eventHandlers.filtreGrupAlumnes);
  document
    .getElementById("filtreEstatAlumnes")
    ?.addEventListener("change", eventHandlers.filtreEstatAlumnes);

  document
    .getElementById("cercaGrups")
    ?.addEventListener("input", eventHandlers.cercaGrups);
  document
    .getElementById("filtreEstatGrups")
    ?.addEventListener("change", eventHandlers.filtreEstatGrups);

  document
    .getElementById("cercaProfessors")
    ?.addEventListener("input", eventHandlers.cercaProfessors);

  // Listener per actualitzacions del socket
  const socket = getSocket();
  if (socket) {
    socketListener = (grups) => {
      console.log("Rebudes dades actualitzades de grups i alumnes", grups);
      grupAlumnesData = grups;
      renderitzarTaules();
    };
    socket.on("grupAlumnesList", socketListener);

    socketListenerAdmins = (admins) => {
      console.log("Rebudes dades actualitzades de professors", admins);
      professorsData = admins;
      renderitzarTaulaProfessors();
    };
    socket.on("adminsList", socketListenerAdmins);
  } else {
    console.warn("[GESTIO] Socket no disponible!");
  }
}

/**
 * Sol·licitar dades inicials
 */
function requestInitialData() {
  const socket = getSocket();

  console.log("[GESTIO] Demanant dades inicials...", {
    socket: !!socket,
    connected: socket?.connected,
  });

  if (socket && socket.connected) {
    console.log("[GESTIO] Emetent getGrupAlumnesList");
    socket.emit("getGrupAlumnesList");
    console.log("[GESTIO] Emetent getAdminsList");
    socket.emit("getAdminsList", (response) => {
      if (response && response.status === "OK") {
        professorsData = response.data;
        renderitzarTaulaProfessors();
      }
    });
  } else {
    console.warn("[GESTIO] Socket no connectat, reintentant en 2s...");
    setTimeout(requestInitialData, 2000);
  }
} // ============================================
// RENDERITZACIÓ DE TAULES
// ============================================

/**
 * Renderitzar totes les taules
 */
function renderitzarTaules() {
  renderitzarTaulaAlumnes();
  renderitzarTaulaGrups();
  renderitzarTaulaProfessors();
  actualitzarSelectsGrups();
}

/**
 * Renderitzar taula d'alumnes
 */
function renderitzarTaulaAlumnes() {
  const tbody = document.getElementById("taulaAlumnes");
  if (!tbody) return;

  if (!grupAlumnesData || Object.keys(grupAlumnesData).length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          <i class="bi bi-info-circle"></i> No hi ha alumnes registrats
        </td>
      </tr>
    `;
    return;
  }

  // Extreure tots els alumnes
  const alumnes = [];
  for (const grupId in grupAlumnesData) {
    const grup = grupAlumnesData[grupId];
    for (const alumneId in grup.alumnes) {
      alumnes.push(grup.alumnes[alumneId]);
    }
  }

  if (alumnes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          <i class="bi bi-info-circle"></i> No hi ha alumnes registrats
        </td>
      </tr>
    `;
    return;
  }

  // Ordenar per grup i nom
  alumnes.sort((a, b) => {
    if (a.grup !== b.grup) return a.grup.localeCompare(b.grup);
    return a.nom.localeCompare(b.nom);
  });

  tbody.innerHTML = alumnes
    .map(
      (alumne) => `
      <tr data-alumne-id="${alumne.alumneId}">
        <td><code>${alumne.alumneId}</code></td>
        <td>${alumne.nom}</td>
        <td>${alumne.cognoms}</td>
        <td><span class="badge bg-info">${alumne.grup}</span></td>
        <td>
          <span class="badge ${
            alumne.status === "RuleOn" ? "bg-success" : "bg-secondary"
          }">
            ${alumne.status === "RuleOn" ? "Actiu" : "Inactiu"}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="editarAlumne('${
            alumne.alumneId
          }')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
              <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
              <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
            </svg>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="confirmarEsborrarAlumne('${
            alumne.alumneId
          }', '${alumne.nom} ${alumne.cognoms}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
              <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
            </svg>
          </button>
        </td>
      </tr>
    `
    )
    .join("");
}

/**
 * Renderitzar taula de grups
 */
function renderitzarTaulaGrups() {
  const tbody = document.getElementById("taulaGrups");
  if (!tbody) return;

  if (!grupAlumnesData || Object.keys(grupAlumnesData).length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">
          <i class="bi bi-info-circle"></i> No hi ha grups registrats
        </td>
      </tr>
    `;
    return;
  }

  const grups = Object.values(grupAlumnesData).sort((a, b) =>
    a.grupId.localeCompare(b.grupId)
  );

  tbody.innerHTML = grups
    .map((grup) => {
      const numAlumnes = Object.keys(grup.alumnes || {}).length;
      return `
      <tr data-grup-id="${grup.grupId}">
        <td><code>${grup.grupId}</code></td>
        <td>${grup.nom || grup.grupId}</td>
        <td>
          <span class="badge bg-primary">${numAlumnes} alumne${
        numAlumnes !== 1 ? "s" : ""
      }</span>
        </td>
        <td>
          <span class="badge ${
            grup.status === "RuleOn" ? "bg-success" : "bg-secondary"
          }">
            ${grup.status === "RuleOn" ? "Actiu" : "Inactiu"}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="editarGrup('${
            grup.grupId
          }')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
              <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
              <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
            </svg>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="confirmarEsborrarGrup('${
            grup.grupId
          }', '${grup.nom || grup.grupId}')" ${
        numAlumnes > 0
          ? 'disabled title="No es pot esborrar un grup amb alumnes"'
          : ""
      }>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
              <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
            </svg>
          </button>
        </td>
      </tr>
    `;
    })
    .join("");
}

/**
 * Actualitzar selects de grups
 */
function actualitzarSelectsGrups() {
  const selects = [
    document.getElementById("alumneGrup"),
    document.getElementById("filtreGrupAlumnes"),
  ];

  selects.forEach((select) => {
    if (!select) return;

    const currentValue = select.value;
    const isFilter = select.id === "filtreGrupAlumnes";

    // Generar opcions
    const opcions = isFilter
      ? ['<option value="">Tots els grups</option>']
      : ['<option value="">Selecciona un grup...</option>'];

    if (grupAlumnesData) {
      const grups = Object.values(grupAlumnesData).sort((a, b) =>
        a.grupId.localeCompare(b.grupId)
      );
      grups.forEach((grup) => {
        opcions.push(
          `<option value="${grup.grupId}">${grup.nom || grup.grupId}</option>`
        );
      });
    }

    select.innerHTML = opcions.join("");

    // Restaurar valor si encara existeix
    if (
      currentValue &&
      select.querySelector(`option[value="${currentValue}"]`)
    ) {
      select.value = currentValue;
    }
  });
}

// ============================================
// FILTRES
// ============================================

/**
 * Filtrar alumnes
 */
function filtrarAlumnes() {
  const cerca =
    document.getElementById("cercaAlumnes")?.value.toLowerCase() || "";
  const grupFiltre = document.getElementById("filtreGrupAlumnes")?.value || "";
  const estatFiltre =
    document.getElementById("filtreEstatAlumnes")?.value || "";

  const tbody = document.getElementById("taulaAlumnes");
  if (!tbody) return;

  const files = tbody.querySelectorAll("tr[data-alumne-id]");

  files.forEach((fila) => {
    const text = fila.textContent.toLowerCase();
    const grupBadge = fila.querySelector(".badge.bg-info")?.textContent || "";
    const estatBadge = fila
      .querySelector("td:nth-child(5) .badge")
      ?.classList.contains("bg-success")
      ? "RuleOn"
      : "RuleOff";

    const coincideixCerca = !cerca || text.includes(cerca);
    const coincideixGrup = !grupFiltre || grupBadge === grupFiltre;
    const coincideixEstat = !estatFiltre || estatBadge === estatFiltre;

    if (coincideixCerca && coincideixGrup && coincideixEstat) {
      fila.style.display = "";
    } else {
      fila.style.display = "none";
    }
  });
}

/**
 * Filtrar grups
 */
function filtrarGrups() {
  const cerca =
    document.getElementById("cercaGrups")?.value.toLowerCase() || "";
  const estatFiltre = document.getElementById("filtreEstatGrups")?.value || "";

  const tbody = document.getElementById("taulaGrups");
  if (!tbody) return;

  const files = tbody.querySelectorAll("tr[data-grup-id]");

  files.forEach((fila) => {
    const text = fila.textContent.toLowerCase();
    const estatBadge = fila
      .querySelector("td:nth-child(4) .badge")
      ?.classList.contains("bg-success")
      ? "RuleOn"
      : "RuleOff";

    const coincideixCerca = !cerca || text.includes(cerca);
    const coincideixEstat = !estatFiltre || estatBadge === estatFiltre;

    if (coincideixCerca && coincideixEstat) {
      fila.style.display = "";
    } else {
      fila.style.display = "none";
    }
  });
}

// ============================================
// MODALS - ALUMNES
// ============================================

/**
 * Obrir modal per crear nou alumne
 */
function obrirModalNouAlumne() {
  document.getElementById("modalAlumneTitle").textContent = "Nou Alumne";
  document.getElementById("alumneMode").value = "create";
  document.getElementById("formAlumne").reset();
  document.getElementById("alumneId").disabled = false;
  document.getElementById("alumneClau").required = true;
  document.getElementById("clauRequired").style.display = "";
  document.getElementById("clauHelp").style.display = "none";
  modalAlumneInstance?.show();
}

/**
 * Editar alumne
 */
function editarAlumne(alumneId) {
  // Buscar l'alumne
  let alumne = null;
  for (const grupId in grupAlumnesData) {
    if (grupAlumnesData[grupId].alumnes[alumneId]) {
      alumne = grupAlumnesData[grupId].alumnes[alumneId];
      break;
    }
  }

  if (!alumne) {
    showErrorToast("No s'ha trobat l'alumne");
    return;
  }

  // Omplir el formulari
  document.getElementById("modalAlumneTitle").textContent = "Editar Alumne";
  document.getElementById("alumneMode").value = "edit";
  document.getElementById("alumneOriginalId").value = alumne.alumneId;
  document.getElementById("alumneId").value = alumne.alumneId;
  document.getElementById("alumneNom").value = alumne.nom;
  document.getElementById("alumneCognoms").value = alumne.cognoms;
  document.getElementById("alumneGrup").value = alumne.grup;
  document.getElementById("alumneClau").value = "";

  // Desactivar camp ID en mode edició
  document.getElementById("alumneId").disabled = true;
  document.getElementById("alumneClau").required = false;
  document.getElementById("clauRequired").style.display = "none";
  document.getElementById("clauHelp").style.display = "";

  modalAlumneInstance?.show();
}

/**
 * Gestionar submit del formulari d'alumne
 */
async function handleSubmitAlumne(e) {
  e.preventDefault();

  const mode = document.getElementById("alumneMode").value;
  const alumneId = document.getElementById("alumneId").value.trim();
  const nom = document.getElementById("alumneNom").value.trim();
  const cognoms = document.getElementById("alumneCognoms").value.trim();
  const grupId = document.getElementById("alumneGrup").value;
  const clau = document.getElementById("alumneClau").value;

  try {
    if (mode === "create") {
      // Crear nou alumne
      if (!clau) {
        showErrorToast("La contrasenya és obligatòria");
        return;
      }
      await window.GestioAPI.crearAlumne({
        alumneId,
        grupId,
        clau,
        nom,
        cognoms,
      });
    } else {
      // Actualitzar alumne
      const updates = { nom, cognoms, grup: grupId };
      if (clau) {
        updates.clau = clau;
      }
      await window.GestioAPI.actualitzarAlumne(alumneId, updates);
    }

    modalAlumneInstance?.hide();
    document.getElementById("formAlumne").reset();
  } catch (error) {
    // L'error ja es mostra dins de les funcions de GestioAPI
    console.error("Error en handleSubmitAlumne:", error);
  }
}

/**
 * Confirmar esborrat d'alumne
 */
async function confirmarEsborrarAlumne(alumneId, nomComplet) {
  try {
    await window.GestioAPI.esborrarAlumne(alumneId, nomComplet);
  } catch (error) {
    console.error("Error esborrant alumne:", error);
  }
}

// ============================================
// MODALS - GRUPS
// ============================================

/**
 * Obrir modal per crear nou grup
 */
function obrirModalNouGrup() {
  document.getElementById("modalGrupTitle").textContent = "Nou Grup";
  document.getElementById("grupMode").value = "create";
  document.getElementById("formGrup").reset();
  document.getElementById("grupId").disabled = false;
  modalGrupInstance?.show();
}

/**
 * Editar grup
 */
function editarGrup(grupId) {
  const grup = grupAlumnesData[grupId];
  if (!grup) {
    showErrorToast("No s'ha trobat el grup");
    return;
  }

  document.getElementById("modalGrupTitle").textContent = "Editar Grup";
  document.getElementById("grupMode").value = "edit";
  document.getElementById("grupOriginalId").value = grup.grupId;
  document.getElementById("grupId").value = grup.grupId;
  document.getElementById("grupNom").value = grup.nom || grup.grupId;

  // Desactivar camp ID en mode edició
  document.getElementById("grupId").disabled = true;

  modalGrupInstance?.show();
}

/**
 * Gestionar submit del formulari de grup
 */
async function handleSubmitGrup(e) {
  e.preventDefault();

  const mode = document.getElementById("grupMode").value;
  const grupId = document.getElementById("grupId").value.trim();
  const nom = document.getElementById("grupNom").value.trim();

  try {
    if (mode === "create") {
      // Crear nou grup
      await window.GestioAPI.crearGrup(grupId, nom);
    } else {
      // Actualitzar grup
      await window.GestioAPI.actualitzarGrup(grupId, { nom: nom || grupId });
    }

    modalGrupInstance?.hide();
    document.getElementById("formGrup").reset();
  } catch (error) {
    console.error("Error en handleSubmitGrup:", error);
  }
}

/**
 * Confirmar esborrat de grup
 */
async function confirmarEsborrarGrup(grupId, nom) {
  try {
    await window.GestioAPI.esborrarGrup(grupId, nom);
  } catch (error) {
    console.error("Error esborrant grup:", error);
  }
}

// ============================================
// GESTIÓ DE PROFESSORS
// ============================================

/**
 * Renderitzar taula de professors
 */
function renderitzarTaulaProfessors() {
  const tbody = document.getElementById("taulaProfessors");
  if (!tbody) return;

  // Aplicar cerca
  const cerca =
    document.getElementById("cercaProfessors")?.value.toLowerCase() || "";

  let professors = professorsData.filter((p) =>
    p.user.toLowerCase().includes(cerca)
  );

  if (professors.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="2" class="text-center text-muted">
          <i class="bi bi-inbox"></i> No hi ha professors
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = professors
    .map(
      (prof) => `
      <tr>
        <td>${prof.user}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary" onclick="editarProfessor('${prof.user}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pencil-square" viewBox="0 0 16 16">
              <path d="M15.502 1.94a.5.5 0 0 1 0 .706L14.459 3.69l-2-2L13.502.646a.5.5 0 0 1 .707 0l1.293 1.293zm-1.75 2.456-2-2L4.939 9.21a.5.5 0 0 0-.121.196l-.805 2.414a.25.25 0 0 0 .316.316l2.414-.805a.5.5 0 0 0 .196-.12l6.813-6.814z"/>
              <path fill-rule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5z"/>
            </svg>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="confirmarEsborrarProfessor('${prof.user}')">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
              <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
            </svg>
          </button>
        </td>
      </tr>
    `
    )
    .join("");
}

/**
 * Obrir modal per crear un nou professor
 */
function nouProfessor() {
  document.getElementById("professorMode").value = "create";
  document.getElementById("professorUser").value = "";
  document.getElementById("professorUser").disabled = false;
  document.getElementById("professorClau").value = "";
  document.getElementById("professorClau").required = true;
  document.getElementById("modalProfessorTitle").textContent = "Nou Professor";
  document.getElementById("professorClauHelp").textContent =
    "Contrasenya per l'usuari (mínim 4 caràcters)";
  modalProfessorInstance?.show();
}

/**
 * Editar professor
 */
function editarProfessor(user) {
  document.getElementById("professorMode").value = "edit";
  document.getElementById("professorUser").value = user;
  document.getElementById("professorUser").disabled = true;
  document.getElementById("professorClau").value = "";
  document.getElementById("professorClau").required = true;
  document.getElementById("modalProfessorTitle").textContent =
    "Canviar Contrasenya";
  document.getElementById("professorClauHelp").textContent =
    "Nova contrasenya per l'usuari";
  modalProfessorInstance?.show();
}

/**
 * Guardar professor (crear o actualitzar)
 */
async function handleSubmitProfessor(e) {
  e.preventDefault();

  const mode = document.getElementById("professorMode").value;
  const user = document.getElementById("professorUser").value.trim();
  const clau = document.getElementById("professorClau").value;

  try {
    if (mode === "create") {
      await window.GestioAPI.crearProfessor(user, clau);
    } else {
      await window.GestioAPI.actualitzarProfessor(user, clau);
    }

    modalProfessorInstance?.hide();
    document.getElementById("formProfessor").reset();
  } catch (error) {
    console.error("Error en handleSubmitProfessor:", error);
  }
}

/**
 * Confirmar esborrat de professor
 */
async function confirmarEsborrarProfessor(user) {
  try {
    await window.GestioAPI.esborrarProfessor(user);
  } catch (error) {
    console.error("Error esborrant professor:", error);
  }
}

// Exposar funcions globalment per poder cridar-les des dels onclick del HTML
window.editarAlumne = editarAlumne;
window.confirmarEsborrarAlumne = confirmarEsborrarAlumne;
window.editarGrup = editarGrup;
window.confirmarEsborrarGrup = confirmarEsborrarGrup;
window.editarProfessor = editarProfessor;
window.confirmarEsborrarProfessor = confirmarEsborrarProfessor;

console.log("Super Mode UI carregat");

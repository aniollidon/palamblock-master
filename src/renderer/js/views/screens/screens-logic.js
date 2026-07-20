import {
  openCastSidebarForStudent,
  updateCastStudentData,
} from "./cast-view.js";
import { getSocket } from "../../core/container-helpers.js";
import { getState } from "../../core/store.js";
import { openScreenshotsHistory } from "./screenshots-history.js";

let grupAlumnesList = {};
let alumnesMachines = {};

function asDisplayText(value, fallback) {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || fallback;
  }

  if (value && typeof value === "object") {
    const candidate =
      value.displayName ||
      value.sessionDisplayName ||
      value.name ||
      value.user ||
      value.sessionUser ||
      value.label ||
      null;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return fallback;
}

function compareMachines(m1, m2) {
  try {
    if (Object.keys(m1).toString() !== Object.keys(m2).toString()) return false;
    for (let key in m1) {
      if (m1[key].connected !== m2[key].connected) return false;
      if (m1[key].ip !== m2[key].ip) return false;
      if (m1[key].displayName !== m2[key].displayName) return false;
      if (m1[key].sessionDisplayName !== m2[key].sessionDisplayName)
        return false;
      if (m1[key].sessionActive !== m2[key].sessionActive) return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Gestiona el fullscreen d'un iframe amb cleanup automàtic
 * @param {HTMLIFrameElement} iframe - L'iframe a posar en fullscreen
 * @param {string} ip - IP de la màquina
 * @param {string} alumne - Nom de l'alumne
 * @param {boolean} allowEdit - Si true, permet edició en fullscreen (sense view=true)
 * @returns {Object} Objecte amb funcions activate i cleanup
 */
function handleFullscreen(iframe, ip, alumne, allowEdit = false) {
  let fullscreenHandler = null;

  const cleanup = () => {
    if (fullscreenHandler) {
      document.removeEventListener("fullscreenchange", fullscreenHandler);
      document.removeEventListener("webkitfullscreenchange", fullscreenHandler);
      document.removeEventListener("mozfullscreenchange", fullscreenHandler);
      document.removeEventListener("MSFullscreenChange", fullscreenHandler);
      fullscreenHandler = null;
    }
  };

  const activate = () => {
    // Neteja listener anterior si existeix
    cleanup();

    // Canvia URL segons si permet edició o només visualització
    const vncPwd = getState().remoteVncPassword || 'fpb123';
    if (allowEdit) {
      // Mode edició: sense view=true (botó cursor)
      iframe.src = `http://${ip}:6080/vnc_iframe.html?password=${vncPwd}&reconnect&name=${alumne}`;
    } else {
      // Mode visualització: manté view=true (overlay)
      iframe.src = `http://${ip}:6080/vnc_iframe.html?password=${vncPwd}&view=true&reconnect&name=${alumne}`;
    }

    // Prova diferents mètodes de fullscreen per compatibilitat amb Electron
    const requestFullscreen =
      iframe.requestFullscreen ||
      iframe.webkitRequestFullscreen ||
      iframe.mozRequestFullScreen ||
      iframe.msRequestFullscreen;

    if (requestFullscreen) {
      requestFullscreen.call(iframe).catch((err) => {
        console.error("Error en posar a pantalla completa:", err);
      });
    }

    // Crea el nou handler per tornar a mode view quan surt de fullscreen
    fullscreenHandler = () => {
      if (
        !document.fullscreenElement &&
        !document.webkitFullscreenElement &&
        !document.mozFullScreenElement &&
        !document.msFullscreenElement
      ) {
        iframe.src = `http://${ip}:6080/vnc_iframe.html?password=${vncPwd}&view=true&reconnect&name=${alumne}`;
        cleanup();
      }
    };

    // Registra listeners per diferents APIs de fullscreen
    document.addEventListener("fullscreenchange", fullscreenHandler);
    document.addEventListener("webkitfullscreenchange", fullscreenHandler);
    document.addEventListener("mozfullscreenchange", fullscreenHandler);
    document.addEventListener("MSFullscreenChange", fullscreenHandler);
  };

  return { activate, cleanup };
}

export function drawGridGrup_update(updatedData) {
  const grupSelector = document.getElementById("grupSelector");
  const grup = grupSelector ? grupSelector.value : null;
  if (!grup) return;

  for (let alumne in updatedData) {
    if (!grupAlumnesList[grup] || !grupAlumnesList[grup].alumnes[alumne])
      continue;
    if (Object.keys(updatedData[alumne]).length === 0) continue;
    if (compareMachines(alumnesMachines[alumne], updatedData[alumne])) continue;
    const oldGridItem = document.getElementById("grid-item-" + alumne);
    if (!oldGridItem) continue;
    const maquina = Object.values(updatedData[alumne])[0];
    if (!maquina) continue;
    const gridItem = drawGridItem(alumne, maquina);
    const grid = document.getElementById("grid-container");
    grid.replaceChild(gridItem, oldGridItem);
  }

  setAlumnesMachine(updatedData);

  // Actualitzar dropdown del cast sidebar després d'actualitzar les dades
  updateCastStudentData(grupAlumnesList, alumnesMachines);
}

function drawGridItem(alumne, maquina) {
  const shownName = asDisplayText(
    maquina?.displayName ||
      (maquina?.sessionActive
        ? maquina?.sessionDisplayName || maquina?.sessionUser
        : maquina?.sessionDisplayName),
    alumne
  );
  const gridItem = document.createElement("div");
  gridItem.classList.add("grid-item");
  gridItem.setAttribute("id", "grid-item-" + alumne);

  const gridItemContentHeader = document.createElement("div");
  gridItemContentHeader.classList.add("grid-item-content-header");

  const gridItemContentHeaderName = document.createElement("div");
  gridItemContentHeaderName.classList.add("grid-item-content-header-name");
  gridItemContentHeaderName.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-display" viewBox="0 0 16 16">
    <path d="M0 4s0-2 2-2h12s2 0 2 2v6s0 2-2 2h-4q0 1 .25 1.5H11a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1h.75Q6 13 6 12H2s-2 0-2-2zm1.398-.855a.76.76 0 0 0-.254.302A1.5 1.5 0 0 0 1 4.01V10c0 .325.078.502.145.602q.105.156.302.254a1.5 1.5 0 0 0 .538.143L2.01 11H14c.325 0 .502-.078.602-.145a.76.76 0 0 0 .254-.302 1.5 1.5 0 0 0 .143-.538L15 9.99V4c0-.325-.078-.502-.145-.602a.76.76 0 0 0-.302-.254A1.5 1.5 0 0 0 13.99 3H2c-.325 0-.502.078-.602.145"/>
  </svg> ${shownName}`;
  gridItemContentHeader.appendChild(gridItemContentHeaderName);

  const itemButtons = document.createElement("div");
  itemButtons.classList.add("grid-item-buttons");

  // Botó d'apagar
  const buttonOff = document.createElement("button");
  buttonOff.classList.add("btn", "btn-sm", "btn-danger", "hidden-offline");
  buttonOff.title = "Apaga la màquina de l'alumne";
  buttonOff.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-power" viewBox="0 0 16 16">
                              <path d="M7.5 1v7h1V1z"/>
                              <path d="M3 8.812a5 5 0 0 1 2.578-4.375l-.485-.874A6 6 0 1 0 11 3.616l-.501.865A5 5 0 1 1 3 8.812"/>
                            </svg>`;
  buttonOff.onclick = () => {
    getSocket()?.emit("sendCommandToAlumne", {
      alumne: alumne,
      command: "apaga-tot",
    });
  };
  itemButtons.appendChild(buttonOff);

  // Botó actualitzar vista
  const buttonRefresh = document.createElement("button");
  buttonRefresh.classList.add("btn", "btn-sm", "btn-dark", "hidden-offline");
  buttonRefresh.title = "Refresca la vista de la pantalla";
  buttonRefresh.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="currentColor" class="bi bi-arrow-repeat" viewBox="0 0 16 16">
      <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41m-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9"/>
      <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5 5 0 0 0 8 3M3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9z"/>
    </svg>`;
  buttonRefresh.onclick = () => {
    const vncPwd = getState().remoteVncPassword || 'fpb123';
    iframe.src = `http://${maquina.ip}:6080/vnc_iframe.html?password=${vncPwd}&view=true&reconnect&name=${alumne}`;
  };
  itemButtons.appendChild(buttonRefresh);

  // Botó editar amb pantalla completa
  const buttonCursor = document.createElement("button");
  buttonCursor.classList.add("btn", "btn-sm", "btn-dark", "hidden-offline");
  buttonCursor.title = "Obre la pantalla en mode edició (fullscreen)";
  buttonCursor.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-cursor" viewBox="0 0 16 16">
          <path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103zM2.25 8.184l3.897 1.67a.5.5 0 0 1 .262.263l1.67 3.897L12.743 3.52z"/>
        </svg>`;

  // El onclick s'assignarà després de crear l'iframe
  itemButtons.appendChild(buttonCursor);

  // Llista extra de botons
  const moreButtons = document.createElement("div");
  moreButtons.classList.add(
    "dropdown",
    "d-inline",
    "extra-item-buttons",
    "dropend"
  );
  const buttonMore = document.createElement("button");
  buttonMore.classList.add("btn", "btn-sm", "btn-dark");
  buttonMore.title = "Més accions";
  buttonMore.setAttribute("type", "button");
  buttonMore.setAttribute("id", "mesBotons_" + alumne);
  buttonMore.setAttribute("data-bs-toggle", "dropdown");
  buttonMore.setAttribute("aria-expanded", "false");
  buttonMore.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-list" viewBox="0 0 16 16">
    <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/>
    </svg>`;

  const dropdownMenu = document.createElement("ul");
  dropdownMenu.classList.add("dropdown-menu");
  dropdownMenu.setAttribute("aria-labelledby", "mesBotons_" + alumne);

  // ── Botó Historial de captures (sempre actiu) ──
  const dropdownItemHist = document.createElement("li");
  const buttonHistory = document.createElement("button");
  buttonHistory.classList.add("btn", "btn-sm", "btn-dark");
  buttonHistory.title = "Historial de captures de pantalla";
  buttonHistory.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clock-history" viewBox="0 0 16 16">
    <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 0 0-.439-.27l.493-.87a8.025 8.025 0 0 1 .979.654l-.615.789a6.996 6.996 0 0 0-.418-.302zm1.834 1.79a6.99 6.99 0 0 0-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zm.744 1.352a7.08 7.08 0 0 0-.214-.468l.893-.45a7.976 7.976 0 0 1 .45 1.088l-.95.313a7.023 7.023 0 0 0-.179-.483zm.53 2.507a6.991 6.991 0 0 0-.1-1.025l.985-.17c.067.386.106.778.116 1.17l-1 .025zm-.131 1.538c.033-.17.06-.339.081-.51l.993.123a7.957 7.957 0 0 1-.23 1.155l-.964-.267c.046-.165.086-.332.12-.501zm-.952 2.379c.184-.29.346-.594.486-.908l.914.405c-.16.36-.345.706-.555 1.038l-.845-.535zm-.964 1.205c.122-.122.239-.248.35-.378l.758.653a8.073 8.073 0 0 1-.401.432l-.707-.707z"></path>
    <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0v1z"></path>
    <path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z"></path>
    </svg>`;
  buttonHistory.onclick = () => {
    openScreenshotsHistory(alumne);
  };
  dropdownItemHist.appendChild(buttonHistory);
  dropdownMenu.appendChild(dropdownItemHist);

  // Botó de congelar
  const dropdownItem1 = document.createElement("li");
  const buttonFreeze = document.createElement("button");
  buttonFreeze.style.display = "none";
  buttonFreeze.classList.add("btn", "btn-sm", "btn-primary", "hidden-offline");
  buttonFreeze.title = "Pausa / reprèn processos a la màquina";

  function setButtonFreezeText(estat) {
    buttonFreeze.setAttribute("data-estat", estat);
    if (estat === "pausa") {
      buttonFreeze.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16">
                  <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5m5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5"/>
                </svg>`;
    } else {
      buttonFreeze.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play" viewBox="0 0 16 16">
              <path d="M10.804 8 5 4.633v6.734zm.792-.696a.802.802 0 0 1 0 1.392l-6.363 3.692C4.713 12.69 4 12.345 4 11.692V4.308c0-.653.713-.998 1.233-.696z"/>
                </svg>`;
    }
  }
  setButtonFreezeText("pausa");

  buttonFreeze.onclick = () => {
    const estat = buttonFreeze.getAttribute("data-estat");
    if (estat === "pausa") {
      getSocket()?.emit("sendCommandToAlumne", {
        alumne: alumne,
        command: "pausa",
      });
      setButtonFreezeText("repren");
    } else {
      getSocket()?.emit("sendCommandToAlumne", {
        alumne: alumne,
        command: "repren",
      });
      setButtonFreezeText("pausa");
    }
  };
  dropdownItem1.appendChild(buttonFreeze);
  dropdownMenu.appendChild(dropdownItem1);

  // Botó actualitzar script // deprecated
  const dropdownItem2 = document.createElement("li");
  const buttonScript = document.createElement("button");
  buttonScript.style.display = "none";
  buttonScript.classList.add("btn", "btn-sm", "btn-dark", "hidden-offline");
  buttonScript.title = "Actualitza l'script de l'alumne";
  buttonScript.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-cloud-upload" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M4.406 1.342A5.53 5.53 0 0 1 8 0c2.69 0 4.923 2 5.166 4.579C14.758 4.804 16 6.137 16 7.773 16 9.569 14.502 11 12.687 11H10a.5.5 0 0 1 0-1h2.688C13.979 10 15 8.988 15 7.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 2.825 10.328 1 8 1a4.53 4.53 0 0 0-2.941 1.1c-.757.652-1.153 1.438-1.153 2.055v.448l-.445.049C2.064 4.805 1 5.952 1 7.318 1 8.785 2.23 10 3.781 10H6a.5.5 0 0 1 0 1H3.781C1.708 11 0 9.366 0 7.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383"/>
      <path fill-rule="evenodd" d="M7.646 4.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V14.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708z"/>
    </svg>`;
  buttonScript.onclick = () => {
    getSocket()?.emit("sendCommandToAlumne", {
      alumne: alumne,
      command: "actualitza",
    });
  };
  dropdownItem2.appendChild(buttonScript);
  dropdownMenu.appendChild(dropdownItem2);

  // Botó visió incognit
  const dropdownItem3 = document.createElement("li");
  const buttonIncognito = document.createElement("button");
  buttonIncognito.classList.add("btn", "btn-sm", "btn-dark", "hidden-offline");
  buttonIncognito.title = "Obre noVNC amb controls addicionals";
  buttonIncognito.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-incognito" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="m4.736 1.968-.892 3.269-.014.058C2.113 5.568 1 6.006 1 6.5 1 7.328 4.134 8 8 8s7-.672 7-1.5c0-.494-1.113-.932-2.83-1.205l-.014-.058-.892-3.27c-.146-.533-.698-.849-1.239-.734C9.411 1.363 8.62 1.5 8 1.5s-1.411-.136-2.025-.267c-.541-.115-1.093.2-1.239.735m.015 3.867a.25.25 0 0 1 .274-.224c.9.092 1.91.143 2.975.143a30 30 0 0 0 2.975-.143.25.25 0 0 1 .05.498c-.918.093-1.944.145-3.025.145s-2.107-.052-3.025-.145a.25.25 0 0 1-.224-.274M3.5 10h2a.5.5 0 0 1 .5.5v1a1.5 1.5 0 0 1-3 0v-1a.5.5 0 0 1 .5-.5m-1.5.5q.001-.264.085-.5H2a.5.5 0 0 1 0-1h3.5a1.5 1.5 0 0 1 1.488 1.312 3.5 3.5 0 0 1 2.024 0A1.5 1.5 0 0 1 10.5 9H14a.5.5 0 0 1 0 1h-.085q.084.236.085.5v1a2.5 2.5 0 0 1-5 0v-.14l-.21-.07a2.5 2.5 0 0 0-1.58 0l-.21.07v.14a2.5 2.5 0 0 1-5 0zm8.5-.5h2a.5.5 0 0 1 .5.5v1a1.5 1.5 0 0 1-3 0v-1a.5.5 0 0 1 .5-.5"/>
    </svg>`;
  buttonIncognito.onclick = () => {
    // Open link in new tab
    window.open(
      `http://${maquina.ip}:6080/vnc.html?reconnect&viewonly=true&name=${alumne}`,
      "_blank"
    );
  };

  dropdownItem3.appendChild(buttonIncognito);
  dropdownMenu.appendChild(dropdownItem3);

  // Botó copiar IP
  const dropdownItem4 = document.createElement("li");
  const buttonCopyIP = document.createElement("button");
  buttonCopyIP.classList.add("btn", "btn-sm", "btn-dark", "hidden-offline");
  buttonCopyIP.title = "Copia la IP al portaretalls";
  buttonCopyIP.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard2" viewBox="0 0 16 16">
      <path d="M3.5 2a.5.5 0 0 0-.5.5v12a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-12a.5.5 0 0 0-.5-.5H12a.5.5 0 0 1 0-1h.5A1.5 1.5 0 0 1 14 2.5v12a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14.5v-12A1.5 1.5 0 0 1 3.5 1H4a.5.5 0 0 1 0 1z"/>
      <path d="M10 .5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5.5.5 0 0 1-.5.5.5.5 0 0 0-.5.5V2a.5.5 0 0 0 .5.5h5A.5.5 0 0 0 11 2v-.5a.5.5 0 0 0-.5-.5.5.5 0 0 1-.5-.5"/>
    </svg>`;
  buttonCopyIP.onclick = () => {
    try {
      navigator.clipboard.writeText(maquina.ip);
    } catch (e) {
      bootbox.alert({
        title: "No s'ha pogut accedir al portaretalls",
        message:
          "Copia manualment la IP:<br><code>" + maquina.ip + "</code>",
      });
    }
  };
  dropdownItem4.appendChild(buttonCopyIP);
  dropdownMenu.appendChild(dropdownItem4);

  //botó ssh
  const dropdownItemSSH = document.createElement("li");
  const buttonSSH = document.createElement("a");
  buttonSSH.classList.add("btn", "btn-sm", "btn-dark", "hidden-offline");
  buttonSSH.title = "Obre una sessió SSH de super per l'alumne";
  buttonSSH.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-terminal" viewBox="0 0 16 16">
  <path d="M6 9a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3A.5.5 0 0 1 6 9M3.854 4.146a.5.5 0 1 0-.708.708L4.793 6.5 3.146 8.146a.5.5 0 1 0 .708.708l2-2a.5.5 0 0 0 0-.708z"/>
  <path d="M2 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm12 1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
</svg>`;
  // Assigna href només si hi ha IP
  if (maquina && maquina.ip) {
    buttonSSH.setAttribute("href", `ssh://super@${maquina.ip}`);
    buttonSSH.setAttribute("target", "_blank");
  } else {
    buttonSSH.classList.add("disabled");
    buttonSSH.setAttribute("aria-disabled", "true");
  }
  dropdownItemSSH.appendChild(buttonSSH);
  dropdownMenu.appendChild(dropdownItemSSH);

  // Botó emetre a l'alumne (obrir sidebar en mode individual)
  const dropdownItem5 = document.createElement("li");
  const buttonCastStudent = document.createElement("button");
  buttonCastStudent.classList.add("btn", "btn-sm", "btn-primary", "hidden-offline");
  buttonCastStudent.title = "Emet la pantalla d'aquest alumne";
  buttonCastStudent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-in-up" viewBox="0 0 16 16">
    <path fill-rule="evenodd" d="M3.5 10a.5.5 0 0 1-.5-.5v-8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 0 0 1h2A1.5 1.5 0 0 0 14 9.5v-8A1.5 1.5 0 0 0 12.5 0h-9A1.5 1.5 0 0 0 2 1.5v8A1.5 1.5 0 0 0 3.5 11h2a.5.5 0 0 0 0-1z"/>
    <path fill-rule="evenodd" d="M7.646 4.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V14.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708z"/>
  </svg>`;
  buttonCastStudent.onclick = () => {
    openCastSidebarForStudent(alumne);
  };
  dropdownItem5.appendChild(buttonCastStudent);
  dropdownMenu.appendChild(dropdownItem5);

  moreButtons.appendChild(buttonMore);
  moreButtons.appendChild(dropdownMenu);
  itemButtons.appendChild(moreButtons);
  gridItemContentHeader.appendChild(itemButtons);
  gridItem.appendChild(gridItemContentHeader);

  const gridItemContentScreen = document.createElement("div");
  gridItemContentScreen.classList.add("grid-item-content-screen");
  const iframe = document.createElement("iframe");
  iframe.classList.add("grid-item-content-iframe");

  if (!maquina.connected) {
    iframe.src = "";
    gridItem.classList.add("offline");
    // Desactiva els botons que requereixen connexió
    buttonCursor.disabled = true;
    buttonOff.disabled = true;
    buttonRefresh.disabled = true;
    // buttonMore SEMPRE actiu (conté historial)
    buttonMore.disabled = false;
    buttonCastStudent.disabled = true;
    buttonScript.disabled = true;
    buttonIncognito.disabled = true;
    buttonCopyIP.disabled = true;

  } else {
    const vncPwd = getState().remoteVncPassword || 'fpb123';
    iframe.setAttribute(
      "src",
      `http://${maquina.ip}:6080/vnc_iframe.html?password=${vncPwd}&view=true&reconnect&name=${alumne}`
    );
    gridItem.classList.add("online");
    // Reactiva els botons
    buttonCursor.disabled = false;
    buttonMore.disabled = false;
    buttonOff.disabled = false;
    buttonRefresh.disabled = false;
    buttonCastStudent.disabled = false;
    buttonScript.disabled = false;
    buttonIncognito.disabled = false;
    buttonCopyIP.disabled = false;
  }

  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("scrolling", "no");

  iframe.style.backgroundImage = "url('images/offline.jpg')";
  iframe.style.backgroundPosition = "center";
  iframe.style.backgroundRepeat = "no-repeat";
  iframe.style.backgroundSize = "contain";

  const overlay = document.createElement("div");
  overlay.classList.add("overlay");

  // Ara que tenim l'iframe creat, podem assignar els fullscreen managers
  // Gestió de fullscreen amb edició permesa (allowEdit = true) per al botó cursor
  const fullscreenManagerEdit = handleFullscreen(
    iframe,
    maquina.ip,
    alumne,
    true
  );
  buttonCursor.onclick = fullscreenManagerEdit.activate;

  // Gestió de fullscreen només visualització (allowEdit = false) per a l'overlay
  const fullscreenManagerView = handleFullscreen(
    iframe,
    maquina.ip,
    alumne,
    false
  );
  overlay.onclick = fullscreenManagerView.activate;

  gridItemContentScreen.appendChild(overlay);
  gridItemContentScreen.appendChild(iframe);

  // Advertiment de xarxa no esperada per l'alumne
  const expectedNetwork = getState().expectedNetwork;
  if (
    expectedNetwork &&
    maquina.wifi_ssid &&
    maquina.wifi_ssid !== "unknown" &&
    maquina.wifi_ssid !== expectedNetwork
  ) {
    const networkWarning = document.createElement("div");
    networkWarning.classList.add("network-warning-icon");
    networkWarning.title = `Connectat a la xarxa ${maquina.wifi_ssid}`;
    networkWarning.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M10.706 3.294A12.6 12.6 0 0 0 8 3C5.259 3 2.723 3.882.663 5.379a.485.485 0 0 0-.048.736.52.52 0 0 0 .668.05A11.45 11.45 0 0 1 8 4q.946 0 1.852.148zM8 6c-1.905 0-3.68.56-5.166 1.526a.48.48 0 0 0-.063.745.525.525 0 0 0 .652.065 8.45 8.45 0 0 1 3.51-1.27zm2.596 1.404.785-.785q.947.362 1.785.907a.482.482 0 0 1 .063.745.525.525 0 0 1-.652.065 8.5 8.5 0 0 0-1.98-.932zM8 10l.933-.933a6.5 6.5 0 0 1 2.013.637c.285.145.326.524.1.75l-.015.015a.53.53 0 0 1-.611.09A5.5 5.5 0 0 0 8 10m4.905-4.905.747-.747q.886.451 1.685 1.03a.485.485 0 0 1 .047.737.52.52 0 0 1-.668.05 11.5 11.5 0 0 0-1.811-1.07M9.02 11.78c.238.14.236.464.04.66l-.707.706a.5.5 0 0 1-.707 0l-.707-.707c-.195-.195-.197-.518.04-.66A2 2 0 0 1 8 11.5c.374 0 .723.102 1.021.28zm4.355-9.905a.53.53 0 0 1 .75.75l-10.75 10.75a.53.53 0 0 1-.75-.75z"/>
    </svg>`;
    gridItemContentScreen.appendChild(networkWarning);
  }

  gridItem.appendChild(gridItemContentScreen);

  return gridItem;
}

function drawGridGrup(grupName) {
  // Activa els botons de grup
  const offBtn = document.getElementById("globalGroupPowerOffButton");
  const castBtn = document.getElementById("globalGroupCastButton");
  if (offBtn) offBtn.disabled = false;
  if (castBtn) castBtn.disabled = false;

  // Fes el grid
  const grid = document.getElementById("grid-container");
  if (!grid) return; // Evita error si el DOM no està llest o la vista ha canviat
  grid.innerHTML = "";
  const grup = grupAlumnesList[grupName];
  for (let alumne in grup.alumnes) {
    let maquina = { connected: false, ip: "" };

    if (
      alumnesMachines[alumne] &&
      Object.keys(alumnesMachines[alumne]).length !== 0
    )
      maquina = Object.values(alumnesMachines[alumne])[0];

    const gridItem = drawGridItem(alumne, maquina);
    grid.appendChild(gridItem);
  }
}

export function preparaSelectorGrups() {
  // Llegeix el parametre grup de la query
  const urlParams = new URLSearchParams(window.location.search);
  const grupGET = urlParams.get("grup");
  // Llegeix el darrer grup seleccionat (persistència entre vistes)
  let grupStored = null;
  try {
    grupStored = localStorage.getItem("pbk:lastBrowsersGroup");
  } catch (_) {}

  // Prepara el selector de grups
  const grupSelector = document.getElementById("grupSelector");
  if (!grupSelector) return; // encara no està el DOM
  grupSelector.innerHTML = "";
  const option = document.createElement("option");
  option.innerHTML = "Selecciona un grup";
  option.setAttribute("selected", "selected");
  option.setAttribute("disabled", "disabled");
  grupSelector.appendChild(option);

  let selectedGrup = null;
  for (let grup in grupAlumnesList) {
    const option = document.createElement("option");
    option.setAttribute("value", grup);
    option.innerHTML = grup;
    // Prioritza query; si no n'hi ha, usa el guardat
    if ((grupGET && grupGET === grup) || (!grupGET && grupStored === grup)) {
      option.setAttribute("selected", "selected");
      selectedGrup = grup;
    }
    grupSelector.appendChild(option);
  }

  // Aplica selecció inicial si escau
  if (selectedGrup) {
    grupSelector.value = selectedGrup;
    try {
      localStorage.setItem("pbk:lastBrowsersGroup", selectedGrup);
    } catch (_) {}
    drawGridGrup(selectedGrup);
    // Neteja la query si venia marcada
    if (grupGET) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  grupSelector.onchange = (ev) => {
    const grup = ev.target.value;
    try {
      localStorage.setItem("pbk:lastBrowsersGroup", grup || "");
    } catch (_) {}
    if (!grup) {
      const offBtn = document.getElementById("globalGroupPowerOffButton");
      const castBtn = document.getElementById("globalGroupCastButton");
      if (offBtn) offBtn.disabled = true;
      if (castBtn) castBtn.disabled = true;
    } else {
      // Evita error si el contenidor no hi és encara
      if (document.getElementById("grid-container")) {
        drawGridGrup(grup);
      }
    }
    // Actualitzar dropdown del cast sidebar quan canvia el grup
    updateCastStudentData(grupAlumnesList, alumnesMachines);
  };
}

export function setAlumnesMachine(data) {
  alumnesMachines = data;
  // Actualitzar dades del cast sidebar si existeix
  updateCastStudentData(grupAlumnesList, alumnesMachines);
}

export function setGrupAlumnesList(data) {
  grupAlumnesList = data;
  // Actualitzar dades del cast sidebar si existeix
  updateCastStudentData(grupAlumnesList, alumnesMachines);
}

import { socket } from "./socket.js";

let grupAlumnesList = {};
let alumnesMachines = {};

function compareMachines(m1, m2) {
  try {
    if (Object.keys(m1).toString() !== Object.keys(m2).toString()) return false;
    for (let key in m1) {
      if (m1[key].connected !== m2[key].connected) return false;
      if (m1[key].ip !== m2[key].ip) return false;
    }

    return true;
  } catch (e) {
    return false;
  }
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
  if (window.updateCastStudentData) {
    window.updateCastStudentData(grupAlumnesList, alumnesMachines);
  }
}

function drawGridItem(alumne, maquina) {
  const gridItem = document.createElement("div");
  gridItem.classList.add("grid-item");
  gridItem.setAttribute("id", "grid-item-" + alumne);

  const gridItemContentHeader = document.createElement("div");
  gridItemContentHeader.classList.add("grid-item-content-header");

  const gridItemContentHeaderName = document.createElement("div");
  gridItemContentHeaderName.classList.add("grid-item-content-header-name");
  gridItemContentHeaderName.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-display" viewBox="0 0 16 16">
    <path d="M0 4s0-2 2-2h12s2 0 2 2v6s0 2-2 2h-4q0 1 .25 1.5H11a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1h.75Q6 13 6 12H2s-2 0-2-2zm1.398-.855a.76.76 0 0 0-.254.302A1.5 1.5 0 0 0 1 4.01V10c0 .325.078.502.145.602q.105.156.302.254a1.5 1.5 0 0 0 .538.143L2.01 11H14c.325 0 .502-.078.602-.145a.76.76 0 0 0 .254-.302 1.5 1.5 0 0 0 .143-.538L15 9.99V4c0-.325-.078-.502-.145-.602a.76.76 0 0 0-.302-.254A1.5 1.5 0 0 0 13.99 3H2c-.325 0-.502.078-.602.145"/>
  </svg> ${alumne}`;
  gridItemContentHeader.appendChild(gridItemContentHeaderName);

  const itemButtons = document.createElement("div");
  itemButtons.classList.add("grid-item-buttons");

  // Botó d'apagar
  const buttonOff = document.createElement("button");
  buttonOff.classList.add("btn", "btn-sm", "btn-danger");
  buttonOff.title = "Apaga la màquina de l'alumne";
  buttonOff.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-power" viewBox="0 0 16 16">
                              <path d="M7.5 1v7h1V1z"/>
                              <path d="M3 8.812a5 5 0 0 1 2.578-4.375l-.485-.874A6 6 0 1 0 11 3.616l-.501.865A5 5 0 1 1 3 8.812"/>
                            </svg>`;
  buttonOff.onclick = () => {
    socket.emit("sendCommandToAlumne", {
      alumne: alumne,
      command: "apaga-tot",
    });
  };
  itemButtons.appendChild(buttonOff);

  // Botó actualitzar vista
  const buttonRefresh = document.createElement("button");
  buttonRefresh.classList.add("btn", "btn-sm", "btn-dark");
  buttonRefresh.title = "Refresca la vista de la pantalla";
  buttonRefresh.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" fill="currentColor" class="bi bi-arrow-repeat" viewBox="0 0 16 16">
      <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41m-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9"/>
      <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5 5 0 0 0 8 3M3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9z"/>
    </svg>`;
  buttonRefresh.onclick = () => {
    iframe.src = `http://${maquina.ip}:6080/vnc_iframe.html?password=fpb123&view=true&reconnect&name=${alumne}`;
  };
  itemButtons.appendChild(buttonRefresh);

  // Botó editar amb pantalla completa
  const buttonCursor = document.createElement("button");
  buttonCursor.classList.add("btn", "btn-sm", "btn-dark");
  buttonCursor.title = "Obre la pantalla en mode edició (fullscreen)";
  buttonCursor.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-cursor" viewBox="0 0 16 16">
          <path d="M14.082 2.182a.5.5 0 0 1 .103.557L8.528 15.467a.5.5 0 0 1-.917-.007L5.57 10.694.803 8.652a.5.5 0 0 1-.006-.916l12.728-5.657a.5.5 0 0 1 .556.103zM2.25 8.184l3.897 1.67a.5.5 0 0 1 .262.263l1.67 3.897L12.743 3.52z"/>
        </svg>`;

  // Variable per controlar si ja hi ha un listener actiu
  let fullscreenHandler = null;

  buttonCursor.onclick = () => {
    // Elimina el listener anterior si existeix
    if (fullscreenHandler) {
      document.removeEventListener("fullscreenchange", fullscreenHandler);
    }

    iframe.src = `http://${maquina.ip}:6080/vnc_iframe.html?password=fpb123&reconnect&name=${alumne}`;
    iframe.requestFullscreen();

    // Crea el nou handler
    fullscreenHandler = () => {
      if (!document.fullscreenElement) {
        iframe.src = `http://${maquina.ip}:6080/vnc_iframe.html?password=fpb123&view=true&reconnect&name=${alumne}`;
        document.removeEventListener("fullscreenchange", fullscreenHandler);
        fullscreenHandler = null;
      }
    };

    document.addEventListener("fullscreenchange", fullscreenHandler);
  };
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

  // Botó de congelar
  const dropdownItem1 = document.createElement("li");
  const buttonFreeze = document.createElement("button");
  buttonFreeze.style.display = "none";
  buttonFreeze.classList.add("btn", "btn-sm", "btn-primary");
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
      socket.emit("sendCommandToAlumne", { alumne: alumne, command: "pausa" });
      setButtonFreezeText("repren");
    } else {
      socket.emit("sendCommandToAlumne", { alumne: alumne, command: "repren" });
      setButtonFreezeText("pausa");
    }
  };
  dropdownItem1.appendChild(buttonFreeze);
  dropdownMenu.appendChild(dropdownItem1);

  // Botó actualitzar script
  const dropdownItem2 = document.createElement("li");
  const buttonScript = document.createElement("button");
  buttonScript.classList.add("btn", "btn-sm", "btn-dark");
  buttonScript.title = "Actualitza l'script de l'alumne";
  buttonScript.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-cloud-upload" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M4.406 1.342A5.53 5.53 0 0 1 8 0c2.69 0 4.923 2 5.166 4.579C14.758 4.804 16 6.137 16 7.773 16 9.569 14.502 11 12.687 11H10a.5.5 0 0 1 0-1h2.688C13.979 10 15 8.988 15 7.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 2.825 10.328 1 8 1a4.53 4.53 0 0 0-2.941 1.1c-.757.652-1.153 1.438-1.153 2.055v.448l-.445.049C2.064 4.805 1 5.952 1 7.318 1 8.785 2.23 10 3.781 10H6a.5.5 0 0 1 0 1H3.781C1.708 11 0 9.366 0 7.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383"/>
      <path fill-rule="evenodd" d="M7.646 4.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V14.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708z"/>
    </svg>`;
  buttonScript.onclick = () => {
    socket.emit("sendCommandToAlumne", {
      alumne: alumne,
      command: "actualitza",
    });
  };
  dropdownItem2.appendChild(buttonScript);
  dropdownMenu.appendChild(dropdownItem2);

  // Botó visió incognit
  const dropdownItem3 = document.createElement("li");
  const buttonIncognito = document.createElement("button");
  buttonIncognito.classList.add("btn", "btn-sm", "btn-dark");
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
  buttonCopyIP.classList.add("btn", "btn-sm", "btn-dark");
  buttonCopyIP.title = "Copia la IP al portaretalls";
  buttonCopyIP.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard2" viewBox="0 0 16 16">
      <path d="M3.5 2a.5.5 0 0 0-.5.5v12a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-12a.5.5 0 0 0-.5-.5H12a.5.5 0 0 1 0-1h.5A1.5 1.5 0 0 1 14 2.5v12a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 14.5v-12A1.5 1.5 0 0 1 3.5 1H4a.5.5 0 0 1 0 1z"/>
      <path d="M10 .5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5.5.5 0 0 1-.5.5.5.5 0 0 0-.5.5V2a.5.5 0 0 0 .5.5h5A.5.5 0 0 0 11 2v-.5a.5.5 0 0 0-.5-.5.5.5 0 0 1-.5-.5"/>
    </svg>`;
  buttonCopyIP.onclick = () => {
    try {
      navigator.clipboard.writeText(maquina.ip);
    } catch (e) {
      prompt(
        "No s'ha pogut accedir al portaretalls \nCopia manualment la IP: \n",
        maquina.ip
      );
    }
  };
  dropdownItem4.appendChild(buttonCopyIP);
  dropdownMenu.appendChild(dropdownItem4);

  //botó ssh
  const dropdownItemSSH = document.createElement("li");
  const buttonSSH = document.createElement("a");
  buttonSSH.classList.add("btn", "btn-sm", "btn-dark");
  buttonSSH.title = "Obre una sessió SSH de super per l'alumne";
  buttonSSH.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-terminal" viewBox="0 0 16 16">
  <path d="M6 9a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3A.5.5 0 0 1 6 9M3.854 4.146a.5.5 0 1 0-.708.708L4.793 6.5 3.146 8.146a.5.5 0 1 0 .708.708l2-2a.5.5 0 0 0 0-.708z"/>
  <path d="M2 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm12 1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/>
</svg>`;
  // Assigna href només si hi ha IP
  if (maquina && maquina.ip) {
    buttonSSH.setAttribute("href", `ssh://super@${maquina.ip}`);
  } else {
    buttonSSH.classList.add("disabled");
    buttonSSH.setAttribute("aria-disabled", "true");
  }
  dropdownItemSSH.appendChild(buttonSSH);
  dropdownMenu.appendChild(dropdownItemSSH);

  // Botó emetre a l'alumne (obrir sidebar en mode individual)
  const dropdownItem5 = document.createElement("li");
  const buttonCastStudent = document.createElement("button");
  buttonCastStudent.classList.add("btn", "btn-sm", "btn-primary");
  buttonCastStudent.title = "Emet la pantalla d'aquest alumne";
  buttonCastStudent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-in-up" viewBox="0 0 16 16">
    <path fill-rule="evenodd" d="M3.5 10a.5.5 0 0 1-.5-.5v-8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 0 0 1h2A1.5 1.5 0 0 0 14 9.5v-8A1.5 1.5 0 0 0 12.5 0h-9A1.5 1.5 0 0 0 2 1.5v8A1.5 1.5 0 0 0 3.5 11h2a.5.5 0 0 0 0-1z"/>
    <path fill-rule="evenodd" d="M7.646 4.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 5.707V14.5a.5.5 0 0 1-1 0V5.707L5.354 7.854a.5.5 0 1 1-.708-.708z"/>
  </svg>`;
  buttonCastStudent.onclick = () => {
    if (window.openCastSidebarForStudent) {
      window.openCastSidebarForStudent(alumne);
    } else {
      showErrorToast("No s'ha carregat la funcionalitat d'emissió");
    }
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
    // Desactiva els botons
    buttonCursor.disabled = true;
    buttonMore.disabled = true;
    buttonOff.disabled = true;
    buttonRefresh.disabled = true;
  } else {
    iframe.setAttribute(
      "src",
      `http://${maquina.ip}:6080/vnc_iframe.html?password=fpb123&view=true&reconnect&name=${alumne}`
    );
    gridItem.classList.add("online");
    // Reactiva els botons
    buttonCursor.disabled = false;
    buttonMore.disabled = false;
    buttonOff.disabled = false;
    buttonRefresh.disabled = false;
  }

  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("scrolling", "no");

  iframe.style.backgroundImage = "url('images/offline.jpg')";
  iframe.style.backgroundPosition = "center";
  iframe.style.backgroundRepeat = "no-repeat";
  iframe.style.backgroundSize = "contain";
  const overlay = document.createElement("div");
  overlay.classList.add("overlay");
  overlay.onclick = () => {
    iframe.requestFullscreen();
  };
  gridItemContentScreen.appendChild(overlay);
  gridItemContentScreen.appendChild(iframe);
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
    if (window.updateCastStudentData) {
      window.updateCastStudentData(grupAlumnesList, alumnesMachines);
    }
  };
}

export function setAlumnesMachine(data) {
  alumnesMachines = data;
  // Actualitzar dades del cast sidebar si existeix
  if (window.updateCastStudentData) {
    window.updateCastStudentData(grupAlumnesList, alumnesMachines);
  }
}

export function setGrupAlumnesList(data) {
  grupAlumnesList = data;
  // Actualitzar dades del cast sidebar si existeix
  if (window.updateCastStudentData) {
    window.updateCastStudentData(grupAlumnesList, alumnesMachines);
  }
}

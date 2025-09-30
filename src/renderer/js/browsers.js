import {
  creaWebMenuJSON,
  obreDialogNormesWeb,
  obreDialogAfegeixLlistaBlanca,
  obre_confirmacio,
  obreDialogBloquejaWeb,
  obreDialogDebug,
} from "./dialogs.js";
import { toogleSideBar } from "./sidebar.js";
import { compareEqualTabs } from "./utils.js";
import { socket } from "./socket.js";

const storedAlumneInfo = {};
let grupAlumnesList = {};
let visibilityAlumnes = {};
let chromeTabsObjects = {};

export function drawAlumnesActivity(data) {
  let alumnesList = document.getElementById("alumnesList");
  if (!alumnesList) return; // Vista de navegadors no carregada; evita errors a Pantalles

  for (let grup in grupAlumnesList) {
    for (let alumne in grupAlumnesList[grup].alumnes) {
      const alumneInfo = Object.hasOwnProperty.call(data, alumne)
        ? data[alumne]
        : undefined;
      let alumneDiv = undefined;

      // Draw alumne container
      if (!document.getElementById(alumne + "-container")) {
        alumneDiv = document.createElement("div");
        alumneDiv.setAttribute("class", "alumne-container");
        alumneDiv.setAttribute("id", alumne + "-container");
        alumneDiv.style.display = visibilityAlumnes[alumne] ? "" : "none";
      } else {
        alumneDiv = document.getElementById(alumne + "-container");
        alumneDiv.style.display = visibilityAlumnes[alumne] ? "" : "none";
      }

      // Draw alumne header
      let alumneStatusButtonMain = undefined;

      function setAlumneStatus(status) {
        alumneStatusButtonMain.classList.remove("btn-success");
        alumneStatusButtonMain.classList.remove("btn-danger");
        alumneStatusButtonMain.classList.remove("btn-warning");
        alumneStatusButtonMain.classList.remove("btn-secondary");
        alumneStatusButtonMain.removeAttribute("disabled");

        switch (status) {
          case "RuleFree":
            alumneStatusButtonMain.classList.add("btn-warning");
            alumneStatusButtonMain.innerHTML = "Desactivat";
            break;
          case "Blocked":
            alumneStatusButtonMain.classList.add("btn-danger");
            alumneStatusButtonMain.innerHTML = "Bloquejat";
            break;
          case "RuleOn":
          default:
            alumneStatusButtonMain.classList.add("btn-success");
            alumneStatusButtonMain.innerHTML = "Filtre actiu";
            break;
        }
      }

      if (!document.getElementById(alumne + "-header")) {
        const alumneDivHeader = document.createElement("div");
        alumneDivHeader.setAttribute("class", "alumne-header");
        alumneDivHeader.setAttribute("id", alumne + "-header");
        alumneDiv.appendChild(alumneDivHeader);
        alumneDivHeader.innerHTML = ` <h3>Alumne: ${alumne}</h3>`;
        alumnesList.appendChild(alumneDiv);

        const alumneDivButtons = document.createElement("div");
        alumneDivButtons.setAttribute("class", "alumne-buttons");
        alumneDivHeader.appendChild(alumneDivButtons);

        // Status button
        const alumneStatusButton = document.createElement("div");
        alumneStatusButton.setAttribute("class", "btn-group");
        alumneStatusButton.setAttribute("id", alumne + "-status-button");
        alumneStatusButtonMain = document.createElement("button");
        alumneStatusButtonMain.setAttribute(
          "id",
          alumne + "-status-button-main"
        );
        alumneStatusButtonMain.setAttribute("type", "button");
        alumneStatusButtonMain.setAttribute("class", "btn dropdown-toggle");
        alumneStatusButtonMain.setAttribute("data-bs-toggle", "dropdown");
        alumneStatusButtonMain.setAttribute("aria-expanded", "false");
        alumneStatusButton.appendChild(alumneStatusButtonMain);
        const alumneStatusButtonDropdown = document.createElement("ul");
        alumneStatusButtonDropdown.setAttribute("class", "dropdown-menu");
        alumneStatusButton.appendChild(alumneStatusButtonDropdown);

        for (const s of [
          { id: "RuleOn", text: "Filtre actiu" },
          { id: "RuleFree", text: "Filtre desactivat" },
          { id: "Blocked", text: "Tot bloquejat" },
        ]) {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.setAttribute("class", "dropdown-item");
          a.setAttribute("id", alumne + "-status-" + s.id);
          a.innerHTML = s.text;
          a.onclick = () => {
            let text_confirmacio = undefined;
            switch (s.id) {
              case "RuleFree":
                text_confirmacio =
                  "Segur que vols desactivar PalamBlock a <i>" +
                  alumne +
                  "</i>? " +
                  "Això permetrà a l'alumne accedir a qualsevol web, sense restriccions. Aquest canvi " +
                  "pot afectar altres professors i assignatures. No es recomana fer-ho. Si s'escau, " +
                  "reverteix aquest canvi un cop hagis acabat.";
                break;
              case "Blocked":
                text_confirmacio =
                  "Segur que vols activar el mode bloqueig total de PalamBlock a <i>" +
                  alumne +
                  "</i>? Això " +
                  "impedirà a l'alumne accedir a qualsevol web, sense excepcions. Aquest " +
                  "canvi pot afectar altres professors i assignatures. Reverteix aquest " +
                  "canvi un cop hagis acabat.";
                break;
            }

            obre_confirmacio(text_confirmacio, () => {
              socket.emit("setAlumneStatus", { alumne: alumne, status: s.id });
              setAlumneStatus(s.id);
            });
          };
          li.appendChild(a);
          alumneStatusButtonDropdown.appendChild(li);
        }

        setAlumneStatus(grupAlumnesList[grup].alumnes[alumne].status);
        alumneDivButtons.appendChild(alumneStatusButton);
        alumneDivButtons.appendChild(document.createTextNode(" "));

        // Normes web button
        const normesWebButton = document.createElement("button");
        normesWebButton.setAttribute("class", "btn btn-dark");
        normesWebButton.setAttribute("type", "button");
        const NormesWebInner = document.createElement("div");
        NormesWebInner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-globe-americas" viewBox="0 0 16 16">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM2.04 4.326c.325 1.329 2.532 2.54 3.717 3.19.48.263.793.434.743.484-.08.08-.162.158-.242.234-.416.396-.787.749-.758 1.266.035.634.618.824 1.214 1.017.577.188 1.168.38 1.286.983.082.417-.075.988-.22 1.52-.215.782-.406 1.48.22 1.48 1.5-.5 3.798-3.186 4-5 .138-1.243-2-2-3.5-2.5-.478-.16-.755.081-.99.284-.172.15-.322.279-.51.216-.445-.148-2.5-2-1.5-2.5.78-.39.952-.171 1.227.182.078.099.163.208.273.318.609.304.662-.132.723-.633.039-.322.081-.671.277-.867.434-.434 1.265-.791 2.028-1.12.712-.306 1.365-.587 1.579-.88A7 7 0 1 1 2.04 4.327Z"/>
                </svg> Normes Web`;
        normesWebButton.appendChild(NormesWebInner);

        normesWebButton.onclick = () => obreDialogNormesWeb(alumne, "alumne");
        alumneDivButtons.appendChild(normesWebButton);
        alumneDivButtons.appendChild(document.createTextNode(" "));

        // Historial Web button
        const historialWebButton = document.createElement("button");
        historialWebButton.setAttribute("class", "btn btn-dark");
        historialWebButton.setAttribute("type", "button");
        const historialWebInner = document.createElement("div");
        historialWebInner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-clock-history" viewBox="0 0 16 16">
                <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zm2.004.45a7.003 7.003 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342l-.36.933zm1.37.71a7.01 7.01 0 0 0-.439-.27l.493-.87a8.025 8.025 0 0 1 .979.654l-.615.789a6.996 6.996 0 0 0-.418-.302zm1.834 1.79a6.99 6.99 0 0 0-.653-.796l.724-.69c.27.285.52.59.747.91l-.818.576zm.744 1.352a7.08 7.08 0 0 0-.214-.468l.893-.45a7.976 7.976 0 0 1 .45 1.088l-.95.313a7.023 7.023 0 0 0-.179-.483zm.53 2.507a6.991 6.991 0 0 0-.1-1.025l.985-.17c.067.386.106.778.116 1.17l-1 .025zm-.131 1.538c.033-.17.06-.339.081-.51l.993.123a7.957 7.957 0 0 1-.23 1.155l-.964-.267c.046-.165.086-.332.12-.501zm-.952 2.379c.184-.29.346-.594.486-.908l.914.405c-.16.36-.345.706-.555 1.038l-.845-.535zm-.964 1.205c.122-.122.239-.248.35-.378l.758.653a8.073 8.073 0 0 1-.401.432l-.707-.707z"/>
                <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0v1z"/>
                <path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5z"/>
                </svg> Historial Web`;
        historialWebButton.appendChild(historialWebInner);

        historialWebButton.onclick = () => toogleSideBar(alumne, "web");
        alumneDivButtons.appendChild(historialWebButton);
        alumneDivButtons.appendChild(document.createTextNode(" "));

        // Delete button
        if (alumne === "prova" || window.location.search.includes("super")) {
          const deleteButton = document.createElement("button");
          deleteButton.setAttribute("class", "btn btn-danger");
          deleteButton.setAttribute("type", "button");
          deleteButton.innerHTML = "Esborra historial";
          deleteButton.onclick = () => {
            socket.emit("deleteHistorialFromAlumne", { alumne: alumne });
          };
          alumneDivButtons.appendChild(document.createTextNode(" "));
          alumneDivButtons.appendChild(deleteButton);
        }

        const debugButton = document.createElement("button");
        debugButton.setAttribute("class", "btn btn-dark");
        debugButton.setAttribute("type", "button");
        debugButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-bug" viewBox="0 0 16 16">
                      <path d="M4.355.522a.5.5 0 0 1 .623.333l.291.956A5 5 0 0 1 8 1c1.007 0 1.946.298 2.731.811l.29-.956a.5.5 0 1 1 .957.29l-.41 1.352A5 5 0 0 1 13 6h.5a.5.5 0 0 0 .5-.5V5a.5.5 0 0 1 1 0v.5A1.5 1.5 0 0 1 13.5 7H13v1h1.5a.5.5 0 0 1 0 1H13v1h.5a1.5 1.5 0 0 1 1.5 1.5v.5a.5.5 0 1 1-1 0v-.5a.5.5 0 0 0-.5-.5H13a5 5 0 0 1-10 0h-.5a.5.5 0 0 0-.5.5v.5a.5.5 0 1 1-1 0v-.5A1.5 1.5 0 0 1 2.5 10H3V9H1.5a.5.5 0 0 1 0-1H3V7h-.5A1.5 1.5 0 0 1 1 5.5V5a.5.5 0 0 1 1 0v.5a.5.5 0 0 0 .5.5H3c0-1.364.547-2.601 1.432-3.503l-.41-1.352a.5.5 0 0 1 .333-.623M4 7v4a4 4 0 0 0 3.5 3.97V7zm4.5 0v7.97A4 4 0 0 0 12 11V7zM12 6a4 4 0 0 0-1.334-2.982A3.98 3.98 0 0 0 8 2a3.98 3.98 0 0 0-2.667 1.018A4 4 0 0 0 4 6z"/>
                    </svg>`;
        debugButton.onclick = () => {
          obreDialogDebug(alumne);
        };
        alumneDivButtons.appendChild(document.createTextNode(" "));
        alumneDivButtons.appendChild(debugButton);

        alumneDivButtons.appendChild(document.createTextNode(" "));

        alumneDivButtons.appendChild(document.createTextNode(" "));
      }

      if (alumneInfo) {
        // Browsers List
        let alumneBrowsersDiv = undefined;
        let countActiveBrowsers = 0;

        if (!document.getElementById(alumne + "-browsers")) {
          alumneBrowsersDiv = document.createElement("div");
          alumneBrowsersDiv.setAttribute("class", "browsers");
          alumneBrowsersDiv.setAttribute("id", alumne + "-browsers");
          alumneDiv.appendChild(alumneBrowsersDiv);
        } else {
          alumneBrowsersDiv = document.getElementById(alumne + "-browsers");
        }

        for (const browser in alumneInfo.browsers) {
          const browserInfo = alumneInfo.browsers[browser];

          let browserDiv = document.getElementById(
            alumne + "-" + browser + "-browser"
          );
          if (!browserDiv) {
            browserDiv = document.createElement("div");
            browserDiv.setAttribute("class", "browser");
            browserDiv.setAttribute("id", alumne + "-" + browser + "-browser");
            browserDiv.setAttribute("data-version", browserInfo.extVersion);
            alumneBrowsersDiv.appendChild(browserDiv);
          }

          // Si el browser ja no és obert
          if (!browserInfo.opened) {
            browserDiv.remove();
            continue;
          }

          countActiveBrowsers++;

          // Prepara i separa per finestres
          const windowInfo = {};
          for (const tab in browserInfo.tabs) {
            if (!browserInfo.tabs[tab].opened) continue;
            if (!windowInfo[browserInfo.tabs[tab].windowId])
              windowInfo[browserInfo.tabs[tab].windowId] = {};

            windowInfo[browserInfo.tabs[tab].windowId][tab] =
              browserInfo.tabs[tab];
          }

          for (const windowId in windowInfo) {
            let browserWin = undefined;
            const bw_id = alumne + "-" + browser + "-" + windowId;
            // Si les pestanyes no han canviat PERO el DOM d'aquest window no existeix (perquè hem re-entrar a la vista),
            // no saltem el dibuix: cal reconstruir l'estructura visual.
            const bw_dom_exists = document.getElementById(
              bw_id + "-browser-win"
            );
            if (
              bw_dom_exists &&
              storedAlumneInfo[alumne] &&
              storedAlumneInfo[alumne][browser] &&
              storedAlumneInfo[alumne][browser][windowId] &&
              compareEqualTabs(
                storedAlumneInfo[alumne][browser][windowId],
                windowInfo[windowId]
              )
            ) {
              continue;
            }
            if (!document.getElementById(bw_id + "-browser-win")) {
              browserWin = document.createElement("div");
              browserWin.setAttribute("class", "chrome-tabs");
              browserWin.setAttribute("id", bw_id + "-browser-win");
              browserWin.style = "--tab-content-margin: 9px;";
              browserWin.setAttribute("data-chrome-tabs-instance-id", bw_id);
              browserDiv.appendChild(browserWin);
              //browserDiv.addEventListener('activeTabChange', ({ detail }) => console.log('Active tab changed', detail.tabEl))
              //browserDiv.addEventListener('tabAdd', ({ detail }) => console.log('Tab added', detail.tabEl))
              browserWin.addEventListener(
                "tabRemove",
                function tabRemoveListener({ detail }) {
                  console.log("Tab removed", detail.tabEl);
                  socket.emit("closeTab", {
                    alumne: alumne,
                    browser: browserInfo.browser,
                    tabId: detail.tabEl.info.tabId,
                  });
                }
              );
            } else {
              browserWin = document.getElementById(bw_id + "-browser-win");
              browserWin.innerHTML = "";
            }

            const browserWinInfoDiv = document.createElement("div");
            browserWinInfoDiv.setAttribute("class", "browser-info");
            const browserIcon = document.createElement("img");
            browserIcon.setAttribute(
              "src",
              "images/" + browserInfo.browser.toLowerCase() + ".png"
            );
            browserIcon.setAttribute("class", "browser-icon");
            const browserVersion = document.createElement("div");
            browserVersion.setAttribute("class", "browser-version");
            browserVersion.innerHTML = "v" + browserInfo.extVersion;
            browserWinInfoDiv.appendChild(browserVersion);
            browserWinInfoDiv.appendChild(browserIcon);
            browserWin.appendChild(browserWinInfoDiv);

            const browserContent = document.createElement("div");
            browserContent.setAttribute("class", "chrome-tabs-content");
            browserWin.appendChild(browserContent);

            const browserTabsBottomBar = document.createElement("div");
            browserTabsBottomBar.setAttribute(
              "class",
              "chrome-tabs-bottom-bar"
            );
            browserWin.appendChild(browserTabsBottomBar);

            const menu_options = creaWebMenuJSON(alumne, browserInfo.browser);

            // init chrome tabs
            if (!chromeTabsObjects[alumne]) chromeTabsObjects[alumne] = {};
            chromeTabsObjects[alumne][browser] = new ChromeTabs();
            chromeTabsObjects[alumne][browser].init(browserWin, menu_options);

            for (const tab in windowInfo[windowId]) {
              const tabInfo = windowInfo[windowId][tab];
              if (!tabInfo.opened) continue;
              const noprotocols = [
                "chrome:",
                "edge:",
                "opera:",
                "brave:",
                "vivaldi:",
                "secure:",
                "about:",
              ];
              const noicon =
                tabInfo.webPage.protocol &&
                noprotocols.indexOf(tabInfo.webPage.protocol) !== -1;
              chromeTabsObjects[alumne][browser].addTab(
                {
                  title: tabInfo.webPage.title,
                  favicon: tabInfo.webPage.favicon
                    ? tabInfo.webPage.favicon
                    : noicon
                    ? undefined
                    : "images/undefined_favicon.png",
                  info: tabInfo,
                },
                {
                  background: !tabInfo.active,
                }
              );
            }

            // Store windows structure
            if (!storedAlumneInfo[alumne]) storedAlumneInfo[alumne] = {};
            if (!storedAlumneInfo[alumne][browser])
              storedAlumneInfo[alumne][browser] = {};
            storedAlumneInfo[alumne][browser][windowId] = windowInfo[windowId];
          }

          // Cerca si hi ha alguna finestra tancada
          if (storedAlumneInfo[alumne] && storedAlumneInfo[alumne][browser]) {
            for (const windowId in storedAlumneInfo[alumne][browser]) {
              if (!windowInfo[windowId]) {
                delete storedAlumneInfo[alumne][browser][windowId];
                const browserWin = document.getElementById(
                  alumne + "-" + browser + "-" + windowId + "-browser-win"
                );
                if (browserWin) browserWin.remove();
              }
            }
          }
        }
      }
    }
  }
}

function drawBrowsersGrup(grup) {
  // Desa el darrer grup seleccionat per recordar-lo en futures entrades
  try {
    localStorage.setItem("pbk:lastBrowsersGroup", grup);
  } catch (_) {}
  // Evita executar si no som a la vista de navegadors
  if (!document.getElementById("alumnesList")) return;
  for (let g in grupAlumnesList) {
    for (let a in grupAlumnesList[g].alumnes) {
      visibilityAlumnes[a] = g === grup;
      const browserContainer = document.getElementById(a + "-container");
      if (browserContainer)
        browserContainer.style.display = visibilityAlumnes[a] ? "" : "none";

      // Refresca els chrome tabs
      if (chromeTabsObjects[a])
        for (let b in chromeTabsObjects[a])
          chromeTabsObjects[a][b].layoutTabs();
    }
  }

  // Prepara el botó d'estat global
  const grupStatus = document.getElementById("globalGroupGtatus");
  const grupStatusRuleOn = document.getElementById("globalGroupStatusRuleOn");
  const grupStatusRuleFree = document.getElementById(
    "globalGroupStatusRuleFree"
  );
  const grupStatusBlockAll = document.getElementById(
    "globalGroupStatusBlockAll"
  );

  function setGrupStatus(status, send = false) {
    grupStatus.classList.remove("btn-warning");
    grupStatus.classList.remove("btn-success");
    grupStatus.classList.remove("btn-danger");
    let text_confirmacio = undefined;

    if (status === "RuleOn") {
      grupStatus.classList.add("btn-success");
      grupStatus.innerHTML = "Filtre actiu";
    } else if (status === "RuleFree") {
      grupStatus.classList.add("btn-warning");
      grupStatus.innerHTML = "Desactivat";
      text_confirmacio =
        "Segur que vols desactivar PalamBlock a tots els alumnes del grup? " +
        "Això permetrà als alumnes accedir a qualsevol web, sense restriccions. Aquest canvi pot afectar" +
        " altres professors i assignatures. No es recomana fer-ho. Si s'escau, reverteix aquest canvi un cop hagis acabat.";
    } else if (status === "Blocked") {
      grupStatus.classList.add("btn-danger");
      grupStatus.innerHTML = "Tot bloquejat";
      text_confirmacio =
        "Segur que vols activar el mode bloqueig total de PalamBlock per a tots els " +
        "alumnes del grup? Això impedirà als alumnes accedir a qualsevol web, sense excepcions. Aquest" +
        " canvi pot afectar altres professors i assignatures. Reverteix aquest canvi un cop hagis acabat.";
    }

    if (send) {
      obre_confirmacio(text_confirmacio, () => {
        socket.emit("setGrupStatus", { grup: grup, status: status });
      });
    }
  }

  grupStatus.classList.remove("btn-dark");
  grupStatus.removeAttribute("disabled");
  setGrupStatus(grupAlumnesList[grup].status);

  grupStatusRuleOn.onclick = (ev) => {
    setGrupStatus("RuleOn", true);
  };

  grupStatusRuleFree.onclick = (ev) => {
    setGrupStatus("RuleFree", true);
  };

  grupStatusBlockAll.onclick = (ev) => {
    setGrupStatus("Blocked", true);
  };

  // Prepara el botó per moure a la pagina de screens
  // (El botó Pantalles ja no existeix a la capçalera nova; defensiu)
  const grupScreensButton = document.getElementById("globalGroupScreensButton");
  if (grupScreensButton) {
    grupScreensButton.onclick = (ev) => {
      window.location.href = "../screens?grup=" + grup;
    };
  }
  // Prepara el botó de Normes Web de grup
  const grupNormesWebButton = document.getElementById(
    "globalGroupNormesWebButton"
  );
  if (grupNormesWebButton) {
    grupNormesWebButton.removeAttribute("disabled");
    grupNormesWebButton.onclick = (ev) => obreDialogNormesWeb(grup, "grup");
  }

  // Prepara el botó afegeixllistablanca
  const grupAfegeixLlistaBlancaButton = document.getElementById(
    "globalGroupAfegeixLlistaBlancaButton"
  );
  if (grupAfegeixLlistaBlancaButton) {
    grupAfegeixLlistaBlancaButton.removeAttribute("disabled");
    grupAfegeixLlistaBlancaButton.onclick = (ev) =>
      obreDialogAfegeixLlistaBlanca(grup);
  }

  // Prepara el botó nova norma
  const grupNovaNormaButton = document.getElementById(
    "globalGroupAfegeixNormaButton"
  );
  if (grupNovaNormaButton) {
    grupNovaNormaButton.removeAttribute("disabled");
    grupNovaNormaButton.onclick = (ev) =>
      obreDialogBloquejaWeb(
        {
          host: "",
          pathname: "",
          search: "",
          title: "",
        },
        undefined,
        grup,
        "blocgrup"
      );
  }

  // Força un dibuix per assegurar que tots els alumnes (també els desconnectats) es mostren
  // encara que no hagi arribat cap paquet d'activitat.
  try {
    drawAlumnesActivity({});
  } catch (e) {
    console.warn("[Browsers] drawAlumnesActivity initial render warning:", e);
  }
}

export function preparaAlumnesGrups(data) {
  // Si la vista de navegadors no està carregada, evita manipular el DOM
  const alumnesListEl = document.getElementById("alumnesList");
  const grupSelectorEl = document.getElementById("grupSelector");
  if (!alumnesListEl || !grupSelectorEl) return;
  grupAlumnesList = data;

  // Prepara visibilitat
  for (let grup in grupAlumnesList) {
    for (let alumne in grupAlumnesList[grup].alumnes) {
      visibilityAlumnes[alumne] = false;
    }
  }

  // Llegeix el parametre grup de la query
  const urlParams = new URLSearchParams(window.location.search);
  const grupGET = urlParams.get("grup");
  let grupStored = null;
  try {
    grupStored = localStorage.getItem("pbk:lastBrowsersGroup");
  } catch (_) {}

  // Prepara el selector de grups
  const grupSelector = grupSelectorEl;
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
    grupSelector.appendChild(option);

    if (grupGET === grup || (!grupGET && grupStored === grup)) {
      option.setAttribute("selected", "selected");
      selectedGrup = grup;
    }
  }

  // Si tenim un grup per seleccionar (de la URL o guardat), aplica'l i dibuixa
  if (selectedGrup) {
    grupSelector.value = selectedGrup;
    drawBrowsersGrup(selectedGrup);
    // Neteja la query si venia marcada
    if (grupGET) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  grupSelector.onchange = (ev) => {
    drawBrowsersGrup(grupSelector.value);
  };
  // Nota: No tornar a demanar getInitialData aquí; això crearia un bucle amb 'grupAlumnesList'.
}

export function getGrup(alumneId) {
  for (let grup in grupAlumnesList) {
    if (alumneId in grupAlumnesList[grup].alumnes) return grup;
  }

  return undefined;
}

export function getGrups() {
  const grups = [];
  for (let grup in grupAlumnesList) {
    grups.push(grup);
  }
  return grups;
}

export function getAlumnes(grup) {
  return grupAlumnesList[grup].alumnes;
}

export { chromeTabsObjects };

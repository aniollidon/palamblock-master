import { safeURL } from "../../../utils/validators.js";

// If opened inside the admin modal iframe, inherit authManager from parent
if (!window.authManager && window.parent && window.parent.authManager) {
  window.authManager = window.parent.authManager;
}

const urlParams = new URLSearchParams(window.location.search);
let idalumn = urlParams.get("alumn");
idalumn = idalumn ? idalumn : "prova";
document.getElementById(`alumne`).innerText = idalumn;

// Obtenir URL si ve com a paràmetre
const urlParam = urlParams.get("url");

const search = document.getElementById(`search`);
const title = document.getElementById(`title`);
const check = document.getElementById(`check`);
const pbButton = document.getElementById(`pbButton`);
const pbUrl = document.getElementById(`pburl`);
const dotdotdot = document.getElementById(`dotdotdot`);
const dtPanel = document.getElementById("dtPanel");
const dtInput = document.getElementById("datetimeInput");
const dtApply = document.getElementById("datetimeApply");
const dtCancel = document.getElementById("datetimeCancel");
let specificTime = undefined;
let pbStatus = "search";
search.addEventListener(`focus`, () => search.select());
title.addEventListener(`focus`, () => title.select());

function onAction(data) {
  if (data.do === "block") {
    check.classList.add("action-blocked");
    check.classList.remove("action-allowed");
    check.classList.remove("action-unknown");
  } else if (data.do === "warn") {
    //TODO
  } else if (data.do === "allow") {
    check.classList.add("action-allowed");
    check.classList.remove("action-blocked");
    check.classList.remove("action-unknown");
  } else {
    check.classList.remove("action-allowed");
    check.classList.remove("action-blocked");
    check.classList.add("action-unknown");
  }
}

/**
 * Valida una URL mitjançant l'API de validació
 * @param {string} urlValue - URL a validar
 */
function validateURL(urlValue) {
  if (!urlValue || urlValue.trim() === "") {
    console.warn("[browser-test] URL buida, no es valida");
    return;
  }

  onAction({ do: "" });
  const url = safeURL(urlValue);
  pbUrl.innerText = urlValue;
  const baseUrl = window.authManager?.serverUrl || "";

  if (!baseUrl) {
    console.warn("[browser-test] serverUrl no definit encara");
    return;
  }

  fetch(`${baseUrl}/api/v1/validacio/tab`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      host: url.host,
      protocol: url.protocol,
      search: url.search,
      pathname: url.pathname,
      title: "",
      alumne: idalumn,
      browser: "PalamBlock",
      tabId: "0",
      incognito: false,
      favicon: "",
      active: true,
      audible: false,
      silentQuery: true,
      timestampQuery: specificTime,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      onAction(data);
      console.log("[browser-test] Validació URL:", data);
    })
    .catch((error) => {
      console.error("[browser-test] Error validant URL:", error);
      onAction({ do: "unknown" });
    });
}

search.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    validateURL(search.value);
  }
});

title.addEventListener("keypress", (e) => {
  onAction({ do: "" });
  if (e.key === "Enter") {
    pbUrl.innerText = "La pàgina amb títol <<" + title.value + ">>";
    const baseUrl2 = window.authManager?.serverUrl || "";
    if (!baseUrl2) {
      console.warn("[browser-test] serverUrl no definit encara");
    }
    fetch(`${baseUrl2}/api/v1/validacio/tab`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        host: "",
        protocol: "",
        search: "",
        pathname: "",
        title: title.value,
        alumne: idalumn,
        browser: "PalamBlock",
        tabId: "0",
        incognito: false,
        favicon: "",
        active: true,
        audible: false,
        silentQuery: true,
        timestampQuery: specificTime,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        onAction(data);
        console.log("Success:", data);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }
});

pbButton.addEventListener("click", () => {
  pbStatus = pbStatus === "search" ? "title" : "search";
  pbUrl.innerText = "Aquesta pàgina";

  if (pbStatus === "search") {
    search.style.display = "";
    title.style.display = "none";
    search.focus();
    title.value = "Títol d'exemple";
  } else {
    search.style.display = "none";
    title.style.display = "";
    title.focus();
    search.value = "https://exemple.cat";
  }

  onAction({ do: "allow" });
});

dotdotdot.addEventListener("click", () => {
  // Mostra el panell de data-hora
  const now = new Date();
  // Preconfigura el datetime-local al format yyyy-MM-ddTHH:mm:ss
  const pad = (n) => String(n).padStart(2, "0");
  const initVal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  dtInput.value = initVal;
  dtPanel.style.display = "block";
});

dtApply.addEventListener("click", () => {
  if (!dtInput.value) {
    dtPanel.style.display = "none";
    return;
  }
  // value format: yyyy-MM-ddTHH:mm[:ss]
  const [ymd, hms] = dtInput.value.split("T");
  const [y, m, d] = ymd.split("-").map(Number);
  const [hh, mm, ssRaw] = (hms || "00:00:00").split(":");
  const ss = Number(ssRaw ?? "0");
  specificTime = new Date(y, m - 1, d, Number(hh), Number(mm), ss);

  // Mostra la data seleccionada en format local
  const shown = specificTime.toLocaleString();
  document.getElementById(
    "info_datetime"
  ).innerText = ` el dia i hora: ${shown}`;
  dtPanel.style.display = "none";
  onAction({ do: "" });
});

dtCancel.addEventListener("click", () => {
  dtPanel.style.display = "none";
});

// Si hi ha una URL com a paràmetre, carrega-la i valida-la automàticament
if (urlParam) {
  try {
    const decodedUrl = decodeURIComponent(urlParam);
    search.value = decodedUrl;

    // Espera un moment per assegurar que authManager està disponible
    setTimeout(() => {
      console.log("[browser-test] Validant URL automàticament:", decodedUrl);
      validateURL(decodedUrl);
    }, 200);
  } catch (e) {
    console.error("[browser-test] Error descodificant URL:", e);
    onAction({ do: "unknown" });
  }
}

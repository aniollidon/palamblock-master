import { isValidEmail, normaTempsActiva } from "../../utils/validators.js";
import { getSocket } from "../../core/container-helpers.js";

let lastNormesData = null;

/**
 * Detecta si una norma és recurrent (té days a enabled_on).
 * Si té days -> recurrent -> es proposa desactivar (no eliminar).
 * Si no té days -> no recurrent -> es proposa eliminar.
 */
function isNormaRecurrent(enabled_on) {
  if (!enabled_on || !Array.isArray(enabled_on)) return false;
  return enabled_on.some((entry) => entry.days && entry.days.length > 0);
}

function getSelectedGroup() {
  try {
    return localStorage.getItem("pbk:lastBrowsersGroup");
  } catch (_) {
    return null;
  }
}

/**
 * Refresca els avisos de normes blanques per al grup indicat.
 * Si no es passa grup, l'obté de localStorage.
 * @param {string} [grup] - El grup pel qual mostrar avisos.
 */
export function refreshWarningsForGroup(grup) {
  if (!lastNormesData) return;
  const data = lastNormesData;
  const avisos = document.getElementById("avisos");
  const container = document.querySelector(".informacions");
  if (!avisos) return;
  avisos.innerHTML = "";
  let count = 0;

  const selectedGrup = grup || getSelectedGroup();
  if (!selectedGrup) {
    if (container) container.classList.add("d-none");
    return;
  }

  // Només processar normes de grup (no d'alumnes individuals)
  const who = "grups";
  if (!data[who] || !data[who][selectedGrup]) {
    if (container) container.classList.add("d-none");
    return;
  }

  const whois = selectedGrup;
  for (let normaid in data[who][whois]) {
    if (!data[who][whois][normaid].alive) continue;
    if (data[who][whois][normaid].mode === "whitelist") {
      if (!normaTempsActiva(data[who][whois][normaid].enabled_on)) continue;

      const whotxt = "grup";
      let div = document.createElement("div");
      div.classList.add("alert", "alert-warning", "alert-dismissible", "fade", "show");
      div.setAttribute("role", "alert");

      const imsdiv = document.createElement("div");
      imsdiv.classList.add("warning-tip-icons");
      // Get images
      let firstgoogle = false;
      for (let line of data[who][whois][normaid].lines) {
        if (line.host) {
          if (
            line.host.toString().includes("google.com") ||
            line.host.toString().includes("googleusercontent.com")
          ) {
            if (!firstgoogle) firstgoogle = true;
            else continue;
          }

          const favicon = document.createElement("img");
          favicon.setAttribute(
            "src",
            "https://www.google.com/s2/favicons?domain=" +
              line.host.replaceAll("*", "") +
              "&sz=64"
          );
          favicon.setAttribute("alt", line.host);
          favicon.setAttribute("width", "20");
          favicon.setAttribute("height", "20");
          favicon.setAttribute("style", "margin-right: 5px");
          // if favicon is not found, use default
          favicon.onerror = () => {
            favicon.src =
              "https://www.google.com/s2/favicons?domain=google.com&sz=64";
          };
          imsdiv.appendChild(favicon);
        }
      }
      let strong = document.createElement("strong");
      strong.innerHTML = "Alerta: ";

      let span = document.createElement("span");
      span.innerHTML =
        "El grup " + whois + " té una norma amb llista blanca activa.";

      const right = document.createElement("div");
      right.classList.add("warning-right");

      const norma = data[who][whois][normaid];
      const recurrent = isNormaRecurrent(norma.enabled_on);

      const actionBtn = document.createElement("button");
      actionBtn.classList.add("btn", "eye-button");
      actionBtn.setAttribute("type", "button");
      actionBtn.setAttribute("data-bs-toggle", "tooltip");
      actionBtn.setAttribute("data-bs-placement", "top");

      if (recurrent) {
        // Norma recurrent (té days): botó de desactivar
        actionBtn.setAttribute("title", "Desactiva");
        actionBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-slash-fill" viewBox="0 0 16 16">
          <path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7 7 0 0 0 2.79-.588M5.21 3.088A7 7 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474z"/>
          <path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z"/>
        </svg>`;
        actionBtn.onclick = () => {
          getSocket()?.emit("updateNormaWeb", {
            normaId: normaid,
            who: whotxt,
            whoid: whois,
            alive: false,
          });
          bootstrap.Alert.getOrCreateInstance(div).close();
        };
      } else {
        // Norma no recurrent (sense days): botó d'eliminar
        actionBtn.setAttribute("title", "Elimina");
        actionBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6Z"/>
          <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1ZM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118ZM2.5 3h11V2h-11v1Z"/>
        </svg>`;
        actionBtn.onclick = () => {
          getSocket()?.emit("removeNormaWeb", {
            normaId: normaid,
            who: whotxt,
            whoid: whois,
          });
          bootstrap.Alert.getOrCreateInstance(div).close();
        };
      }

      div.appendChild(strong);
      div.appendChild(span);
      right.appendChild(imsdiv);
      right.appendChild(actionBtn);
      div.appendChild(right);

      // When an alert is closed, if no more alerts remain, hide the container
      div.addEventListener("closed.bs.alert", () => {
        if (avisos.childElementCount === 0 && container) {
          container.classList.add("d-none");
        }
      });

      avisos.appendChild(div);
      count++;
      if (container) container.classList.remove("d-none");
    }
  }

  // If no messages were added, hide the container
  if (count === 0 && container) {
    container.classList.add("d-none");
  }
}

/**
 * Rep i emmagatzema les dades de normes web, i refresca els avisos
 * per al grup seleccionat actualment.
 * @param {object} data - Dades de normesWeb del servidor.
 */
export function warnNormesWeb(data) {
  lastNormesData = data;
  refreshWarningsForGroup();
}

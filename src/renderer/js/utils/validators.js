/**
 * Validators - Utilitats de validació i funcions d'utilitat
 */

import { commonHorari } from "../common.js";

/**
 * Compara si dos objectes de tabs són iguals (ignora updatedAt i status)
 * @param {object} obj1 - Primer objecte
 * @param {object} obj2 - Segon objecte
 * @returns {boolean}
 */
export function compareEqualTabs(obj1, obj2) {
  try {
    // Crear còpies profundes
    const copy1 = JSON.parse(JSON.stringify(obj1 || {}));
    const copy2 = JSON.parse(JSON.stringify(obj2 || {}));

    // Eliminar claus que no volem comparar
    eliminarClauJSON(copy1, "updatedAt");
    eliminarClauJSON(copy2, "updatedAt");
    eliminarClauJSON(copy1, "status");
    eliminarClauJSON(copy2, "status");

    return JSON.stringify(copy1) === JSON.stringify(copy2);
  } catch (error) {
    console.warn("[VALIDATORS] Error comparant tabs:", error);
    return false;
  }
}

/**
 * Elimina una clau d'un objecte recursivament
 * @param {object} obj - Objecte a modificar
 * @param {string} clau - Clau a eliminar
 */
function eliminarClauJSON(obj, clau) {
  if (obj && typeof obj === "object") {
    for (const key in obj) {
      if (key === clau) {
        delete obj[key];
      } else {
        eliminarClauJSON(obj[key], clau);
      }
    }
  }
}

/**
 * Parseja una URL de forma segura
 * @param {string} web - URL a parsejar
 * @returns {object} - Objecte amb protocol, host, pathname, search
 */
export function safeURL(web) {
  if (web === undefined || web === null || web === "" || web === "*") {
    return {
      host: undefined,
      protocol: undefined,
      search: undefined,
      pathname: undefined,
    };
  }

  // Netejar espais
  web = web.replaceAll(" ", "");

  // Eliminar última /
  if (web.endsWith("/")) {
    web = web.substring(0, web.length - 1);
  }

  // Extreure protocol
  const protocol = web.includes("//") ? web.split("//")[0] : undefined;
  if (protocol) {
    web = web.replace(protocol + "//", "");
  }

  // Extreure host
  const host = web.split(/\/|\?/)[0];
  if (host) {
    web = web.replace(host, "");
  }

  // Extreure search
  const search = web.includes("?") ? web.split("?")[1] : undefined;
  if (search) {
    web = web.replace("?" + search, "");
  }

  // El que queda és pathname
  const pathname = web.length > 0 ? web : undefined;

  return { host, protocol, search, pathname };
}

/**
 * Comprova si una norma de temps està activa segons l'horari
 * @param {Array} enabled_on - Array de configuracions d'horari amb datetimes, duration, startHours, days
 * @returns {boolean}
 */
export function normaTempsActiva(enabled_on) {
  if (
    enabled_on === undefined ||
    enabled_on === null ||
    enabled_on.length === 0
  ) {
    return true;
  }

  const dataActual = new Date();
  const datetime_ara = dataActual.getTime();
  const dia_avui = dataActual.toLocaleDateString("ca-ES", { weekday: "long" });

  return (
    enabled_on.find((enabled) => {
      const duration = enabled.duration || 0;

      // Mira per datetime
      for (const datetime of enabled.datetimes) {
        const timestamp = new Date(datetime).getTime();
        if (duration === 0 && datetime_ara > timestamp) return true;
        else if (
          datetime_ara > timestamp &&
          datetime_ara < timestamp + duration * 60000
        )
          return true;
      }

      let horaTrobada = false;
      // Mira per hora
      for (const startHour of enabled.startHours) {
        const startHourM = hhmmToMinutes(startHour);
        const endHourM = startHourM + duration;
        const momentM = hhmmToMinutes(
          dataActual.toLocaleTimeString("ca-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
        if (momentM >= startHourM && momentM <= endHourM) {
          horaTrobada = true;
          break;
        }
      }

      // Mira per dia
      const diaTrobat = enabled.days.includes(dia_avui);

      // Comprova
      return (
        (horaTrobada && diaTrobat) ||
        (enabled.startHours === 0 && diaTrobat) ||
        (horaTrobada && enabled.days.length === 0)
      );
    }) !== undefined
  );
}

/**
 * Obté la següent hora del horari lectiu
 * @param {string} moment - Hora actual en format "HH:MM"
 * @param {number} sessions - Número de sessions a avançar (1 o 2)
 * @returns {string|undefined} - Hora de finalització o undefined si no hi ha més sessions
 */
export function getIntervalHorari(moment, sessions) {
  const momentM = hhmmToMinutes(moment);
  let count_sessions = 0;

  for (let hhmm of commonHorari) {
    const minuts = hhmmToMinutes(hhmm);

    if (minuts > momentM) {
      count_sessions++;
      if (count_sessions >= sessions) {
        return hhmm;
      }
    }
  }

  return undefined;
}

/**
 * Converteix format HH:MM a minuts (helper intern)
 * @param {string} hhmm - Hora en format "HH:MM"
 * @returns {number} - Minuts totals
 */
function hhmmToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return 0;

  const parts = hhmm.split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;

  return hours * 60 + minutes;
}

/**
 * Comprova si l'usuari té mode super activat
 * @returns {boolean}
 */
export function isSuperUser() {
  try {
    return sessionStorage.getItem("pbk:super") === "1";
  } catch (error) {
    return false;
  }
}

/**
 * Valida una adreça de correu electrònic
 * @param {string} email - Email a validar
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

/**
 * Valida una URL
 * @param {string} url - URL a validar
 * @returns {boolean}
 */
export function isValidURL(url) {
  if (!url || typeof url !== "string") return false;
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Valida que un string no estigui buit
 * @param {string} str - String a validar
 * @returns {boolean}
 */
export function isNotEmpty(str) {
  return str !== null && str !== undefined && String(str).trim().length > 0;
}

/**
 * Reconstrueix l'opció de durada seleccionada a partir de l'objecte enabled_on
 * @param {Array} enabled_on - Array d'objectes amb datetimes, duration, startHours, days
 * @returns {string|undefined} - Opció seleccionada: "always", "today", "9:30", "11:40", "nopati", etc.
 */
export function reconstrueixDuradaOpcio(enabled_on) {
  if (
    enabled_on === undefined ||
    enabled_on === null ||
    enabled_on.length === 0
  ) {
    return "always";
  }

  const avui = new Date();
  avui.setHours(0, 0, 0, 0);

  if (
    enabled_on.length === 1 &&
    enabled_on[0].datetimes &&
    enabled_on[0].datetimes.length === 1 &&
    enabled_on[0].duration === 1440 &&
    new Date(enabled_on[0].datetimes[0]).getTime() === avui.getTime()
  ) {
    return "today";
  }

  const nowHM = new Date().toLocaleTimeString("ca-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const nextHora = getIntervalHorari(nowHM, 1);
  const next2Hora = getIntervalHorari(nowHM, 2);

  if (
    enabled_on.length === 1 &&
    enabled_on[0].datetimes &&
    enabled_on[0].datetimes.length === 1 &&
    enabled_on[0].duration
  ) {
    const endTime =
      new Date(enabled_on[0].datetimes[0]).getTime() +
      enabled_on[0].duration * 60000;
    const endFormatted = new Date(endTime).toLocaleTimeString("ca-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (endFormatted === nextHora) return nextHora;
    if (endFormatted === next2Hora) return next2Hora;
  }

  return undefined;
}

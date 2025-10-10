/**
 * Formatters - Utilitats per formatar dates, temps, textos, etc.
 */

/**
 * Converteix format HH:MM a minuts
 * @param {string} hhmm - Hora en format "HH:MM"
 * @returns {number} - Minuts totals
 */
export function hhmmToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== "string") return 0;

  const parts = hhmm.split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;

  return hours * 60 + minutes;
}

/**
 * Capitalitza la primera lletra d'un string
 * @param {string} string - Text a capitalitzar
 * @returns {string} - Text capitalitzat
 */
export function capitalizeFirstLetter(string) {
  if (!string || typeof string !== "string") return "";
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Converteix minuts a format "X dies, Y hores, Z minuts"
 * @param {number} minuts - Minuts totals
 * @returns {string} - Text formatat
 */
export function minutstoDDHHMM(minuts) {
  if (typeof minuts !== "number" || minuts < 0) return "0 minuts";

  const dies = Math.floor(minuts / 1440);
  const hores = Math.floor((minuts - dies * 1440) / 60);
  const mins = minuts - dies * 1440 - hores * 60;

  const parts = [];

  if (dies === 1) parts.push(`${dies} dia`);
  else if (dies > 1) parts.push(`${dies} dies`);

  if (hores === 1) parts.push(`${hores} hora`);
  else if (hores > 1) parts.push(`${hores} hores`);

  if (mins === 1) parts.push(`${mins} minut`);
  else if (mins > 1) parts.push(`${mins} minuts`);

  if (parts.length === 0) return "0 minuts";
  if (parts.length === 1) return parts[0];

  return parts.slice(0, -1).join(", ") + " i " + parts.slice(-1);
}

/**
 * Formata una data a format localitzat
 * @param {Date|string|number} date - Data a formatar
 * @param {object} options - Opcions d'Intl.DateTimeFormat
 * @returns {string} - Data formatada
 */
export function formatDate(date, options = {}) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    const defaultOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...options,
    };
    return new Intl.DateTimeFormat("ca-ES", defaultOptions).format(d);
  } catch (error) {
    console.warn("[FORMATTERS] Error formatant data:", error);
    return String(date);
  }
}

/**
 * Formata una data relativa (fa 5 minuts, ahir, etc.)
 * @param {Date|string|number} date - Data a formatar
 * @returns {string} - Text relatiu
 */
export function formatRelativeTime(date) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Ara mateix";
    if (diffMins < 60)
      return `Fa ${diffMins} ${diffMins === 1 ? "minut" : "minuts"}`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
      return `Fa ${diffHours} ${diffHours === 1 ? "hora" : "hores"}`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7)
      return `Fa ${diffDays} ${diffDays === 1 ? "dia" : "dies"}`;

    return formatDate(d, { year: "numeric", month: "short", day: "numeric" });
  } catch (error) {
    console.warn("[FORMATTERS] Error formatant temps relatiu:", error);
    return String(date);
  }
}

/**
 * Formata un nombre amb separadors de milers
 * @param {number} num - Nombre a formatar
 * @returns {string} - Nombre formatat
 */
export function formatNumber(num) {
  if (typeof num !== "number") return String(num);
  return new Intl.NumberFormat("ca-ES").format(num);
}

/**
 * Trunca un text amb punts suspensius
 * @param {string} text - Text a truncar
 * @param {number} maxLength - Longitud màxima
 * @returns {string} - Text truncat
 */
export function truncate(text, maxLength = 50) {
  if (!text || typeof text !== "string") return "";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Escapa HTML per evitar XSS
 * @param {string} text - Text a escapar
 * @returns {string} - Text escapat
 */
export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Converteix un objecte de paràmetres a query string
 * @param {object} params - Objecte amb paràmetres
 * @returns {string} - Query string (?key=value&...)
 */
export function objectToQueryString(params) {
  if (!params || typeof params !== "object") return "";

  const pairs = Object.entries(params)
    .filter(([_, value]) => value !== null && value !== undefined)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    );

  return pairs.length > 0 ? "?" + pairs.join("&") : "";
}

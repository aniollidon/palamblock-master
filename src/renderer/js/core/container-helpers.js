/**
 * Container Helpers - API d'accés al ServiceContainer
 *
 * Aquest mòdul proporciona helpers per accedir als serveis registrats
 * al ServiceContainer de forma senzilla i consistent.
 *
 * Segueix el patró Facade/Service Locator per abstraure l'accés al DI container.
 *
 * @module core/container-helpers
 */

/**
 * Obté el socket de Socket.IO del ServiceContainer
 *
 * @returns {Socket|null} El socket de Socket.IO o null si no està disponible
 *
 * @example
 * import { getSocket } from '@core/container-helpers';
 *
 * getSocket()?.emit('eventName', data);
 *
 * const socket = getSocket();
 * if (socket && socket.connected) {
 *   socket.emit('eventName', data);
 * }
 */
export function getSocket() {
  return window.app?.container?.get("socketManager")?.getSocket();
}

/**
 * Obté l'AuthManager del ServiceContainer
 *
 * @returns {AuthManager|null} L'instància d'AuthManager o null si no està disponible
 *
 * @example
 * import { getAuthManager } from '@core/container-helpers';
 *
 * const authManager = getAuthManager();
 * const user = authManager?.getUser();
 */
export function getAuthManager() {
  return window.app?.container?.get("authManager");
}

/**
 * Obté el ViewManager del ServiceContainer
 *
 * @returns {ViewManager|null} L'instància de ViewManager o null si no està disponible
 *
 * @example
 * import { getViewManager } from '@core/container-helpers';
 *
 * const viewManager = getViewManager();
 * viewManager?.loadView('screens');
 */
export function getViewManager() {
  return window.app?.container?.get("viewManager");
}

/**
 * Obté un servei genèric del ServiceContainer
 *
 * Aquesta funció permet accedir a qualsevol servei registrat al container
 * de forma dinàmica.
 *
 * @param {string} serviceName - Nom del servei registrat al container
 * @returns {any|null} El servei sol·licitat o null si no existeix
 *
 * @example
 * import { getService } from '@core/container-helpers';
 *
 * const logger = getService('logger');
 * const config = getService('config');
 */
export function getService(serviceName) {
  if (!serviceName) {
    console.warn("[container-helpers] getService: serviceName no proporcionat");
    return null;
  }
  return window.app?.container?.get(serviceName);
}

/**
 * Comprova si el ServiceContainer està disponible i inicialitzat
 *
 * @returns {boolean} True si el container està disponible, false altrament
 *
 * @example
 * import { isContainerReady } from '@core/container-helpers';
 *
 * if (isContainerReady()) {
 *   const socket = getSocket();
 * }
 */
export function isContainerReady() {
  return !!(window.app && window.app.container);
}

/**
 * Comprova si un servei específic està registrat al container
 *
 * @param {string} serviceName - Nom del servei a comprovar
 * @returns {boolean} True si el servei està registrat, false altrament
 *
 * @example
 * import { hasService } from '@core/container-helpers';
 *
 * if (hasService('socketManager')) {
 *   const socket = getSocket();
 * }
 */
export function hasService(serviceName) {
  if (!isContainerReady() || !serviceName) return false;
  return window.app.container.has(serviceName);
}

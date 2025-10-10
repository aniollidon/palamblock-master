/**
 * API Client - Wrapper per fer crides HTTP al servidor PalamSRV
 * Centralitza la configuració d'axios i gestiona errors de forma consistent
 */

/**
 * Classe ApiClient per fer crides HTTP
 */
export class ApiClient {
  constructor() {
    this.baseURL = null;
    this.authToken = null;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  /**
   * Configura l'API client amb URL base i token
   * @param {string} baseURL - URL base del servidor
   * @param {string} authToken - Token d'autenticació
   */
  configure(baseURL, authToken) {
    this.baseURL = baseURL;
    this.authToken = authToken;
  }

  /**
   * Obté els headers per les peticions
   * @returns {object}
   */
  getHeaders() {
    const headers = { ...this.defaultHeaders };

    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Fa una petició HTTP genèrica
   * @param {string} method - Mètode HTTP
   * @param {string} endpoint - Endpoint (ruta relativa)
   * @param {object} options - Opcions (body, headers, etc.)
   * @returns {Promise<any>}
   */
  async request(method, endpoint, options = {}) {
    if (!this.baseURL) {
      throw new Error("[API] Base URL no configurada");
    }

    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
      ...options,
    };

    // Afegir body si existeix
    if (options.body) {
      config.body =
        typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);

      // Gestió d'errors HTTP
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // Retornar resposta JSON
      return await response.json();
    } catch (error) {
      console.error(`[API] Error en ${method} ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Petició GET
   * @param {string} endpoint - Endpoint
   * @param {object} options - Opcions
   * @returns {Promise<any>}
   */
  async get(endpoint, options = {}) {
    return this.request("GET", endpoint, options);
  }

  /**
   * Petició POST
   * @param {string} endpoint - Endpoint
   * @param {object} body - Cos de la petició
   * @param {object} options - Opcions
   * @returns {Promise<any>}
   */
  async post(endpoint, body, options = {}) {
    return this.request("POST", endpoint, { ...options, body });
  }

  /**
   * Petició PUT
   * @param {string} endpoint - Endpoint
   * @param {object} body - Cos de la petició
   * @param {object} options - Opcions
   * @returns {Promise<any>}
   */
  async put(endpoint, body, options = {}) {
    return this.request("PUT", endpoint, { ...options, body });
  }

  /**
   * Petició DELETE
   * @param {string} endpoint - Endpoint
   * @param {object} options - Opcions
   * @returns {Promise<any>}
   */
  async delete(endpoint, options = {}) {
    return this.request("DELETE", endpoint, options);
  }

  /**
   * Petició PATCH
   * @param {string} endpoint - Endpoint
   * @param {object} body - Cos de la petició
   * @param {object} options - Opcions
   * @returns {Promise<any>}
   */
  async patch(endpoint, body, options = {}) {
    return this.request("PATCH", endpoint, { ...options, body });
  }
}

// Instància global de l'API client
export const apiClient = new ApiClient();

/**
 * Configura l'API client global
 * @param {string} baseURL - URL base del servidor
 * @param {string} authToken - Token d'autenticació
 */
export function configureApiClient(baseURL, authToken) {
  apiClient.configure(baseURL, authToken);
}

/**
 * Funció helper per fer login
 * @param {string} serverUrl - URL del servidor
 * @param {string} username - Nom d'usuari
 * @param {string} password - Contrasenya
 * @returns {Promise<object>} - Resposta amb token
 */
export async function loginAdmin(serverUrl, username, password) {
  const client = new ApiClient();
  client.configure(serverUrl, null);

  return await client.post("/api/v1/admin/login", {
    username,
    password,
  });
}

/**
 * Funció helper per fer ping al servidor
 * @param {string} serverUrl - URL del servidor
 * @returns {Promise<object>}
 */
export async function pingServer(serverUrl) {
  const client = new ApiClient();
  client.configure(serverUrl, null);

  return await client.get("/api/v1/admin/ping");
}

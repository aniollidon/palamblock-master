/**
 * ServiceContainer - Contenidor de serveis amb Dependency Injection
 * Gestiona la creació i cicle de vida dels serveis de l'aplicació
 * Elimina la dependència de variables globals a window.*
 */

export class ServiceContainer {
  constructor() {
    /**
     * Mapa de serveis registrats
     * @type {Map<string, ServiceDefinition>}
     */
    this.services = new Map();

    /**
     * Mapa de serveis singleton instanciats
     * @type {Map<string, any>}
     */
    this.instances = new Map();

    /**
     * Flag per evitar cicles infinits durant resolució
     * @type {Set<string>}
     */
    this.resolving = new Set();
  }

  /**
   * Registra un servei al contenidor
   * @param {string} name - Nom del servei
   * @param {Function} factory - Funció factory que crea el servei
   * @param {Object} options - Opcions de configuració
   * @param {boolean} options.singleton - Si true, només es crea una instància (default: true)
   * @param {Array<string>} options.dependencies - Llista de dependències requerides
   */
  register(name, factory, options = {}) {
    const { singleton = true, dependencies = [] } = options;

    if (this.services.has(name)) {
      console.warn(
        `[ServiceContainer] Servei '${name}' ja registrat. Sobreescrivint...`
      );
    }

    this.services.set(name, {
      factory,
      singleton,
      dependencies,
    });
  }

  /**
   * Obté un servei del contenidor
   * @param {string} name - Nom del servei
   * @returns {any} Instància del servei
   * @throws {Error} Si el servei no està registrat o hi ha dependències circulars
   */
  get(name) {
    // Comprovar si el servei existeix
    if (!this.services.has(name)) {
      throw new Error(
        `[ServiceContainer] Servei '${name}' no registrat. Serveis disponibles: ${Array.from(
          this.services.keys()
        ).join(", ")}`
      );
    }

    const service = this.services.get(name);

    // Si és singleton i ja està instanciat, retornar la instància
    if (service.singleton && this.instances.has(name)) {
      return this.instances.get(name);
    }

    // Detectar dependències circulars
    if (this.resolving.has(name)) {
      const cycle = Array.from(this.resolving).join(" -> ") + " -> " + name;
      throw new Error(
        `[ServiceContainer] Dependència circular detectada: ${cycle}`
      );
    }

    // Marcar com a resolent
    this.resolving.add(name);

    try {
      // Resoldre dependències
      const dependencies = service.dependencies.map((dep) => this.get(dep));

      // Crear instància passant les dependències
      const instance = service.factory(this, ...dependencies);

      // Si és singleton, guardar la instància
      if (service.singleton) {
        this.instances.set(name, instance);
      }

      return instance;
    } finally {
      // Eliminar del conjunt de resolució
      this.resolving.delete(name);
    }
  }

  /**
   * Comprova si un servei està registrat
   * @param {string} name - Nom del servei
   * @returns {boolean}
   */
  has(name) {
    return this.services.has(name);
  }

  /**
   * Neteja una instància singleton (útil per testing)
   * @param {string} name - Nom del servei
   */
  clear(name) {
    if (this.instances.has(name)) {
      const instance = this.instances.get(name);

      // Si té mètode destroy, cridar-lo
      if (instance && typeof instance.destroy === "function") {
        instance.destroy();
      }

      this.instances.delete(name);
    }
  }

  /**
   * Neteja tots els serveis
   */
  clearAll() {
    // Destruir totes les instàncies
    for (const [name, instance] of this.instances.entries()) {
      if (instance && typeof instance.destroy === "function") {
        try {
          instance.destroy();
        } catch (error) {
          console.error(
            `[ServiceContainer] Error destruint servei '${name}':`,
            error
          );
        }
      }
    }

    this.instances.clear();
    this.resolving.clear();
  }

  /**
   * Retorna la llista de serveis registrats
   * @returns {Array<string>}
   */
  getRegisteredServices() {
    return Array.from(this.services.keys());
  }

  /**
   * Obté informació de debug sobre un servei
   * @param {string} name - Nom del servei
   * @returns {Object|null}
   */
  debug(name) {
    if (!this.services.has(name)) {
      return null;
    }

    const service = this.services.get(name);
    const isInstantiated = this.instances.has(name);

    return {
      name,
      singleton: service.singleton,
      dependencies: service.dependencies,
      instantiated: isInstantiated,
      instance: isInstantiated ? this.instances.get(name) : null,
    };
  }
}

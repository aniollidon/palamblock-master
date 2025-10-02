/**
 * SUPER MODE - Gestió d'Alumnes i Grups
 *
 * Aquest mòdul proporciona funcions per gestionar alumnes i grups
 * en mode super a través del WebSocket ws-admin.
 *
 * Requereix:
 * - Socket connectat a ws-admin (variable global: socket)
 * - Sistema de toasts (toast.js)
 */

// ============================================
// FUNCIONS AUXILIARS
// ============================================

/**
 * Funció genèrica per executar operacions via WebSocket amb callback
 * @param {string} event - Nom de l'event a emetre
 * @param {object} data - Dades a enviar
 * @returns {Promise} - Promesa amb el resultat de l'operació
 */
function wsOperation(event, data) {
  return new Promise((resolve, reject) => {
    if (!window.socket || !window.socket.connected) {
      reject(new Error("Socket no connectat"));
      return;
    }

    window.socket.emit(event, data, (response) => {
      if (response && response.status === "OK") {
        resolve(response.data);
      } else {
        reject(new Error(response?.error || "Error desconegut"));
      }
    });
  });
}

/**
 * Validació bàsica d'ID d'alumne
 */
function validarAlumneId(alumneId) {
  if (!alumneId || typeof alumneId !== "string" || alumneId.trim() === "") {
    throw new Error("L'ID d'alumne no és vàlid");
  }
  // Només lletres, números, guions i guions baixos
  if (!/^[a-zA-Z0-9_-]+$/.test(alumneId)) {
    throw new Error(
      "L'ID d'alumne només pot contenir lletres, números, guions i guions baixos"
    );
  }
  return alumneId.trim();
}

/**
 * Validació bàsica d'ID de grup
 */
function validarGrupId(grupId) {
  if (!grupId || typeof grupId !== "string" || grupId.trim() === "") {
    throw new Error("L'ID de grup no és vàlid");
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(grupId)) {
    throw new Error(
      "L'ID de grup només pot contenir lletres, números, guions i guions baixos"
    );
  }
  return grupId.trim();
}

// ============================================
// GESTIÓ D'ALUMNES
// ============================================

/**
 * Crear un nou alumne
 * @param {object} alumneData - Dades de l'alumne
 * @param {string} alumneData.alumneId - ID únic de l'alumne
 * @param {string} alumneData.grupId - ID del grup
 * @param {string} alumneData.clau - Contrasenya
 * @param {string} alumneData.nom - Nom
 * @param {string} alumneData.cognoms - Cognoms
 * @returns {Promise<object>} - Alumne creat
 */
async function crearAlumne({ alumneId, grupId, clau, nom, cognoms }) {
  try {
    // Validacions
    validarAlumneId(alumneId);
    validarGrupId(grupId);

    if (!nom || nom.trim() === "") {
      throw new Error("El nom és obligatori");
    }
    if (!cognoms || cognoms.trim() === "") {
      throw new Error("Els cognoms són obligatoris");
    }
    if (!clau || clau.length < 4) {
      throw new Error("La contrasenya ha de tenir almenys 4 caràcters");
    }

    const alumne = await wsOperation("createAlumne", {
      alumneId: alumneId.trim(),
      grupId: grupId.trim(),
      clau,
      nom: nom.trim(),
      cognoms: cognoms.trim(),
    });

    showSuccessToast(`Alumne ${nom} ${cognoms} creat correctament`);
    return alumne;
  } catch (error) {
    console.error("Error creant alumne:", error);
    showErrorToast(`Error creant alumne: ${error.message}`);
    throw error;
  }
}

/**
 * Actualitzar dades d'un alumne
 * @param {string} alumneId - ID de l'alumne
 * @param {object} updates - Camps a actualitzar
 * @returns {Promise<void>}
 */
async function actualitzarAlumne(alumneId, updates) {
  try {
    validarAlumneId(alumneId);

    if (!updates || Object.keys(updates).length === 0) {
      throw new Error("No hi ha camps per actualitzar");
    }

    // Validacions específiques
    if (updates.clau && updates.clau.length < 4) {
      throw new Error("La contrasenya ha de tenir almenys 4 caràcters");
    }
    if (updates.grupId) {
      validarGrupId(updates.grupId);
    }

    await wsOperation("updateAlumne", {
      alumneId: alumneId.trim(),
      updates,
    });

    showSuccessToast("Alumne actualitzat correctament");
  } catch (error) {
    console.error("Error actualitzant alumne:", error);
    showErrorToast(`Error actualitzant alumne: ${error.message}`);
    throw error;
  }
}

/**
 * Esborrar un alumne (amb confirmació)
 * @param {string} alumneId - ID de l'alumne
 * @param {string} nomComplet - Nom complet per mostrar en la confirmació
 * @returns {Promise<boolean>} - true si s'ha esborrat, false si s'ha cancel·lat
 */
async function esborrarAlumne(alumneId, nomComplet = "") {
  try {
    validarAlumneId(alumneId);

    const missatge = nomComplet
      ? `Estàs segur que vols esborrar l'alumne ${nomComplet}?\n\nAquesta acció no es pot desfer.`
      : `Estàs segur que vols esborrar l'alumne ${alumneId}?\n\nAquesta acció no es pot desfer.`;

    const confirmat = confirm(missatge);
    if (!confirmat) {
      return false;
    }

    await wsOperation("deleteAlumne", {
      alumneId: alumneId.trim(),
    });

    showSuccessToast("Alumne esborrat correctament");
    return true;
  } catch (error) {
    console.error("Error esborrant alumne:", error);
    showErrorToast(`Error esborrant alumne: ${error.message}`);
    throw error;
  }
}

// ============================================
// GESTIÓ DE GRUPS
// ============================================

/**
 * Crear un nou grup
 * @param {string} grupId - ID únic del grup
 * @param {string} nom - Nom descriptiu (opcional)
 * @returns {Promise<void>}
 */
async function crearGrup(grupId, nom = "") {
  try {
    validarGrupId(grupId);

    await wsOperation("createGrup", {
      grupId: grupId.trim(),
      nom: nom ? nom.trim() : grupId.trim(),
    });

    showSuccessToast(`Grup ${nom || grupId} creat correctament`);
  } catch (error) {
    console.error("Error creant grup:", error);
    if (error.message.includes("ja existeix")) {
      showWarningToast(`El grup ${grupId} ja existeix`);
    } else {
      showErrorToast(`Error creant grup: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Actualitzar dades d'un grup
 * @param {string} grupId - ID del grup
 * @param {object} updates - Camps a actualitzar
 * @returns {Promise<void>}
 */
async function actualitzarGrup(grupId, updates) {
  try {
    validarGrupId(grupId);

    if (!updates || Object.keys(updates).length === 0) {
      throw new Error("No hi ha camps per actualitzar");
    }

    await wsOperation("updateGrup", {
      grupId: grupId.trim(),
      updates,
    });

    showSuccessToast("Grup actualitzat correctament");
  } catch (error) {
    console.error("Error actualitzant grup:", error);
    showErrorToast(`Error actualitzant grup: ${error.message}`);
    throw error;
  }
}

/**
 * Esborrar un grup (amb confirmació)
 * @param {string} grupId - ID del grup
 * @param {string} nom - Nom del grup per mostrar en la confirmació
 * @returns {Promise<boolean>} - true si s'ha esborrat, false si s'ha cancel·lat
 */
async function esborrarGrup(grupId, nom = "") {
  try {
    validarGrupId(grupId);

    const missatge = nom
      ? `Estàs segur que vols esborrar el grup ${nom}?\n\nNota: No es pot esborrar un grup amb alumnes assignats.\nAquesta acció no es pot desfer.`
      : `Estàs segur que vols esborrar el grup ${grupId}?\n\nNota: No es pot esborrar un grup amb alumnes assignats.\nAquesta acció no es pot desfer.`;

    const confirmat = confirm(missatge);
    if (!confirmat) {
      return false;
    }

    await wsOperation("deleteGrup", {
      grupId: grupId.trim(),
    });

    showSuccessToast("Grup esborrat correctament");
    return true;
  } catch (error) {
    console.error("Error esborrant grup:", error);
    if (error.message.includes("alumnes assignats")) {
      showWarningToast(
        "No es pot esborrar el grup perquè té alumnes assignats. Primer reassigna'ls o esborra'ls."
      );
    } else {
      showErrorToast(`Error esborrant grup: ${error.message}`);
    }
    throw error;
  }
}

// ============================================
// OPERACIONS COMPOSTES
// ============================================

/**
 * Moure un alumne a un altre grup
 * @param {string} alumneId - ID de l'alumne
 * @param {string} nouGrupId - ID del nou grup
 * @returns {Promise<void>}
 */
async function moureAlumneAGrup(alumneId, nouGrupId) {
  try {
    validarAlumneId(alumneId);
    validarGrupId(nouGrupId);

    await actualitzarAlumne(alumneId, { grup: nouGrupId });
    showSuccessToast(`Alumne mogut al grup ${nouGrupId}`);
  } catch (error) {
    console.error("Error movent alumne:", error);
    throw error;
  }
}

/**
 * Canviar la contrasenya d'un alumne
 * @param {string} alumneId - ID de l'alumne
 * @param {string} novaClau - Nova contrasenya
 * @returns {Promise<void>}
 */
async function canviarClauAlumne(alumneId, novaClau) {
  try {
    validarAlumneId(alumneId);

    if (!novaClau || novaClau.length < 4) {
      throw new Error("La contrasenya ha de tenir almenys 4 caràcters");
    }

    await actualitzarAlumne(alumneId, { clau: novaClau });
    showSuccessToast("Contrasenya canviada correctament");
  } catch (error) {
    console.error("Error canviant contrasenya:", error);
    throw error;
  }
}

// ============================================
// PROFESSORS / ADMINISTRADORS
// ============================================

/**
 * Crear un nou professor/administrador
 */
async function crearProfessor(user, clau) {
  if (!user || typeof user !== "string" || user.trim() === "") {
    showErrorToast("L'usuari no és vàlid");
    throw new Error("L'usuari no és vàlid");
  }
  if (!clau || typeof clau !== "string" || clau.trim() === "") {
    showErrorToast("La contrasenya no és vàlida");
    throw new Error("La contrasenya no és vàlida");
  }

  try {
    await wsOperation("createAdmin", { user, clau });
    showSuccessToast(`Professor ${user} creat correctament`);
  } catch (error) {
    showErrorToast(`Error creant professor: ${error.message}`);
    console.error("Error creant professor:", error);
    throw error;
  }
}

/**
 * Actualitzar contrasenya d'un professor
 */
async function actualitzarProfessor(user, clau) {
  if (!clau || typeof clau !== "string" || clau.trim() === "") {
    showErrorToast("La contrasenya no és vàlida");
    throw new Error("La contrasenya no és vàlida");
  }

  try {
    await wsOperation("updateAdmin", { user, clau });
    showSuccessToast(`Contrasenya del professor ${user} actualitzada`);
  } catch (error) {
    showErrorToast(`Error actualitzant professor: ${error.message}`);
    console.error("Error actualitzant professor:", error);
    throw error;
  }
}

/**
 * Esborrar un professor
 */
async function esborrarProfessor(user) {
  if (
    !confirm(
      `Segur que vols esborrar el professor ${user}?\n\nAquesta acció no es pot desfer.`
    )
  ) {
    return;
  }

  try {
    await wsOperation("deleteAdmin", { user });
    showSuccessToast(`Professor ${user} esborrat correctament`);
  } catch (error) {
    showErrorToast(`Error esborrant professor: ${error.message}`);
    console.error("Error esborrant professor:", error);
    throw error;
  }
}

// ============================================
// EXPORTACIONS
// ============================================

// Exportar funcions per ser utilitzades globalment o com a mòdul
window.GestioAPI = {
  // Alumnes
  crearAlumne,
  actualitzarAlumne,
  esborrarAlumne,
  moureAlumneAGrup,
  canviarClauAlumne,

  // Grups
  crearGrup,
  actualitzarGrup,
  esborrarGrup,

  // Professors
  crearProfessor,
  actualitzarProfessor,
  esborrarProfessor,

  // Utilitats
  validarAlumneId,
  validarGrupId,
  wsOperation,
};

console.log("Super Mode API carregada");

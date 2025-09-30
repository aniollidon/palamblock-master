// Electron web-parity wiring for Screens view
import {
  drawGridGrup_update,
  preparaSelectorGrups,
  setAlumnesMachine,
  setGrupAlumnesList,
} from "./screens.js";
import { socket, initializeSocket } from "./socket.js";
import { on as storeOn, off as storeOff, requestInitialData } from "./store.js";

let grups_disponibles = false;
let maquines_disponibles = false;
let unsubscribers = [];

async function ensureSocket() {
  return socket || (await initializeSocket());
}

function bind() {
  // Power off all
  const powerBtn = document.getElementById("globalGroupPowerOffButton");
  if (powerBtn && !powerBtn.dataset._bound) {
    powerBtn.addEventListener("click", async () => {
      const currentGrup = document.getElementById("grupSelector")?.value;
      const s = await ensureSocket();
      if (s && currentGrup) s.emit("powerOffAll", { grup: currentGrup });
    });
    powerBtn.dataset._bound = "1";
  }

  // Store listeners
  unsubscribers.push(
    storeOn("grupAlumnesList", (data) => {
      grups_disponibles = true;
      setGrupAlumnesList(data);
      if (grups_disponibles && maquines_disponibles) preparaSelectorGrups();
    })
  );
  unsubscribers.push(
    storeOn("alumnesMachine", (data) => {
      maquines_disponibles = true;
      setAlumnesMachine(data);
      if (grups_disponibles && maquines_disponibles) preparaSelectorGrups();
    })
  );
  unsubscribers.push(
    storeOn("updateAlumnesMachine", (data) => {
      drawGridGrup_update(data);
    })
  );
}

export async function initScreensWiring() {
  await ensureSocket();
  bind();
  // Dades inicials
  requestInitialData("screens-mount");

  // Enllaç del dropdown per canviar a navegadors
  setTimeout(() => {
    const link = document.getElementById("navSwitchBrowsers");
    if (link && !link.dataset._bound) {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        if (window.viewManager) window.viewManager.navigateTo("browsers");
      });
      link.dataset._bound = "1";
    }
  }, 0);
}

// Auto-init when the screens view DOM is present
if (document.getElementById("grid-container")) {
  initScreensWiring();
}

export function unmountScreensView() {
  for (const off of unsubscribers) {
    try {
      off();
    } catch (_) {}
  }
  unsubscribers = [];
}

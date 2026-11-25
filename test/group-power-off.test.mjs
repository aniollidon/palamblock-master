import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

test("el professor confirma l'apagada del seu grup i el botó respecta els permisos i l'espera", async () => {
  const timers = new Set();
  const nativeSetTimeout = globalThis.setTimeout;
  const windowEvents = new EventEmitter();
  const socketEvents = new EventEmitter();
  const requests = [];
  let respond;
  const socket = {
    connected: true,
    on: socketEvents.on.bind(socketEvents),
    off: socketEvents.off.bind(socketEvents),
    emit(name, data, callback) {
      if (name === "powerOffAll") {
        requests.push(data);
        respond = callback;
      }
    },
  };
  let superadmin = false;
  const auth = {
    isSuperAdmin: () => superadmin,
    getAdminGrups: () => ["classe"],
  };
  function element() {
    const events = new EventEmitter();
    return {
      disabled: false, isConnected: true, style: {}, children: [],
      addEventListener: events.on.bind(events),
      removeEventListener: events.off.bind(events),
      emit: events.emit.bind(events),
      appendChild(child) { this.children.push(child); child.parentNode = this; },
      removeChild() {}, remove() {},
    };
  }
  const button = element();
  const selector = element();
  selector.value = "classe";
  selector.selectedOptions = [{ value: "classe", disabled: false }];
  const nodes = { globalGroupPowerOffButton: button, grupSelector: selector };
  globalThis.window = {
    authManager: auth,
    app: { container: { get: name => name === "socketManager" ? { getSocket: () => socket } : null } },
    addEventListener: windowEvents.on.bind(windowEvents),
    removeEventListener: windowEvents.off.bind(windowEvents),
  };
  globalThis.document = {
    readyState: "loading",
    getElementById: id => nodes[id] || null,
    addEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: element,
    body: { appendChild() {}, classList: { remove() {} }, style: { removeProperty() {} } },
  };
  globalThis.setTimeout = (fn, delay, ...args) => {
    const timer = nativeSetTimeout(fn, delay, ...args);
    timers.add(timer);
    return timer;
  };
  let confirmed = false;
  let prompts = 0;
  let promptText;
  globalThis.confirm = message => { prompts++; promptText = message; return confirmed; };
  let view;
  try {
    view = await import("../src/renderer/js/views/screens/screens-view.js");
    await view.init();
    assert.equal(button.disabled, false);

    button.emit("click");
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(prompts, 1);
    assert.match(promptText, /fora de l'aula/);
    assert.equal(requests.length, 0);

    confirmed = true;
    button.emit("click");
    await Promise.resolve();
    await Promise.resolve();
    assert.deepEqual(requests, [{ grup: "classe", confirmed: true }]);
    assert.equal(button.disabled, true);

    selector.value = "altre";
    selector.selectedOptions = [{ value: "altre", disabled: false }];
    selector.emit("change");
    assert.equal(button.disabled, true);
    selector.value = "classe";
    selector.selectedOptions = [{ value: "classe", disabled: false }];
    selector.emit("change");
    assert.equal(button.disabled, true);
    respond({ status: "OK", data: { sent: 2 } });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(button.disabled, false);

    selector.value = "altre";
    selector.selectedOptions = [{ value: "altre", disabled: false }];
    selector.emit("change");
    assert.equal(button.disabled, true);
    superadmin = true;
    windowEvents.emit("auth:role-changed");
    assert.equal(button.disabled, false);
    superadmin = false;
    windowEvents.emit("auth:role-changed");
    assert.equal(button.disabled, true);
  } finally {
    view?.destroy();
    for (const timer of timers) clearTimeout(timer);
    globalThis.setTimeout = nativeSetTimeout;
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.confirm;
  }
});

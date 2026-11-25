import test from "node:test";
import assert from "node:assert/strict";
import { AuthManager } from "../src/renderer/js/core/auth-manager.js";

test("el login interromp la petició i informa després de 15 segons", async () => {
  const timer = globalThis.setTimeout;
  const fields = {
    serverUrl: { value: "http://localhost" },
    username: { value: "test" },
    password: { value: "test" },
    rememberCredentials: { checked: false },
  };
  let delay;
  globalThis.window = {};
  globalThis.document = { getElementById: (id) => fields[id] };
  globalThis.fetch = (_, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  });

  globalThis.setTimeout = (fn, ms, ...args) => {
    delay = ms;
    return timer(fn, 5, ...args);
  };
  try {
    const manager = new AuthManager({ electronAPI: {} });
    const spinners = [];
    let error;
    manager.showLoginSpinner = (show) => spinners.push(show);
    manager.hideLoginError = () => {};
    manager.showLoginError = (message) => { error = message; };
    await manager.performLogin();
    assert.equal(delay, 15000);
    assert.match(error, /15 segons/);
    assert.deepEqual(spinners, [true, false]);
    assert.equal(manager.currentAbortController, null);
    assert.equal(manager.isAuthenticated, false);
  } finally {
    globalThis.setTimeout = timer;
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.fetch;
  }
});

test("el login es tanca si la connexió arriba mentre el modal s'està obrint", () => {
  const modal = new EventTarget();
  globalThis.window = {};
  globalThis.document = { getElementById: () => modal };
  try {
    const manager = new AuthManager({ electronAPI: {} });
    let transitioning = true;
    let hidden = 0;
    manager.isAuthenticated = true;
    manager._modalInstance = {
      hide() {
        if (transitioning) return;
        hidden++;
        modal.dispatchEvent(new Event("hide.bs.modal"));
      },
    };
    manager.hideLogin();
    assert.equal(hidden, 0);
    transitioning = false;
    modal.dispatchEvent(new Event("shown.bs.modal"));
    assert.equal(hidden, 1);
  } finally {
    delete globalThis.window;
    delete globalThis.document;
  }
});

test("un canvi d'identitat neteja la sessió anterior abans d'iniciar el nou socket", async () => {
  const fields = {
    serverUrl: { value: "http://localhost" },
    username: { value: "nou" },
    password: { value: "test" },
    rememberCredentials: { checked: false },
  };
  globalThis.window = {};
  globalThis.document = { getElementById: id => fields[id] };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ authToken: "nou" }) });
  try {
    const events = [];
    const manager = new AuthManager({ electronAPI: {}, emitEvent: name => events.push(name) });
    manager.isAuthenticated = true;
    manager.serverUrl = "http://localhost";
    manager.currentCredentials = { username: "anterior", token: "anterior" };
    manager.showLoginSpinner = () => {};
    manager.hideLoginError = () => {};
    manager.saveCredentials = async () => {};
    manager.setSocketInitializer(() => events.push("socket"));
    await manager.performLogin();
    assert.deepEqual(events, ["auth:logout", "socket"]);
    assert.equal(manager.currentCredentials.username, "nou");
  } finally {
    globalThis.fetch = originalFetch;
    delete globalThis.window;
    delete globalThis.document;
  }
});

test("un error d'autenticació invalida el rol i notifica la neteja de sessió", () => {
  const events = new EventTarget();
  globalThis.window = events;
  globalThis.document = { getElementById: () => null };
  try {
    const emitted = [];
    const manager = new AuthManager({ electronAPI: {}, emitEvent: name => emitted.push(name) });
    manager.isAuthenticated = true;
    manager.currentCredentials = { username: "anterior", token: "anterior" };
    manager.adminRole = "superadmin";
    manager.showLogin = () => {};
    manager.showLoginSpinner = () => {};
    manager.showLoginError = () => {};
    manager.setupLoginModal();
    const event = new Event("socket:auth-error");
    event.detail = { error: "Autenticació fallida" };
    events.dispatchEvent(event);
    assert.equal(manager.isAuthenticated, false);
    assert.equal(manager.currentCredentials, null);
    assert.equal(manager.adminRole, null);
    assert.deepEqual(emitted, ["auth:logout"]);
  } finally {
    delete globalThis.window;
    delete globalThis.document;
  }
});

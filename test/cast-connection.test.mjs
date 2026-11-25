import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

test("una emissió sense confirmació allibera el botó i reconnecta el canal sense repetir l'ordre", async () => {
  const timer = globalThis.setTimeout;
  const nodes = new Map();
  function element(id) {
    const listeners = {};
    return {
      id, listeners, dataset: {}, disabled: false, isConnected: true,
      style: {}, classList: { add() {}, remove() {} },
      addEventListener(name, fn) { listeners[name] = fn; },
      remove() {},
      appendChild(child) { child.parentNode = this; },
      children: [],
    };
  }
  const group = element("grupSelector");
  group.value = "classe";
  const share = element("castShareUrlButton");
  const url = element("castUrlInput");
  url.value = "https://example.org";
  for (const node of [group, share, url, element("globalGroupCastButton")]) nodes.set(node.id, node);

  const events = new EventEmitter();
  const auth = {
    isAuthenticated: true,
    serverUrl: "http://localhost",
    getCredentials: () => ({ username: "test", token: "test" }),
  };
  const socket = new EventEmitter();
  socket.connected = true;
  socket.joins = 0;
  socket.disconnects = 0;
  socket.mode = "timeout";
  socket.replacements = 0;
  const emit = socket.emit.bind(socket);
  socket.emit = (name, ...args) => {
    if (name === "check-room") return args[1]({ hasBroadcaster: socket.mode === "already-active" });
    if (name === "broadcaster-join-request") {
      socket.joins++;
      if (socket.mode !== "timeout") queueMicrotask(() => emit("replace-required"));
      return true;
    }
    if (name === "confirm-replace") {
      socket.replacements++;
      queueMicrotask(() => emit("broadcaster-accepted"));
      return true;
    }
    return emit(name, ...args);
  };
  socket.disconnect = () => {
    socket.disconnects++;
    socket.connected = false;
    emit("disconnect", "io client disconnect");
  };
  socket.connect = () => { socket.connected = true; emit("connect"); };

  globalThis.window = {
    app: { container: { get: () => auth } },
    addEventListener: events.on.bind(events),
    removeEventListener: events.off.bind(events),
  };
  globalThis.document = {
    readyState: "complete",
    getElementById: (id) => nodes.get(id) || null,
    querySelector: () => null,
    addEventListener() {},
    createElement: () => element("toast"),
    body: { appendChild(node) { nodes.set(node.id, node); } },
  };
  globalThis.io = () => socket;
  globalThis.setTimeout = (fn, delay, ...args) => {
    const handle = timer(fn, delay === 15000 ? 5 : delay, ...args);
    if (delay > 1000 && delay !== 15000) handle.unref();
    return handle;
  };
  try {
    await import("../src/renderer/js/views/screens/cast-view.js");
    events.emit("auth:ready");
    const first = share.listeners.click({ currentTarget: share });
    await share.listeners.click({ currentTarget: share });
    await first;
    assert.equal(socket.joins, 1);
    assert.equal(socket.disconnects, 1);
    assert.equal(socket.connected, true);
    assert.equal(share.disabled, false);
    socket.connected = false;
    await share.listeners.click({ currentTarget: share });
    assert.equal(socket.joins, 1);
    socket.connected = true;
    let confirmations = 0;
    globalThis.confirm = () => { confirmations++; return false; };
    socket.mode = "race";
    await share.listeners.click({ currentTarget: share });
    assert.equal(confirmations, 1);
    assert.equal(socket.replacements, 0);
    assert.equal(share.disabled, false);

    globalThis.confirm = () => { confirmations++; return true; };
    await share.listeners.click({ currentTarget: share });
    assert.equal(confirmations, 2);
    assert.equal(socket.replacements, 1);
    emit("force-disconnect");
    socket.mode = "already-active";
    await share.listeners.click({ currentTarget: share });
    assert.equal(confirmations, 3);
    assert.equal(socket.replacements, 2);
    events.emit("auth:logout");
    await new Promise((resolve) => timer(resolve, 350));
  } finally {
    globalThis.setTimeout = timer;
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.io;
    delete globalThis.confirm;
  }
});

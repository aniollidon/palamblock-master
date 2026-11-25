import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { SocketManager } from "../src/renderer/js/core/socket.js";
import { attachAdminSocket, on, detachAdminSocket, clearState } from "../src/renderer/js/core/store.js";

test("una desconnexió temporal conserva la sessió i torna a preparar el socket en reconnectar", () => {
  const socket = new EventEmitter();
  socket.connected = true;
  socket.disconnect = () => {};
  globalThis.window = {};
  globalThis.io = () => socket;
  const events = [];
  const auth = { isAuthenticated: true, authToken: "test", showLogin() { throw new Error("No s'ha de mostrar el login"); } };
  const manager = new SocketManager({ authManager: auth, emitEvent: (name) => events.push(name) });
  manager.createSocket("http://localhost", { username: "test", token: "test" });
  socket.emit("connect");
  socket.connected = false;
  socket.emit("disconnect", "transport close");
  assert.equal(auth.isAuthenticated, true);
  socket.connected = true;
  socket.emit("connect");
  assert.deepEqual(events, ["socket:ready", "socket:disconnected", "socket:ready"]);
  manager.disconnectSocket();
  detachAdminSocket();
  clearState();
  delete globalThis.window;
  delete globalThis.io;
});

test("el replay no substitueix una actualització més recent ni sobreviu a una neteja", async () => {
  const socket = new EventEmitter();
  attachAdminSocket(socket);
  socket.emit("grupAlumnesList", { anterior: {} });
  const received = [];
  const unsubscribe = on("grupAlumnesList", value => received.push(Object.keys(value)[0]));
  socket.emit("grupAlumnesList", { actual: {} });
  await Promise.resolve();
  assert.deepEqual(received, ["actual"]);
  const stale = [];
  const unsubscribeStale = on("grupAlumnesList", value => stale.push(value));
  clearState();
  await Promise.resolve();
  assert.deepEqual(stale, []);
  unsubscribe();
  unsubscribeStale();
  detachAdminSocket();
});

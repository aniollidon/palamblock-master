import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { socketRequest } from "../src/renderer/js/utils/socket-request.js";

class FakeSocket extends EventEmitter {
  connected = true;
  calls = [];

  emit(event, ...args) {
    if (event === "disconnect") return super.emit(event, ...args);
    this.calls.push({ event, data: args[0], ack: args[1] });
    return true;
  }
}

test("no envia ordres desconnectat i no les posa en cua", async () => {
  const socket = new FakeSocket();
  socket.connected = false;
  await assert.rejects(socketRequest(socket, "action", {}), /connexió/);
  assert.equal(socket.calls.length, 0);
});

test("retorna la resposta o mostra el rebuig del servidor", async () => {
  const socket = new FakeSocket();
  const first = socketRequest(socket, "action", { id: 1 });
  socket.calls[0].ack({ status: "OK", data: 1 });
  assert.equal((await first).data, 1);
  const second = socketRequest(socket, "action", {});
  socket.calls[1].ack({ status: "ERROR", error: "Accés denegat" });
  await assert.rejects(second, /Accés denegat/);
  assert.equal(socket.listenerCount("disconnect"), 0);
});

test("una desconnexió o timeout informa del resultat desconegut i ignora respostes tardanes", async () => {
  const socket = new FakeSocket();
  const disconnected = socketRequest(socket, "action", {}, 100);
  socket.emit("disconnect");
  await assert.rejects(disconnected, /resultat.*desconegut/);
  socket.calls[0].ack({ status: "OK" });
  const timedOut = socketRequest(socket, "action", {}, 5);
  await assert.rejects(timedOut, /resultat.*desconegut/);
  socket.calls[1].ack({ status: "OK" });
  assert.equal(socket.listenerCount("disconnect"), 0);
  assert.equal(socket.calls.length, 2);
});

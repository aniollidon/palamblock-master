import test from "node:test";
import assert from "node:assert/strict";

test("l'historial només accepta la consulta actual, incloent canvis d'alumne i de cerca", async () => {
  const calls = [];
  const socket = { connected: true, emit: (name, data) => calls.push({ name, data }), on() {} };
  const events = new EventTarget();
  globalThis.window = {
    app: { container: { get: () => ({ getSocket: () => socket }) } },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
  };
  const nodes = new Map();
  const node = () => ({
    value: "", innerHTML: "",
    classList: { add() {}, remove() {}, contains: () => true },
    getAttribute(name) { return this[name]; },
    setAttribute(name, value) { this[name] = value; },
    focus() {},
  });
  for (const id of [
    "historialSidebar", "historialSidebar-allTab", "historialSidebar-statsTab",
    "historialSidebar-sortedTab", "historialSidebar-searchTab", "historialSidebarContent",
    "historialGraphSidebarContent", "historialSortedSidebarContent",
    "historialSearchSidebarContent", "historialSearchResults", "historialSearchInput",
  ]) nodes.set(id, node());
  globalThis.document = { getElementById: id => nodes.get(id) || null };
  try {
    const { initHistorialSidebar, isCurrentHistorialResponse, invalidateHistorialRequests } =
      await import("../src/renderer/js/views/browsers/historial-view.js");
    const sidebar = nodes.get("historialSidebar");
    sidebar.setAttribute("data-alumne", "anna");
    initHistorialSidebar("anna");
    nodes.get("historialSidebar-allTab").onclick();
    const first = calls.at(-1).data;
    sidebar.setAttribute("data-alumne", "berta");
    initHistorialSidebar("berta");
    nodes.get("historialSidebar-allTab").onclick();
    const second = calls.at(-1).data;
    assert.equal(isCurrentHistorialResponse({ alumne: "berta", requestId: second.requestId }, "getHistorialWeb"), true);
    assert.equal(isCurrentHistorialResponse({ alumne: "anna", requestId: first.requestId }, "getHistorialWeb"), false);

    nodes.get("historialSidebar-searchTab").onclick();
    const input = nodes.get("historialSearchInput");
    input.value = "primer";
    input.onchange();
    const older = calls.at(-1).data;
    input.value = "segon";
    input.oninput();
    input.onchange();
    const latest = calls.at(-1).data;
    assert.equal(isCurrentHistorialResponse({ alumne: "berta", requestId: older.requestId }, "getSearchHistorialWeb"), false);
    assert.equal(isCurrentHistorialResponse({ alumne: "berta", requestId: latest.requestId }, "getSearchHistorialWeb"), true);
    invalidateHistorialRequests();
    assert.equal(isCurrentHistorialResponse({ alumne: "berta", requestId: latest.requestId }, "getSearchHistorialWeb"), false);
    await new Promise(resolve => setTimeout(resolve, 550));
  } finally {
    delete globalThis.window;
    delete globalThis.document;
  }
});

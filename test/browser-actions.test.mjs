import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

test("els clics de tancar demanen l'acció sense eliminar la pestanya localment", async () => {
  const source = await readFile(new URL("../src/renderer/js/views/browsers/tabs.js", import.meta.url), "utf8");
  const window = { addEventListener() {} };
  runInNewContext(source, { window, document: { querySelector: () => null } });
  const handlers = {};
  const tab = { querySelector: () => ({ addEventListener: (name, fn) => { handlers[name] = fn; } }) };
  const requests = [];
  const tabs = { emit: (name, detail) => requests.push([name, detail.tabEl]) };
  window.ChromeTabs.prototype.setTabCloseEventListener.call(tabs, tab);
  window.ChromeTabs.prototype.setTabMiddleClickEventListener.call(tabs, tab);
  handlers.click({});
  handlers.mouseup({ button: 1 });
  assert.deepEqual(requests.map(([name]) => name), ["tabCloseRequest", "tabCloseRequest"]);
  assert.ok(requests.every(([, element]) => element === tab));
});

test("les actualitzacions de grup repinten l'estat dels alumnes existents", async () => {
  const events = new EventTarget();
  const socket = { connected: true, emit() {}, on() {} };
  globalThis.window = {
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    app: { container: { get: () => ({ getSocket: () => socket }) } },
    authManager: { isSuperAdmin: () => true },
    location: { search: "" },
  };
  globalThis.localStorage = { getItem: () => null };
  const classes = new Set();
  const status = {
    classList: { add: name => classes.add(name), remove: name => classes.delete(name) },
    innerHTML: "", disabled: false,
  };
  const nodes = {
    alumnesList: {},
    grupSelector: { appendChild() {} },
    "anna-container": { style: {} },
    "anna-header": { querySelector: () => ({ textContent: "" }) },
    "anna-status-button-main": status,
  };
  globalThis.document = {
    getElementById: id => nodes[id] || null,
    createElement: () => ({ setAttribute() {} }),
  };
  try {
    const { preparaAlumnesGrups, drawAlumnesActivity } =
      await import("../src/renderer/js/views/browsers/browsers-logic.js");
    const groups = state => ({ classe: { status: "RuleOn", alumnes: { anna: { status: state } } } });
    preparaAlumnesGrups(groups("RuleOn"));
    drawAlumnesActivity({});
    assert.equal(status.innerHTML, "Filtre actiu");
    preparaAlumnesGrups(groups("Blocked"));
    drawAlumnesActivity({});
    assert.equal(status.innerHTML, "Bloquejat");
    assert.ok(classes.has("btn-danger"));
    await new Promise(resolve => setTimeout(resolve, 550));
  } finally {
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.localStorage;
  }
});

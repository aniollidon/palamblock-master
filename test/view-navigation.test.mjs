import test from "node:test";
import assert from "node:assert/strict";
import { ViewManager } from "../src/renderer/js/core/view-manager.js";

test("una plantilla lenta no substitueix una navegació posterior", async () => {
  const main = { innerHTML: "" };
  globalThis.document = {
    title: "",
    addEventListener() {},
    getElementById: () => main,
    querySelector: () => main,
  };
  const events = [];
  const manager = new ViewManager({ emitEvent: (_, detail) => events.push(detail.view) });
  let release;
  let started;
  const loading = new Promise((resolve) => { started = resolve; });
  manager.loadTemplate = async (path) => {
    if (path.includes("browsers")) {
      started();
      await new Promise((resolve) => { release = resolve; });
    }
    return path;
  };
  manager.initializeView = async () => { manager.currentInstance = { destroy() {} }; };
  const first = manager.loadView("browsers");
  await loading;
  const second = manager.loadView("screens");
  release();
  await Promise.all([first, second]);
  assert.equal(main.innerHTML, "views/screens.html");
  assert.equal(manager.currentView, "screens");
  assert.deepEqual(events, ["screens"]);
  delete globalThis.document;
});

import test from "node:test";
import assert from "node:assert/strict";
import { createGridZoom } from "../src/renderer/js/views/screens/grid-zoom.mjs";

function grid() {
  const styles = new Map();
  const listeners = new Map();
  return {
    styles,
    listeners,
    style: { setProperty: (name, value) => styles.set(name, value) },
    addEventListener: (type, handler, options) => listeners.set(type, { handler, options }),
    removeEventListener: (type, handler) => {
      if (listeners.get(type)?.handler === handler) listeners.delete(type);
    },
  };
}

function wheel(target, deltaY, ctrlKey = true) {
  const event = { deltaY, ctrlKey, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
  target.listeners.get("wheel").handler(event);
  return event;
}

test("Ctrl i rodeta ajusten la mida i preserven l'scroll normal", () => {
  const element = grid();
  const zoom = createGridZoom();
  zoom.attach(element);
  assert.equal(element.styles.get("--grid-card-width"), "300px");
  assert.equal(element.listeners.get("wheel").options.passive, false);
  assert.equal(wheel(element, -1, false).defaultPrevented, false);
  assert.equal(wheel(element, 0).defaultPrevented, false);
  assert.equal(element.styles.get("--grid-card-width"), "300px");
  assert.equal(wheel(element, -1).defaultPrevented, true);
  assert.equal(element.styles.get("--grid-card-width"), "330px");
  assert.equal(element.styles.get("--grid-card-zoom"), "1.1");
  wheel(element, 1);
  assert.equal(element.styles.get("--grid-card-width"), "300px");
});

test("s'apliquen els límits de 150 i 700 píxels", () => {
  const element = grid();
  createGridZoom().attach(element);
  for (let i = 0; i < 20; i++) wheel(element, 1);
  assert.equal(element.styles.get("--grid-card-width"), "150px");
  assert.equal(element.styles.get("--grid-card-zoom"), "0.5");
  assert.equal(wheel(element, 1).defaultPrevented, true);
  for (let i = 0; i < 30; i++) wheel(element, -1);
  assert.equal(element.styles.get("--grid-card-width"), "700px");
  assert.equal(Number(element.styles.get("--grid-card-zoom")), 700 / 300);
  assert.equal(wheel(element, -1).defaultPrevented, true);
});

test("les graelles són independents i la mida sobreviu al desmuntatge", () => {
  const live = grid();
  const history = grid();
  const replacement = grid();
  const liveZoom = createGridZoom();
  const historyZoom = createGridZoom();
  liveZoom.attach(live);
  historyZoom.attach(history);
  wheel(live, -1);
  wheel(history, 1);
  assert.equal(live.styles.get("--grid-card-width"), "330px");
  assert.equal(history.styles.get("--grid-card-width"), "270px");
  liveZoom.attach(live);
  assert.equal(live.listeners.size, 1);
  liveZoom.detach();
  assert.equal(live.listeners.size, 0);
  liveZoom.attach(replacement);
  assert.equal(replacement.styles.get("--grid-card-width"), "330px");
  liveZoom.attach(live);
  assert.equal(replacement.listeners.size, 0);
  assert.equal(live.styles.get("--grid-card-width"), "330px");
});

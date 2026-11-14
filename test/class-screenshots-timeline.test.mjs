import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMachineTimelines,
  findRecentCapture,
  CAPTURE_MARGIN_MS,
  TIMELINE_STEP_MS,
} from "../src/renderer/js/views/screens/class-screenshots-timeline.mjs";

const start = Date.parse("2026-01-01T09:00:00.000Z");
function image(alumne, machineId, offset, sessionId = "legacy") {
  return {
    alumne,
    machineId,
    sessionId,
    timestamp: new Date(start + offset).toISOString(),
    url: `/${alumne}/${machineId}/${sessionId}/${offset}`,
  };
}

test("agrupa per alumne i màquina, ordena i conserva totes les sessions originals", () => {
  const first = image("anna", "pc1", 0);
  const second = image("anna", "pc1", 10_000, "examen");
  const timelines = buildMachineTimelines([
    image("anna", "pc2", 0),
    second,
    image("bruna", "pc1", 0),
    first,
  ]);
  assert.deepEqual(timelines.map(({ alumne, machineId }) => [alumne, machineId]), [
    ["anna", "pc1"], ["anna", "pc2"], ["bruna", "pc1"],
  ]);
  assert.deepEqual(timelines[0].captures.map(({ image: capture }) => capture), [first, second]);
  assert.deepEqual(buildMachineTimelines([]), []);
  assert.throws(() => buildMachineTimelines([{ ...first, timestamp: "invalid" }]), /Data de captura invàlida/);
});

test("mostra l'última captura anterior dins dels 30 segons, inclosos els límits", () => {
  const first = image("anna", "pc", 0);
  const next = image("anna", "pc", 60_000);
  const [{ captures }] = buildMachineTimelines([next, first]);
  assert.equal(CAPTURE_MARGIN_MS, 30_000);
  assert.equal(TIMELINE_STEP_MS, 30_000);
  assert.equal(findRecentCapture(captures, start - 1), null);
  assert.equal(findRecentCapture(captures, start), first);
  assert.equal(findRecentCapture(captures, start + 30_000), first);
  assert.equal(findRecentCapture(captures, start + 30_001), null);
  assert.equal(findRecentCapture(captures, start + 59_999), null);
  assert.equal(findRecentCapture(captures, start + 60_000), next);
  assert.equal(findRecentCapture([], start), null);
});

test("cada màquina es consulta independentment i mai no es mostra una captura futura", () => {
  const a = image("anna", "a", 0);
  const b = image("bruna", "b", 20_000);
  const timelines = buildMachineTimelines([a, b]);
  assert.deepEqual(timelines.map(({ captures }) => findRecentCapture(captures, start + 10_000)), [a, null]);
  assert.deepEqual(timelines.map(({ captures }) => findRecentCapture(captures, start + 31_000)), [null, b]);
});

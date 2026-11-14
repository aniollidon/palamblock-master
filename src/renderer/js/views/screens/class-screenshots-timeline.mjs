export const CAPTURE_MARGIN_MS = 30_000;
export const TIMELINE_STEP_MS = 30_000;

export function buildMachineTimelines(images) {
  const students = new Map();
  for (const image of images) {
    let machines = students.get(image.alumne);
    if (!machines) {
      machines = new Map();
      students.set(image.alumne, machines);
    }
    let machine = machines.get(image.machineId);
    if (!machine) {
      machine = { alumne: image.alumne, machineId: image.machineId, captures: [] };
      machines.set(image.machineId, machine);
    }
    const time = Date.parse(image.timestamp);
    if (!Number.isFinite(time)) throw new Error(`Data de captura invàlida: ${image.timestamp}`);
    machine.captures.push({ image, time });
  }
  const timelines = [...students.values()].flatMap(machines => [...machines.values()]);
  for (const timeline of timelines) {
    timeline.captures.sort((a, b) => a.time - b.time);
  }
  return timelines.sort((a, b) =>
    a.alumne.localeCompare(b.alumne, "ca") || a.machineId.localeCompare(b.machineId, "ca")
  );
}

export function findRecentCapture(captures, time, margin = CAPTURE_MARGIN_MS) {
  let low = 0;
  let high = captures.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (captures[middle].time <= time) low = middle + 1;
    else high = middle;
  }
  const capture = captures[low - 1];
  return capture && time - capture.time <= margin ? capture.image : null;
}

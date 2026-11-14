const MIN_WIDTH = 150;
const MAX_WIDTH = 700;
const DEFAULT_WIDTH = 300;
const STEP = 30;

export function createGridZoom() {
  let width = DEFAULT_WIDTH;
  let element = null;

  function applyWidth() {
    element.style.setProperty("--grid-card-width", `${width}px`);
    element.style.setProperty("--grid-card-zoom", String(width / DEFAULT_WIDTH));
  }

  function onWheel(event) {
    if (!event.ctrlKey || event.deltaY === 0) return;
    event.preventDefault();
    width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width + (event.deltaY < 0 ? STEP : -STEP)));
    applyWidth();
  }

  return {
    attach(grid) {
      if (element === grid) return;
      if (element) element.removeEventListener("wheel", onWheel);
      element = grid;
      applyWidth();
      element.addEventListener("wheel", onWheel, { passive: false });
    },
    detach() {
      if (!element) return;
      element.removeEventListener("wheel", onWheel);
      element = null;
    },
  };
}

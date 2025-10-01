// Home view interactions: 7-click "super" activation with progressive feedback
import { isSuperUser } from "./utils.js";

let cleanup = null;

export function mountHomeView() {
  const logo = document.querySelector(".home-logo");
  if (!logo) return;

  // Ensure hint container exists under the header block
  let headerBlock = logo.closest(".text-center");
  if (!headerBlock)
    headerBlock = document.querySelector(".home-wrapper .text-center");
  let hint = document.getElementById("homeSuperHint");
  if (!hint) {
    hint = document.createElement("div");
    hint.id = "homeSuperHint";
    hint.className = "small mt-2 text-muted";
    // Insert after the subtitle if present, else append to header
    const subtitle = headerBlock?.querySelector("p");
    if (subtitle && subtitle.parentElement) {
      subtitle.parentElement.insertBefore(hint, subtitle.nextSibling);
    } else if (headerBlock) {
      headerBlock.appendChild(hint);
    }
  }

  // If already super, show a subtle active hint
  const showActive = () => {
    hint.textContent = "Mode super actiu";
    hint.classList.remove("text-muted", "text-info");
    hint.classList.add("text-success", "fw-semibold");
  };
  if (isSuperUser()) {
    showActive();
  } else {
    hint.textContent = "";
    hint.className = "small mt-2 text-muted";
  }

  // Click logic
  const REQUIRED = 7;
  let clicks = 0;
  let resetTimer = null;

  const reset = () => {
    clicks = 0;
    if (!isSuperUser()) {
      hint.textContent = "";
      hint.className = "small mt-2 text-muted";
    }
  };

  const onClick = () => {
    // If already super, keep showing active state
    if (isSuperUser()) {
      showActive();
      return;
    }

    clicks += 1;
    clearTimeout(resetTimer);
    // Reset if no further clicks within 2s
    resetTimer = setTimeout(reset, 2000);

    const remaining = Math.max(0, REQUIRED - clicks);
    if (remaining > 0 && remaining <= 3) {
      hint.textContent =
        remaining === 1
          ? "Un clic més per esdevenir super"
          : `Falten ${remaining} clics per esdevenir super`;
      hint.classList.remove("text-muted", "text-success", "fw-semibold");
      hint.classList.add("text-info");
    }

    if (clicks >= REQUIRED) {
      try {
        sessionStorage.setItem("pbk:super", "1");
      } catch (_) {}
      showActive();
      clearTimeout(resetTimer);
    }
  };

  logo.addEventListener("click", onClick);

  cleanup = () => {
    clearTimeout(resetTimer);
    logo.removeEventListener("click", onClick);
  };
}

export function unmountHomeView() {
  if (typeof cleanup === "function") {
    try {
      cleanup();
    } catch (_) {}
  }
  cleanup = null;
}

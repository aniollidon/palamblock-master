export function createCaptureImageLoader({ resolveUrl, isCurrent, createImage = () => new Image() }) {
  const requests = new WeakMap();

  function invalidate(element) {
    requests.set(element, (requests.get(element) || 0) + 1);
  }

  function load(element, image, { onLoading, onDisplayed, onError } = {}) {
    invalidate(element);
    const request = requests.get(element);
    const current = () => requests.get(element) === request && isCurrent(image);

    if (!image._archiveId) {
      element.src = resolveUrl(image);
      onDisplayed?.();
      return;
    }

    onLoading?.();
    Promise.resolve()
      .then(() => resolveUrl(image))
      .then(url => {
        if (!current()) return;
        const preview = createImage();
        preview.onload = () => {
          if (!current()) return;
          element.src = url;
          onDisplayed?.();
        };
        preview.onerror = () => {
          if (current()) onError?.(new Error("No s'ha pogut descodificar la captura"));
        };
        preview.src = url;
      })
      .catch(error => {
        if (current()) onError?.(error);
      });
  }

  return { load, invalidate };
}

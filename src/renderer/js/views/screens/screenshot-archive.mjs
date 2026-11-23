const opened = new Map();
let viewingArchive = false;
let owner = null;

export function setArchiveViewing(active) {
  const wasViewing = viewingArchive;
  viewingArchive = active;
  if (wasViewing && !active && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('screenshot-archive-view-closed'));
  }
}

export function rememberArchive(archive, username) {
  if (username) owner = username;
  const session = {
    ...archive.session,
    _archiveId: archive.id,
    _archiveName: archive.name,
    images: archive.session.images.map(image => ({ ...image, _archiveId: archive.id })),
  };
  opened.set(archive.id, session);
  return session;
}

export function localSessions(groupId) {
  return [...opened.values()].filter(session => session.groupId === groupId);
}

export async function screenshotUrl(image, baseUrl) {
  if (!image._archiveId) return baseUrl + image.url;
  return window.electronAPI.screenshotArchiveImage(image._archiveId, image.archivePath);
}

export function localStudentData(session, alumne) {
  const machines = Object.create(null);
  for (const image of session.images.filter(item => item.alumne === alumne)) {
    const machine = machines[image.machineId] ||= { sessions: [] };
    let individual = machine.sessions.find(item => item.sessionId === image.sessionId);
    if (!individual) {
      const metadata = session.sessions.find(item =>
        item.alumne === alumne && item.machineId === image.machineId && item.sessionId === image.sessionId
      ) || {};
      individual = { ...metadata, sessionId: image.sessionId, images: [], imageCount: 0 };
      machine.sessions.push(individual);
    }
    individual.images.push(image);
    individual.imageCount++;
  }
  return { alumne, machines };
}

if (typeof window !== 'undefined') {
  window.addEventListener('auth:login-request', event => {
    if (viewingArchive) event.preventDefault();
  });
  const clear = () => {
    opened.clear();
    owner = null;
    viewingArchive = false;
    window.electronAPI.clearScreenshotArchives().catch(error => {
      console.error('[SCREENSHOT_ARCHIVE] Error netejant còpies:', error);
    });
  };
  window.addEventListener('auth:logout', clear);
  window.addEventListener('auth:ready', event => {
    if (owner && event.detail?.credentials?.username !== owner) clear();
  });
}

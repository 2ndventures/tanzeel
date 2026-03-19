type Listener = (active: boolean) => void;

let isActive = false;
const listeners = new Set<Listener>();

export function setDownloadActive(active: boolean) {
  isActive = active;
  listeners.forEach(fn => fn(isActive));
}

export function getDownloadActive(): boolean {
  return isActive;
}

export function subscribeDownloadState(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

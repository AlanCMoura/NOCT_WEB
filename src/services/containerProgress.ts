export type ContainerStatus = 'Não inicializado' | 'Parcial' | 'Completo';

export interface ContainerProgress {
  images: number;
  complete: boolean;
}

const STORAGE_KEY = 'containerProgress';

function readStore(): Record<string, ContainerProgress> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, ContainerProgress>) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, ContainerProgress>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getProgress(containerId: string | undefined): ContainerProgress {
  if (!containerId) return { images: 0, complete: false };
  const store = readStore();
  return store[containerId] ?? { images: 0, complete: false };
}

export function setImages(containerId: string, images: number): void {
  const store = readStore();
  const prev = store[containerId] ?? { images: 0, complete: false };
  store[containerId] = { ...prev, images: Math.max(0, images) };
  writeStore(store);
}

export function setComplete(containerId: string, complete: boolean): void {
  const store = readStore();
  const prev = store[containerId] ?? { images: 0, complete: false };
  store[containerId] = { ...prev, complete };
  writeStore(store);
}

export function computeStatus(progress: ContainerProgress): ContainerStatus {
  if (progress.complete) return 'Completo';
  if (progress.images > 0) return 'Parcial';
  return 'Não inicializado';
}

export function statusWeight(status: ContainerStatus): number {
  switch (status) {
    case 'Não inicializado':
      return 0;
    case 'Parcial':
      return 1;
    case 'Completo':
      return 2;
    default:
      return 0;
  }
}


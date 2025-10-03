export type OperationStatus = 'Aberta' | 'Fechada';

const STORAGE_KEY = 'operationStatus';

function readStore(): Record<string, OperationStatus> {
  if (typeof localStorage === 'undefined') {
    return {};
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, OperationStatus>) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, OperationStatus>): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getOperationStatus(operationId: string | undefined): OperationStatus | undefined {
  if (!operationId) {
    return undefined;
  }
  const store = readStore();
  return store[operationId];
}

export function setOperationStatus(operationId: string, status: OperationStatus): void {
  if (!operationId) {
    return;
  }
  const store = readStore();
  store[operationId] = status;
  writeStore(store);
}

export function clearOperationStatus(operationId: string): void {
  const store = readStore();
  if (store[operationId]) {
    delete store[operationId];
    writeStore(store);
  }
}

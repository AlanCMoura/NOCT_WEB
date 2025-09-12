export const OPERATION_CONTAINER_COUNTS: Record<string, number> = {
  'AMV-12345/25': 28,
  'AMV-12346/25': 34,
  'AMV-12344/25': 22,
  'AMV-12343/25': 40,
  'AMV-12342/25': 24,
  'AMV-12341/25': 31,
};

export const containerCountFor = (operationId: string | undefined): number => {
  if (!operationId) return 22;
  const n = OPERATION_CONTAINER_COUNTS[operationId];
  if (typeof n === 'number') return n;
  // fallback entre 20 e 40
  return 22;
};


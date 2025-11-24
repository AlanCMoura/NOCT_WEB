export const OPERATION_CONTAINER_COUNTS: Record<string, number> = {
  'CTV-12345/25': 28,
  'CTV-12346/25': 34,
  'CTV-12344/25': 22,
  'CTV-12343/25': 40,
  'CTV-12342/25': 24,
  'CTV-12341/25': 31,
};

export const containerCountFor = (operationId: string | undefined): number => {
  if (!operationId) return 22;
  const n = OPERATION_CONTAINER_COUNTS[operationId];
  if (typeof n === 'number') return n;
  // fallback entre 20 e 40
  return 22;
};


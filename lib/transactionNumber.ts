export function formatTransactionNumber(id: number): string {
  return `TX-${String(id).padStart(6, '0')}`;
}

export function normalizeTransactionNumber(value: unknown): string {
  return String(value || '').trim();
}

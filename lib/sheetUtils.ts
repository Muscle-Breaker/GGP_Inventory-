export function normalizeSheetRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/^\uFEFF/, '').replace(/\u200B/g, '').trim(),
      value,
    ])
  );
}

export function getSheetValue(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

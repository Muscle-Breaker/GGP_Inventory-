/**
 * Excel 시리얼 날짜 또는 각종 형식 → YYYY-MM-DD 문자열로 변환
 * Excel은 날짜를 숫자(시리얼)로 저장: 1900-01-01 = 1, 2026-01-01 ≈ 45658
 */
export function toDateStr(value: unknown, fallback?: string): string {
  const today = new Date().toISOString().split('T')[0];
  const def = fallback ?? today;

  if (value === null || value === undefined || value === '') return def;

  // 이미 YYYY-MM-DD 형식인 문자열
  if (typeof value === 'string') {
    const s = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    // 다른 문자열 날짜 파싱 시도
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    // 숫자 형태 문자열일 수도 있음 ("46101")
    const n = Number(s);
    if (!isNaN(n) && n > 40000) return excelSerialToDate(n);
    return def;
  }

  // 숫자 (Excel 시리얼 또는 Unix ms)
  if (typeof value === 'number') {
    if (value > 40000 && value < 100000) return excelSerialToDate(value);
    if (value > 1_000_000_000_000) {
      // Unix timestamp ms
      return new Date(value).toISOString().split('T')[0];
    }
  }

  return def;
}

function excelSerialToDate(serial: number): string {
  // Excel 기준일: 1899-12-30 (윤년 버그 보정)
  const ms = (serial - 25569) * 86400 * 1000;
  return new Date(ms).toISOString().split('T')[0];
}

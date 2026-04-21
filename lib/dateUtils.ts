/**
 * Excel 시리얼 날짜 또는 각종 형식 → YYYY-MM-DD 문자열로 변환
 * Excel은 날짜를 숫자(시리얼)로 저장: 1900-01-01 = 1, 2026-01-01 ≈ 45658
 */
export function toDateStr(value: unknown, fallback?: string): string {
  const today = new Date().toISOString().split('T')[0];
  const def = fallback ?? today;

  if (value === null || value === undefined || value === '') return def;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? def : formatLocalDate(value);
  }

  // 이미 YYYY-MM-DD 형식인 문자열
  if (typeof value === 'string') {
    const s = value.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    if (/^\d{4}[./]\d{1,2}[./]\d{1,2}$/.test(s)) {
      const normalized = s.replace(/[./]/g, '-').split('-');
      const [year, month, day] = normalized.map(part => Number(part));
      if (year && month && day) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    const koreanDateMatch = s.match(/^(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일$/);
    if (koreanDateMatch) {
      const [, year, month, day] = koreanDateMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    // 다른 문자열 날짜 파싱 시도
    const d = new Date(s);
    if (!isNaN(d.getTime())) return formatLocalDate(d);
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
      return formatLocalDate(new Date(value));
    }
  }

  return def;
}

function excelSerialToDate(serial: number): string {
  // Excel 기준일: 1899-12-30 (윤년 버그 보정)
  const ms = (serial - 25569) * 86400 * 1000;
  return formatUtcDate(new Date(ms));
}

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatUtcDate(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

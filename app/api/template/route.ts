import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'products';

  const wb = XLSX.utils.book_new();

  if (type === 'products') {
    const sample = [
      { 상품명: '오버핏 반팔 티셔츠', 영문명: 'Overfit T-shirt', 색상: '화이트', 사이즈: 'M', 품번: 'TS-001-WHT-M', 판매가: 35000, 현재재고: 50 },
      { 상품명: '슬림 데님 팬츠', 영문명: 'Slim Denim Pants', 색상: '블랙', 사이즈: 'L', 품번: 'PT-002-BLK-L', 판매가: 79000, 현재재고: 30 },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    ws['!cols'] = [
      { wch: 25 }, { wch: 25 }, { wch: 10 }, { wch: 8 }, { wch: 18 }, { wch: 10 }, { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, '상품목록');
  } else {
    const sample = [
      { 날짜: '2026-04-17', 제품명: '오버핏 반팔 티셔츠', 색상: '화이트', 사이즈: 'M', 품번: 'TS-001-WHT-M', 수량: 5, 유형: '판매', 경로: '자사몰' },
      { 날짜: '2026-04-15', 제품명: '슬림 데님 팬츠', 색상: '블랙', 사이즈: 'L', 품번: 'PT-002-BLK-L', 수량: 20, 유형: '입고', 경로: '' },
      { 날짜: '2026-04-16', 제품명: '오버핏 반팔 티셔츠', 색상: '화이트', 사이즈: 'M', 품번: 'TS-001-WHT-M', 수량: 1, 유형: '반품', 경로: '' },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    ws['!cols'] = [
      { wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 8 }, { wch: 18 }, { wch: 8 }, { wch: 10 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, '입출고내역');
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `입력양식_${type === 'products' ? '상품목록' : '입출고내역'}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

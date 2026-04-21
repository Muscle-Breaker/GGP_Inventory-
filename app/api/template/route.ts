import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'products';

  const wb = XLSX.utils.book_new();

  if (type === 'products') {
    const sample = [
      { 상품명: '오버핏 반팔 티셔츠', SKU: 'TS-001-WHT-M', 카테고리: '상의', 색상: '화이트', 사이즈: 'M', 판매가: 35000, 원가: 12000, 현재재고: 50 },
      { 상품명: '슬림 데님 팬츠', SKU: 'PT-002-BLK-L', 카테고리: '하의', 색상: '블랙', 사이즈: 'L', 판매가: 79000, 원가: 28000, 현재재고: 30 },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    ws['!cols'] = [
      { wch: 25 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, '상품목록');
  } else {
    const sample = [
      { SKU: 'TS-001-WHT-M', 유형: '판매', 수량: 5, 판매처: '자사몰', 비고: '', 처리일: '2026-04-17', 처리자: '관리자' },
      { SKU: 'PT-002-BLK-L', 유형: '입고', 수량: 20, 판매처: '', 비고: '신규 입고', 처리일: '2026-04-15', 처리자: '관리자' },
      { SKU: 'TS-001-WHT-M', 유형: '반품', 수량: 1, 판매처: '', 비고: '사이즈 불량', 처리일: '2026-04-16', 처리자: '관리자' },
    ];
    const ws = XLSX.utils.json_to_sheet(sample);
    ws['!cols'] = [
      { wch: 18 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 10 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, '재고내역');
  }

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `입력양식_${type === 'products' ? '상품목록' : '재고내역'}.xlsx`;

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}

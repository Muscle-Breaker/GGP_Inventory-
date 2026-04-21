import { NextRequest, NextResponse } from 'next/server';
import { qAll } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';
    const wb = XLSX.utils.book_new();

    if (type === 'all' || type === 'products') {
      const products = await qAll(`SELECT id as 'ID', name as '상품명', sku as 'SKU', category as '카테고리',
        color as '색상', size as '사이즈', sale_price as '판매가', cost_price as '원가',
        current_stock as '현재재고', created_at as '등록일' FROM products ORDER BY id`);
      const ws = XLSX.utils.json_to_sheet(products);
      ws['!cols'] = [{ wch:6 },{ wch:30 },{ wch:15 },{ wch:12 },{ wch:10 },{ wch:10 },{ wch:12 },{ wch:12 },{ wch:10 },{ wch:20 }];
      XLSX.utils.book_append_sheet(wb, ws, '상품목록');
    }

    if (type === 'all' || type === 'inventory') {
      const txs = await qAll(`SELECT t.id as 'ID', p.name as '상품명', p.sku as 'SKU',
        CASE t.type WHEN 'STOCK_IN' THEN '입고' WHEN 'SALE' THEN '판매' WHEN 'RETURN' THEN '반품'
          WHEN 'DISPOSAL' THEN '폐기' WHEN 'OTHER_OUT' THEN '기타출고' END as '유형',
        t.quantity as '수량', t.sales_channel as '판매처', t.note as '비고',
        t.transaction_date as '처리일', t.created_by as '처리자', t.created_at as '등록일시'
        FROM inventory_transactions t JOIN products p ON t.product_id = p.id ORDER BY t.created_at DESC`);
      const ws = XLSX.utils.json_to_sheet(txs);
      ws['!cols'] = [{ wch:6 },{ wch:25 },{ wch:15 },{ wch:10 },{ wch:8 },{ wch:12 },{ wch:20 },{ wch:12 },{ wch:10 },{ wch:20 }];
      XLSX.utils.book_append_sheet(wb, ws, '재고내역');
    }

    if (type === 'all') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      const summary = await qAll(`SELECT p.name as '상품명', p.sku as 'SKU', p.category as '카테고리',
        COALESCE(SUM(CASE WHEN t.type='STOCK_IN' THEN t.quantity ELSE 0 END),0) as '총입고',
        COALESCE(SUM(CASE WHEN t.type='SALE' THEN t.quantity ELSE 0 END),0) as '총판매',
        COALESCE(SUM(CASE WHEN t.type='RETURN' THEN t.quantity ELSE 0 END),0) as '총반품',
        COALESCE(SUM(CASE WHEN t.type='DISPOSAL' THEN t.quantity ELSE 0 END),0) as '총폐기',
        p.current_stock as '현재재고',
        COALESCE(SUM(CASE WHEN t.type='SALE' AND t.transaction_date BETWEEN ? AND ? THEN t.quantity ELSE 0 END),0) as '이번달판매',
        COALESCE(SUM(CASE WHEN t.type='SALE' THEN t.quantity*p.sale_price ELSE 0 END),0) as '총매출'
        FROM products p LEFT JOIN inventory_transactions t ON p.id=t.product_id GROUP BY p.id ORDER BY p.name`,
        [firstDay, lastDay]
      );
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), '재고요약');
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `재고관리_${new Date().toISOString().split('T')[0]}.xlsx`;
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '엑셀 내보내기 실패' }, { status: 500 });
  }
}

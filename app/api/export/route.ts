import { NextRequest, NextResponse } from 'next/server';
import { qAll } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';
    const wb = XLSX.utils.book_new();

    if (type === 'all' || type === 'products') {
      const products = await qAll(`SELECT name as '상품명', COALESCE(english_name,'') as '영문명',
        color as '색상', size as '사이즈', sku as '품번', sale_price as '판매가',
        current_stock as '현재재고' FROM products ORDER BY name`);
      const ws = XLSX.utils.json_to_sheet(products);
      ws['!cols'] = [{ wch:28 },{ wch:28 },{ wch:10 },{ wch:8 },{ wch:18 },{ wch:10 },{ wch:10 }];
      XLSX.utils.book_append_sheet(wb, ws, '상품목록');
    }

    if (type === 'all' || type === 'inventory') {
      const txs = await qAll(`SELECT t.transaction_date as '날짜', p.name as '제품명',
        p.color as '색상', p.size as '사이즈', p.sku as '품번', t.quantity as '수량',
        CASE t.type WHEN 'STOCK_IN' THEN '입고' WHEN 'SALE' THEN '판매' WHEN 'RETURN' THEN '반품'
          WHEN 'DISPOSAL' THEN '폐기' WHEN 'OTHER_OUT' THEN '기타출고' END as '유형',
        t.sales_channel as '경로'
        FROM inventory_transactions t JOIN products p ON t.product_id = p.id ORDER BY t.created_at DESC`);
      const ws = XLSX.utils.json_to_sheet(txs);
      ws['!cols'] = [{ wch:12 },{ wch:25 },{ wch:10 },{ wch:8 },{ wch:18 },{ wch:8 },{ wch:10 },{ wch:12 }];
      XLSX.utils.book_append_sheet(wb, ws, '입출고내역');
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

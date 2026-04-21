import { NextRequest, NextResponse } from 'next/server';
import { qAll, qOne, exec } from '@/lib/db';
import type { Product } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const outOfStock = searchParams.get('outOfStock') === 'true';

    let sql = 'SELECT * FROM products WHERE 1=1';
    const args: (string | number)[] = [];

    if (search) { sql += ' AND (name LIKE ? OR sku LIKE ?)'; args.push(`%${search}%`, `%${search}%`); }
    if (category) { sql += ' AND category = ?'; args.push(category); }
    if (outOfStock) sql += ' AND current_stock = 0';
    sql += ' ORDER BY updated_at DESC';

    const products = await qAll<Product>(sql, args);
    return NextResponse.json(products);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '상품 조회 실패' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, sku, category, color, size, sale_price, cost_price, current_stock, image_url } = await req.json();
    if (!name || !sku) return NextResponse.json({ error: '상품명과 SKU는 필수입니다' }, { status: 400 });

    const result = await exec(
      `INSERT INTO products (name, sku, category, color, size, sale_price, cost_price, current_stock, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, sku, category || '', color || '', size || '', sale_price || 0, cost_price || 0, current_stock || 0, image_url || '']
    );

    if (current_stock > 0) {
      await exec(
        `INSERT INTO inventory_transactions (product_id, type, quantity, note, created_by) VALUES (?, 'STOCK_IN', ?, '초기 재고 등록', '관리자')`,
        [result.lastId, current_stock]
      );
    }

    const product = await qOne<Product>('SELECT * FROM products WHERE id = ?', [result.lastId]);
    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    const e = error as { message?: string };
    if (e.message?.includes('UNIQUE')) return NextResponse.json({ error: 'SKU가 이미 존재합니다' }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: '상품 등록 실패' }, { status: 500 });
  }
}

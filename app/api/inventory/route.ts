import { NextRequest, NextResponse } from 'next/server';
import { qOne, qAll, exec, getDb } from '@/lib/db';
import type { InventoryTransaction } from '@/lib/types';

interface ProductRow { id: number; current_stock: number; }
interface TxRow { id: number; product_id: number; type: string; quantity: number; }

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search    = searchParams.get('search') || '';
    const type      = searchParams.get('type') || '';
    const productId = searchParams.get('productId') || '';
    const dateFrom  = searchParams.get('dateFrom') || '';
    const dateTo    = searchParams.get('dateTo') || '';
    const sort      = searchParams.get('sort') || 'date_desc';   // date_asc | date_desc
    const limit     = parseInt(searchParams.get('limit') || '200');
    const offset    = parseInt(searchParams.get('offset') || '0');

    let sql = `SELECT t.*, p.name as product_name, p.sku as product_sku
               FROM inventory_transactions t JOIN products p ON t.product_id = p.id WHERE 1=1`;
    const args: (string | number)[] = [];

    if (search)    { sql += ' AND (p.name LIKE ? OR p.sku LIKE ?)'; args.push(`%${search}%`, `%${search}%`); }
    if (type)      { sql += ' AND t.type = ?';       args.push(type); }
    if (productId) { sql += ' AND t.product_id = ?'; args.push(productId); }
    if (dateFrom)  { sql += ' AND t.transaction_date >= ?'; args.push(dateFrom); }
    if (dateTo)    { sql += ' AND t.transaction_date <= ?'; args.push(dateTo); }

    const orderBy = sort === 'date_asc' ? 't.transaction_date ASC, t.id ASC' : 't.transaction_date DESC, t.id DESC';
    sql += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const transactions = await qAll<InventoryTransaction>(sql, args);

    let countSql = `SELECT COUNT(*) as n FROM inventory_transactions t JOIN products p ON t.product_id = p.id WHERE 1=1`;
    const countArgs: (string | number)[] = [];
    if (search)    { countSql += ' AND (p.name LIKE ? OR p.sku LIKE ?)'; countArgs.push(`%${search}%`, `%${search}%`); }
    if (type)      { countSql += ' AND t.type = ?';       countArgs.push(type); }
    if (productId) { countSql += ' AND t.product_id = ?'; countArgs.push(productId); }
    if (dateFrom)  { countSql += ' AND t.transaction_date >= ?'; countArgs.push(dateFrom); }
    if (dateTo)    { countSql += ' AND t.transaction_date <= ?'; countArgs.push(dateTo); }

    const countRow = await qOne<{ n: number }>(countSql, countArgs);
    return NextResponse.json({ transactions, total: countRow?.n ?? 0 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '재고 내역 조회 실패' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { product_id, type, quantity, sales_channel, note, transaction_date, created_by } = body;

    if (!product_id || !type || !quantity) return NextResponse.json({ error: '필수 항목을 입력해주세요' }, { status: 400 });
    if (quantity <= 0) return NextResponse.json({ error: '수량은 1 이상이어야 합니다' }, { status: 400 });

    const product = await qOne<ProductRow>('SELECT id, current_stock FROM products WHERE id = ?', [product_id]);
    if (!product) return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 });

    let stockChange = 0;
    if (type === 'STOCK_IN' || type === 'RETURN') {
      stockChange = quantity;
    } else {
      stockChange = -quantity;
      if (product.current_stock < quantity) {
        return NextResponse.json({ error: `재고가 부족합니다 (현재 재고: ${product.current_stock})` }, { status: 400 });
      }
    }

    const db = await getDb();
    const tx = await db.transaction('write');
    let lastId = 0;
    try {
      const r = await tx.execute({
        sql: `INSERT INTO inventory_transactions (product_id, type, quantity, sales_channel, note, transaction_date, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [product_id, type, quantity, sales_channel || '', note || '',
               transaction_date || new Date().toISOString().split('T')[0], created_by || '관리자'],
      });
      lastId = r.lastInsertRowid ? Number(r.lastInsertRowid) : 0;
      await tx.execute({
        sql: 'UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [stockChange, product_id],
      });
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    const transaction = await qOne<InventoryTransaction>(
      `SELECT t.*, p.name as product_name, p.sku as product_sku
       FROM inventory_transactions t JOIN products p ON t.product_id = p.id WHERE t.id = ?`,
      [lastId]
    );
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '재고 등록 실패' }, { status: 500 });
  }
}

// Bulk delete: DELETE /api/inventory  body: { ids: number[] }
export async function DELETE(req: NextRequest) {
  try {
    const { ids } = await req.json() as { ids: number[] };
    if (!ids?.length) return NextResponse.json({ error: 'ids가 필요합니다' }, { status: 400 });

    const placeholders = ids.map(() => '?').join(',');
    const txRows = await qAll<TxRow>(
      `SELECT id, product_id, type, quantity FROM inventory_transactions WHERE id IN (${placeholders})`,
      ids
    );

    const db = await getDb();
    const dbTx = await db.transaction('write');
    try {
      for (const row of txRows) {
        const stockChange = (row.type === 'STOCK_IN' || row.type === 'RETURN') ? -row.quantity : row.quantity;
        await dbTx.execute({ sql: 'DELETE FROM inventory_transactions WHERE id = ?', args: [row.id] });
        await dbTx.execute({
          sql: 'UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          args: [stockChange, row.product_id],
        });
      }
      await dbTx.commit();
    } catch (e) {
      await dbTx.rollback();
      throw e;
    }

    return NextResponse.json({ success: true, deleted: txRows.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '일괄 삭제 실패' }, { status: 500 });
  }
}

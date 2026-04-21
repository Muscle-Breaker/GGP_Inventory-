import { NextRequest, NextResponse } from 'next/server';
import { qOne, getDb } from '@/lib/db';

interface TxRow { product_id: number; type: string; quantity: number; current_stock: number; }

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tx = await qOne<TxRow>(
      `SELECT t.*, p.current_stock FROM inventory_transactions t JOIN products p ON t.product_id = p.id WHERE t.id = ?`,
      [id]
    );
    if (!tx) return NextResponse.json({ error: '내역을 찾을 수 없습니다' }, { status: 404 });

    const stockChange = (tx.type === 'STOCK_IN' || tx.type === 'RETURN') ? -tx.quantity : tx.quantity;

    const db = await getDb();
    const dbTx = await db.transaction('write');
    try {
      await dbTx.execute({ sql: 'DELETE FROM inventory_transactions WHERE id = ?', args: [id] });
      await dbTx.execute({
        sql: 'UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [stockChange, tx.product_id],
      });
      await dbTx.commit();
    } catch (e) {
      await dbTx.rollback();
      throw e;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '내역 삭제 실패' }, { status: 500 });
  }
}

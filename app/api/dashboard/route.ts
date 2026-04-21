import { NextResponse } from 'next/server';
import { qOne, qAll } from '@/lib/db';

export async function GET() {
  try {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [totalP, totalS, outOfS, lowS, monthlySales, monthlyRev, recentTx, lowStock] = await Promise.all([
      qOne<{ n: number }>('SELECT COUNT(*) as n FROM products'),
      qOne<{ n: number }>('SELECT COALESCE(SUM(current_stock), 0) as n FROM products'),
      qOne<{ n: number }>('SELECT COUNT(*) as n FROM products WHERE current_stock = 0'),
      qOne<{ n: number }>('SELECT COUNT(*) as n FROM products WHERE current_stock > 0 AND current_stock <= 5'),
      qOne<{ n: number }>(`SELECT COALESCE(SUM(quantity), 0) as n FROM inventory_transactions WHERE type='SALE' AND transaction_date BETWEEN ? AND ?`, [firstDay, lastDay]),
      qOne<{ n: number }>(`SELECT COALESCE(SUM(t.quantity * p.sale_price), 0) as n FROM inventory_transactions t JOIN products p ON t.product_id = p.id WHERE t.type='SALE' AND t.transaction_date BETWEEN ? AND ?`, [firstDay, lastDay]),
      qAll(`SELECT t.*, p.name as product_name, p.sku as product_sku FROM inventory_transactions t JOIN products p ON t.product_id = p.id ORDER BY t.created_at DESC LIMIT 10`),
      qAll('SELECT * FROM products WHERE current_stock <= 5 ORDER BY current_stock ASC LIMIT 10'),
    ]);

    return NextResponse.json({
      totalProducts: totalP?.n ?? 0,
      totalStock: totalS?.n ?? 0,
      outOfStockCount: outOfS?.n ?? 0,
      lowStockCount: lowS?.n ?? 0,
      monthlySales: monthlySales?.n ?? 0,
      monthlyRevenue: monthlyRev?.n ?? 0,
      recentTransactions: recentTx,
      lowStockProducts: lowStock,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '대시보드 조회 실패' }, { status: 500 });
  }
}

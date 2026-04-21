import { NextResponse } from 'next/server';
import { qAll } from '@/lib/db';

export async function GET() {
  try {
    const [topSellers, highStock, lowTurnover, monthlySales, categoryStats, channelStats] = await Promise.all([
      qAll(`SELECT p.id, p.name, p.sku, p.category, p.sale_price, p.current_stock,
             COALESCE(SUM(CASE WHEN t.type='SALE' THEN t.quantity ELSE 0 END),0) as total_sold,
             COALESCE(SUM(CASE WHEN t.type='SALE' THEN t.quantity*p.sale_price ELSE 0 END),0) as total_revenue
            FROM products p LEFT JOIN inventory_transactions t ON p.id=t.product_id
            GROUP BY p.id ORDER BY total_sold DESC LIMIT 10`),
      qAll('SELECT * FROM products ORDER BY current_stock DESC LIMIT 10'),
      qAll(`SELECT p.id, p.name, p.sku, p.category, p.current_stock,
             COALESCE(SUM(CASE WHEN t.type='SALE' THEN t.quantity ELSE 0 END),0) as total_sold
            FROM products p LEFT JOIN inventory_transactions t ON p.id=t.product_id
            GROUP BY p.id HAVING p.current_stock > 0
            ORDER BY (CAST(total_sold AS REAL)/NULLIF(p.current_stock,0)) ASC LIMIT 10`),
      qAll(`SELECT strftime('%Y-%m', transaction_date) as month,
             SUM(quantity) as total_qty,
             SUM(t.quantity*p.sale_price) as total_revenue
            FROM inventory_transactions t JOIN products p ON t.product_id=p.id
            WHERE t.type='SALE' AND transaction_date >= date('now','-6 months')
            GROUP BY month ORDER BY month ASC`),
      qAll(`SELECT p.category,
             COUNT(*) as product_count,
             SUM(p.current_stock) as total_stock,
             COALESCE(SUM(CASE WHEN t.type='SALE' THEN t.quantity ELSE 0 END),0) as total_sold
            FROM products p LEFT JOIN inventory_transactions t ON p.id=t.product_id
            GROUP BY p.category ORDER BY total_sold DESC`),
      qAll(`SELECT sales_channel,
             SUM(quantity) as total_qty,
             SUM(t.quantity*p.sale_price) as total_revenue,
             COUNT(*) as transaction_count
            FROM inventory_transactions t JOIN products p ON t.product_id=p.id
            WHERE t.type='SALE' AND sales_channel!=''
            GROUP BY sales_channel ORDER BY total_revenue DESC`),
    ]);

    return NextResponse.json({ topSellers, highStock, lowTurnover, monthlySales, categoryStats, channelStats });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '통계 조회 실패' }, { status: 500 });
  }
}

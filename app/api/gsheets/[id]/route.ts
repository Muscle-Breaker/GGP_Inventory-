import { NextRequest, NextResponse } from 'next/server';
import { qOne, exec, qAll } from '@/lib/db';
import { batchWrite } from '@/lib/db';
import type { GoogleSheetConnection } from '@/lib/types';
import { toDateStr } from '@/lib/dateUtils';
import * as XLSX from 'xlsx';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await exec('DELETE FROM google_sheets_connections WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  }
}

// POST = sync
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const conn = await qOne<GoogleSheetConnection>(
      'SELECT * FROM google_sheets_connections WHERE id = ?', [id]
    );
    if (!conn) return NextResponse.json({ error: '연동을 찾을 수 없습니다' }, { status: 404 });

    let csvUrl = conn.url;
    const match = conn.url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && conn.url.includes('docs.google.com')) {
      csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }

    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error('시트에서 데이터를 가져올 수 없습니다. 공유 설정을 확인하세요.');
    const text = await response.text();
    const wb = XLSX.read(text, { type: 'string', cellDates: true });
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: true }) as Record<string, unknown>[];

    let imported = 0;
    let skipped = 0;

    if (conn.import_type === 'products') {
      const stmts = [];
      for (const row of data) {
        const name = String(row['상품명'] || row['name'] || '').trim();
        const sku = String(row['품번'] || row['SKU'] || row['sku'] || '').trim();
        if (!name || !sku) { skipped++; continue; }
        stmts.push({
          sql: `INSERT OR REPLACE INTO products (name, english_name, sku, color, size, sale_price, current_stock)
                VALUES (?,?,?,?,?,?,?)`,
          args: [
            name,
            String(row['영문명'] || ''),
            sku,
            String(row['색상'] || ''),
            String(row['사이즈'] || ''),
            Number(row['판매가'] || 0),
            Number(row['현재재고'] || 0),
          ],
        });
        imported++;
      }
      if (stmts.length > 0) await batchWrite(stmts);
    } else if (conn.import_type === 'inventory') {
      const typeMap: Record<string, string> = {
        '입고': 'STOCK_IN', '판매': 'SALE', '반품': 'RETURN', '폐기': 'DISPOSAL', '기타출고': 'OTHER_OUT',
      };
      for (const row of data) {
        const sku = String(row['품번'] || '').trim();
        const productName = String(row['제품명'] || '').trim();
        const color = String(row['색상'] || '').trim();
        const size = String(row['사이즈'] || '').trim();

        let product: { id: number; current_stock: number } | undefined;
        if (sku) {
          product = await qOne<{ id: number; current_stock: number }>(
            'SELECT id, current_stock FROM products WHERE sku = ?', [sku]
          );
        }
        if (!product && productName) {
          const sql = color || size
            ? 'SELECT id, current_stock FROM products WHERE name = ? AND color = ? AND size = ? LIMIT 1'
            : 'SELECT id, current_stock FROM products WHERE name = ? LIMIT 1';
          const args = color || size ? [productName, color, size] : [productName];
          product = await qOne<{ id: number; current_stock: number }>(sql, args);
        }
        if (!product) { skipped++; continue; }

        const rawType = String(row['유형'] || '');
        const txType = typeMap[rawType] || rawType;
        if (!['STOCK_IN', 'SALE', 'RETURN', 'DISPOSAL', 'OTHER_OUT'].includes(txType)) { skipped++; continue; }

        const qty = Number(row['수량'] || 0);
        if (qty <= 0) { skipped++; continue; }

        const stockChange = (txType === 'STOCK_IN' || txType === 'RETURN') ? qty : -qty;
        await exec(
          `INSERT INTO inventory_transactions (product_id, type, quantity, sales_channel, note, transaction_date, created_by)
           VALUES (?,?,?,?,?,?,?)`,
          [product.id, txType, qty,
           String(row['경로'] || ''),
           '',
           toDateStr(row['날짜']),
           '구글시트']
        );
        await exec(
          'UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [stockChange, product.id]
        );
        imported++;
      }
    }

    await exec(
      `UPDATE google_sheets_connections SET last_synced = CURRENT_TIMESTAMP, last_imported = ?, last_skipped = ? WHERE id = ?`,
      [imported, skipped, id]
    );

    const updated = await qAll<GoogleSheetConnection>(
      'SELECT * FROM google_sheets_connections WHERE id = ?', [id]
    );
    return NextResponse.json({ success: true, imported, skipped, connection: updated[0] });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '동기화 실패';
    console.error(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

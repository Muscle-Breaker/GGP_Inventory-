import { NextRequest, NextResponse } from 'next/server';
import { qOne, exec, batchWrite } from '@/lib/db';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const importType = (formData.get('type') as string) || 'products';
    if (!file) return NextResponse.json({ error: '파일을 업로드해주세요' }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as Record<string, unknown>[];
    if (data.length === 0) return NextResponse.json({ error: '데이터가 없습니다' }, { status: 400 });

    let imported = 0;
    let skipped = 0;

    if (importType === 'products') {
      const stmts = [];
      for (const row of data) {
        const name = String(row['상품명'] || row['name'] || '').trim();
        const sku = String(row['SKU'] || row['sku'] || '').trim();
        if (!name || !sku) { skipped++; continue; }
        stmts.push({
          sql: `INSERT OR REPLACE INTO products (name, sku, category, color, size, sale_price, cost_price, current_stock) VALUES (?,?,?,?,?,?,?,?)`,
          args: [name, sku, String(row['카테고리'] || ''), String(row['색상'] || ''), String(row['사이즈'] || ''),
                 Number(row['판매가'] || 0), Number(row['원가'] || 0), Number(row['현재재고'] || 0)],
        });
        imported++;
      }
      if (stmts.length > 0) await batchWrite(stmts);
    } else if (importType === 'inventory') {
      const typeMap: Record<string, string> = {
        '입고': 'STOCK_IN', '판매': 'SALE', '반품': 'RETURN', '폐기': 'DISPOSAL', '기타출고': 'OTHER_OUT',
      };
      for (const row of data) {
        const sku = String(row['SKU'] || row['sku'] || '').trim();
        const product = await qOne<{ id: number; current_stock: number }>('SELECT id, current_stock FROM products WHERE sku = ?', [sku]);
        if (!product) { skipped++; continue; }

        const rawType = String(row['유형'] || '');
        const txType = typeMap[rawType] || rawType;
        if (!['STOCK_IN', 'SALE', 'RETURN', 'DISPOSAL', 'OTHER_OUT'].includes(txType)) { skipped++; continue; }

        const qty = Number(row['수량'] || 0);
        if (qty <= 0) { skipped++; continue; }

        const stockChange = (txType === 'STOCK_IN' || txType === 'RETURN') ? qty : -qty;
        await exec(
          `INSERT INTO inventory_transactions (product_id, type, quantity, sales_channel, note, transaction_date, created_by) VALUES (?,?,?,?,?,?,?)`,
          [product.id, txType, qty, String(row['판매처'] || ''), String(row['비고'] || ''),
           String(row['처리일'] || new Date().toISOString().split('T')[0]), String(row['처리자'] || '가져오기')]
        );
        await exec('UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [stockChange, product.id]);
        imported++;
      }
    }

    return NextResponse.json({ success: true, imported, skipped });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '파일 가져오기 실패' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { url, importType } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL을 입력해주세요' }, { status: 400 });

    let csvUrl = url;
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && url.includes('docs.google.com')) {
      csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }

    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error('URL에서 데이터를 가져올 수 없습니다');

    const text = await response.text();
    const wb = XLSX.read(text, { type: 'string' });
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as Record<string, unknown>[];

    let imported = 0;
    if (importType === 'products') {
      const stmts = [];
      for (const row of data) {
        const name = String(row['상품명'] || '').trim();
        const sku = String(row['SKU'] || '').trim();
        if (!name || !sku) continue;
        stmts.push({
          sql: `INSERT OR REPLACE INTO products (name, sku, category, color, size, sale_price, cost_price, current_stock) VALUES (?,?,?,?,?,?,?,?)`,
          args: [name, sku, String(row['카테고리'] || ''), String(row['색상'] || ''), String(row['사이즈'] || ''),
                 Number(row['판매가'] || 0), Number(row['원가'] || 0), Number(row['현재재고'] || 0)],
        });
        imported++;
      }
      if (stmts.length > 0) await batchWrite(stmts);
    }

    return NextResponse.json({ success: true, imported, skipped: data.length - imported });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '구글 시트 가져오기 실패' }, { status: 500 });
  }
}

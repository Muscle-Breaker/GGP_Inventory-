import { NextRequest, NextResponse } from 'next/server';
import { qOne, exec } from '@/lib/db';
import type { Product } from '@/lib/types';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const product = await qOne<Product>('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 });
    return NextResponse.json(product);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '상품 조회 실패' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await qOne<Product>('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing) return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 });

    const { name, sku, category, color, size, sale_price, cost_price, image_url } = await req.json();
    await exec(
      `UPDATE products SET name=?, sku=?, category=?, color=?, size=?, sale_price=?, cost_price=?, image_url=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [name, sku, category || '', color || '', size || '', sale_price || 0, cost_price || 0, image_url || '', id]
    );

    const product = await qOne<Product>('SELECT * FROM products WHERE id = ?', [id]);
    return NextResponse.json(product);
  } catch (error: unknown) {
    const e = error as { message?: string };
    if (e.message?.includes('UNIQUE')) return NextResponse.json({ error: 'SKU가 이미 존재합니다' }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: '상품 수정 실패' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const existing = await qOne<Product>('SELECT id FROM products WHERE id = ?', [id]);
    if (!existing) return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 });
    await exec('DELETE FROM products WHERE id = ?', [id]);
    // Also delete related transactions
    await exec('DELETE FROM inventory_transactions WHERE product_id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '상품 삭제 실패' }, { status: 500 });
  }
}

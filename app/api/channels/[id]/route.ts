import { NextRequest, NextResponse } from 'next/server';
import { qOne, exec } from '@/lib/db';
import type { SalesChannel } from '@/lib/types';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, is_active } = await req.json();
    if (name !== undefined) await exec('UPDATE sales_channels SET name = ? WHERE id = ?', [name.trim(), id]);
    if (is_active !== undefined) await exec('UPDATE sales_channels SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id]);
    const channel = await qOne<SalesChannel>('SELECT * FROM sales_channels WHERE id = ?', [id]);
    return NextResponse.json(channel);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '판매처 수정 실패' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await exec('DELETE FROM sales_channels WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '판매처 삭제 실패' }, { status: 500 });
  }
}

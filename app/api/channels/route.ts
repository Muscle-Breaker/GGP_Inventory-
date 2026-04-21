import { NextRequest, NextResponse } from 'next/server';
import { qAll, qOne, exec } from '@/lib/db';
import type { SalesChannel } from '@/lib/types';

export async function GET() {
  try {
    const channels = await qAll<SalesChannel>('SELECT * FROM sales_channels ORDER BY id ASC');
    return NextResponse.json(channels);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '판매처 조회 실패' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: '판매처 이름을 입력해주세요' }, { status: 400 });
    const result = await exec('INSERT INTO sales_channels (name) VALUES (?)', [name.trim()]);
    const channel = await qOne<SalesChannel>('SELECT * FROM sales_channels WHERE id = ?', [result.lastId]);
    return NextResponse.json(channel, { status: 201 });
  } catch (error: unknown) {
    const e = error as { message?: string };
    if (e.message?.includes('UNIQUE')) return NextResponse.json({ error: '이미 존재하는 판매처입니다' }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: '판매처 등록 실패' }, { status: 500 });
  }
}

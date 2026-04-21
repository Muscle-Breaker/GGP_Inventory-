import { NextRequest, NextResponse } from 'next/server';
import { qAll, qOne, exec } from '@/lib/db';

export async function GET() {
  try {
    const categories = await qAll('SELECT * FROM categories ORDER BY name ASC');
    return NextResponse.json(categories);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '카테고리 조회 실패' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: '카테고리 이름을 입력해주세요' }, { status: 400 });
    await exec('INSERT OR IGNORE INTO categories (name) VALUES (?)', [name.trim()]);
    const category = await qOne('SELECT * FROM categories WHERE name = ?', [name.trim()]);
    return NextResponse.json(category);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '카테고리 등록 실패' }, { status: 500 });
  }
}

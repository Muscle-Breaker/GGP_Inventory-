import { NextRequest, NextResponse } from 'next/server';
import { qAll, exec } from '@/lib/db';
import type { GoogleSheetConnection } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope') || '';
    const sql = scope
      ? 'SELECT * FROM google_sheets_connections WHERE scope = ? ORDER BY created_at'
      : 'SELECT * FROM google_sheets_connections ORDER BY created_at';
    const rows = await qAll<GoogleSheetConnection>(sql, scope ? [scope] : []);
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, url, scope, import_type } = await req.json();
    if (!name?.trim() || !url?.trim()) {
      return NextResponse.json({ error: '이름과 URL을 입력해주세요' }, { status: 400 });
    }
    const result = await exec(
      'INSERT INTO google_sheets_connections (name, url, scope, import_type) VALUES (?, ?, ?, ?)',
      [name.trim(), url.trim(), scope, import_type]
    );
    const row = await qAll<GoogleSheetConnection>(
      'SELECT * FROM google_sheets_connections WHERE id = ?', [result.lastId]
    );
    return NextResponse.json(row[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '추가 실패' }, { status: 500 });
  }
}

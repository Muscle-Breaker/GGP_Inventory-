import { createClient, type Client, type InValue } from '@libsql/client';

let _client: Client | null = null;
let _initialized = false;

function getClient(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error('TURSO_DATABASE_URL 환경변수를 설정해주세요');
    _client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

// Convert row to plain object (bigint → number)
function toObj<T>(columns: readonly string[], row: { [key: string]: InValue }): T {
  const obj: Record<string, unknown> = {};
  for (const col of columns) {
    const v = row[col];
    obj[col] = typeof v === 'bigint' ? Number(v) : v;
  }
  return obj as T;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    english_name TEXT DEFAULT '',
    sku TEXT UNIQUE NOT NULL,
    category TEXT DEFAULT '',
    color TEXT DEFAULT '',
    size TEXT DEFAULT '',
    sale_price REAL DEFAULT 0,
    cost_price REAL DEFAULT 0,
    current_stock INTEGER DEFAULT 0,
    image_url TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    sales_channel TEXT DEFAULT '',
    note TEXT DEFAULT '',
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_by TEXT DEFAULT '관리자',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS sales_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS google_sheets_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    scope TEXT NOT NULL,
    import_type TEXT NOT NULL,
    last_synced TEXT,
    last_imported INTEGER DEFAULT 0,
    last_skipped INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
];

export async function getDb(): Promise<Client> {
  const c = getClient();
  if (_initialized) return c;

  for (const sql of SCHEMA) {
    await c.execute(sql);
  }

  // Migrations: add columns that may not exist in older DBs
  const migrations = [
    `ALTER TABLE products ADD COLUMN english_name TEXT DEFAULT ''`,
  ];
  for (const m of migrations) {
    try { await c.execute(m); } catch { /* column already exists */ }
  }

  const { rows: cr } = await c.execute('SELECT COUNT(*) as n FROM sales_channels');
  if (Number(cr[0][0]) === 0) {
    await c.batch(
      ['자사몰', '29cm'].map(name => ({
        sql: 'INSERT OR IGNORE INTO sales_channels (name) VALUES (?)',
        args: [name] as InValue[],
      })),
      'write'
    );
  }

  const { rows: catR } = await c.execute('SELECT COUNT(*) as n FROM categories');
  if (Number(catR[0][0]) === 0) {
    await c.batch(
      ['상의', '하의', '아우터', '원피스/스커트', '신발', '가방', '액세서리'].map(name => ({
        sql: 'INSERT OR IGNORE INTO categories (name) VALUES (?)',
        args: [name] as InValue[],
      })),
      'write'
    );
  }

  _initialized = true;
  return c;
}

export async function qOne<T>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  const c = await getDb();
  const result = await c.execute({ sql, args });
  if (result.rows.length === 0) return undefined;
  return toObj<T>(result.columns, result.rows[0] as { [key: string]: InValue });
}

export async function qAll<T>(sql: string, args: InValue[] = []): Promise<T[]> {
  const c = await getDb();
  const result = await c.execute({ sql, args });
  return result.rows.map(row => toObj<T>(result.columns, row as { [key: string]: InValue }));
}

export async function exec(sql: string, args: InValue[] = []) {
  const c = await getDb();
  const result = await c.execute({ sql, args });
  return {
    lastId: result.lastInsertRowid ? Number(result.lastInsertRowid) : 0,
    affected: result.rowsAffected,
  };
}

export async function batchWrite(statements: { sql: string; args?: InValue[] }[]) {
  const c = await getDb();
  return c.batch(
    statements.map(s => ({ sql: s.sql, args: s.args ?? [] })),
    'write'
  );
}

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowance') as { value: string } | undefined;
  return NextResponse.json({ allowance: parseInt(row?.value || '5000') });
}

export async function POST(req: NextRequest) {
  const { allowance } = await req.json();
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('allowance', String(allowance));
  return NextResponse.json({ allowance });
}

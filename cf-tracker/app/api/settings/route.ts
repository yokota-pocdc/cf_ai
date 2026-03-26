import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function getSetting(key: string, fallback: string): string {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value || fallback;
}

export async function GET() {
  return NextResponse.json({
    allowance: parseInt(getSetting('allowance', '5000')),
    userName: getSetting('userName', ''),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();

  if (body.allowance !== undefined) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('allowance', String(body.allowance));
  }
  if (body.userName !== undefined) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('userName', body.userName);
  }

  return NextResponse.json({
    allowance: parseInt(getSetting('allowance', '5000')),
    userName: getSetting('userName', ''),
  });
}

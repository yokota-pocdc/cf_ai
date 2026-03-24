import { NextRequest, NextResponse } from 'next/server';
import { getDb, Transaction } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // e.g. "2025-04"

  const db = getDb();

  if (month) {
    const rows = db
      .prepare('SELECT * FROM transactions WHERE date LIKE ? ORDER BY date DESC, id DESC')
      .all(`${month}%`) as Transaction[];
    return NextResponse.json(rows);
  }

  const rows = db
    .prepare('SELECT * FROM transactions ORDER BY date DESC, id DESC')
    .all() as Transaction[];
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, amount, description, category, subcategory } = body;

  if (!date || !amount || !description || !category) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const db = getDb();
  const result = db
    .prepare('INSERT INTO transactions (date, amount, description, category, subcategory) VALUES (?, ?, ?, ?, ?)')
    .run(date, amount, description, category, subcategory || null);

  const row = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid) as Transaction;
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  const db = getDb();
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}

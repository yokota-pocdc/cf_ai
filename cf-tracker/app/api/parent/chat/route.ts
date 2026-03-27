import { NextRequest, NextResponse } from 'next/server';
import { getDb, Transaction } from '@/lib/db';

function isAuthed(req: NextRequest): boolean {
  return req.cookies.get('parent_auth')?.value === 'verified';
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const { messages } = await req.json();

  // Build child's data context
  const db = getDb();
  const allTx = db.prepare('SELECT * FROM transactions ORDER BY date ASC').all() as Transaction[];
  const settingsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowance') as { value: string } | undefined;
  const allowance = parseInt(settingsRow?.value || '5000');
  const userNameRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('userName') as { value: string } | undefined;
  const userName = userNameRow?.value || 'お子さん';

  // Monthly summaries
  const monthMap: Record<string, Transaction[]> = {};
  allTx.forEach((tx) => {
    const m = tx.date.slice(0, 7);
    if (!monthMap[m]) monthMap[m] = [];
    monthMap[m].push(tx);
  });

  let dataSummary = '';
  for (const [month, txs] of Object.entries(monthMap)) {
    const total = txs.reduce((s, t) => s + t.amount, 0);
    const invest = txs.filter((t) => t.category === 'invest').reduce((s, t) => s + t.amount, 0);
    const consume = txs.filter((t) => t.category === 'consume').reduce((s, t) => s + t.amount, 0);
    const waste = txs.filter((t) => t.category === 'waste').reduce((s, t) => s + t.amount, 0);
    dataSummary += `\n${month}: ¥${total} (投資${total > 0 ? Math.round(invest / total * 100) : 0}% / 消費${total > 0 ? Math.round(consume / total * 100) : 0}% / 浪費${total > 0 ? Math.round(waste / total * 100) : 0}%)`;
    txs.forEach((t) => {
      dataSummary += `\n  - ${t.date} ${t.description} ¥${t.amount} [${t.category}]`;
      if (t.chat_summary) dataSummary += ` → ${t.chat_summary}`;
    });
  }

  const system = `あなたは子どもの金銭教育の専門家であり、家庭のファイナンシャルアドバイザーです。
保護者からの相談に、お子さんの実際のお小遣いデータをもとに具体的にアドバイスしてください。

【お子さんの情報】
名前: ${userName}
月のお小遣い: ¥${allowance.toLocaleString()}
記録件数: ${allTx.length}件

【お小遣い記録データ（行動文脈付き）】
${dataSummary || 'まだ記録がありません'}

【あなたの対応方針】
- 保護者の悩みや不安に寄り添う
- データに基づいた具体的なアドバイスをする
- 子どもの良い点・成長をまず伝えてから課題に触れる
- 「監視」ではなく「見守り」のスタンスを大切にする
- 親子の会話が豊かになるような声かけの例を提供する
- 浪費を叱るのではなく、自分でコントロールする力を育てる方向でアドバイス
- 具体的なデータ（日付、金額、会話内容）を引用して説得力を持たせる`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system,
        messages,
      }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to call Claude API' }, { status: 500 });
  }
}

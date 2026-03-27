import { NextRequest, NextResponse } from 'next/server';
import { getDb, Transaction } from '@/lib/db';

function isAuthed(req: NextRequest): boolean {
  return req.cookies.get('parent_auth')?.value === 'verified';
}

interface MonthSummary {
  month: string;
  total: number;
  invest: number;
  consume: number;
  waste: number;
  count: number;
  investPct: number;
  consumePct: number;
  wastePct: number;
  remaining: number;
}

// GET: Return monthly summaries for trend chart
export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const allTx = db.prepare('SELECT * FROM transactions ORDER BY date ASC').all() as Transaction[];
  const settingsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowance') as { value: string } | undefined;
  const allowance = parseInt(settingsRow?.value || '5000');

  // Group by month
  const monthMap = new Map<string, Transaction[]>();
  allTx.forEach((tx) => {
    const m = tx.date.slice(0, 7);
    if (!monthMap.has(m)) monthMap.set(m, []);
    monthMap.get(m)!.push(tx);
  });

  const summaries: MonthSummary[] = [];
  for (const [month, txs] of Array.from(monthMap.entries())) {
    const total = txs.reduce((s, t) => s + t.amount, 0);
    const invest = txs.filter((t) => t.category === 'invest').reduce((s, t) => s + t.amount, 0);
    const consume = txs.filter((t) => t.category === 'consume').reduce((s, t) => s + t.amount, 0);
    const waste = txs.filter((t) => t.category === 'waste').reduce((s, t) => s + t.amount, 0);
    summaries.push({
      month,
      total,
      invest,
      consume,
      waste,
      count: txs.length,
      investPct: total > 0 ? Math.round((invest / total) * 100) : 0,
      consumePct: total > 0 ? Math.round((consume / total) * 100) : 0,
      wastePct: total > 0 ? Math.round((waste / total) * 100) : 0,
      remaining: allowance - total,
    });
  }

  return NextResponse.json({ summaries, allowance });
}

// POST: Generate AI multi-month trend report
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const db = getDb();
  const allTx = db.prepare('SELECT * FROM transactions ORDER BY date ASC').all() as Transaction[];
  const settingsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowance') as { value: string } | undefined;
  const allowance = parseInt(settingsRow?.value || '5000');
  const userNameRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('userName') as { value: string } | undefined;
  const userName = userNameRow?.value || 'お子さん';

  if (allTx.length === 0) {
    return NextResponse.json({ report: 'まだ記録がありません。' });
  }

  // Build monthly summaries with behavioral highlights
  const monthMap = new Map<string, Transaction[]>();
  allTx.forEach((tx) => {
    const m = tx.date.slice(0, 7);
    if (!monthMap.has(m)) monthMap.set(m, []);
    monthMap.get(m)!.push(tx);
  });

  let dataText = '';
  for (const [month, txs] of Array.from(monthMap.entries())) {
    const total = txs.reduce((s, t) => s + t.amount, 0);
    const invest = txs.filter((t) => t.category === 'invest').reduce((s, t) => s + t.amount, 0);
    const consume = txs.filter((t) => t.category === 'consume').reduce((s, t) => s + t.amount, 0);
    const waste = txs.filter((t) => t.category === 'waste').reduce((s, t) => s + t.amount, 0);

    dataText += `\n## ${month}\n`;
    dataText += `支出: ¥${total} / 投資: ¥${invest}(${total > 0 ? Math.round(invest/total*100) : 0}%) / 消費: ¥${consume}(${total > 0 ? Math.round(consume/total*100) : 0}%) / 浪費: ¥${waste}(${total > 0 ? Math.round(waste/total*100) : 0}%)\n`;
    dataText += `記録:\n`;
    txs.forEach((t) => {
      dataText += `- ${t.date} ${t.description} ¥${t.amount} [${t.category}]`;
      if (t.chat_summary) dataText += ` → ${t.chat_summary}`;
      dataText += '\n';
    });
  }

  const system = `あなたは子どもの金銭教育の専門家です。
複数月にわたるお小遣い利用データを分析し、保護者向けの「成長レポート」を作成してください。

【重要な原則】
- 数字の変化だけでなく、会話の要約から見える「考え方の変化」を重視する
- 浪費を責めるトーンは絶対にNG
- 成長を具体的なエピソードで伝える
- 親が子どもを褒める材料を提供する

【レポート構成】
1. 📈 全体サマリー（期間、総支出、カテゴリ比率の推移を一言で）
2. 🌱 成長ポイントTOP3（具体的な行動変化を月をまたいで追跡）
3. 📊 月別推移の分析（投資/消費/浪費の比率変化と、その背景）
4. 🧠 ${userName}の「お金の性格」診断（データから見える特徴を3つ）
5. 💬 この成長を活かす親子の会話例（3つ）
6. 🎯 次のステップ提案（具体的な次の目標を2つ）

【出力形式】
見やすいマークダウン形式で。保護者が読みやすい丁寧な敬体で。`;

  const userPrompt = `以下は${userName}の${monthMap.size}ヶ月間のお小遣い記録です。

月のお小遣い: ¥${allowance.toLocaleString()}

${dataText}

上記の複数月にわたるデータを分析し、${userName}の成長と変化を追跡する
保護者向けの「成長レポート」を作成してください。
特に、会話の要約から読み取れる考え方・行動の変化に注目してください。`;

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
        max_tokens: 3000,
        system,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const data = await res.json();
    const report = data.content?.[0]?.text || 'レポート生成に失敗しました。';
    return NextResponse.json({ report });
  } catch {
    return NextResponse.json({ error: 'レポート生成に失敗しました' }, { status: 500 });
  }
}

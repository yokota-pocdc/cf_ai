import { NextRequest, NextResponse } from 'next/server';
import { getDb, Transaction } from '@/lib/db';

// Check parent auth cookie
function isAuthed(req: NextRequest): boolean {
  return req.cookies.get('parent_auth')?.value === 'verified';
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);

  const db = getDb();
  const transactions = db
    .prepare('SELECT * FROM transactions WHERE date LIKE ? ORDER BY date ASC, id ASC')
    .all(`${month}%`) as Transaction[];

  const settingsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowance') as { value: string } | undefined;
  const allowance = parseInt(settingsRow?.value || '5000');
  const userNameRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('userName') as { value: string } | undefined;
  const userName = userNameRow?.value || '';

  return NextResponse.json({ transactions, allowance, userName, month });
}

// Generate AI-powered monthly report
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const { month } = await req.json();
  const targetMonth = month || new Date().toISOString().slice(0, 7);

  const db = getDb();
  const transactions = db
    .prepare('SELECT * FROM transactions WHERE date LIKE ? ORDER BY date ASC, id ASC')
    .all(`${targetMonth}%`) as Transaction[];

  const settingsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowance') as { value: string } | undefined;
  const allowance = parseInt(settingsRow?.value || '5000');
  const userNameRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('userName') as { value: string } | undefined;
  const userName = userNameRow?.value || 'お子さん';

  if (transactions.length === 0) {
    return NextResponse.json({ report: `${targetMonth}の記録がまだありません。` });
  }

  // Build detailed data with behavioral context
  const txDetails = transactions.map((t) => {
    let entry = `${t.date} | ${t.description} | ¥${t.amount} | ${t.category} | ${t.subcategory || ''}`;
    if (t.chat_context) {
      entry += `\n  【会話の文脈】\n  ${t.chat_context.replace(/\n/g, '\n  ')}`;
    }
    return entry;
  }).join('\n\n');

  const totalOut = transactions.reduce((s, t) => s + t.amount, 0);
  const byCategory: Record<string, number> = { invest: 0, consume: 0, waste: 0 };
  transactions.forEach((t) => { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; });

  const system = `あなたは子どもの金銭教育の専門家です。
保護者向けに、お子さんのお小遣い利用状況の月次レポートを作成してください。

【重要な原則】
- これは「監視レポート」ではなく「親子の会話のきっかけ」になるレポートです
- 浪費を責めるトーンは絶対にNG
- 具体的な会話の文脈から、お子さんの思考プロセスや成長を読み取ってください
- 親が子どもに声をかけるときの具体的なフレーズ案も添えてください

【レポート構成】
1. 📊 今月のサマリー（数字＋一言コメント）
2. 🌟 今月の「いい使い方」TOP3（なぜ良かったかの解説付き）
3. 🧠 ${userName}のお金のクセ・傾向（会話文脈からの行動分析）
4. 💬 親子の会話のヒント（3つの具体的な声かけ例）
5. 📝 来月へのおすすめルール（1〜2個、押し付けでなく提案として）

【出力形式】
見やすいマークダウン形式で。保護者が読みやすい丁寧な敬体で。`;

  const userPrompt = `以下は${userName}の${targetMonth}のお小遣い記録です。

月のお小遣い: ¥${allowance.toLocaleString()}
支出合計: ¥${totalOut.toLocaleString()}
残高: ¥${(allowance - totalOut).toLocaleString()}
投資: ¥${byCategory.invest.toLocaleString()} (${totalOut > 0 ? Math.round(byCategory.invest / totalOut * 100) : 0}%)
消費: ¥${byCategory.consume.toLocaleString()} (${totalOut > 0 ? Math.round(byCategory.consume / totalOut * 100) : 0}%)
浪費: ¥${byCategory.waste.toLocaleString()} (${totalOut > 0 ? Math.round(byCategory.waste / totalOut * 100) : 0}%)

【記録の詳細（会話の文脈付き）】
${txDetails}

上記データをもとに、保護者向けの月次レポートを作成してください。
特に「会話の文脈」から読み取れるお子さんの思考プロセスや感情に注目し、
数字だけでは見えない成長や傾向を分析してください。`;

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
        max_tokens: 2000,
        system,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const data = await res.json();
    const report = data.content?.[0]?.text || 'レポート生成に失敗しました。';
    return NextResponse.json({ report, month: targetMonth });
  } catch {
    return NextResponse.json({ error: 'レポート生成に失敗しました' }, { status: 500 });
  }
}

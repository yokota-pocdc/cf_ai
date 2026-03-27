/**
 * 3ヶ月分の親向けAI月次レポートを生成するスクリプト
 * 使い方: ANTHROPIC_API_KEY=sk-ant-xxx node scripts/generate-reports.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'cf-tracker.db');
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY が設定されていません');
  process.exit(1);
}

const db = new Database(DB_PATH);

const CATS = {
  invest: '投資', consume: '消費', waste: '浪費',
};

async function generateReport(month) {
  const transactions = db
    .prepare('SELECT * FROM transactions WHERE date LIKE ? ORDER BY date ASC, id ASC')
    .all(`${month}%`);

  const settingsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('allowance');
  const allowance = parseInt(settingsRow?.value || '5000');
  const userNameRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('userName');
  const userName = userNameRow?.value || 'お子さん';

  if (transactions.length === 0) {
    return `${month}: 記録なし`;
  }

  const txDetails = transactions.map((t) => {
    let entry = `${t.date} | ${t.description} | ¥${t.amount} | ${CATS[t.category] || t.category} | ${t.subcategory || ''}`;
    if (t.chat_context) {
      entry += `\n  【会話の文脈】\n  ${t.chat_context.replace(/\n/g, '\n  ')}`;
    }
    return entry;
  }).join('\n\n');

  const totalOut = transactions.reduce((s, t) => s + t.amount, 0);
  const byCategory = { invest: 0, consume: 0, waste: 0 };
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

  const userPrompt = `以下は${userName}の${month}のお小遣い記録です。

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

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
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
  return data.content?.[0]?.text || 'レポート生成に失敗しました';
}

async function main() {
  const months = ['2026-01', '2026-02', '2026-03'];

  for (const month of months) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 ${month} の月次レポート`);
    console.log(`${'='.repeat(60)}\n`);

    const report = await generateReport(month);
    console.log(report);
  }

  db.close();
}

main().catch(console.error);

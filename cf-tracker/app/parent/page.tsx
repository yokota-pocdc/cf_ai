'use client';

import { useState, useEffect, useCallback } from 'react';

interface Transaction {
  id: number;
  date: string;
  amount: number;
  description: string;
  category: string;
  subcategory: string | null;
  chat_context: string | null;
  chat_summary: string | null;
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

const CATS: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  invest: { label: '投資', emoji: '🌱', color: '#059669', bg: '#d1fae5' },
  consume: { label: '消費', emoji: '🛒', color: '#7c3aed', bg: '#ede9fe' },
  waste: { label: '浪費', emoji: '🎀', color: '#e11d48', bg: '#ffe4e6' },
};

type Tab = 'monthly' | 'trend' | 'chat';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function renderMarkdown(md: string) {
  return md
    .replace(/^### (.*$)/gm, '<h3 class="text-sm font-bold text-[#7c3aed] mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-base font-bold text-[#7c3aed] mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-lg font-bold text-[#7c3aed] mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/g, '<br>');
}

export default function ParentDashboard() {
  const [authed, setAuthed] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [authError, setAuthError] = useState('');
  const [tab, setTab] = useState<Tab>('monthly');

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Monthly state
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allowance, setAllowance] = useState(5000);
  const [userName, setUserName] = useState('');
  const [report, setReport] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  // Trend state
  const [summaries, setSummaries] = useState<MonthSummary[]>([]);
  const [trendReport, setTrendReport] = useState('');
  const [trendLoading, setTrendLoading] = useState(false);

  const login = async () => {
    setAuthError('');
    const res = await fetch('/api/parent/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    });
    if (res.ok) setAuthed(true);
    else setAuthError('パスフレーズが違います');
  };

  const loadMonthly = useCallback(async () => {
    const res = await fetch(`/api/parent/report?month=${month}`);
    if (res.status === 401) { setAuthed(false); return; }
    const data = await res.json();
    setTransactions(data.transactions || []);
    setAllowance(data.allowance || 5000);
    setUserName(data.userName || '');
  }, [month]);

  const loadTrend = useCallback(async () => {
    const res = await fetch('/api/parent/trend');
    if (res.status === 401) { setAuthed(false); return; }
    const data = await res.json();
    setSummaries(data.summaries || []);
    if (data.allowance) setAllowance(data.allowance);
  }, []);

  useEffect(() => {
    if (authed) {
      loadMonthly();
      loadTrend();
    }
  }, [authed, loadMonthly, loadTrend]);

  const sendChat = async (text?: string) => {
    const msg = text || chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: msg }];
    setChatMessages(newMessages);
    setChatLoading(true);
    try {
      const res = await fetch('/api/parent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || 'エラーが発生しました。';
      setChatMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch {
      setChatMessages([...newMessages, { role: 'assistant', content: 'エラーが発生しました。' }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/parent/report?month=' + new Date().toISOString().slice(0, 7))
      .then((r) => { if (r.ok) setAuthed(true); });
  }, []);

  const generateReport = async () => {
    setReportLoading(true); setReport('');
    try {
      const res = await fetch('/api/parent/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month }) });
      const data = await res.json();
      setReport(data.report || '生成に失敗しました。');
    } catch { setReport('エラーが発生しました。'); }
    finally { setReportLoading(false); }
  };

  const generateTrendReport = async () => {
    setTrendLoading(true); setTrendReport('');
    try {
      const res = await fetch('/api/parent/trend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      setTrendReport(data.report || '生成に失敗しました。');
    } catch { setTrendReport('エラーが発生しました。'); }
    finally { setTrendLoading(false); }
  };

  const totalOut = transactions.reduce((s, t) => s + t.amount, 0);
  const remaining = allowance - totalOut;
  const byCategory: Record<string, number> = { invest: 0, consume: 0, waste: 0 };
  transactions.forEach((t) => { byCategory[t.category] = (byCategory[t.category] || 0) + t.amount; });

  // --- Login screen ---
  if (!authed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center bg-gradient-to-b from-[#fdf2f8] via-[#faf5ff] to-[#ede9fe] px-6">
        <div className="w-full rounded-3xl bg-white/90 p-8 shadow-lg backdrop-blur-sm">
          <div className="mb-6 text-center">
            <div className="text-4xl">👨‍👩‍👧</div>
            <h1 className="mt-3 text-lg font-bold text-[#4a3660]">保護者ダッシュボード</h1>
            <p className="mt-1 text-xs text-[#a78bfa]">パスフレーズを入力してください</p>
          </div>
          <input type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} placeholder="パスフレーズ"
            className="w-full rounded-xl border border-[#e9d5ff] bg-[#faf5ff] px-4 py-3 text-center text-base text-[#4a3660] outline-none focus:border-[#c084fc] focus:ring-2 focus:ring-[#c084fc]/20" />
          {authError && <p className="mt-2 text-center text-sm text-[#e11d48]">{authError}</p>}
          <button onClick={login} className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#c084fc] to-[#e879f9] py-3 text-sm font-bold text-white shadow-md">ログイン</button>
        </div>
      </div>
    );
  }

  // --- Dashboard ---
  return (
    <div className="mx-auto flex min-h-screen max-w-[600px] flex-col bg-gradient-to-b from-[#fdf2f8] via-[#faf5ff] to-[#ede9fe]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#9333ea] px-5 pb-2 pt-6">
        <h1 className="text-lg font-bold text-white">👨‍👩‍👧 見守りダッシュボード</h1>
        <p className="mt-0.5 text-xs text-white/70">{userName ? `${userName}のお小遣い状況` : 'お子さんのお小遣い状況'}</p>
        {/* Tabs */}
        <div className="mt-3 flex">
          <button onClick={() => setTab('monthly')} className={`flex-1 border-b-2 py-2 text-xs font-medium ${tab === 'monthly' ? 'border-white text-white' : 'border-transparent text-white/50'}`}>
            📊 月次レポート
          </button>
          <button onClick={() => setTab('trend')} className={`flex-1 border-b-2 py-2 text-xs font-medium ${tab === 'trend' ? 'border-white text-white' : 'border-transparent text-white/50'}`}>
            📈 成長トレンド
          </button>
          <button onClick={() => setTab('chat')} className={`flex-1 border-b-2 py-2 text-xs font-medium ${tab === 'chat' ? 'border-white text-white' : 'border-transparent text-white/50'}`}>
            💬 AI相談
          </button>
        </div>
      </div>

      {/* ===== Monthly Tab ===== */}
      {tab === 'monthly' && (
        <div className="flex flex-col gap-4 p-4">
          <div className="flex justify-end">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-[#e9d5ff] bg-white px-2 py-1 text-xs text-[#4a3660] outline-none" />
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="text-xs text-[#a78bfa]">支出合計 / お小遣い</div>
              <div className="mt-1 text-xl font-bold text-[#7c3aed]">¥{totalOut.toLocaleString()} <span className="text-sm font-normal text-[#a78bfa]">/ ¥{allowance.toLocaleString()}</span></div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="text-xs text-[#a78bfa]">残高</div>
              <div className={`mt-1 text-xl font-bold ${remaining < 0 ? 'text-[#e11d48]' : 'text-[#059669]'}`}>¥{remaining.toLocaleString()}</div>
            </div>
          </div>

          {/* Category ratio */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-bold text-[#4a3660]">投資・消費・浪費の比率</div>
            {totalOut > 0 && (
              <div className="mb-3 flex h-6 overflow-hidden rounded-full">
                {Object.entries(CATS).map(([k, cat]) => {
                  const pct = Math.round((byCategory[k] || 0) / totalOut * 100);
                  if (pct === 0) return null;
                  return <div key={k} className="flex items-center justify-center text-[10px] font-bold text-white" style={{ width: `${pct}%`, backgroundColor: cat.color }}>{pct}%</div>;
                })}
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(CATS).map(([k, cat]) => (
                <div key={k} className="rounded-xl p-2 text-center" style={{ backgroundColor: cat.bg }}>
                  <div className="text-lg">{cat.emoji}</div>
                  <div className="text-xs font-medium" style={{ color: cat.color }}>{cat.label}</div>
                  <div className="text-sm font-bold" style={{ color: cat.color }}>¥{(byCategory[k] || 0).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction list */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-bold text-[#4a3660]">📋 記録一覧</div>
            {transactions.length === 0 ? (
              <div className="py-6 text-center text-sm text-[#a78bfa]">この月の記録はまだありません</div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {transactions.map((tx) => {
                  const cat = CATS[tx.category] || { label: '?', emoji: '❓', color: '#888', bg: '#f5f3ff' };
                  return (
                    <div key={tx.id} className="rounded-xl border border-[#f3e8ff] p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{cat.emoji}</span>
                          <div>
                            <span className="text-sm font-medium text-[#4a3660]">{tx.description}</span>
                            <span className="ml-2 text-xs text-[#a78bfa]">{tx.date}</span>
                          </div>
                        </div>
                        <span className="text-sm font-bold" style={{ color: cat.color }}>¥{tx.amount.toLocaleString()}</span>
                      </div>
                      {tx.chat_summary && (
                        <div className="mt-1.5 rounded-lg bg-[#faf5ff] px-2.5 py-2 text-xs leading-relaxed text-[#6b5c7e]">💬 {tx.chat_summary}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Monthly Report */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-bold text-[#4a3660]">🤖 AI月次レポート</div>
            {report ? (
              <div className="prose prose-sm max-w-none text-sm leading-relaxed text-[#4a3660]" dangerouslySetInnerHTML={{ __html: renderMarkdown(report) }} />
            ) : (
              <div className="text-center">
                <p className="mb-3 text-xs text-[#a78bfa]">AIがお子さんのお金の使い方を分析します。</p>
                <button onClick={generateReport} disabled={reportLoading || transactions.length === 0}
                  className="rounded-xl bg-gradient-to-r from-[#6d28d9] to-[#9333ea] px-6 py-3 text-sm font-bold text-white shadow-md disabled:opacity-40">
                  {reportLoading ? '⏳ 生成中...' : '📊 月次レポートを生成'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Trend Tab ===== */}
      {tab === 'trend' && (
        <div className="flex flex-col gap-4 p-4">

          {/* Month-over-month table */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-bold text-[#4a3660]">📊 月別推移</div>
            {summaries.length === 0 ? (
              <div className="py-6 text-center text-sm text-[#a78bfa]">まだデータがありません</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#f3e8ff] text-[#a78bfa]">
                      <th className="py-2 text-left font-medium">月</th>
                      <th className="py-2 text-right font-medium">支出</th>
                      <th className="py-2 text-right font-medium">🌱投資</th>
                      <th className="py-2 text-right font-medium">🛒消費</th>
                      <th className="py-2 text-right font-medium">🎀浪費</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaries.map((s) => (
                      <tr key={s.month} className="border-b border-[#f9f5ff]">
                        <td className="py-2.5 font-medium text-[#4a3660]">{s.month.replace('2026-0', '').replace('2026-', '')}月</td>
                        <td className="py-2.5 text-right text-[#4a3660]">¥{s.total.toLocaleString()}</td>
                        <td className="py-2.5 text-right font-medium text-[#059669]">{s.investPct}%</td>
                        <td className="py-2.5 text-right font-medium text-[#7c3aed]">{s.consumePct}%</td>
                        <td className="py-2.5 text-right font-medium text-[#e11d48]">{s.wastePct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Visual trend bars */}
          {summaries.length > 0 && (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-bold text-[#4a3660]">📈 カテゴリ比率の推移</div>
              <div className="flex flex-col gap-2">
                {summaries.map((s) => (
                  <div key={s.month} className="flex items-center gap-2">
                    <span className="w-8 text-[11px] font-medium text-[#a78bfa]">{s.month.slice(5)}月</span>
                    <div className="flex h-5 flex-1 overflow-hidden rounded-full">
                      {s.investPct > 0 && <div className="flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${s.investPct}%`, backgroundColor: '#059669' }}>{s.investPct}</div>}
                      {s.consumePct > 0 && <div className="flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${s.consumePct}%`, backgroundColor: '#7c3aed' }}>{s.consumePct}</div>}
                      {s.wastePct > 0 && <div className="flex items-center justify-center text-[9px] font-bold text-white" style={{ width: `${s.wastePct}%`, backgroundColor: '#e11d48' }}>{s.wastePct}</div>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-center gap-4 text-[10px]">
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#059669]" />投資</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#7c3aed]" />消費</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-[#e11d48]" />浪費</span>
              </div>
            </div>
          )}

          {/* Waste trend highlight */}
          {summaries.length >= 2 && (
            <div className="rounded-2xl border-2 border-[#d1fae5] bg-[#ecfdf5] p-4">
              <div className="text-sm font-bold text-[#059669]">🎯 浪費率の変化</div>
              <div className="mt-2 flex items-end gap-3">
                <div className="text-center">
                  <div className="text-[10px] text-[#059669]">初月</div>
                  <div className="text-2xl font-bold text-[#e11d48]">{summaries[0].wastePct}%</div>
                </div>
                <div className="pb-1 text-lg text-[#059669]">→</div>
                <div className="text-center">
                  <div className="text-[10px] text-[#059669]">最新</div>
                  <div className="text-2xl font-bold text-[#059669]">{summaries[summaries.length - 1].wastePct}%</div>
                </div>
                <div className="ml-2 rounded-full bg-[#d1fae5] px-3 py-1 text-xs font-bold text-[#059669]">
                  {summaries[0].wastePct - summaries[summaries.length - 1].wastePct > 0
                    ? `${summaries[0].wastePct - summaries[summaries.length - 1].wastePct}pt改善!`
                    : '維持中'}
                </div>
              </div>
            </div>
          )}

          {/* AI Trend Report */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-bold text-[#4a3660]">🤖 AI成長レポート（複数月分析）</div>
            {trendReport ? (
              <div className="prose prose-sm max-w-none text-sm leading-relaxed text-[#4a3660]" dangerouslySetInnerHTML={{ __html: renderMarkdown(trendReport) }} />
            ) : (
              <div className="text-center">
                <p className="mb-3 text-xs text-[#a78bfa]">
                  全期間の記録と行動文脈を分析して、<br />
                  お子さんの成長を追跡するレポートを生成します。
                </p>
                <button onClick={generateTrendReport} disabled={trendLoading || summaries.length < 2}
                  className="rounded-xl bg-gradient-to-r from-[#059669] to-[#34d399] px-6 py-3 text-sm font-bold text-white shadow-md disabled:opacity-40">
                  {trendLoading ? '⏳ 分析中...' : '📈 成長レポートを生成'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Chat Tab ===== */}
      {tab === 'chat' && (
        <div className="flex flex-1 flex-col">
          {/* Messages */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 pb-2">
            {chatMessages.length === 0 && (
              <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
                <div className="text-3xl">🧑‍🏫</div>
                <div className="mt-3 text-sm font-bold text-[#4a3660]">AI教育アドバイザー</div>
                <p className="mt-2 text-xs leading-relaxed text-[#a78bfa]">
                  {userName || 'お子さん'}のお小遣いデータをもとに、<br />
                  声かけの仕方や教育方針をアドバイスします。
                </p>
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="mr-1.5 mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6d28d9] to-[#9333ea] text-sm">🧑‍🏫</div>
                )}
                <div className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'rounded-[20px_20px_4px_20px] bg-gradient-to-r from-[#6d28d9] to-[#9333ea] text-white'
                    : 'rounded-[20px_20px_20px_4px] border border-[#f3e8ff] bg-white text-[#4a3660]'
                }`} dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') }} />
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="mr-1.5 mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6d28d9] to-[#9333ea] text-sm">🧑‍🏫</div>
                <div className="flex items-center gap-1.5 rounded-[20px_20px_20px_4px] border border-[#f3e8ff] bg-white px-4 py-3">
                  <span className="dot-bounce h-2 w-2 rounded-full bg-[#a78bfa]" />
                  <span className="dot-bounce h-2 w-2 rounded-full bg-[#7c3aed]" />
                  <span className="dot-bounce h-2 w-2 rounded-full bg-[#6d28d9]" />
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts for parents */}
          <div className="flex flex-wrap gap-1.5 px-4 pb-2">
            {[
              { label: '📊 うちの子の傾向は？', prompt: 'うちの子のお金の使い方の傾向を教えてください。良い点と気になる点を両方知りたいです。' },
              { label: '💬 声かけの仕方', prompt: '浪費について子どもに伝えたいのですが、否定せずに話すにはどう声をかけたらいいですか？' },
              { label: '💰 お小遣いの額', prompt: 'お小遣いの額は今のままで適切ですか？データを見てアドバイスをください。' },
            ].map((q, i) => (
              <button key={i} onClick={() => sendChat(q.prompt)}
                className="whitespace-nowrap rounded-full border border-[#e9d5ff] bg-white px-3 py-1.5 text-[11px] text-[#7c3aed] shadow-sm hover:bg-[#faf5ff]">
                {q.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2 border-t border-[#f3e8ff] bg-white/80 px-4 py-3 backdrop-blur-sm">
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && sendChat()}
              placeholder="お子さんのお金の使い方について相談..."
              className="flex-1 rounded-full border border-[#e9d5ff] bg-[#faf5ff] px-4 py-2.5 text-base text-[#4a3660] outline-none placeholder:text-[#c4b5d0] focus:border-[#7c3aed] focus:bg-white focus:ring-2 focus:ring-[#7c3aed]/20" />
            <button onClick={() => sendChat()} disabled={chatLoading}
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#6d28d9] to-[#9333ea] text-lg text-white shadow-md disabled:opacity-40">
              ▲
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

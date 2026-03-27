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

const CATS: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  invest: { label: '投資', emoji: '🌱', color: '#059669', bg: '#d1fae5' },
  consume: { label: '消費', emoji: '🛒', color: '#7c3aed', bg: '#ede9fe' },
  waste: { label: '浪費', emoji: '🎀', color: '#e11d48', bg: '#ffe4e6' },
};

export default function ParentDashboard() {
  const [authed, setAuthed] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [authError, setAuthError] = useState('');

  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allowance, setAllowance] = useState(5000);
  const [userName, setUserName] = useState('');

  const [report, setReport] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  const login = async () => {
    setAuthError('');
    const res = await fetch('/api/parent/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passphrase }),
    });
    if (res.ok) {
      setAuthed(true);
    } else {
      setAuthError('パスフレーズが違います');
    }
  };

  const loadData = useCallback(async () => {
    const res = await fetch(`/api/parent/report?month=${month}`);
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    setTransactions(data.transactions || []);
    setAllowance(data.allowance || 5000);
    setUserName(data.userName || '');
  }, [month]);

  useEffect(() => {
    if (authed) loadData();
  }, [authed, loadData]);

  // Check if already authed on mount
  useEffect(() => {
    fetch('/api/parent/report?month=' + new Date().toISOString().slice(0, 7))
      .then((r) => { if (r.ok) setAuthed(true); });
  }, []);

  const generateReport = async () => {
    setReportLoading(true);
    setReport('');
    try {
      const res = await fetch('/api/parent/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      });
      const data = await res.json();
      setReport(data.report || 'レポート生成に失敗しました。');
    } catch {
      setReport('エラーが発生しました。');
    } finally {
      setReportLoading(false);
    }
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
          <input
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()}
            placeholder="パスフレーズ"
            className="w-full rounded-xl border border-[#e9d5ff] bg-[#faf5ff] px-4 py-3 text-center text-base text-[#4a3660] outline-none focus:border-[#c084fc] focus:ring-2 focus:ring-[#c084fc]/20"
          />
          {authError && <p className="mt-2 text-center text-sm text-[#e11d48]">{authError}</p>}
          <button
            onClick={login}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#c084fc] to-[#e879f9] py-3 text-sm font-bold text-white shadow-md"
          >
            ログイン
          </button>
        </div>
      </div>
    );
  }

  // --- Dashboard ---
  return (
    <div className="mx-auto flex min-h-screen max-w-[600px] flex-col bg-gradient-to-b from-[#fdf2f8] via-[#faf5ff] to-[#ede9fe]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#9333ea] px-5 pb-4 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">👨‍👩‍👧 見守りダッシュボード</h1>
            <p className="mt-0.5 text-xs text-white/70">
              {userName ? `${userName}のお小遣い状況` : 'お子さんのお小遣い状況'}
            </p>
          </div>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border-0 bg-white/20 px-2 py-1 text-xs text-white outline-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-xs text-[#a78bfa]">支出合計 / お小遣い</div>
            <div className="mt-1 text-xl font-bold text-[#7c3aed]">
              ¥{totalOut.toLocaleString()} <span className="text-sm font-normal text-[#a78bfa]">/ ¥{allowance.toLocaleString()}</span>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="text-xs text-[#a78bfa]">残高</div>
            <div className={`mt-1 text-xl font-bold ${remaining < 0 ? 'text-[#e11d48]' : 'text-[#059669]'}`}>
              ¥{remaining.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Category ratio */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-[#4a3660]">投資・消費・浪費の比率</div>
          {/* Stacked bar */}
          {totalOut > 0 && (
            <div className="mb-3 flex h-6 overflow-hidden rounded-full">
              {Object.entries(CATS).map(([k, cat]) => {
                const pct = Math.round((byCategory[k] || 0) / totalOut * 100);
                if (pct === 0) return null;
                return (
                  <div
                    key={k}
                    className="flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ width: `${pct}%`, backgroundColor: cat.color }}
                  >
                    {pct}%
                  </div>
                );
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

        {/* Transaction list with summary */}
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
                      <span className="text-sm font-bold" style={{ color: cat.color }}>
                        ¥{tx.amount.toLocaleString()}
                      </span>
                    </div>
                    {tx.chat_summary && (
                      <div className="mt-1.5 rounded-lg bg-[#faf5ff] px-2.5 py-2 text-xs leading-relaxed text-[#6b5c7e]">
                        💬 {tx.chat_summary}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Report */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold text-[#4a3660]">🤖 AI月次レポート</div>
          {report ? (
            <div
              className="prose prose-sm max-w-none text-[#4a3660]"
              dangerouslySetInnerHTML={{
                __html: report
                  .replace(/^### (.*$)/gm, '<h3 class="text-sm font-bold text-[#7c3aed] mt-4 mb-2">$1</h3>')
                  .replace(/^## (.*$)/gm, '<h2 class="text-base font-bold text-[#7c3aed] mt-4 mb-2">$1</h2>')
                  .replace(/^# (.*$)/gm, '<h1 class="text-lg font-bold text-[#7c3aed] mt-4 mb-2">$1</h1>')
                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                  .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
                  .replace(/\n/g, '<br>'),
              }}
            />
          ) : (
            <div className="text-center">
              <p className="mb-3 text-xs text-[#a78bfa]">
                AIが記録データと会話の文脈を分析して、<br />
                お子さんのお金の使い方レポートを作成します。
              </p>
              <button
                onClick={generateReport}
                disabled={reportLoading || transactions.length === 0}
                className="rounded-xl bg-gradient-to-r from-[#6d28d9] to-[#9333ea] px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-40"
              >
                {reportLoading ? '⏳ レポート生成中...' : '📊 月次レポートを生成'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

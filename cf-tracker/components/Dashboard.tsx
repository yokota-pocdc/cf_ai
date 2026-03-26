'use client';

import { useState, useEffect, useCallback } from 'react';
import { CATS, Category } from '@/lib/categories';
import TxList from './TxList';

interface Transaction {
  id: number;
  date: string;
  amount: number;
  description: string;
  category: Category;
  subcategory: string | null;
}

export default function Dashboard({ onAnalyze }: { onAnalyze: (msg: string) => void }) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allowance, setAllowance] = useState(5000);

  const loadData = useCallback(async () => {
    const [txRes, settingsRes] = await Promise.all([
      fetch(`/api/transactions?month=${month}`),
      fetch('/api/settings'),
    ]);
    const txData = await txRes.json();
    const settingsData = await settingsRes.json();
    setTransactions(txData);
    setAllowance(settingsData.allowance || 5000);
  }, [month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalOut = transactions.reduce((s, t) => s + (t.amount || 0), 0);
  const remaining = allowance - totalOut;

  const byCategory: Record<string, number> = {};
  (Object.keys(CATS) as Category[]).forEach((k) => {
    byCategory[k] = transactions.filter((t) => t.category === k).reduce((s, t) => s + t.amount, 0);
  });

  const bySub: Record<string, number> = {};
  transactions.forEach((t) => {
    if (t.subcategory) {
      bySub[t.subcategory] = (bySub[t.subcategory] || 0) + t.amount;
    }
  });

  const updateAllowance = async (val: string) => {
    const num = parseInt(val) || 5000;
    setAllowance(num);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ allowance: num }),
    });
  };

  const handleAnalyze = () => {
    const summary = transactions
      .map(
        (t) =>
          `${t.date} ${t.description} ¥${t.amount} [${CATS[t.category]?.label}/${t.subcategory}]`
      )
      .join('\n');
    onAnalyze(`${month}の支出を振り返って、アドバイスをください。\n\n記録データ:\n${summary}`);
  };

  return (
    <div className="flex flex-col gap-3 overflow-y-auto bg-gradient-to-b from-[#faf5ff]/50 to-white/50 p-4">
      {/* Allowance setting */}
      <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-[#fdf2f8] to-[#faf5ff] px-4 py-3">
        <span className="text-[13px] font-medium text-[#9333ea]">💰 月のお小遣い</span>
        <div className="flex items-center gap-1">
          <span className="text-sm text-[#9333ea]">¥</span>
          <input
            type="number"
            value={allowance}
            onChange={(e) => updateAllowance(e.target.value)}
            className="w-[80px] rounded-xl border border-[#e9d5ff] bg-white px-2 py-1 text-right text-sm text-[#4a3660] outline-none focus:border-[#c084fc]"
          />
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[13px] text-[#a78bfa]">📅 表示月</span>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-xl border border-[#e9d5ff] bg-white px-2.5 py-1 text-[13px] text-[#4a3660] outline-none focus:border-[#c084fc]"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-gradient-to-br from-[#faf5ff] to-[#fdf2f8] px-2 py-3 text-center shadow-sm">
          <div className="text-[11px] text-[#a78bfa]">支出合計</div>
          <div className="mt-0.5 text-lg font-bold text-[#7c3aed]">¥{totalOut.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-[#ecfdf5] to-[#d1fae5] px-2 py-3 text-center shadow-sm">
          <div className="text-[11px] text-[#34d399]">残高</div>
          <div
            className={`mt-0.5 text-lg font-bold ${remaining < 0 ? 'text-[#e11d48]' : 'text-[#059669]'}`}
          >
            ¥{remaining.toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-[#fdf2f8] to-[#ffe4e6] px-2 py-3 text-center shadow-sm">
          <div className="text-[11px] text-[#f9a8d4]">件数</div>
          <div className="mt-0.5 text-lg font-bold text-[#e11d48]">{transactions.length}件</div>
        </div>
      </div>

      {/* Category breakdown bars */}
      <div className="rounded-2xl border border-[#f3e8ff] bg-white p-4 shadow-sm">
        <div className="mb-3 text-[13px] font-bold text-[#7c3aed]">
          ✨ カテゴリ別
        </div>
        {(Object.entries(CATS) as [Category, (typeof CATS)[Category]][]).map(([k, cat]) => {
          const amt = byCategory[k] || 0;
          const pct = totalOut > 0 ? Math.round((amt / totalOut) * 100) : 0;
          return (
            <div key={k} className="mb-3 last:mb-0">
              <div className="mb-1 flex items-center justify-between text-[13px]">
                <span className="font-medium text-[#4a3660]">
                  {cat.emoji} {cat.label}
                </span>
                <span className="text-[#4a3660]">
                  ¥{amt.toLocaleString()}{' '}
                  <span className="ml-1 text-[11px] text-[#a78bfa]">{pct}%</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#f5f3ff]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: `linear-gradient(to right, ${cat.mid}, ${cat.color})` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Subcategory breakdown */}
      {Object.keys(bySub).length > 0 && (
        <div className="rounded-2xl border border-[#f3e8ff] bg-white p-4 shadow-sm">
          <div className="mb-2.5 text-[13px] font-bold text-[#7c3aed]">🏷️ 細かい内訳</div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(bySub)
              .sort((a, b) => b[1] - a[1])
              .map(([name, amt]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-xl bg-[#faf5ff] px-2.5 py-1.5 text-xs"
                >
                  <span className="text-[#7c3aed]">{name}</span>
                  <span className="font-bold text-[#4a3660]">¥{amt.toLocaleString()}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Transaction list */}
      <div className="rounded-2xl border border-[#f3e8ff] bg-white p-4 shadow-sm">
        <div className="mb-2 text-[13px] font-bold text-[#7c3aed]">📋 今月の記録</div>
        <TxList transactions={transactions} />
      </div>

      {/* Analyze button */}
      {transactions.length > 0 && (
        <button
          onClick={handleAnalyze}
          className="w-full rounded-2xl bg-gradient-to-r from-[#c084fc] to-[#e879f9] py-3.5 text-[13px] font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
        >
          🤖 AIに振り返ってもらう →
        </button>
      )}
    </div>
  );
}

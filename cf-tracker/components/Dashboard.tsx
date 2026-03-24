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
    <div className="flex flex-col gap-3.5 overflow-y-auto p-4">
      {/* Allowance setting */}
      <div className="flex items-center justify-between rounded-[10px] bg-[#f8f6f2] px-3.5 py-2.5">
        <span className="text-[13px] text-[#555]">月のお小遣い</span>
        <input
          type="number"
          value={allowance}
          onChange={(e) => updateAllowance(e.target.value)}
          className="w-[90px] rounded-lg border border-[#e0ddd8] bg-white px-2.5 py-1 text-right text-sm"
        />
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-[#888]">表示月</span>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-lg border border-[#e0ddd8] bg-[#faf9f7] px-2.5 py-1 text-[13px] outline-none"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-[10px] bg-[#f8f6f2] px-2 py-2.5 text-center">
          <div className="text-[11px] text-[#888]">支出合計</div>
          <div className="text-lg font-semibold text-[#1a1a18]">¥{totalOut.toLocaleString()}</div>
        </div>
        <div className="rounded-[10px] bg-[#f8f6f2] px-2 py-2.5 text-center">
          <div className="text-[11px] text-[#888]">残高</div>
          <div
            className={`text-lg font-semibold ${remaining < 0 ? 'text-[#D85A30]' : 'text-[#1D9E75]'}`}
          >
            ¥{remaining.toLocaleString()}
          </div>
        </div>
        <div className="rounded-[10px] bg-[#f8f6f2] px-2 py-2.5 text-center">
          <div className="text-[11px] text-[#888]">件数</div>
          <div className="text-lg font-semibold text-[#1a1a18]">{transactions.length}件</div>
        </div>
      </div>

      {/* Category breakdown bars */}
      <div className="rounded-xl border border-[#eee] bg-white p-3.5">
        <div className="mb-3 text-[13px] font-semibold text-[#1a1a18]">
          投資・消費・浪費の内訳
        </div>
        {(Object.entries(CATS) as [Category, (typeof CATS)[Category]][]).map(([k, cat]) => {
          const amt = byCategory[k] || 0;
          const pct = totalOut > 0 ? Math.round((amt / totalOut) * 100) : 0;
          return (
            <div key={k} className="mb-2.5 last:mb-0">
              <div className="mb-1 flex items-center justify-between text-[13px]">
                <span>
                  <span
                    className="mr-1.5 inline-block h-2 w-2 rounded-full"
                    style={{ background: cat.mid }}
                  />
                  {cat.label}
                </span>
                <span>
                  ¥{amt.toLocaleString()}{' '}
                  <span className="ml-1 text-[11px] text-[#888]">{pct}%</span>
                </span>
              </div>
              <div className="h-[5px] overflow-hidden rounded-sm bg-[#f0ede8]">
                <div
                  className="h-full rounded-sm transition-all duration-400"
                  style={{ width: `${pct}%`, background: cat.mid }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Subcategory breakdown */}
      {Object.keys(bySub).length > 0 && (
        <div className="rounded-xl border border-[#eee] bg-white p-3.5">
          <div className="mb-2.5 text-[13px] font-semibold text-[#1a1a18]">カテゴリ別</div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(bySub)
              .sort((a, b) => b[1] - a[1])
              .map(([name, amt]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-[7px] bg-[#faf9f7] px-2 py-1 text-xs"
                >
                  <span className="text-[#555]">{name}</span>
                  <span className="font-semibold text-[#1a1a18]">¥{amt.toLocaleString()}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Transaction list */}
      <div>
        <div className="mb-2 text-[13px] font-semibold text-[#1a1a18]">今月の記録</div>
        <TxList transactions={transactions} />
      </div>

      {/* Analyze button */}
      {transactions.length > 0 && (
        <button
          onClick={handleAnalyze}
          className="w-full rounded-[10px] border border-[#e0ddd8] bg-[#faf9f7] py-3 text-[13px] text-[#555] transition-colors hover:bg-[#f0ede8]"
        >
          🤖 AIに今月を振り返ってもらう →
        </button>
      )}
    </div>
  );
}

'use client';

import { CATS, Category } from '@/lib/categories';

interface Transaction {
  id: number;
  date: string;
  amount: number;
  description: string;
  category: Category;
  subcategory: string | null;
}

export default function TxList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="text-3xl">🌟</div>
        <div className="mt-2 text-[13px] text-[#a78bfa]">
          まだ記録がないよ
          <br />
          チャットから支出を記録してみよう！
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {transactions.map((tx) => {
        const cat = CATS[tx.category] || { label: '?', emoji: '❓', bg: '#f5f3ff', color: '#888', mid: '#ccc' };
        return (
          <div
            key={tx.id}
            className="flex items-center justify-between rounded-xl bg-[#faf5ff] px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-base"
                style={{ background: cat.bg }}
              >
                {cat.emoji}
              </div>
              <div>
                <div className="text-[13px] font-medium text-[#4a3660]">{tx.description}</div>
                <div className="mt-px text-[11px] text-[#a78bfa]">
                  {tx.date} · {tx.subcategory || ''}
                </div>
              </div>
            </div>
            <div className="text-sm font-bold" style={{ color: cat.color }}>
              ¥{tx.amount.toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

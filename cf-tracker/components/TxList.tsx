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
      <div className="py-6 text-center text-[13px] text-[#aaa]">
        まだ記録がありません
        <br />
        チャットから支出を記録してみよう！
      </div>
    );
  }

  return (
    <div>
      {transactions.map((tx) => {
        const cat = CATS[tx.category] || { label: '?', bg: '#eee', color: '#888' };
        return (
          <div
            key={tx.id}
            className="flex items-center justify-between border-b border-[#f0ede8] py-2 last:border-b-0"
          >
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
                style={{ background: cat.bg, color: cat.color }}
              >
                {cat.label.charAt(0)}
              </div>
              <div>
                <div className="text-[13px] font-medium text-[#1a1a18]">{tx.description}</div>
                <div className="mt-px text-[11px] text-[#aaa]">
                  {tx.date} · {tx.subcategory || ''}
                </div>
              </div>
            </div>
            <div className="text-sm font-semibold text-[#1a1a18]">
              ¥{tx.amount.toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { CATS, Category } from '@/lib/categories';

interface Transaction {
  id: number;
  date: string;
  amount: number;
  description: string;
  category: Category;
  subcategory: string | null;
}

interface TxListProps {
  transactions: Transaction[];
  onDelete: (id: number) => void;
  onUpdate: (tx: Transaction) => void;
}

export default function TxList({ transactions, onDelete, onUpdate }: TxListProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Transaction | null>(null);

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

  const startEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditForm({ ...tx });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = () => {
    if (editForm) {
      onUpdate(editForm);
      setEditingId(null);
      setEditForm(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {transactions.map((tx) => {
        const cat = CATS[tx.category] || { label: '?', emoji: '❓', bg: '#f5f3ff', color: '#888', mid: '#ccc' };

        if (editingId === tx.id && editForm) {
          return (
            <div key={tx.id} className="rounded-xl border-2 border-[#c084fc] bg-[#faf5ff] p-3">
              {/* Description */}
              <input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="mb-2 w-full rounded-lg border border-[#e9d5ff] bg-white px-3 py-1.5 text-[13px] text-[#4a3660] outline-none focus:border-[#c084fc]"
              />
              <div className="flex gap-2">
                {/* Amount */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[#a78bfa]">¥</span>
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: parseInt(e.target.value) || 0 })}
                    className="w-[70px] rounded-lg border border-[#e9d5ff] bg-white px-2 py-1.5 text-[13px] text-[#4a3660] outline-none focus:border-[#c084fc]"
                  />
                </div>
                {/* Category */}
                <select
                  value={editForm.category}
                  onChange={(e) => {
                    const newCat = e.target.value as Category;
                    const newSubcats = CATS[newCat].subcategories;
                    setEditForm({
                      ...editForm,
                      category: newCat,
                      subcategory: newSubcats[0],
                    });
                  }}
                  className="rounded-lg border border-[#e9d5ff] bg-white px-2 py-1.5 text-[13px] text-[#4a3660] outline-none focus:border-[#c084fc]"
                >
                  {(Object.entries(CATS) as [Category, (typeof CATS)[Category]][]).map(([k, c]) => (
                    <option key={k} value={k}>{c.emoji} {c.label}</option>
                  ))}
                </select>
                {/* Date */}
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  className="rounded-lg border border-[#e9d5ff] bg-white px-2 py-1.5 text-[13px] text-[#4a3660] outline-none focus:border-[#c084fc]"
                />
              </div>
              {/* Subcategory */}
              <select
                value={editForm.subcategory || ''}
                onChange={(e) => setEditForm({ ...editForm, subcategory: e.target.value })}
                className="mt-2 w-full rounded-lg border border-[#e9d5ff] bg-white px-2 py-1.5 text-[13px] text-[#4a3660] outline-none focus:border-[#c084fc]"
              >
                {CATS[editForm.category]?.subcategories.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {/* Buttons */}
              <div className="mt-2 flex gap-2">
                <button
                  onClick={saveEdit}
                  className="flex-1 rounded-lg bg-gradient-to-r from-[#c084fc] to-[#e879f9] py-1.5 text-xs font-bold text-white"
                >
                  ✓ 保存
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex-1 rounded-lg border border-[#e9d5ff] bg-white py-1.5 text-xs text-[#a78bfa]"
                >
                  キャンセル
                </button>
              </div>
            </div>
          );
        }

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
            <div className="flex items-center gap-2">
              <div className="text-sm font-bold" style={{ color: cat.color }}>
                ¥{tx.amount.toLocaleString()}
              </div>
              <button
                onClick={() => startEdit(tx)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs text-[#a78bfa] transition-colors hover:bg-[#f3e8ff]"
                title="編集"
              >
                ✏️
              </button>
              <button
                onClick={() => {
                  if (confirm(`「${tx.description}」を削除しますか？`)) {
                    onDelete(tx.id);
                  }
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs text-[#fb7185] transition-colors hover:bg-[#ffe4e6]"
                title="削除"
              >
                🗑️
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { useState } from 'react';
import ChatView from '@/components/ChatView';
import Dashboard from '@/components/Dashboard';

type Tab = 'chat' | 'dash';

export default function Home() {
  const [tab, setTab] = useState<Tab>('chat');

  const handleAnalyze = (msg: string) => {
    setTab('chat');
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('input[placeholder]');
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        nativeInputValueSetter?.call(input, msg);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }
    }, 100);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col bg-white shadow-[0_0_40px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="px-5 pt-[18px]">
        <h1 className="text-[17px] font-semibold tracking-wide text-[#1a1a18]">
          おこづかいC/Fノート
        </h1>
        <p className="mt-0.5 text-xs text-[#888]">
          投資・消費・浪費を仕分けて、お金の流れを見える化しよう
        </p>
      </div>

      {/* Tabs */}
      <div className="mt-3.5 flex border-b border-[#eee]">
        <button
          onClick={() => setTab('chat')}
          className={`flex-1 border-b-2 py-2.5 text-[13px] transition-all ${
            tab === 'chat'
              ? 'border-[#1a1a18] font-semibold text-[#1a1a18]'
              : 'border-transparent text-[#888]'
          }`}
        >
          📝 記録する
        </button>
        <button
          onClick={() => setTab('dash')}
          className={`flex-1 border-b-2 py-2.5 text-[13px] transition-all ${
            tab === 'dash'
              ? 'border-[#1a1a18] font-semibold text-[#1a1a18]'
              : 'border-transparent text-[#888]'
          }`}
        >
          📊 ダッシュボード
        </button>
      </div>

      {/* Content */}
      <div className={`flex flex-1 flex-col ${tab !== 'chat' ? 'hidden' : ''}`}>
        <ChatView />
      </div>
      <div className={`flex flex-1 flex-col ${tab !== 'dash' ? 'hidden' : ''}`}>
        <Dashboard onAnalyze={handleAnalyze} />
      </div>
    </div>
  );
}

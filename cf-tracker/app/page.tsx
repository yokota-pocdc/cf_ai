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
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col overflow-hidden rounded-none bg-white/80 shadow-[0_0_60px_rgba(168,85,247,0.08)] backdrop-blur-sm sm:my-4 sm:rounded-3xl sm:min-h-[calc(100vh-2rem)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#c084fc] via-[#e879f9] to-[#f9a8d4] px-5 pb-3 pt-5">
        <h1 className="text-lg font-bold tracking-wide text-white drop-shadow-sm">
          ✨ おこづかいノート
        </h1>
        <p className="mt-0.5 text-[11px] text-white/80">
          投資・消費・浪費を仕分けて、お金の流れを見える化しよう！
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gradient-to-r from-[#faf5ff] to-[#fdf2f8]">
        <button
          onClick={() => setTab('chat')}
          className={`flex-1 border-b-[3px] py-2.5 text-[13px] font-medium transition-all ${
            tab === 'chat'
              ? 'border-[#c084fc] text-[#9333ea]'
              : 'border-transparent text-[#c4b5d0]'
          }`}
        >
          💬 記録する
        </button>
        <button
          onClick={() => setTab('dash')}
          className={`flex-1 border-b-[3px] py-2.5 text-[13px] font-medium transition-all ${
            tab === 'dash'
              ? 'border-[#c084fc] text-[#9333ea]'
              : 'border-transparent text-[#c4b5d0]'
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

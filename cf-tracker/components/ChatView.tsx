'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CATS, Category } from '@/lib/categories';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface TransactionData {
  amount: number;
  description: string;
  category: Category;
  subcategory: string;
  date: string;
}

function getInitialMessages(name?: string): Message[] {
  const greeting = name ? `${name}、こんにちは！` : 'こんにちは！';
  return [
    {
      role: 'assistant',
      content: `${greeting}🌸\n今日なにか買ったものある？\n「コンビニで350円使った」みたいに教えてくれたら、一緒に記録しよう✨`,
    },
  ];
}

const STORAGE_KEY_MESSAGES = 'cf-chat-messages';
const STORAGE_KEY_HISTORY = 'cf-chat-history';
const STORAGE_KEY_LAST_MONTH = 'cf-last-active-month';

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export default function ChatView() {
  const [messages, setMessages] = useState<Message[]>(() =>
    loadFromStorage(STORAGE_KEY_MESSAGES, getInitialMessages())
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>(() =>
    loadFromStorage(STORAGE_KEY_HISTORY, [])
  );
  const [userName, setUserName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Load user name from settings
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.userName) setUserName(data.userName);
      })
      .catch(() => {});
  }, []);

  // Monthly greeting check
  useEffect(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const lastMonth = localStorage.getItem(STORAGE_KEY_LAST_MONTH);
    if (lastMonth && lastMonth !== currentMonth) {
      const monthName = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          content: `🌸 ${monthName}になりました！新しい月のスタートだよ。今月もお小遣い管理がんばろう✨`,
        },
      ]);
    }
    localStorage.setItem(STORAGE_KEY_LAST_MONTH, currentMonth);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(chatHistory));
  }, [chatHistory]);

  const clearChat = () => {
    setMessages(getInitialMessages(userName));
    setChatHistory([]);
  };

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    setInput('');

    const userMsg: Message = { role: 'user', content: msg };
    setMessages((prev) => [...prev, userMsg]);
    const newHistory = [...chatHistory, { role: 'user', content: msg }];
    setChatHistory(newHistory);
    setIsLoading(true);

    try {
      const txRes = await fetch('/api/transactions');
      const txAll = await txRes.json();
      const settingsRes = await fetch('/api/settings');
      const settings = await settingsRes.json();
      const allowance = settings.allowance || 5000;
      const name = settings.userName || '';

      const today = new Date().toISOString().slice(0, 10);
      const txSummary = txAll
        .slice(0, 10)
        .map(
          (t: TransactionData) =>
            `${t.date} ${t.description} ¥${t.amount} [${CATS[t.category]?.label}/${t.subcategory}]`
        )
        .join('\n');

      const nameInstruction = name
        ? `ユーザーの名前は「${name}」です。名前で呼んでください。`
        : 'ユーザーの名前は設定されていません。「きみ」などで呼んでください。';

      const system = `あなたはお小遣い管理AIアシスタントです。
${nameInstruction}
友達のように親しみやすく、でも押しつけがましくなく話してください。

【あなたの役割】
支出の記録を手伝い、「投資・消費・浪費」に仕分けする練習を通じて金銭感覚を育てます。

【3つの分類】
- 投資：学び、成長、健康、体験につながる支出（本、習い事、スポーツ用品など）
- 消費：日常生活に必要で適切な支出（食事、交通費、文具など）
- 浪費：衝動的・無駄な支出（ガチャ、衝動買いなど）

※「浪費」を責めるのではなく「何%まで浪費OKか自分で決めよう」というスタンスで。

【支出を記録するとき】
1. 支出内容と金額を確認する
2. 「これって自分的には投資？消費？浪費？どう思う？」と聞く
3. ユーザーが分類を決めたら（または明らかな場合）、必ずこの形式で出力する：

<tx>{"amount":金額数値,"description":"説明","category":"invest|consume|waste","subcategory":"サブカテゴリ","date":"${today}"}</tx>

サブカテゴリ候補：
- invest: 学び・参考書, 習い事・体験, 健康・スポーツ, 道具・文具
- consume: 友人との交際費, 外食・カフェ, 日用品・生活費, 交通費
- waste: 衝動買い, 課金・ガチャ, 無駄な飲食, その他

【最近の記録】
${txSummary || 'まだ記録なし'}

今日の日付: ${today}
月のお小遣い: ¥${allowance.toLocaleString()}

振り返りやアドバイスを求められたときは、記録データをもとに具体的で温かいコメントを。`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system,
          messages: newHistory,
        }),
      });

      const data = await res.json();
      const raw = data.content?.[0]?.text || 'ごめんね、エラーが起きちゃった😢';

      const txMatch = raw.match(/<tx>([\s\S]*?)<\/tx>/);
      const clean = raw.replace(/<tx>[\s\S]*?<\/tx>/g, '').trim();

      setChatHistory([...newHistory, { role: 'assistant', content: raw }]);

      const newMessages: Message[] = [{ role: 'assistant', content: clean }];

      if (txMatch) {
        try {
          const tx: TransactionData = JSON.parse(txMatch[1]);
          if (tx.amount && tx.category) {
            await fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(tx),
            });
            const cat = CATS[tx.category];
            newMessages.push({
              role: 'system',
              content: `${cat.emoji} 記録しました！ ${tx.description}  ¥${tx.amount.toLocaleString()}（${cat.label}）`,
            });
          }
        } catch {
          // ignore parse errors
        }
      }

      setMessages((prev) => [...prev, ...newMessages]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'ごめんね、エラーが起きちゃった。もう一度試してみて！' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-[#faf5ff]/50 to-white/50">
      {/* Messages */}
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 pb-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="mr-1.5 mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#c084fc] to-[#e879f9] text-sm">
                🐱
              </div>
            )}
            <div
              className={`max-w-[78%] px-3.5 py-2.5 text-[14px] leading-relaxed ${
                msg.role === 'user'
                  ? 'rounded-[20px_20px_4px_20px] bg-gradient-to-r from-[#c084fc] to-[#e879f9] text-white shadow-sm'
                  : msg.role === 'system'
                    ? 'w-full rounded-2xl border border-[#d1fae5] bg-[#ecfdf5] px-3 py-2 text-[13px] text-[#059669]'
                    : 'rounded-[20px_20px_20px_4px] border border-[#f3e8ff] bg-white text-[#4a3660] shadow-sm'
              }`}
              dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br>') }}
            />
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="mr-1.5 mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#c084fc] to-[#e879f9] text-sm">
              🐱
            </div>
            <div className="flex items-center gap-1.5 rounded-[20px_20px_20px_4px] border border-[#f3e8ff] bg-white px-4 py-3 shadow-sm">
              <span className="dot-bounce h-2 w-2 rounded-full bg-[#d8b4fe]" />
              <span className="dot-bounce h-2 w-2 rounded-full bg-[#e879f9]" />
              <span className="dot-bounce h-2 w-2 rounded-full bg-[#f9a8d4]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-2">
        {messages.length > 1 && (
          <button
            onClick={clearChat}
            className="whitespace-nowrap rounded-full border border-[#fecdd3] bg-white px-3 py-1.5 text-xs text-[#e11d48] shadow-sm transition-colors hover:bg-[#fff1f2]"
          >
            🗑️ チャットをリセット
          </button>
        )}
        {[
          { label: '✏️ 今日の支出', prompt: '今日の支出を教えて' },
          { label: '📅 今月の振り返り', prompt: '今月の振り返りをして' },
          { label: '💡 節約のコツ', prompt: '浪費を減らすコツを教えて' },
        ].map((q, i) => (
          <button
            key={i}
            onClick={() => sendMessage(q.prompt)}
            className="whitespace-nowrap rounded-full border border-[#e9d5ff] bg-white px-3 py-1.5 text-xs text-[#9333ea] shadow-sm transition-colors hover:bg-[#faf5ff]"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 border-t border-[#f3e8ff] bg-white/80 px-4 py-3 backdrop-blur-sm">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && sendMessage()}
          placeholder="今日の支出を教えてね..."
          className="flex-1 rounded-full border border-[#e9d5ff] bg-[#faf5ff] px-4 py-2.5 text-base text-[#4a3660] outline-none placeholder:text-[#c4b5d0] focus:border-[#c084fc] focus:bg-white focus:ring-2 focus:ring-[#c084fc]/20"
        />
        <button
          onClick={() => sendMessage()}
          disabled={isLoading}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#c084fc] to-[#e879f9] text-lg text-white shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-40"
        >
          ▲
        </button>
      </div>
    </div>
  );
}

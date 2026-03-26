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

export default function ChatView() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'こんにちは！今日の支出を教えてね🌱\n「コンビニで350円使った」みたいに話しかけてくれたら、一緒に記録しよう。',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

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
      // Fetch recent transactions for context
      const txRes = await fetch('/api/transactions');
      const txAll = await txRes.json();
      const settingsRes = await fetch('/api/settings');
      const settings = await settingsRes.json();
      const allowance = settings.allowance || 5000;

      const today = new Date().toISOString().slice(0, 10);
      const txSummary = txAll
        .slice(0, 10)
        .map(
          (t: TransactionData) =>
            `${t.date} ${t.description} ¥${t.amount} [${CATS[t.category]?.label}/${t.subcategory}]`
        )
        .join('\n');

      const system = `あなたは中学1年生の女の子のお小遣い管理AIアシスタントです。
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
      const raw = data.content?.[0]?.text || 'ごめん、エラーが起きちゃった😢';

      // Extract transaction
      const txMatch = raw.match(/<tx>([\s\S]*?)<\/tx>/);
      const clean = raw.replace(/<tx>[\s\S]*?<\/tx>/g, '').trim();

      setChatHistory([...newHistory, { role: 'assistant', content: raw }]);

      const newMessages: Message[] = [{ role: 'assistant', content: clean }];

      if (txMatch) {
        try {
          const tx: TransactionData = JSON.parse(txMatch[1]);
          if (tx.amount && tx.category) {
            // Save to DB
            await fetch('/api/transactions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(tx),
            });
            const cat = CATS[tx.category];
            newMessages.push({
              role: 'system',
              content: `✓ 記録しました：${tx.description}  ¥${tx.amount.toLocaleString()}  [${cat.label} / ${tx.subcategory}]`,
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
        { role: 'assistant', content: 'ごめん、エラーが起きちゃった。もう一度試してみて！' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Messages */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4 pb-2">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[82%] px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'rounded-[18px_18px_4px_18px] bg-[#1a1a18] text-white'
                  : msg.role === 'system'
                    ? 'w-full rounded-[10px] bg-[#E1F5EE] text-[13px] text-[#0F6E56]'
                    : 'rounded-[18px_18px_18px_4px] bg-[#f4f2ee] text-[#1a1a18]'
              }`}
              dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br>') }}
            />
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-[18px_18px_18px_4px] bg-[#f4f2ee] px-4 py-3">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ccc]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ccc] [animation-delay:0.2s]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ccc] [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-2.5">
        {['今日の支出は？', '今月を振り返る', '浪費を減らしたい'].map((q, i) => {
          const prompts = ['今日の支出を教えて', '今月の振り返りをして', '浪費を減らすコツを教えて'];
          return (
            <button
              key={i}
              onClick={() => sendMessage(prompts[i])}
              className="whitespace-nowrap rounded-2xl border border-[#e0ddd8] bg-[#faf9f7] px-2.5 py-1 text-xs text-[#555] hover:bg-[#f0ede8]"
            >
              {q}
            </button>
          );
        })}
      </div>

      {/* Input */}
      <div className="flex gap-2 border-t border-[#eee] px-4 py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && sendMessage()}
          placeholder="今日の支出を教えて..."
          className="flex-1 rounded-[22px] border border-[#e0ddd8] bg-[#faf9f7] px-4 py-2 text-base outline-none focus:border-[#999] focus:bg-white"
        />
        <button
          onClick={() => sendMessage()}
          disabled={isLoading}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#1a1a18] text-white transition-opacity disabled:opacity-35"
        >
          ↑
        </button>
      </div>
    </div>
  );
}

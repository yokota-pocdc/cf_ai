# おこづかいC/Fトラッカー - Claude Code引き継ぎ指示

## 概要
中学1年生の娘用お小遣い管理Webアプリ。
AIエージェント（Claude API）が支出を聞き取り、「投資・消費・浪費」に分類しながらキャッシュフロー教育を行う。

---

## 技術スタック

- **フレームワーク**: Next.js 14（App Router）
- **スタイリング**: Tailwind CSS
- **DB**: SQLite（better-sqlite3）※ローカル運用想定、将来PlanetScaleに移行可
- **認証**: next-auth（パスフレーズ認証のみ、家族利用想定）
- **デプロイ**: Railway（SQLiteファイルが永続化できるため）
- **APIキー管理**: Railway環境変数（ANTHROPIC_API_KEY）

---

## ディレクトリ構成

```
cf-tracker/
├── app/
│   ├── api/
│   │   ├── chat/route.ts         ← Claude APIプロキシ
│   │   └── transactions/route.ts ← CRUD
│   ├── page.tsx                  ← チャット画面
│   ├── dashboard/page.tsx        ← ダッシュボード
│   └── layout.tsx
├── components/
│   ├── ChatView.tsx
│   ├── Dashboard.tsx
│   └── TxList.tsx
├── lib/
│   ├── db.ts                     ← SQLiteクライアント
│   └── categories.ts             ← 投資/消費/浪費定義
├── .env.local                    ← ANTHROPIC_API_KEY
└── railway.toml
```

---

## DBスキーマ（SQLite）

```sql
CREATE TABLE transactions (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  date      TEXT NOT NULL,          -- YYYY-MM-DD
  amount    INTEGER NOT NULL,
  description TEXT NOT NULL,
  category  TEXT NOT NULL,          -- 'invest' | 'consume' | 'waste'
  subcategory TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
-- INSERT INTO settings VALUES ('allowance', '5000');
```

---

## APIエンドポイント仕様

### POST /api/chat
Anthropic APIへのプロキシ。リクエストボディはそのまま転送。
環境変数 `ANTHROPIC_API_KEY` をサーバサイドで付与。

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const body = await req.json();
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });
  return new Response(res.body, { headers: { 'Content-Type': 'application/json' } });
}
```

### GET/POST /api/transactions
- GET `?month=2025-04` → その月のトランザクション一覧
- POST → 新規追加 `{ date, amount, description, category, subcategory }`
- DELETE `?id=xxx` → 削除

---

## フロントエンド実装の移植元

以下のHTMLファイルを参考に実装してください。
UIロジックとClaudeへのシステムプロンプトはそのまま流用可。

**[cf-tracker.html を同ディレクトリに配置]**

主な移植ポイント：
1. `fetch('https://api.anthropic.com/v1/messages', ...)` → `fetch('/api/chat', ...)`に変更
2. `window.storage.get/set` → `/api/transactions`へのfetchに変更
3. チャット履歴はReact state（useState）で管理

---

## カテゴリ定義（lib/categories.ts）

```typescript
export const CATS = {
  invest: {
    label: '投資',
    subcategories: ['学び・参考書', '習い事・体験', '健康・スポーツ', '道具・文具'],
  },
  consume: {
    label: '消費',
    subcategories: ['友人との交際費', '外食・カフェ', '日用品・生活費', '交通費'],
  },
  waste: {
    label: '浪費',
    subcategories: ['衝動買い', '課金・ガチャ', '無駄な飲食', 'その他'],
  },
} as const;
```

---

## Railway デプロイ手順

```toml
# railway.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "node server.js"
healthcheckPath = "/"
```

```bash
# ローカル確認後
railway login
railway init
railway add --database sqlite   # volumeマウント設定
railway up
railway variables set ANTHROPIC_API_KEY=sk-ant-xxxxx
```

SQLiteファイルのパスは `/data/cf-tracker.db` に固定し、Railway Volumeをマウント。

---

## 認証（オプション・Phase2）

next-authのCredentials providerで家族用パスフレーズ認証。
環境変数 `APP_PASSWORD` で管理。複雑な認証は不要。

---

## 将来の拡張アイデア（実装不要・メモ）

- 月次PDFレポート生成（パパ向けにメール送信）
- お小遣いアップ交渉機能（AIがデータをもとに判定）
- 貯金ゴール設定と達成率トラッキング

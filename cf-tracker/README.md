# おこづかいC/Fノート ✨

AIチャットでお小遣いを「投資・消費・浪費」に分類しながら記録する、子ども向け金融教育Webアプリ。

## 特徴

- **AIチャットで記録** — 「コンビニで350円使った」と話しかけるだけで、AIが一緒に分類を考えてくれる
- **投資・消費・浪費の3分類** — キャッシュフロー思考を自然に身につける
- **浪費を責めない設計** — 「何%まで浪費OKか自分で決めよう」というスタンス
- **ダッシュボード** — 月次の支出合計、残高、カテゴリ別内訳をビジュアルに表示
- **PWA対応** — ホーム画面に追加してアプリのように使える
- **セルフホスト可能** — 自分のサーバーで動かせるオープンソース

## スクリーンショット

| チャット画面 | ダッシュボード |
|:---:|:---:|
| AIと会話しながら支出を記録 | 月次の支出状況を一覧 |

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **スタイリング**: Tailwind CSS
- **データベース**: SQLite (better-sqlite3)
- **AI**: Claude API (Anthropic)
- **デプロイ**: Railway / EC2 + nginx / どこでも

## セットアップ

### 1. クローン & インストール

```bash
git clone https://github.com/your-username/cf-tracker.git
cd cf-tracker
npm install
```

### 2. 環境変数

```bash
cp .env.local.example .env.local
```

`.env.local` を編集：

```
ANTHROPIC_API_KEY=sk-ant-xxxxx    # 必須: Anthropic APIキー
DB_PATH=./data/cf-tracker.db      # 任意: DBファイルパス（デフォルト: ./data/cf-tracker.db）
```

### 3. 起動

```bash
# 開発モード
npm run dev

# 本番ビルド & 起動
npm run build
npm start
```

http://localhost:3000 でアクセス。

### 4. 初期設定（ブラウザで）

ダッシュボードタブから以下を設定：
- **名前** — AIがこの名前で呼びかけてくれる
- **月のお小遣い** — 月の予算額

## デプロイ

### EC2 + nginx

```bash
# アプリをビルド
npm run build

# pm2で永続化（ポートは既存アプリと被らないように）
PORT=3003 pm2 start npm --name "cf-tracker" -- start

# nginx設定（/etc/nginx/conf.d/cf.conf）
# → cf.your-domain.com を localhost:3003 にプロキシ

# SSL証明書
sudo certbot --nginx -d cf.your-domain.com
```

### Railway

```bash
railway login
railway init
railway volume add
railway up
railway variables set ANTHROPIC_API_KEY=sk-ant-xxxxx
railway variables set DB_PATH=/data/cf-tracker.db
```

## カテゴリ定義

| カテゴリ | 説明 | 例 |
|:---:|---|---|
| 🌱 投資 | 学び・成長・健康につながる支出 | 本、習い事、スポーツ用品 |
| 🛒 消費 | 日常生活に必要な支出 | 食事、交通費、文具 |
| 🎀 浪費 | 衝動的・無駄な支出 | ガチャ、衝動買い |

## 機能一覧

- [x] AIチャットで支出記録・分類
- [x] ダッシュボード（月次集計・カテゴリ内訳）
- [x] 記録の個別編集・削除
- [x] 全記録リセット
- [x] チャット履歴の永続化（localStorage）
- [x] 月初の応援メッセージ
- [x] PWA対応
- [x] ユーザー名のカスタマイズ

## ライセンス

MIT

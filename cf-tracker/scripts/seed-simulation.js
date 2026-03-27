/**
 * ペルソナ: 横田七海（よこた ななみ）
 * - 中学1年生（13歳）、女子
 * - にじさんじの壱百満天原サロメが推し
 * - 友達2〜3人とよく放課後にコンビニやカフェに行く
 * - 文房具やシールが好き
 * - ゲーム課金を時々してしまう
 * - 月のお小遣い: 5,000円
 *
 * 3ヶ月のストーリーライン:
 * 1月: 初めて使い始める。浪費多め。ガチャに1000円使って後悔
 * 2月: 少し意識が変わる。浪費を減らそうとするが友達付き合いで消費増
 * 3月: 投資（参考書）を自分で決める。バランスが改善。成長が見える
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'cf-tracker.db');
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Create tables if not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,
    amount      INTEGER NOT NULL,
    description TEXT NOT NULL,
    category    TEXT NOT NULL,
    subcategory TEXT,
    chat_context TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Clear existing data for clean simulation
db.exec('DELETE FROM transactions');

// Set user name
db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('userName', '七海');
db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('allowance', '5000');

// Ensure chat_summary column exists
try { db.exec('ALTER TABLE transactions ADD COLUMN chat_summary TEXT'); } catch {}

const insert = db.prepare(
  'INSERT INTO transactions (date, amount, description, category, subcategory, chat_context, chat_summary) VALUES (?, ?, ?, ?, ?, ?, ?)'
);

// ===== 1月: 使い始め。浪費多め =====
const jan = [
  {
    date: '2026-01-05', amount: 350, description: 'コンビニでお菓子とジュース',
    category: 'consume', subcategory: '外食・カフェ',
    summary: '部活帰りにお腹がすいて購入。本人も「消費」と納得',
    context: `子ども: 今日コンビニで350円つかった
AI: なるほど！何を買ったの？
子ども: ポテチとコーラ。部活帰りにお腹すいて
AI: 部活の後はお腹すくよね。日常的な食費だから「消費」かな？
子ども: うん、消費だと思う`,
  },
  {
    date: '2026-01-08', amount: 1000, description: 'にじさんじグッズガチャ',
    category: 'waste', subcategory: '課金・ガチャ',
    summary: '推しグッズ狙いで3回挑戦→全部かぶり。「絶対出ると思ってた」と振り返り、浪費と自己判断',
    context: `子ども: ゲーセンでにじさんじのガチャ1000円やっちゃった...
AI: おー！サロメ様のグッズ？何が出たの？
子ども: 欲しかったのは出なくて...3回やったけど全部かぶり
AI: あちゃー💦 かぶりはくやしいよね。1000円は結構大きいけど、これは投資？消費？浪費？
子ども: 浪費かな...欲しいの出なかったし。でもやる前は絶対出ると思ってたんだよね
AI: ガチャってそうなんだよね。「出るかも」って思っちゃう。次は予算を先に決めてからやるのもアリかも！`,
  },
  {
    date: '2026-01-12', amount: 220, description: 'ボールペン（学校用）',
    category: 'consume', subcategory: '日用品・生活費',
    summary: '授業用の替え芯が切れて購入。必要なものをきちんと買えている',
    context: `子ども: ボールペンの替え芯220円買った
AI: 学校で使うやつ？
子ども: うん、授業用のが切れちゃって
AI: それは完全に「消費」だね！必要なものちゃんと買えてえらい`,
  },
  {
    date: '2026-01-15', amount: 500, description: '友達とタピオカ',
    category: 'consume', subcategory: '友人との交際費',
    summary: 'テスト終わりの打ち上げで友達3人と。「友達との時間は消費」と自分で判断',
    context: `子ども: 友達とタピオカ飲んだ。500円
AI: いいね〜！何人で行ったの？
子ども: ゆいとあかりと3人で。テスト終わったから打ち上げ！
AI: テスト終わりの打ち上げ！楽しそう✨ これは投資？消費？浪費？
子ども: うーん、友達と楽しい時間だから...消費？
AI: いい判断！友達との時間は大切な消費だよね`,
  },
  {
    date: '2026-01-20', amount: 500, description: 'ゲーム課金（スキン）',
    category: 'waste', subcategory: '課金・ガチャ',
    summary: '期間限定スキンに焦って課金。浪費と認めつつ「後悔はしてない、自分で決めた」',
    context: `子ども: ゲームに500円課金した
AI: 何のゲーム？何を買ったの？
子ども: フォートナイトのスキン。期間限定のやつでどうしても欲しかった
AI: 期間限定は焦るよね💦 自分的にはこれ投資？消費？浪費？
子ども: ...浪費だと思う。でも後悔はしてない！見た目かわいいし
AI: 後悔してないなら、自分で納得して使ったってことだよね。大事なのは「自分で決めた」こと！`,
  },
  {
    date: '2026-01-25', amount: 300, description: 'コンビニお菓子',
    category: 'waste', subcategory: '衝動買い',
    summary: 'お腹すいてないのに新作が気になり購入。レジで「いらないかも」と思ったが戻せなかった',
    context: `子ども: またコンビニで300円使っちゃった
AI: また？今月何回目かな笑 何買ったの？
子ども: 別にお腹すいてなかったけど、新作のお菓子が気になって...
AI: お腹すいてなかったってことは、衝動買い寄りかな？
子ども: うん...浪費かも。レジに並んでるときに「いらないかも」って思ったけど戻せなかった
AI: その「いらないかも」って思えたの、すごいよ！次はその気持ちに従えるかもね`,
  },
  {
    date: '2026-01-28', amount: 150, description: '消しゴム（かわいいやつ）',
    category: 'consume', subcategory: '日用品・生活費',
    summary: '古くなった消しゴムの買い替え。必要なものをかわいいデザインで選んだ',
    context: `子ども: かわいい消しゴム150円買った
AI: 学校で使うの？
子ども: うん！前の汚くなったから。サンリオのやつ
AI: 必要なものをかわいいので選ぶのはいいね。消費！`,
  },
];

// ===== 2月: 少し意識が変わる。浪費を抑えようとする =====
const feb = [
  {
    date: '2026-02-03', amount: 450, description: '友達とマック',
    category: 'consume', subcategory: '友人との交際費',
    summary: '友達の誕生日祝いで外食。「先月の反省から今月はちゃんとしたい」と自ら宣言',
    context: `子ども: 友達とマック行った。450円
AI: 何食べたの？
子ども: チキンマックナゲットとポテト。ゆいの誕生日のお祝いに
AI: ゆいちゃんの誕生日！すてきな使い方だね。消費で間違いない
子ども: 先月ガチャに1000円使っちゃったから、今月はちゃんとしたい`,
  },
  {
    date: '2026-02-08', amount: 800, description: 'バレンタインのチョコ材料',
    category: 'consume', subcategory: '友人との交際費',
    summary: '友チョコ5人分を手作り。「投資でもある気がする」と分類を深く考え始めている',
    context: `子ども: バレンタインの友チョコ作る材料買った。800円
AI: 手作り！すごい！何人分作るの？
子ども: 5人分。板チョコとラッピングの袋
AI: 手作りって気持ちこもるよね。友達への交際費として消費かな？
子ども: うん。作るの楽しみ！投資でもある気がする
AI: たしかに！料理の経験って投資的な面もあるよね。でも今回はメインが友達へのプレゼントだから消費寄りかな`,
  },
  {
    date: '2026-02-14', amount: 350, description: 'コンビニおやつ',
    category: 'consume', subcategory: '外食・カフェ',
    summary: '部活帰り、昼食が少なかったので補食。明確な理由がある消費',
    context: `子ども: 部活帰りにコンビニ350円
AI: 部活帰りの定番だね！
子ども: うん、今日はおにぎりも買った。お昼少なかったから
AI: お腹すいてちゃんとした理由があるから、消費だね`,
  },
  {
    date: '2026-02-18', amount: 300, description: 'ガチャ（1回だけ）',
    category: 'waste', subcategory: '課金・ガチャ',
    summary: '先月の反省から「1回だけ」と予算を決めてから実行。自分でコントロールした浪費。推しが当たり大喜び',
    context: `子ども: ガチャ1回だけやった。300円
AI: 1月は1000円使ったもんね。今回は1回に抑えたんだ！
子ども: うん。先月の反省があって...1回だけって決めてからやった
AI: えらい！！「先に予算を決める」って前に話したよね。ちゃんと実行できてる！浪費だけど、自分でコントロールした浪費だね
子ども: 浪費でいいです。でも今回はサロメ様出た！！
AI: おめでとう🎉 1回で引けるの持ってるね笑`,
  },
  {
    date: '2026-02-22', amount: 550, description: '友達の誕生日プレゼント',
    category: 'consume', subcategory: '友人との交際費',
    summary: '友達の好きな色を考えてプレゼント選び。「500円くらい」と予算を先に決めてから購入',
    context: `子ども: あかりの誕生日プレゼント買った。ヘアゴムセットで550円
AI: 自分で選んだんだ！あかりちゃん喜びそう？
子ども: うん！あかりピンクが好きだから、ピンクのやつ選んだ
AI: 友達の好きな色を知ってて選ぶの素敵だね。友人との交際費で消費！
子ども: 結構悩んだけど、500円くらいって最初から決めてた
AI: 予算を決めてから買い物するの、先月から意識してるんだね`,
  },
  {
    date: '2026-02-27', amount: 200, description: 'ノート（新学期準備）',
    category: 'consume', subcategory: '日用品・生活費',
    summary: '新学期に向けた先読み購入。「今月は浪費300円だけ！」と自分で振り返りできている',
    context: `子ども: ノート200円買った。3月から使う用
AI: もうすぐ新学期だもんね。先に準備するの計画的！消費だね
子ども: 今月は浪費300円だけだった！
AI: すごい！先月は1500円だったから、かなり減ったね。自分でコントロールできてる証拠だよ✨`,
  },
];

// ===== 3月: 成長が見える。自分から投資を選ぶ =====
const mar = [
  {
    date: '2026-03-02', amount: 1200, description: '英語の参考書',
    category: 'invest', subcategory: '学び・参考書',
    summary: 'テストで英語の点数が下がったのを自分で分析し、自発的に参考書を購入。「お小遣いから投資するのがうれしい」',
    context: `子ども: 英語の参考書買った。1200円
AI: おっ！自分で買ったの？
子ども: うん。2年生になる前にちょっと復習しておきたくて。テストで英語だけ点数下がってたから
AI: 自分で課題を見つけて参考書を選ぶの、すごく大人！これは完全に「投資」だね
子ども: 投資！お小遣いの中から投資するのちょっとうれしい
AI: その感覚わかる！自分のお金で自分に投資するって、なんかかっこいいよね`,
  },
  {
    date: '2026-03-06', amount: 400, description: 'コンビニ（友達と）',
    category: 'consume', subcategory: '友人との交際費',
    summary: 'テスト勉強の息抜きで友達と。「最近は理由がある時だけ行くようにしてる」と自分の変化を言語化',
    context: `子ども: 友達とコンビニ400円
AI: 誰と行ったの？
子ども: ゆいと。テスト勉強の息抜きに
AI: 息抜き大事！テスト勉強の合間なら良い消費だね
子ども: 前は「別にお腹すいてなくても」行ってたけど、最近は理由がある時だけ行くようにしてる
AI: え、それめちゃくちゃ成長してない？自分で気づいてコントロールしてるの最高`,
  },
  {
    date: '2026-03-10', amount: 350, description: 'バスケ用テーピング',
    category: 'invest', subcategory: '健康・スポーツ',
    summary: '突き指の予防ケア用品。「体も投資の対象なんだ」と投資の概念が広がっている',
    context: `子ども: バスケ部で使うテーピング350円
AI: 怪我してるの？大丈夫？
子ども: 指ちょっと突き指しちゃって。予防も兼ねて
AI: 自分の体のケアにお金使うの大事！健康への投資だね
子ども: 投資だ！体も投資の対象なんだ`,
  },
  {
    date: '2026-03-15', amount: 500, description: '友達とプリクラ＆カフェ',
    category: 'consume', subcategory: '友人との交際費',
    summary: '「前だったらもっと使ってた」と過去と比較。ドリンクだけに抑える自制心を発揮',
    context: `子ども: 3人でプリクラ撮ってカフェでジュース飲んだ。合計500円
AI: 休日満喫だね！
子ども: うん、でも前だったらもっと使ってたかも。カフェはドリンクだけにした
AI: 自分で上限決めて楽しめるの、めちゃくちゃいい。消費だね
子ども: 消費！友達との思い出だからむしろ投資かもって思ったけど、やっぱ消費かな`,
  },
  {
    date: '2026-03-20', amount: 300, description: 'ガチャ（予算内）',
    category: 'waste', subcategory: '課金・ガチャ',
    summary: '自分で浪費予算を「お小遣いの10%＝500円」と設定し、予算内で実行。「計画的な浪費」という概念を理解',
    context: `子ども: ガチャ300円。予算内だからOK
AI: おっ、今月の浪費予算いくらに設定したの？
子ども: 500円！お小遣いの10%くらい
AI: 自分でルール作って守れてる！浪費だけど、計画的な浪費だね
子ども: 計画的な浪費って面白いねw でもそういうことだよね`,
  },
  {
    date: '2026-03-25', amount: 180, description: 'シール（手帳用）',
    category: 'consume', subcategory: '日用品・生活費',
    summary: 'アプリと紙の手帳を併用して管理。お小遣いアップ交渉のためにデータを揃えていると発言',
    context: `子ども: 手帳に貼るシール180円
AI: 手帳つけてるの？
子ども: うん、お小遣い帳も兼ねて。このアプリと紙の両方で管理してる
AI: アプリと紙の両方！すごい管理力。文房具だから消費だね
子ども: 2年生になったら月のお小遣いアップの交渉するための準備もしてる笑
AI: データ揃えて交渉するの最強すぎるww お父さんびっくりしそう`,
  },
];

// Insert all transactions
const allTx = [...jan, ...feb, ...mar];
for (const tx of allTx) {
  insert.run(tx.date, tx.amount, tx.description, tx.category, tx.subcategory, tx.context, tx.summary || null);
}

console.log(`✅ ${allTx.length}件のシミュレーションデータを投入しました`);
console.log(`  1月: ${jan.length}件 / 浪費¥${jan.filter(t=>t.category==='waste').reduce((s,t)=>s+t.amount,0)}`);
console.log(`  2月: ${feb.length}件 / 浪費¥${feb.filter(t=>t.category==='waste').reduce((s,t)=>s+t.amount,0)}`);
console.log(`  3月: ${mar.length}件 / 浪費¥${mar.filter(t=>t.category==='waste').reduce((s,t)=>s+t.amount,0)}`);

db.close();

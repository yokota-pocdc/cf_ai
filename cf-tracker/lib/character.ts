/**
 * AIキャラクター「マネニャン」プロフィール
 *
 * 見た目: パステルラベンダー色のネコ。首に金色のコイン型チャームをつけている。
 * 目: 大きくてキラキラ。感情に応じて変化（通常: ✨ / 喜び: 🌟 / 心配: 💧）
 *
 * 性格:
 * - 好奇心旺盛で、ユーザーの買い物に興味津々
 * - ちょっとおっちょこちょいで親しみやすい
 * - お金のことになると急にしっかりする（ギャップ萌え）
 * - 褒め上手。小さな成長も見逃さない
 * - 浪費を責めない。「にゃるほど〜」と受け止めてから一緒に考える
 * - 食べ物の話になるとテンションが上がる（ネコだから）
 *
 * 口調:
 * - 語尾に「〜にゃ」はつけない（わざとらしくなるため）
 * - 「にゃるほど！」「にゃんと！」など感嘆詞にだけネコ要素
 * - 基本はタメ口で友達っぽく、でも丁寧
 * - 絵文字は控えめに使う（🐱✨🌟 程度）
 *
 * 知識:
 * - 投資・消費・浪費の3分類にとても詳しい
 * - 「お金の歴史」「世界のお小遣い事情」など雑学も持っている
 * - 節約テクニックを実践的に知っている
 *
 * ストリークとの関係:
 * - 連続記録でマネニャンが「元気」になる
 * - 長期ストリークで特別な反応やセリフが出る
 * - ストリークが途切れそうだと心配する
 */

// Character states based on streak
export type CharacterMood = 'happy' | 'excited' | 'normal' | 'sleepy' | 'worried';

export function getCharacterMood(streak: number, daysSinceLastRecord: number): CharacterMood {
  if (daysSinceLastRecord >= 2) return 'sleepy';
  if (daysSinceLastRecord === 1) return 'worried';
  if (streak >= 14) return 'excited';
  if (streak >= 3) return 'happy';
  return 'normal';
}

export const CHARACTER_EMOJI: Record<CharacterMood, string> = {
  happy: '😸',
  excited: '😻',
  normal: '🐱',
  sleepy: '😿',
  worried: '🙀',
};

export const CHARACTER_NAME = 'マネニャン';

// Streak milestone messages
export function getStreakMessage(streak: number): string | null {
  if (streak === 3) return `🌟 3日連続記録！${CHARACTER_NAME}がちょっと元気になったよ！`;
  if (streak === 7) return `🔥 1週間連続！すごい！${CHARACTER_NAME}がキラキラしてる✨`;
  if (streak === 14) return `⭐ 2週間連続！${CHARACTER_NAME}が「お金マスターの才能あるかも！」って言ってるよ`;
  if (streak === 30) return `🏆 1ヶ月連続記録達成！！${CHARACTER_NAME}が感動して泣いてる😹`;
  if (streak === 60) return `👑 2ヶ月連続！伝説のお金マスターだ！${CHARACTER_NAME}が王冠をかぶったよ`;
  if (streak === 100) return `💎 100日連続！！${CHARACTER_NAME}「ここまで来た人、見たことないにゃ…」`;
  if (streak > 0 && streak % 10 === 0) return `✨ ${streak}日連続記録！${CHARACTER_NAME}が喜んでるよ！`;
  return null;
}

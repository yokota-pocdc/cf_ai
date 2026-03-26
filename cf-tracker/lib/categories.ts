export const CATS = {
  invest: {
    label: '投資',
    emoji: '🌱',
    color: '#059669',
    bg: '#d1fae5',
    mid: '#34d399',
    subcategories: ['学び・参考書', '習い事・体験', '健康・スポーツ', '道具・文具'],
  },
  consume: {
    label: '消費',
    emoji: '🛒',
    color: '#7c3aed',
    bg: '#ede9fe',
    mid: '#a78bfa',
    subcategories: ['友人との交際費', '外食・カフェ', '日用品・生活費', '交通費'],
  },
  waste: {
    label: '浪費',
    emoji: '🎀',
    color: '#e11d48',
    bg: '#ffe4e6',
    mid: '#fb7185',
    subcategories: ['衝動買い', '課金・ガチャ', '無駄な飲食', 'その他'],
  },
} as const;

export type Category = keyof typeof CATS;

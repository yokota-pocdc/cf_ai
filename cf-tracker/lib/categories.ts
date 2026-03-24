export const CATS = {
  invest: {
    label: '投資',
    color: '#0F6E56',
    bg: '#E1F5EE',
    mid: '#1D9E75',
    subcategories: ['学び・参考書', '習い事・体験', '健康・スポーツ', '道具・文具'],
  },
  consume: {
    label: '消費',
    color: '#185FA5',
    bg: '#E6F1FB',
    mid: '#378ADD',
    subcategories: ['友人との交際費', '外食・カフェ', '日用品・生活費', '交通費'],
  },
  waste: {
    label: '浪費',
    color: '#993C1D',
    bg: '#FAECE7',
    mid: '#D85A30',
    subcategories: ['衝動買い', '課金・ガチャ', '無駄な飲食', 'その他'],
  },
} as const;

export type Category = keyof typeof CATS;

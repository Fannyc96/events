import type { CategoryId } from './types';

export interface Category {
  id: CategoryId;
  name: string; // 顯示名稱
  main: string; // 標籤底色、卡片框線
  light: string; // 重要卡片底色
}

// 顏色取自 nipponcolors.com（SPEC 第 3 節）。順序即畫面上由上到下的順序。
export const CATEGORIES: Category[] = [
  { id: 'international', name: 'international', main: '#77428D', light: '#B28FCE' }, // 江戸紫／薄
  { id: 'allied', name: 'allied', main: '#006284', light: '#7DB9DE' }, // 縹／勿忘草
  { id: 'adversary', name: 'adversary', main: '#AB3B3A', light: '#F4A7B9' }, // 真朱／一斥染
  { id: 'cross_strait', name: 'cross-strait, Taiwan', main: '#C7802D', light: '#FAD689' }, // 金茶／浅黄
  { id: 'defense', name: 'defense', main: '#2D6D4B', light: '#A8D8B9' }, // 木賊／白緑
  { id: 'trade_tech', name: 'trade/tech', main: '#0D5661', light: '#66BAB7' }, // 藍／水浅葱
];

export function categoryOf(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export const PRECISION_TEXT = { day: '單日', range: '多日', approx: '大致區間' } as const;

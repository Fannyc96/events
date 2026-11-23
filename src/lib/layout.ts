// 時間軸矩陣的排列規則（SPEC 4.2；對照 prototype-mobile.html 的 renderVals()）。
// 純函式：不碰 React、不碰 DOM，方便單元測試。
import { columnOf, eventDays, parseDate, type Window } from './dates';
import type { EventRow } from './types';

/** 卡片排數（細條軌與溢出軌之外） */
export const CARD_ROWS = 2;

export interface BandLayout {
  /** 合併在這條細條裡的事件，依重要優先排序 */
  ids: string[];
  /** 排序後的第一件，用來產生細條文字 */
  first: EventRow;
  /** 起訖欄（含），為所有細條事件跨度的聯集 */
  cs: number;
  ce: number;
}

export interface CardLayout {
  event: EventRow;
  /** 0 = 卡片第 1 排，1 = 第 2 排 */
  row: number;
  cs: number;
  ce: number;
  /** 事件早於目前範圍：左側不留圓角、不畫框線 */
  cutLeft: boolean;
  /** 事件晚於目前範圍：右側不留圓角、不畫框線 */
  cutRight: boolean;
}

export interface MoreLayout {
  col: number;
  /** 這一欄被收起來的事件數 */
  n: number;
  /** 收起來的事件中是否有重要事件（是的話 +N 用墨色底） */
  hasImportant: boolean;
  /** 這一欄所有事件（含細條與已顯示的卡片），給清單用 */
  ids: string[];
}

export interface LaneLayout {
  band: BandLayout | null;
  cards: CardLayout[];
  more: MoreLayout[];
}

const hasRank = (e: EventRow) => e.manual_rank !== null && e.manual_rank !== undefined;

/**
 * 事件排序（決定誰先占卡片排，也是清單的順序）：
 * 1. 手動排序過的（manual_rank）優先，數字小的在前
 * 2. 重要 → 3. 明確日期（單日／多日）優先於大致區間 → 4. 已確定優先於未確定
 * 5. 開始日早 → 6. 時間長
 */
export function compareEvents(a: EventRow, b: EventRow): number {
  const ra = hasRank(a);
  const rb = hasRank(b);
  if (ra !== rb) return ra ? -1 : 1;
  if (ra && rb && a.manual_rank !== b.manual_rank) return a.manual_rank! - b.manual_rank!;
  const imp = Number(b.important) - Number(a.important);
  if (imp) return imp;
  const precise = Number(a.date_precision === 'approx') - Number(b.date_precision === 'approx');
  if (precise) return precise;
  const sure = Number(b.confirmed) - Number(a.confirmed);
  if (sure) return sure;
  if (a.start_date !== b.start_date) return a.start_date < b.start_date ? -1 : 1;
  return eventDays(b.start_date, b.end_date) - eventDays(a.start_date, a.end_date);
}

/** 事件是否與目前範圍重疊 */
export function overlapsWindow(e: EventRow, win: Window): boolean {
  return parseDate(e.start_date) <= win.end && parseDate(e.end_date) >= win.start;
}

/** 是否放進細條軌：大致區間，且長度超過目前範圍天數的一半 */
export function isBandEvent(e: EventRow, win: Window): boolean {
  return e.date_precision === 'approx' && eventDays(e.start_date, e.end_date) > win.days / 2;
}

interface Placed {
  ev: EventRow;
  sI: number; // 未夾限的起始欄
  eI: number; // 未夾限的結束欄
  cs: number;
  ce: number;
}

/**
 * 排列單一分類列。
 * @param events 該分類的事件（不必先篩範圍；「只看重要」請在呼叫前先篩）
 * @param win 目前的時間範圍
 * @param colCount 欄數（週 7、月 28–31、年 12）
 */
export function layoutLane(events: EventRow[], win: Window, colCount: number): LaneLayout {
  const placed: Placed[] = events
    .filter((e) => overlapsWindow(e, win))
    .sort(compareEvents)
    .map((ev) => {
      const sI = columnOf(parseDate(ev.start_date), win);
      const eI = columnOf(parseDate(ev.end_date), win);
      return { ev, sI, eI, cs: Math.max(0, sI), ce: Math.min(colCount - 1, eI) };
    });

  const bandItems = placed.filter((p) => isBandEvent(p.ev, win));
  const band: BandLayout | null = bandItems.length
    ? {
        ids: bandItems.map((p) => p.ev.id),
        first: bandItems[0].ev,
        cs: Math.min(...bandItems.map((p) => p.cs)),
        ce: Math.max(...bandItems.map((p) => p.ce)),
      }
    : null;

  const occupied: boolean[][] = Array.from({ length: CARD_ROWS }, () => new Array(colCount).fill(false));
  const cards: CardLayout[] = [];
  const hidden: Placed[] = [];

  for (const p of placed) {
    if (bandItems.includes(p)) continue;
    const isFree = (row: number) => {
      for (let q = p.cs; q <= p.ce; q++) if (occupied[row][q]) return false;
      return true;
    };
    let row = 0;
    while (row < CARD_ROWS && !isFree(row)) row++;
    if (row >= CARD_ROWS) {
      hidden.push(p);
      continue;
    }
    for (let q = p.cs; q <= p.ce; q++) occupied[row][q] = true;
    cards.push({ event: p.ev, row, cs: p.cs, ce: p.ce, cutLeft: p.sI < 0, cutRight: p.eI > colCount - 1 });
  }

  const more: MoreLayout[] = [];
  for (let col = 0; col < colCount; col++) {
    const hs = hidden.filter((p) => p.cs <= col && p.ce >= col);
    if (!hs.length) continue;
    more.push({
      col,
      n: hs.length,
      hasImportant: hs.some((p) => p.ev.important),
      ids: placed.filter((p) => p.cs <= col && p.ce >= col).map((p) => p.ev.id),
    });
  }

  return { band, cards, more };
}

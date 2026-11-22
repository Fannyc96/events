import type { Precision, Scale } from './types';

// 所有日期都以「本地時間的午夜」表示，避免 UTC 位移造成差一天。
export const DAY_MS = 86400000;
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const pad = (n: number) => (n < 10 ? '0' : '') + n;

export function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayIso(now: Date = new Date()): string {
  return toIso(now);
}

/** 11/3 */
export function md(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 2026/11/3 */
export function ymd(d: Date): string {
  return `${d.getFullYear()}/${md(d)}`;
}

/** 兩個日期之間相差幾天（b − a） */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}

export interface Window {
  scale: Scale;
  start: Date;
  end: Date;
  /** 範圍內的天數 */
  days: number;
}

export function windowOf(scale: Scale, anchorIso: string): Window {
  const a = parseDate(anchorIso);
  let start: Date;
  let end: Date;
  if (scale === 'year') {
    start = new Date(a.getFullYear(), 0, 1);
    end = new Date(a.getFullYear(), 11, 31);
  } else if (scale === 'month') {
    start = new Date(a.getFullYear(), a.getMonth(), 1);
    end = new Date(a.getFullYear(), a.getMonth() + 1, 0);
  } else {
    const dow = (a.getDay() + 6) % 7; // 週一 = 0
    start = new Date(a.getFullYear(), a.getMonth(), a.getDate() - dow);
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  }
  return { scale, start, end, days: daysBetween(start, end) + 1 };
}

export function shiftAnchor(scale: Scale, anchorIso: string, dir: number): string {
  const a = parseDate(anchorIso);
  if (scale === 'year') return toIso(new Date(a.getFullYear() + dir, a.getMonth(), 1));
  if (scale === 'month') return toIso(new Date(a.getFullYear(), a.getMonth() + dir, 1));
  return toIso(new Date(a.getFullYear(), a.getMonth(), a.getDate() + 7 * dir));
}

export interface Column {
  top: string; // 主要文字：11/16、16、11月
  sub: string; // 星期：一（年視圖為空字串）
  today: boolean;
  weekend: boolean;
}

export function buildColumns(win: Window, today: string): Column[] {
  const cols: Column[] = [];
  const t = parseDate(today);
  if (win.scale === 'year') {
    for (let m = 0; m < 12; m++) {
      cols.push({
        top: `${m + 1}月`,
        sub: '',
        today: t.getFullYear() === win.start.getFullYear() && t.getMonth() === m,
        weekend: false,
      });
    }
    return cols;
  }
  for (let i = 0; i < win.days; i++) {
    const d = new Date(win.start.getFullYear(), win.start.getMonth(), win.start.getDate() + i);
    cols.push({
      top: win.scale === 'week' ? md(d) : String(d.getDate()),
      sub: WEEKDAYS[d.getDay()],
      today: toIso(d) === today,
      weekend: d.getDay() === 0 || d.getDay() === 6,
    });
  }
  return cols;
}

/**
 * 日期落在第幾欄。年視圖以月份為欄；範圍之前回傳 -1 以下、之後回傳 ≥ 欄數，
 * 由呼叫端夾到範圍內並判斷是否被切斷。
 */
export function columnOf(d: Date, win: Window): number {
  if (win.scale === 'year') {
    const y = win.start.getFullYear();
    if (d.getFullYear() < y) return -1;
    if (d.getFullYear() > y) return 12;
    return d.getMonth();
  }
  return daysBetween(win.start, d);
}

/** 頂部列的日期標題：11/16–22、11/30–12/6、2026/11、2026 */
export function titleShort(win: Window): string {
  if (win.scale === 'year') return String(win.start.getFullYear());
  if (win.scale === 'month') return `${win.start.getFullYear()}/${win.start.getMonth() + 1}`;
  const s = win.start;
  const e = win.end;
  return s.getMonth() === e.getMonth() ? `${md(s)}–${e.getDate()}` : `${md(s)}–${md(e)}`;
}

/** 給螢幕閱讀器的完整標題 */
export function titleFull(win: Window): string {
  if (win.scale === 'year') return `${win.start.getFullYear()} 年`;
  if (win.scale === 'month') return `${win.start.getFullYear()} 年 ${win.start.getMonth() + 1} 月`;
  return `${ymd(win.start)} – ${md(win.end)}`;
}

/** 單日與多日的顯示文字：5/19、5/29-31、11/30-12/2 */
export function autoLabel(prec: Precision, startIso: string, endIso: string): string {
  const a = parseDate(startIso);
  const b = parseDate(endIso);
  if (prec === 'day' || startIso === endIso) return md(a);
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) return `${md(a)}-${b.getDate()}`;
  return `${md(a)}-${md(b)}`;
}

/** 詳情的完整區間：2026/11/3、2026/8/1 – 2026/9/30（大致） */
export function rangeText(prec: Precision, startIso: string, endIso: string): string {
  if (startIso === endIso) return ymd(parseDate(startIso));
  return `${ymd(parseDate(startIso))} – ${ymd(parseDate(endIso))}${prec === 'approx' ? '（大致）' : ''}`;
}

export function eventDays(startIso: string, endIso: string): number {
  return daysBetween(parseDate(startIso), parseDate(endIso)) + 1;
}

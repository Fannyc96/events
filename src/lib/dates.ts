import type { Precision, Scale } from './types';

// 所有日期都以「本地時間的午夜」表示，避免 UTC 位移造成差一天。
export const DAY_MS = 86400000;
/** 週視圖一次顯示幾週 */
export const WEEK_SPAN = 2;
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
    // 年：anchor 所在月份的前一個月開始，連續 12 個月（例：今天 2026/11 → 2026/10–2027/9）
    start = new Date(a.getFullYear(), a.getMonth() - 1, 1);
    end = new Date(start.getFullYear(), start.getMonth() + 12, 0);
  } else {
    // 雙週：anchor 所在那週的週一開始，共 14 天（這週＋隔週）
    const dow = (a.getDay() + 6) % 7; // 週一 = 0
    start = new Date(a.getFullYear(), a.getMonth(), a.getDate() - dow);
    end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + WEEK_SPAN * 7 - 1);
  }
  return { scale, start, end, days: daysBetween(start, end) + 1 };
}

export function shiftAnchor(scale: Scale, anchorIso: string, dir: number): string {
  const a = parseDate(anchorIso);
  if (scale === 'year') return toIso(new Date(a.getFullYear(), a.getMonth() + 12 * dir, 1));
  return toIso(new Date(a.getFullYear(), a.getMonth(), a.getDate() + WEEK_SPAN * 7 * dir));
}

export interface Column {
  top: string; // 主要文字：11/16、10月
  sub: string; // 雙週：星期（一）；年：第一欄與 1 月顯示年份（2027），其他為空字串
  today: boolean;
  weekend: boolean;
}

export function buildColumns(win: Window, today: string): Column[] {
  const cols: Column[] = [];
  const t = parseDate(today);
  if (win.scale === 'year') {
    for (let i = 0; i < 12; i++) {
      const d = new Date(win.start.getFullYear(), win.start.getMonth() + i, 1);
      cols.push({
        top: `${d.getMonth() + 1}月`,
        sub: i === 0 || d.getMonth() === 0 ? String(d.getFullYear()) : '',
        today: t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth(),
        weekend: false,
      });
    }
    return cols;
  }
  for (let i = 0; i < win.days; i++) {
    const d = new Date(win.start.getFullYear(), win.start.getMonth(), win.start.getDate() + i);
    cols.push({
      top: md(d),
      sub: WEEKDAYS[d.getDay()],
      today: toIso(d) === today,
      weekend: d.getDay() === 0 || d.getDay() === 6,
    });
  }
  return cols;
}

/**
 * 日期落在第幾欄。雙週視圖以日為欄、年視圖以月份為欄；範圍之前回傳 -1 以下、之後回傳 ≥ 欄數，
 * 由呼叫端夾到範圍內並判斷是否被切斷。
 */
export function columnOf(d: Date, win: Window): number {
  if (win.scale === 'year') {
    return (d.getFullYear() - win.start.getFullYear()) * 12 + (d.getMonth() - win.start.getMonth());
  }
  return daysBetween(win.start, d);
}

const yy = (d: Date) => String(d.getFullYear()).slice(2);

/** 頁首的日期標題：11/16–29、11/30–12/13；年：26/10–27/9（兩位數年份，手機放得下） */
export function titleShort(win: Window): string {
  if (win.scale === 'year') {
    return `${yy(win.start)}/${win.start.getMonth() + 1}–${yy(win.end)}/${win.end.getMonth() + 1}`;
  }
  const s = win.start;
  const e = win.end;
  return s.getMonth() === e.getMonth() ? `${md(s)}–${e.getDate()}` : `${md(s)}–${md(e)}`;
}

/** 給螢幕閱讀器的完整標題 */
export function titleFull(win: Window): string {
  if (win.scale === 'year') {
    return `${win.start.getFullYear()} 年 ${win.start.getMonth() + 1} 月 – ${win.end.getFullYear()} 年 ${win.end.getMonth() + 1} 月`;
  }
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

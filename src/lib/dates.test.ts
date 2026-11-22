import { describe, expect, it } from 'vitest';
import {
  autoLabel,
  buildColumns,
  columnOf,
  parseDate,
  rangeText,
  shiftAnchor,
  titleShort,
  toIso,
  windowOf,
} from './dates';

describe('windowOf', () => {
  it('雙週：這週的週一開始，到隔週週日，共 14 天', () => {
    const w = windowOf('week', '2026-11-21'); // 週六
    expect(toIso(w.start)).toBe('2026-11-16');
    expect(toIso(w.end)).toBe('2026-11-29');
    expect(w.days).toBe(14);
  });

  it('雙週：週日屬於前一個週一開始的那週', () => {
    const w = windowOf('week', '2026-11-22');
    expect(toIso(w.start)).toBe('2026-11-16');
  });

  it('雙週：跨月、跨年', () => {
    const w = windowOf('week', '2026-12-30');
    expect(toIso(w.start)).toBe('2026-12-28');
    expect(toIso(w.end)).toBe('2027-01-10');
  });

  it('年：1/1 到 12/31', () => {
    const w = windowOf('year', '2026-11-21');
    expect(toIso(w.start)).toBe('2026-01-01');
    expect(toIso(w.end)).toBe('2026-12-31');
    expect(w.days).toBe(365);
  });
});

describe('shiftAnchor', () => {
  it('雙週 ±14 天、年 ±1 年', () => {
    expect(shiftAnchor('week', '2026-11-21', 1)).toBe('2026-12-05');
    expect(shiftAnchor('week', '2026-11-21', -1)).toBe('2026-11-07');
    expect(toIso(windowOf('week', shiftAnchor('week', '2026-11-21', 1)).start)).toBe('2026-11-30');
    expect(shiftAnchor('year', '2026-11-21', 1)).toBe('2027-11-01');
  });
});

describe('titleShort', () => {
  it('雙週：同月與跨月', () => {
    expect(titleShort(windowOf('week', '2026-11-04'))).toBe('11/2–15');
    expect(titleShort(windowOf('week', '2026-11-18'))).toBe('11/16–29');
    expect(titleShort(windowOf('week', '2026-12-02'))).toBe('11/30–12/13');
  });
  it('年', () => {
    expect(titleShort(windowOf('year', '2026-11-18'))).toBe('2026');
  });
});

describe('buildColumns', () => {
  it('雙週視圖：14 欄，標題、星期、今天、週末', () => {
    const cols = buildColumns(windowOf('week', '2026-11-21'), '2026-11-21');
    expect(cols).toHaveLength(14);
    expect(cols[0]).toMatchObject({ top: '11/16', sub: '一', today: false, weekend: false });
    expect(cols[5]).toMatchObject({ top: '11/21', sub: '六', today: true, weekend: true });
    expect(cols[7]).toMatchObject({ top: '11/23', sub: '一' });
    expect(cols[13]).toMatchObject({ top: '11/29', sub: '日', weekend: true });
  });

  it('年視圖：12 個月，今天所在月份', () => {
    const cols = buildColumns(windowOf('year', '2026-01-01'), '2026-11-21');
    expect(cols.map((c) => c.top)[10]).toBe('11月');
    expect(cols.findIndex((c) => c.today)).toBe(10);
    expect(buildColumns(windowOf('year', '2027-01-01'), '2026-11-21').some((c) => c.today)).toBe(false);
  });
});

describe('columnOf', () => {
  it('年視圖：前一年 -1、後一年 12', () => {
    const w = windowOf('year', '2026-06-01');
    expect(columnOf(parseDate('2025-12-31'), w)).toBe(-1);
    expect(columnOf(parseDate('2026-03-15'), w)).toBe(2);
    expect(columnOf(parseDate('2027-01-01'), w)).toBe(12);
  });
});

describe('autoLabel / rangeText', () => {
  it('產生顯示文字', () => {
    expect(autoLabel('day', '2026-05-19', '2026-05-19')).toBe('5/19');
    expect(autoLabel('range', '2026-05-29', '2026-05-31')).toBe('5/29-31');
    expect(autoLabel('range', '2026-11-30', '2026-12-02')).toBe('11/30-12/2');
  });
  it('詳情的完整區間', () => {
    expect(rangeText('day', '2026-11-03', '2026-11-03')).toBe('2026/11/3');
    expect(rangeText('approx', '2026-08-01', '2026-09-30')).toBe('2026/8/1 – 2026/9/30（大致）');
    expect(rangeText('range', '2026-05-29', '2026-05-31')).toBe('2026/5/29 – 2026/5/31');
  });
});

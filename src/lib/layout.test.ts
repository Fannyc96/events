import { describe, expect, it } from 'vitest';
import { windowOf } from './dates';
import { compareEvents, isBandEvent, layoutLane } from './layout';
import { ev } from './testUtils';

const week = windowOf('week', '2026-11-16'); // 雙週：11/16（一）– 11/29（日），14 欄
const year = windowOf('year', '2026-02-01'); // 2026/1–2026/12

describe('isBandEvent（細條門檻）', () => {
  it('approx 且長度 > 範圍一半才算；剛好一半不算（雙週 14 天，一半 = 7）', () => {
    expect(isBandEvent(ev({ start_date: '2026-11-16', end_date: '2026-11-23', date_precision: 'approx' }), week)).toBe(true); // 8 天
    expect(isBandEvent(ev({ start_date: '2026-11-16', end_date: '2026-11-22', date_precision: 'approx' }), week)).toBe(false); // 7 天
  });

  it('非 approx 的長事件不算', () => {
    expect(isBandEvent(ev({ start_date: '2026-11-01', end_date: '2026-11-30', date_precision: 'range' }), week)).toBe(false);
  });
});

describe('compareEvents', () => {
  const ids = (xs: ReturnType<typeof ev>[]) => [...xs].sort(compareEvents).map((e) => e.id);

  it('重要優先 → 開始日早 → 時間長', () => {
    const a = ev({ id: 'a', start_date: '2026-11-18', end_date: '2026-11-18' });
    const b = ev({ id: 'b', start_date: '2026-11-17', end_date: '2026-11-17' });
    const c = ev({ id: 'c', start_date: '2026-11-17', end_date: '2026-11-20' });
    const d = ev({ id: 'd', start_date: '2026-11-20', end_date: '2026-11-20', important: true });
    expect(ids([a, b, c, d])).toEqual(['d', 'c', 'b', 'a']);
  });

  it('同重要性：明確日期優先於大致區間（即使大致區間開始得早）', () => {
    const approx = ev({ id: 'approx', start_date: '2026-11-01', end_date: '2026-11-30', date_precision: 'approx' });
    const day = ev({ id: 'day', start_date: '2026-11-20', end_date: '2026-11-20' });
    expect(ids([approx, day])).toEqual(['day', 'approx']);
  });

  it('同重要性、同為明確日期：已確定優先於未確定', () => {
    const unsure = ev({ id: 'unsure', start_date: '2026-11-17', end_date: '2026-11-17', confirmed: false });
    const sure = ev({ id: 'sure', start_date: '2026-11-19', end_date: '2026-11-19' });
    expect(ids([unsure, sure])).toEqual(['sure', 'unsure']);
  });

  it('重要性優先於日期類型與確定與否', () => {
    const impApproxUnsure = ev({ id: 'imp', start_date: '2026-11-01', end_date: '2026-11-30', date_precision: 'approx', confirmed: false, important: true });
    const plain = ev({ id: 'plain', start_date: '2026-11-17', end_date: '2026-11-17' });
    expect(ids([plain, impApproxUnsure])).toEqual(['imp', 'plain']);
  });

  it('手動排序優先於所有預設規則，數字小的在前', () => {
    const imp = ev({ id: 'imp', start_date: '2026-11-17', end_date: '2026-11-17', important: true });
    const r1 = ev({ id: 'r1', start_date: '2026-11-18', end_date: '2026-11-18', manual_rank: 1 });
    const r0 = ev({ id: 'r0', start_date: '2026-11-19', end_date: '2026-11-19', manual_rank: 0, confirmed: false });
    expect(ids([imp, r1, r0])).toEqual(['r0', 'r1', 'imp']);
  });

  it('manual_rank 為 null 或沒有這個欄位，都當作沒有手動排序', () => {
    const a = ev({ id: 'a', start_date: '2026-11-17', end_date: '2026-11-17', manual_rank: null });
    const b = ev({ id: 'b', start_date: '2026-11-18', end_date: '2026-11-18' });
    expect(ids([b, a])).toEqual(['a', 'b']);
  });
});

describe('layoutLane 的手動排序', () => {
  it('手動排在前面的事件占卡片排，原本排前面的被收進 +N', () => {
    const base = { start_date: '2026-11-18', end_date: '2026-11-18' };
    const r = layoutLane(
      [ev({ id: 'imp', ...base, important: true }), ev({ id: 'x', ...base }), ev({ id: 'pick', ...base, manual_rank: 0 })],
      week,
      14,
    );
    expect(r.cards.map((c) => c.event.id)).toEqual(['pick', 'imp']);
    expect(r.more[0].ids).toEqual(['pick', 'imp', 'x']);
  });
});

describe('layoutLane', () => {
  it('過濾掉不在範圍內的事件', () => {
    const r = layoutLane([ev({ start_date: '2026-12-01', end_date: '2026-12-01' })], week, 14);
    expect(r.cards).toHaveLength(0);
    expect(r.band).toBeNull();
  });

  it('同一欄：第 1、2 排各放一件，第三件收起並出現 +1', () => {
    const evs = [
      ev({ id: 'x', start_date: '2026-11-18', end_date: '2026-11-18' }),
      ev({ id: 'y', start_date: '2026-11-18', end_date: '2026-11-18' }),
      ev({ id: 'z', start_date: '2026-11-18', end_date: '2026-11-18' }),
    ];
    const r = layoutLane(evs, week, 14);
    expect(r.cards.map((c) => [c.event.id, c.row, c.cs, c.ce])).toEqual([
      ['x', 0, 2, 2],
      ['y', 1, 2, 2],
    ]);
    expect(r.more).toEqual([{ col: 2, n: 1, hasImportant: false, ids: ['x', 'y', 'z'] }]);
  });

  it('不重疊的事件都放在第 1 排', () => {
    const r = layoutLane(
      [
        ev({ start_date: '2026-11-16', end_date: '2026-11-17' }),
        ev({ start_date: '2026-11-18', end_date: '2026-11-19' }),
      ],
      week,
      14,
    );
    expect(r.cards.map((c) => c.row)).toEqual([0, 0]);
  });

  it('重要事件優先占位，被收起的一般事件 +N 用主色', () => {
    const r = layoutLane(
      [
        ev({ id: 'n1', start_date: '2026-11-18', end_date: '2026-11-18' }),
        ev({ id: 'n2', start_date: '2026-11-18', end_date: '2026-11-18' }),
        ev({ id: 'i1', start_date: '2026-11-18', end_date: '2026-11-18', important: true }),
      ],
      week,
      14,
    );
    expect(r.cards.map((c) => c.event.id)).toEqual(['i1', 'n1']);
    expect(r.more[0]).toMatchObject({ n: 1, hasImportant: false });
  });

  it('收起的事件含重要事件時 hasImportant = true', () => {
    const r = layoutLane(
      [
        ev({ id: 'a', start_date: '2026-11-17', end_date: '2026-11-21', important: true }), // 長
        ev({ id: 'b', start_date: '2026-11-17', end_date: '2026-11-20', important: true }),
        ev({ id: 'c', start_date: '2026-11-18', end_date: '2026-11-18', important: true }),
      ],
      week,
      14,
    );
    expect(r.cards.map((c) => c.event.id)).toEqual(['a', 'b']);
    expect(r.more).toEqual([{ col: 2, n: 1, hasImportant: true, ids: ['a', 'b', 'c'] }]);
  });

  it('多欄事件收起時，每一欄都有 +N', () => {
    const r = layoutLane(
      [
        ev({ start_date: '2026-11-16', end_date: '2026-11-22' }),
        ev({ start_date: '2026-11-16', end_date: '2026-11-22' }),
        ev({ start_date: '2026-11-17', end_date: '2026-11-18' }),
      ],
      week,
      14,
    );
    expect(r.more.map((m) => m.col)).toEqual([1, 2]);
  });

  it('細條：單一條', () => {
    const r = layoutLane(
      [ev({ id: 'b1', start_date: '2026-11-01', end_date: '2026-11-30', date_precision: 'approx' })],
      week,
      14,
    );
    expect(r.band).toMatchObject({ ids: ['b1'], cs: 0, ce: 13 });
    expect(r.cards).toHaveLength(0);
  });

  it('年視圖：只有超過半年的 approx 進細條，其餘照卡片規則排', () => {
    const r = layoutLane(
      [
        ev({ id: 'spring', start_date: '2026-03-01', end_date: '2026-05-31', date_precision: 'approx' }),
        ev({ id: 'h1', start_date: '2026-01-01', end_date: '2026-06-30', date_precision: 'approx', important: true }),
        ev({ id: 'whole', start_date: '2026-01-01', end_date: '2026-12-31', date_precision: 'approx' }),
        ev({ id: 'may', start_date: '2026-05-01', end_date: '2026-05-31', date_precision: 'approx' }), // 31 天 → 卡片
      ],
      year,
      12,
    );
    // 年範圍 365 天，一半 182.5；上半年 181 天也不夠
    expect(r.band?.ids).toEqual(['whole']);
    expect(r.band).toMatchObject({ cs: 0, ce: 11 });
    // h1（重要）第 1 排 1–6 月；spring 第 2 排 3–5 月；may 兩排都滿 → 收起，5 月出現 +1
    expect(r.cards.map((c) => [c.event.id, c.row])).toEqual([
      ['h1', 0],
      ['spring', 1],
    ]);
    expect(r.more).toEqual([{ col: 4, n: 1, hasImportant: false, ids: ['h1', 'whole', 'spring', 'may'] }]);
  });

  it('細條：雙週視圖下多條合併', () => {
    const r = layoutLane(
      [
        ev({ id: 'p', start_date: '2026-11-01', end_date: '2026-11-19', date_precision: 'approx' }),
        ev({ id: 'q', start_date: '2026-11-18', end_date: '2026-12-31', date_precision: 'approx', important: true }),
      ],
      week,
      14,
    );
    expect(r.band).toMatchObject({ ids: ['q', 'p'], cs: 0, ce: 13 });
    expect(r.band?.first.id).toBe('q');
  });

  it('細條不占卡片排，也不計入 +N，但列在該欄清單中', () => {
    const r = layoutLane(
      [
        ev({ id: 'band', start_date: '2026-11-01', end_date: '2026-11-30', date_precision: 'approx' }),
        ev({ id: 'a', start_date: '2026-11-18', end_date: '2026-11-18' }),
        ev({ id: 'b', start_date: '2026-11-18', end_date: '2026-11-18' }),
        ev({ id: 'c', start_date: '2026-11-18', end_date: '2026-11-18' }),
      ],
      week,
      14,
    );
    expect(r.cards.map((c) => c.event.id)).toEqual(['a', 'b']);
    // 大致區間排在明確日期之後
    expect(r.more).toEqual([{ col: 2, n: 1, hasImportant: false, ids: ['a', 'b', 'c', 'band'] }]);
  });

  it('超出範圍的那一側標記為切斷', () => {
    const r = layoutLane(
      [
        ev({ id: 'left', start_date: '2026-11-14', end_date: '2026-11-17' }),
        ev({ id: 'right', start_date: '2026-11-28', end_date: '2026-12-01' }),
        ev({ id: 'in', start_date: '2026-11-19', end_date: '2026-11-19' }),
      ],
      week,
      14,
    );
    const byId = Object.fromEntries(r.cards.map((c) => [c.event.id, c]));
    expect(byId.left).toMatchObject({ cs: 0, ce: 1, cutLeft: true, cutRight: false });
    expect(byId.right).toMatchObject({ cs: 12, ce: 13, cutLeft: false, cutRight: true });
    expect(byId.in).toMatchObject({ cutLeft: false, cutRight: false });
  });

  it('年視圖：跨年事件夾到 1 月或 12 月並標記切斷', () => {
    const r = layoutLane(
      [
        ev({ id: 'from2025', start_date: '2025-12-20', end_date: '2026-01-05' }),
        ev({ id: 'to2027', start_date: '2026-12-28', end_date: '2027-01-03' }),
      ],
      year,
      12,
    );
    const byId = Object.fromEntries(r.cards.map((c) => [c.event.id, c]));
    expect(byId.from2025).toMatchObject({ cs: 0, ce: 0, cutLeft: true, cutRight: false });
    expect(byId.to2027).toMatchObject({ cs: 11, ce: 11, cutLeft: false, cutRight: true });
  });
});

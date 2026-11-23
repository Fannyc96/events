import { describe, expect, it } from 'vitest';
import { futureEvents, searchEvents } from './search';
import { ev } from './testUtils';

const list = [
  ev({ id: 'g7', stakeholder: 'G7', title: 'Summit', start_date: '2027-06-01', end_date: '2027-06-30', location: '美國', category: 'international' }),
  ev({ id: 'hk', stakeholder: '台', title: '漢光演習', start_date: '2026-08-05', end_date: '2026-08-14', category: 'defense' }),
  ev({ id: 'fomc', stakeholder: '美', title: 'FED FOMC會議', start_date: '2026-12-08', end_date: '2026-12-09', note: '利率決策', category: 'trade_tech' }),
];

describe('searchEvents', () => {
  it('比對標題、stakeholder、地點、備註、分類名稱，不分大小寫', () => {
    expect(searchEvents(list, 'summit').map((e) => e.id)).toEqual(['g7']);
    expect(searchEvents(list, 'g7').map((e) => e.id)).toEqual(['g7']);
    expect(searchEvents(list, '美國').map((e) => e.id)).toEqual(['g7']);
    expect(searchEvents(list, '利率').map((e) => e.id)).toEqual(['fomc']);
    expect(searchEvents(list, 'defense').map((e) => e.id)).toEqual(['hk']);
  });

  it('多個關鍵字都要符合', () => {
    expect(searchEvents(list, '美 fomc').map((e) => e.id)).toEqual(['fomc']);
    expect(searchEvents(list, '美 漢光')).toEqual([]);
  });

  it('依開始日排序；空白查詢回傳空陣列', () => {
    expect(searchEvents(list, 'e').map((e) => e.id)).toEqual(['hk', 'fomc', 'g7']);
    expect(searchEvents(list, '   ')).toEqual([]);
  });
});

describe('futureEvents', () => {
  it('結束日 ≥ 今天', () => {
    expect(futureEvents(list, '2026-12-09').map((e) => e.id)).toEqual(['g7', 'fomc']);
  });
});

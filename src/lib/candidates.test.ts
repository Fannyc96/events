import { describe, expect, it } from 'vitest';
import { isAllowedSource, isDuplicate, normalizeTitle, planImport, titleSimilarity, validateCandidate, type ExistingEvent } from './candidates';

const TODAY = '2026-11-22';
const DOMAINS = ['reuters.com', 'focustaiwan.tw', 'nato.int'];

const raw = (over: Record<string, unknown> = {}) => ({
  category: 'international',
  stakeholder: 'NATO',
  title: '外長會議',
  start_date: '2026-12-02',
  end_date: '2026-12-03',
  date_precision: 'range',
  confirmed: true,
  important: false,
  source_title: 'Reuters',
  source_url: 'https://www.reuters.com/world/nato-1',
  ai_reason: '新聞寫明日期',
  ...over,
});

const existing = (over: Partial<ExistingEvent>): ExistingEvent => ({
  category: 'international',
  stakeholder: null,
  title: 'x',
  start_date: '2026-12-01',
  end_date: '2026-12-01',
  ...over,
});

describe('isAllowedSource', () => {
  it('允許網域與其子網域', () => {
    expect(isAllowedSource('https://www.reuters.com/a', DOMAINS)).toBe(true);
    expect(isAllowedSource('https://reuters.com/a', DOMAINS)).toBe(true);
    expect(isAllowedSource('https://focustaiwan.tw/politics/1', DOMAINS)).toBe(true);
  });
  it('拒絕其他網域、假冒網域、非 http 網址', () => {
    expect(isAllowedSource('https://example.com/a', DOMAINS)).toBe(false);
    expect(isAllowedSource('https://notreuters.com/a', DOMAINS)).toBe(false);
    expect(isAllowedSource('https://reuters.com.evil.io/a', DOMAINS)).toBe(false);
    expect(isAllowedSource('javascript:alert(1)', DOMAINS)).toBe(false);
    expect(isAllowedSource('not a url', DOMAINS)).toBe(false);
  });
});

describe('validateCandidate', () => {
  it('合法的多日事件：自動產生 date_label', () => {
    const r = validateCandidate(raw(), TODAY, DOMAINS);
    expect(r).toMatchObject({ ok: true, value: { date_label: '12/2-3', date_precision: 'range', stakeholder: 'NATO' } });
  });

  it('分類、標題、日期、來源不合法時拒絕', () => {
    expect(validateCandidate(raw({ category: 'sports' }), TODAY, DOMAINS).ok).toBe(false);
    expect(validateCandidate(raw({ title: '  ' }), TODAY, DOMAINS).ok).toBe(false);
    expect(validateCandidate(raw({ start_date: '2026-13-01' }), TODAY, DOMAINS).ok).toBe(false);
    expect(validateCandidate(raw({ start_date: '2026-02-30' }), TODAY, DOMAINS).ok).toBe(false);
    expect(validateCandidate(raw({ source_url: '' }), TODAY, DOMAINS).ok).toBe(false);
    expect(validateCandidate(raw({ source_url: 'https://blog.example.com/x' }), TODAY, DOMAINS).ok).toBe(false);
    expect(validateCandidate('hello', TODAY, DOMAINS).ok).toBe(false);
  });

  it('只收今天以後：結束日早於今天就拒絕，今天當天可以', () => {
    expect(validateCandidate(raw({ start_date: '2026-11-20', end_date: '2026-11-21' }), TODAY, DOMAINS).ok).toBe(false);
    expect(validateCandidate(raw({ start_date: '2026-11-20', end_date: '2026-11-22' }), TODAY, DOMAINS).ok).toBe(true);
  });

  it('結束早於開始時對調；單日時結束日 = 開始日', () => {
    expect(validateCandidate(raw({ start_date: '2026-12-05', end_date: '2026-12-03' }), TODAY, DOMAINS)).toMatchObject({
      ok: true,
      value: { start_date: '2026-12-03', end_date: '2026-12-05' },
    });
    expect(
      validateCandidate(raw({ date_precision: 'day', start_date: '2026-12-05', end_date: '2026-12-09' }), TODAY, DOMAINS),
    ).toMatchObject({ ok: true, value: { end_date: '2026-12-05', date_label: '12/5' } });
  });

  it('大致區間：保留 Claude 給的顯示文字，沒給就自動產生', () => {
    expect(
      validateCandidate(raw({ date_precision: 'approx', start_date: '2027-01-01', end_date: '2027-02-28', date_label: 'Jan/Feb' }), TODAY, DOMAINS),
    ).toMatchObject({ ok: true, value: { date_label: 'Jan/Feb' } });
    expect(
      validateCandidate(raw({ date_precision: 'approx', start_date: '2027-01-01', end_date: '2027-02-28', date_label: '' }), TODAY, DOMAINS),
    ).toMatchObject({ ok: true, value: { date_label: '1/1-2/28' } });
  });

  it('confirmed / important 只有明確 true 才算', () => {
    expect(validateCandidate(raw({ confirmed: 'yes', important: 1 }), TODAY, DOMAINS)).toMatchObject({
      ok: true,
      value: { confirmed: false, important: false },
    });
  });
});

describe('titleSimilarity / normalizeTitle', () => {
  it('忽略大小寫、空白與標點', () => {
    expect(normalizeTitle('FED FOMC 會議？')).toBe('fedfomc會議');
    expect(titleSimilarity('FED FOMC會議', 'Fed FOMC 會議')).toBe(1);
  });
  it('不同事件相似度低', () => {
    expect(titleSimilarity('漢光演習', 'USMCA expiration')).toBeLessThan(0.2);
  });
});

describe('isDuplicate', () => {
  it('同分類、日期重疊、標題相同 → 重複', () => {
    expect(isDuplicate(existing({ title: 'FED FOMC會議', start_date: '2026-12-08', end_date: '2026-12-09' }), existing({ title: 'Fed FOMC 會議', start_date: '2026-12-09', end_date: '2026-12-09' }))).toBe(true);
  });

  it('標題互相包含 → 重複', () => {
    expect(isDuplicate(existing({ title: '漢光演習實兵演練' }), existing({ title: '漢光演習' }))).toBe(true);
  });

  it('分類不同、日期不重疊 → 不重複', () => {
    const a = existing({ title: '漢光演習' });
    expect(isDuplicate(a, { ...a, category: 'defense' })).toBe(false);
    expect(isDuplicate(a, { ...a, start_date: '2026-12-02', end_date: '2026-12-03' })).toBe(false);
  });

  it('stakeholder 都有但不同 → 不重複（G7 Summit vs NATO Summit）', () => {
    expect(isDuplicate(existing({ stakeholder: 'G7', title: 'Summit' }), existing({ stakeholder: 'NATO', title: 'Summit' }))).toBe(false);
    expect(isDuplicate(existing({ stakeholder: 'G7', title: 'Summit' }), existing({ stakeholder: 'g7', title: 'summit' }))).toBe(true);
  });

  it('大致區間與確切日期重疊也能抓到', () => {
    expect(
      isDuplicate(
        existing({ stakeholder: '台', title: '台北國防展', start_date: '2026-09-17', end_date: '2026-09-19' }),
        existing({ stakeholder: '台', title: '台北國防展', start_date: '2026-09-01', end_date: '2026-09-30' }),
      ),
    ).toBe(true);
  });
});

describe('planImport', () => {
  it('分出可匯入與被拒絕的，並在同一批之間去重', () => {
    const plan = planImport(
      [
        raw(),
        raw({ title: '外長會議 ' }), // 與第一筆重複
        raw({ title: 'Summit', stakeholder: 'G20', start_date: '2026-12-14', end_date: '2026-12-15' }), // 與既有重複
        raw({ source_url: 'https://example.com' }), // 來源不合法
      ],
      [existing({ stakeholder: 'G20', title: 'summit', start_date: '2026-12-14', end_date: '2026-12-15' })],
      TODAY,
      DOMAINS,
    );
    expect(plan.accepted.map((c) => c.title)).toEqual(['外長會議']);
    expect(plan.rejected.map((r) => r.reason)).toEqual([
      expect.stringContaining('重複'),
      expect.stringContaining('重複'),
      expect.stringContaining('網域'),
    ]);
  });
});

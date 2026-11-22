// 自動搜尋的候選事件：驗證、過濾、去重（SPEC 第 8 節）。純函式，給 scripts/import-candidates.ts 用。
import { autoLabel } from './dates';
import type { CategoryId, EventInput, Precision } from './types';

const CATEGORY_IDS: CategoryId[] = ['international', 'allied', 'adversary', 'cross_strait', 'defense', 'trade_tech'];
const PRECISIONS: Precision[] = ['day', 'range', 'approx'];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** 寫進資料庫的候選事件（status、origin 由匯入腳本補上） */
export interface Candidate extends EventInput {
  source_title: string;
  source_url: string;
  ai_reason: string;
}

/** 去重時拿來比對的既有事件（pending / approved / dismissed 都要） */
export interface ExistingEvent {
  category: CategoryId;
  stakeholder: string | null;
  title: string;
  start_date: string;
  end_date: string;
}

export type ValidateResult = { ok: true; value: Candidate } | { ok: false; reason: string };

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

function isValidIso(s: string): boolean {
  if (!ISO.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** 網址的主機名稱是否屬於允許的網域（含子網域，例：www.reuters.com 屬於 reuters.com） */
export function isAllowedSource(url: string, allowedDomains: string[]): boolean {
  let host: string;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    host = u.hostname.toLowerCase();
  } catch {
    return false;
  }
  return allowedDomains.some((d) => {
    const dom = d.toLowerCase().replace(/^\.+/, '');
    return host === dom || host.endsWith('.' + dom);
  });
}

/**
 * 驗證並整理 Claude 回傳的一筆候選事件。
 * 規則：分類與日期類型要合法、標題必填、日期格式正確（結束早於開始時對調）、
 * 必須有來源網址且屬於允許的網域、只收今天以後（結束日 ≥ 今天）的事件。
 */
export function validateCandidate(raw: unknown, today: string, allowedDomains: string[]): ValidateResult {
  if (!raw || typeof raw !== 'object') return { ok: false, reason: '不是物件' };
  const r = raw as Record<string, unknown>;

  const category = str(r.category) as CategoryId;
  if (!CATEGORY_IDS.includes(category)) return { ok: false, reason: `分類不合法：${String(r.category)}` };

  const title = str(r.title);
  if (!title) return { ok: false, reason: '缺少標題' };

  let start = str(r.start_date);
  let end = str(r.end_date) || start;
  if (!isValidIso(start) || !isValidIso(end)) return { ok: false, reason: `日期格式錯誤：${start} / ${end}` };
  if (end < start) [start, end] = [end, start];
  if (end < today) return { ok: false, reason: `已經過去：${end}` };

  const source_url = str(r.source_url);
  if (!source_url) return { ok: false, reason: '缺少來源網址' };
  if (!isAllowedSource(source_url, allowedDomains)) return { ok: false, reason: `來源不在允許的網域：${source_url}` };

  let precision = str(r.date_precision) as Precision;
  if (!PRECISIONS.includes(precision)) precision = start === end ? 'day' : 'range';
  if (precision === 'day') end = start;

  const label =
    precision === 'approx' ? str(r.date_label) || autoLabel('range', start, end) : autoLabel(precision, start, end);

  const orNull = (v: unknown) => str(v) || null;

  return {
    ok: true,
    value: {
      category,
      stakeholder: orNull(r.stakeholder),
      title,
      start_date: start,
      end_date: end,
      date_precision: precision,
      date_label: label,
      confirmed: r.confirmed === true,
      important: r.important === true,
      location: orNull(r.location),
      note: orNull(r.note),
      source_title: str(r.source_title) || new URL(source_url).hostname,
      source_url,
      ai_reason: str(r.ai_reason) || '（未說明）',
    },
  };
}

/** 標題正規化：轉小寫，只留文字與數字（去掉空白、標點、問號等） */
export function normalizeTitle(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function bigrams(s: string): string[] {
  const chars = [...s];
  if (chars.length < 2) return chars;
  const out: string[] = [];
  for (let i = 0; i < chars.length - 1; i++) out.push(chars[i] + chars[i + 1]);
  return out;
}

/** 兩個字串的相似度（字元 bigram 的 Dice 係數，0–1） */
export function titleSimilarity(a: string, b: string): number {
  const x = normalizeTitle(a);
  const y = normalizeTitle(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const bx = bigrams(x);
  const by = bigrams(y);
  const pool = new Map<string, number>();
  for (const g of by) pool.set(g, (pool.get(g) ?? 0) + 1);
  let common = 0;
  for (const g of bx) {
    const n = pool.get(g) ?? 0;
    if (n > 0) {
      common++;
      pool.set(g, n - 1);
    }
  }
  return (2 * common) / (bx.length + by.length);
}

export const SIMILARITY_THRESHOLD = 0.5;

/**
 * 是否為重複事件：同分類 ＋ 日期區間重疊 ＋ 標題相似。
 * 標題相似＝正規化後其中一個包含另一個，或相似度 ≥ 0.5。
 * 兩邊都有 stakeholder 但不同時（例：G7 Summit vs NATO Summit），不算重複。
 */
export function isDuplicate(c: ExistingEvent, e: ExistingEvent): boolean {
  if (c.category !== e.category) return false;
  if (c.start_date > e.end_date || e.start_date > c.end_date) return false;

  const sc = normalizeTitle(c.stakeholder ?? '');
  const se = normalizeTitle(e.stakeholder ?? '');
  if (sc && se && sc !== se && !sc.includes(se) && !se.includes(sc)) return false;

  const tc = normalizeTitle(c.title);
  const te = normalizeTitle(e.title);
  if (!tc || !te) return false;
  if (tc.includes(te) || te.includes(tc)) return true;
  return titleSimilarity(c.title, e.title) >= SIMILARITY_THRESHOLD;
}

export interface ImportPlan {
  accepted: Candidate[];
  rejected: { raw: unknown; reason: string }[];
}

/** 驗證全部候選，並與既有事件、以及同一批的其他候選去重 */
export function planImport(raws: unknown[], existing: ExistingEvent[], today: string, allowedDomains: string[]): ImportPlan {
  const accepted: Candidate[] = [];
  const rejected: ImportPlan['rejected'] = [];
  for (const raw of raws) {
    const v = validateCandidate(raw, today, allowedDomains);
    if (!v.ok) {
      rejected.push({ raw, reason: v.reason });
      continue;
    }
    const dupOf = [...existing, ...accepted].find((e) => isDuplicate(v.value, e));
    if (dupOf) {
      rejected.push({ raw, reason: `重複：${dupOf.stakeholder ? dupOf.stakeholder + ' ' : ''}${dupOf.title}（${dupOf.start_date}）` });
      continue;
    }
    accepted.push(v.value);
  }
  return { accepted, rejected };
}

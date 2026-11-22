// 對應 seed.sql 的 public.events
export type CategoryId =
  | 'international'
  | 'allied'
  | 'adversary'
  | 'cross_strait'
  | 'defense'
  | 'trade_tech';

export type Precision = 'day' | 'range' | 'approx';
export type Status = 'pending' | 'approved' | 'dismissed';
export type Origin = 'manual' | 'auto' | 'import';
/** week = 雙週：從週一開始的 14 天（這週＋隔週）；year = 1–12 月 */
export type Scale = 'week' | 'year';

export interface EventRow {
  id: string;
  category: CategoryId;
  stakeholder: string | null;
  title: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  date_precision: Precision;
  date_label: string;
  confirmed: boolean;
  important: boolean;
  location: string | null;
  note: string | null;
  status: Status;
  origin: Origin;
  source_title: string | null;
  source_url: string | null;
  ai_reason: string | null;
  created_at?: string;
  updated_at?: string;
}

/** 新增／更新時送給資料庫的欄位 */
export type EventInput = Pick<
  EventRow,
  | 'category'
  | 'stakeholder'
  | 'title'
  | 'start_date'
  | 'end_date'
  | 'date_precision'
  | 'date_label'
  | 'confirmed'
  | 'important'
  | 'location'
  | 'note'
>;

// 表單資料的驗證與整理（SPEC 第 5 節）。純函式。
import { autoLabel } from './dates';
import type { CategoryId, EventInput, EventRow, Precision } from './types';

export interface FormState {
  title: string;
  stakeholder: string;
  location: string;
  category: CategoryId;
  precision: Precision;
  start: string;
  end: string;
  label: string; // 只有大致區間才用
  confirmed: boolean;
  important: boolean;
  note: string;
}

export function emptyForm(startIso: string): FormState {
  return {
    title: '',
    stakeholder: '',
    location: '',
    category: 'international',
    precision: 'day',
    start: startIso,
    end: startIso,
    label: '',
    confirmed: true,
    important: false,
    note: '',
  };
}

export function formFromEvent(e: EventRow): FormState {
  return {
    title: e.title,
    stakeholder: e.stakeholder ?? '',
    location: e.location ?? '',
    category: e.category,
    precision: e.date_precision,
    start: e.start_date,
    end: e.end_date,
    label: e.date_precision === 'approx' ? e.date_label : '',
    confirmed: e.confirmed,
    important: e.important,
    note: e.note ?? '',
  };
}

export type NormalizeResult = { ok: true; value: EventInput } | { ok: false; error: string };

export function normalizeForm(f: FormState): NormalizeResult {
  const title = f.title.trim();
  if (!title || !f.start) return { ok: false, error: '請填寫標題與開始日期' };

  let start = f.start;
  let end = f.precision === 'day' ? f.start : f.end || f.start;
  if (end < start) [start, end] = [end, start];

  const label =
    f.precision === 'approx'
      ? f.label.trim() || autoLabel('range', start, end)
      : autoLabel(f.precision, start, end);

  const orNull = (s: string) => (s.trim() ? s.trim() : null);

  return {
    ok: true,
    value: {
      category: f.category,
      stakeholder: orNull(f.stakeholder),
      title,
      start_date: start,
      end_date: end,
      date_precision: f.precision,
      date_label: label,
      confirmed: f.confirmed,
      important: f.important,
      location: orNull(f.location),
      note: f.note.trim() ? f.note : null,
    },
  };
}

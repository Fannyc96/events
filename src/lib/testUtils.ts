import type { EventRow } from './types';

let seq = 0;

/** 測試用：快速建立一筆事件，未給的欄位用預設值 */
export function ev(partial: Partial<EventRow> & Pick<EventRow, 'start_date' | 'end_date'>): EventRow {
  seq += 1;
  return {
    id: partial.id ?? `e${seq}`,
    category: 'international',
    stakeholder: null,
    title: `事件${seq}`,
    date_precision: partial.start_date === partial.end_date ? 'day' : 'range',
    date_label: '',
    confirmed: true,
    important: false,
    location: null,
    note: null,
    status: 'approved',
    origin: 'manual',
    source_title: null,
    source_url: null,
    ai_reason: null,
    ...partial,
  };
}

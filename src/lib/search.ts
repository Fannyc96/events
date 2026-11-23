// 事件搜尋（純函式）：關鍵字以空白分隔，每個關鍵字都要出現在
// 標題、stakeholder、地點、備註、顯示日期或分類名稱其中之一（不分大小寫）。
import { categoryOf } from './categories';
import type { EventRow } from './types';

function haystack(e: EventRow): string {
  return [e.title, e.stakeholder, e.location, e.note, e.date_label, categoryOf(e.category).name]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function searchEvents(events: EventRow[], query: string): EventRow[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return events
    .filter((e) => {
      const h = haystack(e);
      return terms.every((t) => h.includes(t));
    })
    .sort((a, b) => (a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : 0));
}

/** 全部未來事件：結束日 ≥ 今天 */
export function futureEvents(events: EventRow[], today: string): EventRow[] {
  return events.filter((e) => e.end_date >= today);
}

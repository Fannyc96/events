import { CONFIG_ERROR, supabase } from './supabase';
import type { EventInput, EventRow, Status } from './types';

function client() {
  if (!supabase) throw new Error(CONFIG_ERROR);
  return supabase;
}

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

/** 讀取所有已核准與待審核的事件（RLS 也只允許這兩種） */
export async function fetchEvents(): Promise<EventRow[]> {
  const { data, error } = await client()
    .from('events')
    .select('*')
    .in('status', ['approved', 'pending'])
    .order('start_date');
  check(error);
  return (data ?? []) as EventRow[];
}

export async function createEvent(input: EventInput): Promise<void> {
  const { error } = await client()
    .from('events')
    .insert({ ...input, status: 'approved', origin: 'manual' });
  check(error);
}

export async function updateEvent(
  id: string,
  input: Partial<EventInput> & { status?: Status; update_of?: string | null },
): Promise<void> {
  const { error } = await client().from('events').update(input).eq('id', id);
  check(error);
}

export async function setStatus(id: string, status: Status): Promise<void> {
  await updateEvent(id, { status });
}

/**
 * 設定手動排序：ids 依新順序寫入 manual_rank = 0, 1, 2…；reset 時全部清成 null（回到預設排序）。
 */
export async function setManualOrder(ids: string[], reset = false): Promise<void> {
  const results = await Promise.all(
    ids.map((id, i) => client().from('events').update({ manual_rank: reset ? null : i }).eq('id', id)),
  );
  for (const r of results) check(r.error);
}

/**
 * 核准「更新建議」：把建議的內容（或審核時編輯過的 value）寫回原事件，再刪掉這筆建議。
 * 原事件已不存在時，改成把建議本身當新事件核准。
 */
export async function applyUpdate(proposal: EventRow, originalExists: boolean, value?: EventInput): Promise<void> {
  const fields: EventInput = value ?? {
    category: proposal.category,
    stakeholder: proposal.stakeholder,
    title: proposal.title,
    start_date: proposal.start_date,
    end_date: proposal.end_date,
    date_precision: proposal.date_precision,
    date_label: proposal.date_label,
    confirmed: proposal.confirmed,
    important: proposal.important,
    location: proposal.location,
    note: proposal.note,
  };
  if (!originalExists || !proposal.update_of) {
    await updateEvent(proposal.id, { ...fields, status: 'approved', update_of: null });
    return;
  }
  await updateEvent(proposal.update_of, fields);
  await deleteEvent(proposal.id);
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await client().from('events').delete().eq('id', id);
  check(error);
}

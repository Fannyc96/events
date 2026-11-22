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

export async function updateEvent(id: string, input: Partial<EventInput> & { status?: Status }): Promise<void> {
  const { error } = await client().from('events').update(input).eq('id', id);
  check(error);
}

export async function setStatus(id: string, status: Status): Promise<void> {
  await updateEvent(id, { status });
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await client().from('events').delete().eq('id', id);
  check(error);
}

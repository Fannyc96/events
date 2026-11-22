// 呼叫 Supabase Edge Function「trigger-search」：查詢／觸發自動搜尋（GitHub Actions）
import { anonKey, CONFIG_ERROR, url } from './supabase';

export interface RunInfo {
  status: string; // queued | in_progress | completed
  conclusion: string | null; // success | failure | cancelled ...
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface TriggerResponse {
  ok: boolean;
  message?: string;
  lastRun: RunInfo | null;
}

async function call(method: 'GET' | 'POST'): Promise<TriggerResponse> {
  if (!url || !anonKey) throw new Error(CONFIG_ERROR);
  let res: Response;
  try {
    res = await fetch(`${url}/functions/v1/trigger-search`, { method, headers: { apikey: anonKey } });
  } catch {
    throw new Error('連不到搜尋服務（Edge Function 可能還沒部署）');
  }
  const body = (await res.json().catch(() => null)) as TriggerResponse | null;
  if (!body) throw new Error(`搜尋服務回應錯誤（${res.status}）`);
  return body;
}

export const getSearchStatus = () => call('GET');
export const triggerSearch = () => call('POST');

export const isRunning = (r: RunInfo | null) => !!r && r.status !== 'completed';

function hm(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 搜尋狀態的顯示文字 */
export function statusText(r: RunInfo | null): string {
  if (!r) return '還沒有搜尋紀錄';
  if (isRunning(r)) return `搜尋中…（${hm(r.created_at)} 開始，約 5–10 分鐘）`;
  if (r.conclusion === 'success') return `上次搜尋：${hm(r.updated_at)} 完成`;
  if (r.conclusion === 'cancelled') return `上次搜尋已取消（${hm(r.updated_at)}）`;
  return `上次搜尋失敗（${hm(r.updated_at)}）`;
}

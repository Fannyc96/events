import { useCallback, useEffect, useRef, useState } from 'react';
import { getSearchStatus, isRunning, triggerSearch, type RunInfo } from '../lib/searchTrigger';

const POLL_MS = 20000;

/** 自動搜尋的狀態：開頁時查一次；搜尋中每 20 秒查一次，結束時呼叫 onFinished（重新讀事件） */
export function useSearchRun(onFinished: () => void, flash: (msg: string, ms?: number) => void) {
  const [run, setRun] = useState<RunInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const wasRunning = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const r = await getSearchStatus();
      if (!r.ok) throw new Error(r.message ?? '讀取失敗');
      setRun(r.lastRun);
      setError(null);
      if (wasRunning.current && !isRunning(r.lastRun)) onFinished();
      wasRunning.current = isRunning(r.lastRun);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoaded(true);
    }
  }, [onFinished]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const running = isRunning(run);
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(t);
  }, [running, refresh]);

  const start = useCallback(async () => {
    setBusy(true);
    try {
      const r = await triggerSearch();
      flash(r.message ?? (r.ok ? '已開始搜尋' : '無法開始搜尋'), 3000);
      if (r.ok) {
        // GitHub 建立 run 需要幾秒，先顯示為排隊中
        wasRunning.current = true;
        setRun({ status: 'queued', conclusion: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), html_url: '' });
        window.setTimeout(() => void refresh(), 5000);
      } else if (r.lastRun) {
        setRun(r.lastRun);
        wasRunning.current = isRunning(r.lastRun);
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : String(e), 4000);
    } finally {
      setBusy(false);
    }
  }, [flash, refresh]);

  return { run, loaded, error, busy, running, start };
}

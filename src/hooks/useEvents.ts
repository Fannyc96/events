import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchEvents } from '../lib/api';
import type { EventRow } from '../lib/types';

export function useEvents() {
  const [all, setAll] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setAll(await fetchEvents());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const events = useMemo(() => all.filter((e) => e.status === 'approved'), [all]);
  const pending = useMemo(() => all.filter((e) => e.status === 'pending'), [all]);

  return { events, pending, loading, error, reload };
}

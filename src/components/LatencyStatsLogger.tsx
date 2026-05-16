import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import type { LatencyPingLog } from './latencyStatsLoggerShared';
import { readLogs, writeLogs } from './latencyStatsLoggerShared';

async function pingSupabaseOnce(): Promise<{
  ok: boolean;
  ms: number | null;
  error?: string;
}> {
  const start = Date.now();
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    const ms = Date.now() - start;
    if (error) {
      return { ok: false, ms, error: String(error.message || error) };
    }
    return { ok: true, ms };
  } catch (e) {
    const ms = Date.now() - start;
    return {
      ok: false,
      ms,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Pings Supabase every 2 minutes and persists results for the Stats page to show.
 */
export default function LatencyStatsLogger(): null {
  const intervalRef = useRef<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async (): Promise<void> => {
      const result = await pingSupabaseOnce();
      if (cancelled) return;

      const log: LatencyPingLog = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        timestamp: Date.now(),
        ok: result.ok,
        ms: result.ms,
        error: result.ok ? undefined : result.error,
      };

      const existing = readLogs();
      writeLogs([...existing, log]);

      if (!result.ok) {
        setLastError(result.error || 'Ping failed');
      } else {
        setLastError(null);
      }
    };

    // Run once immediately
    void run();

    // Then every 2 minutes
    intervalRef.current = window.setInterval(
      () => {
        void run();
      },
      2 * 60 * 1000,
    );

    return () => {
      cancelled = true;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, []);

  // Keep state update for potential UI usage later.
  // (No side effects required right now.)
  useEffect(() => {
    void lastError;
  }, [lastError]);

  return null;
}

export const STORAGE_KEY = 'latency_ping_logs_v1';

export type LatencyPingLog = {
  id: string;
  timestamp: number;
  ok: boolean;
  ms: number | null;
  error?: string;
};

export function readLogs(): LatencyPingLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LatencyPingLog[];
  } catch {
    return [];
  }
}

export function writeLogs(next: LatencyPingLog[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(-50)));
  } catch {
    // ignore
  }
}

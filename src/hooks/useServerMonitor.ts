import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export type ConnectionStatus = 'online' | 'slow' | 'offline' | 'checking';
export type Alert = {
  id: number;
  type: string;
  message: string;
  timestamp: Date;
}; // TODO: REPLACE WITH DATABASE TYPE!

export function useServerMonitor(): {
  serverStatus: ConnectionStatus;
  internetStatus: ConnectionStatus;
  responseTime: number | null;
  lastChecked: Date | null;
  alerts: Alert[];
  refresh: () => Promise<void>;
  dismissAlert: (alertId: number) => void;
} {
  const [serverStatus, setServerStatus] =
    useState<ConnectionStatus>('checking');
  const [internetStatus, setInternetStatus] =
    useState<ConnectionStatus>('checking');
  const [responseTime, setResponseTime] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Wrapped in useCallback so it can be safely used in useEffect
  const performChecks = useCallback(async () => {
    setInternetStatus('checking');
    setServerStatus('checking');

    let isOnline = true;
    let isSlow = false;

    // 1. Check Client Internet Status First
    if (!navigator.onLine) {
      isOnline = false;
    } else {
      try {
        const start = Date.now();
        // Using a 'no-cors' request to a highly available endpoint prevents CORS errors
        // from falsely triggering an 'offline' state.
        await fetch('https://1.1.1.1/cdn-cgi/trace', {
          mode: 'no-cors',
          cache: 'no-store',
        });
        const time = Date.now() - start;

        if (time > 2000) {
          isSlow = true;
        }
      } catch {
        // If the fetch genuinely fails, the internet is offline
        isOnline = false;
      }
    }

    const currentInternetStatus = isOnline
      ? isSlow
        ? 'slow'
        : 'online'
      : 'offline';
    setInternetStatus(currentInternetStatus);

    // 2. Handle Alerts Gracefully
    if (currentInternetStatus === 'offline') {
      setAlerts((prev) => {
        // Prevent spamming the same alert multiple times
        if (prev.some((a) => a.message === 'Internet connection lost'))
          return prev;
        return [
          ...prev,
          {
            id: Date.now(),
            type: 'error',
            message: 'Internet connection lost',
            timestamp: new Date(),
          },
        ].slice(-5);
      });

      setServerStatus('offline');
      setResponseTime(null);
      return; // Stop here, no point in checking the server if internet is down
    } else {
      // Auto-clear the error alert the second the internet comes back online
      setAlerts((prev) =>
        prev.filter((a) => a.message !== 'Internet connection lost'),
      );
    }

    // 3. Check Supabase Server Health
    try {
      const start = Date.now();
      const { error } = await supabase.from('profiles').select('id').limit(1);
      const time = Date.now() - start;

      setResponseTime(time);
      setLastChecked(new Date());

      if (error) {
        setServerStatus('offline');
      } else if (time > 1500) {
        setServerStatus('slow');
      } else {
        setServerStatus('online');
      }
    } catch {
      setServerStatus('offline');
      setResponseTime(null);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    performChecks();
    const interval = setInterval(performChecks, 10000); // Check every 10 seconds

    // Instant offline detection using the browser's native event listeners
    const handleOffline = (): void => {
      setInternetStatus('offline');
      setAlerts((prev) => {
        if (prev.some((a) => a.message === 'Internet connection lost'))
          return prev;
        return [
          ...prev,
          {
            id: Date.now(),
            type: 'error',
            message: 'Internet connection lost',
            timestamp: new Date(),
          },
        ].slice(-5);
      });
    };

    // Re-run checks immediately when the browser detects the connection is back
    const handleOnline = (): Promise<void> => performChecks();

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [performChecks]);

  const dismissAlert = (alertId: number): void => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  };

  return {
    serverStatus,
    internetStatus,
    responseTime,
    lastChecked,
    alerts,
    refresh: performChecks,
    dismissAlert,
  };
}

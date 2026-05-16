import type { Session } from '@supabase/supabase-js';

type CookieStorageOptions = {
  cookieName: string;
  maxAgeSeconds: number;
  sameSite: 'lax' | 'strict' | 'none';
  secure: boolean;
};

const defaultOptions: CookieStorageOptions = {
  cookieName: 'sb-session',
  maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dayss
  sameSite: 'lax',
  secure: true,
};

function readCookie(name: string): string | null {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp('(?:^|; )' + escapedName + '=([^;]*)');
  const match = document.cookie.match(regex);
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(
  name: string,
  value: string,
  options: CookieStorageOptions,
): void {
  const parts: string[] = [];
  parts.push(`${name}=${encodeURIComponent(value)}`);
  parts.push(`Max-Age=${options.maxAgeSeconds}`);
  parts.push('Path=/');
  parts.push(
    `SameSite=${options.sameSite[0].toUpperCase()}${options.sameSite.slice(1)}`,
  );
  if (options.secure) parts.push('Secure');
  document.cookie = parts.join('; ');
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; Max-Age=0; Path=/;`;
}

/**
 * Minimal Supabase auth storage adapter.
 * Stores the auth token payload in a single browser cookie.
 */
export function createCookieStorage(options?: Partial<CookieStorageOptions>): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
} {
  const merged: CookieStorageOptions = {
    ...defaultOptions,
    ...(options || {}),
  };

  return {
    getItem: (key: string): string | null => {
      void key;
      return readCookie(merged.cookieName);
    },

    setItem: (key: string, value: string): void => {
      void key;
      writeCookie(merged.cookieName, value, merged);
    },

    removeItem: (key: string): void => {
      void key;
      deleteCookie(merged.cookieName);
    },

    clear: (): void => {
      deleteCookie(merged.cookieName);
    },
  };
}

// optional helper (kept for potential debugging)
export function safeParseSession(json: string | null): Session | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as Session;
  } catch {
    return null;
  }
}

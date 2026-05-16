import { supabase } from '../supabaseClient';

const BANNED_DEVICE_COOKIE = 'crooms_banned_device';
const BANNED_DEVICE_ID_COOKIE = 'crooms_banned_device_id';

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  const parts: string[] = [];
  parts.push(`${name}=${encodeURIComponent(value)}`);
  parts.push(`Max-Age=${maxAgeSeconds}`);
  parts.push('Path=/');
  parts.push('SameSite=Lax');
  parts.push('Secure');
  document.cookie = parts.join('; ');
}

function readCookie(name: string): string | null {
  const escapedName = name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  const regex = new RegExp('(?:^|; )' + escapedName + '=([^;]*)');
  const match = document.cookie.match(regex);
  return match ? decodeURIComponent(match[1]) : null;
}

export function isBannedDevice(): boolean {
  return readCookie(BANNED_DEVICE_COOKIE) === 'true';
}

export async function enforceBanForThisDevice(params?: {
  deviceId?: string;
}): Promise<void> {
  try {
    const deviceId =
      params?.deviceId ||
      window.localStorage.getItem('crooms_device_id') ||
      undefined;

    // 30 days (long enough to block re-signup attempts; you can extend).
    const THIRTY_DAYS = 30 * 24 * 60 * 60;

    setCookie(BANNED_DEVICE_COOKIE, 'true', THIRTY_DAYS);
    if (deviceId) setCookie(BANNED_DEVICE_ID_COOKIE, deviceId, THIRTY_DAYS);
  } catch {
    // cookie writes can fail in some environments; continue to sign out.
  }

  try {
    await supabase.auth.signOut();
  } catch {
    // ignore; we still want to refresh UI.t
  }

  // Background refresh (single reload only)
  // Prevent refresh loops: mark per-tab.
  try {
    if (window.sessionStorage.getItem('ban_reload_done') === 'true') return;
    window.sessionStorage.setItem('ban_reload_done', 'true');
  } catch {
    // ignore
  }

  try {
    // Reload the current page once.
    window.location.reload();
  } catch {
    // ignore
  }
}

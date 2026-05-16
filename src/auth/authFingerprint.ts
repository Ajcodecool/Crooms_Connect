const COOKIE_NAME = 'cc-auth';

type AuthFingerprintCookie = {
  uid: string;
  sha: string;
  exp: number; // epoch millis
};

const DEFAULT_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function readCookieRaw(name: string): string | null {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp('(?:^|; )' + escapedName + '=([^;]*)');
  const match = document.cookie.match(regex);
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookieRaw(
  name: string,
  value: string,
  maxAgeSeconds: number,
): void {
  const parts: string[] = [];
  parts.push(`${name}=${encodeURIComponent(value)}`);
  parts.push(`Max-Age=${maxAgeSeconds}`);
  parts.push('Path=/');
  // Match sb-session behavior
  parts.push('SameSite=Lax');
  parts.push('Secure');
  document.cookie = parts.join('; ');
}

function deleteCookieRaw(name: string): void {
  document.cookie = `${name}=; Max-Age=0; Path=/; Secure; SameSite=Lax`;
}

function toEpochMillis(secondsFromNow: number): number {
  return Date.now() + secondsFromNow * 1000;
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function writeAuthFingerprintCookie(params: {
  uid: string;
  // include email when available to reduce accidental collisions if uid changes
  email?: string | null;
  maxAgeSeconds?: number;
}): Promise<void> {
  const { uid, email, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS } = params;

  // SHA input should be stable for the user and deterministic.
  // If your uid never changes, uid alone is sufficient; email is just extra entropy.
  const shaInput = `${uid}:${email ?? ''}`;
  const sha = await sha256Hex(shaInput);

  const cookie: AuthFingerprintCookie = {
    uid,
    sha,
    exp: toEpochMillis(maxAgeSeconds),
  };

  writeCookieRaw(COOKIE_NAME, JSON.stringify(cookie), maxAgeSeconds);
}

export function readAuthFingerprintCookie(): AuthFingerprintCookie | null {
  const raw = readCookieRaw(COOKIE_NAME);
  const parsed = safeJsonParse<AuthFingerprintCookie>(raw);
  if (!parsed?.uid || !parsed?.sha || !parsed?.exp) return null;
  if (Date.now() > parsed.exp) return null;
  return parsed;
}

export function clearAuthFingerprintCookie(): void {
  deleteCookieRaw(COOKIE_NAME);
}


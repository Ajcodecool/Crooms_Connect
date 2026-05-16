import { createClient } from '@supabase/supabase-js';
import { createCookieStorage } from './auth/cookieStorage';

// ------------------------------------------------------------------
// 🔧 CONFIGURATION: RASPBERRY PI VIA CLOUDFLARE TUNNEL
// ------------------------------------------------------------------

const PI_URL = 'https://api.croomsconnect.com';
const PI_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE5MDAwMDAwMDB9.XaG-6cRHV8WIfTcuFMHhRmPdUiqn_jm15U4vzHrrt6w';

// ------------------------------------------------------------------
// 🚀 SINGLETON CLIENT SETUP
// ------------------------------------------------------------------
// We create the instance once and reuse it to prevent "AbortError" locks.

let supabaseInstance = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(PI_URL, PI_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // cookie-backed session persistence (prevents sign-outs when site storage is cleared)
        storage: createCookieStorage({
          cookieName: 'sb-session',
          maxAgeSeconds: 7 * 24 * 60 * 60,
          sameSite: 'lax',
          secure: true,
        }),
      },
    });
  }
  return supabaseInstance;
})();

// ------------------------------------------------------------------
// 🌟 UTILITY EXPORTS
// ------------------------------------------------------------------

export const supabaseBios = supabase;
export const biosUrl = PI_URL;
export const biosKey = PI_KEY;

export async function signUp(
  email: string,
  password: string,
): Promise<unknown> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(
  email: string,
  password: string,
): Promise<unknown> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchTable(tableName: string): Promise<unknown> {
  const { data, error } = await supabase.from(tableName).select('*');
  if (error) throw error;
  return data;
}

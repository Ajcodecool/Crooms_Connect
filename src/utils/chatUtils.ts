import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

type Profile = { [key: string]: string }; // WARNING: NEED SUPABASE TYPES!!!!!

// === CHARACTER COUNTER ===
export const getCharacterCount = (html: string): number => {
  if (!html) return 0;
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').length;
};

// === AVATAR LOGIC (Fixed for Real-time Updates) ===
export const getStorageAvatar = (userId: string): string => {
  const { data } = supabase.storage
    .from('profile-pictures')
    .getPublicUrl(`${userId}.png`);
  return data.publicUrl;
};

// UPDATED: Now accepts 'profile' to get the timestamped URL
export const resolveAvatar = (user: User, profile?: Profile): string => {
  // 1. PRIORITY: Database Profile (Contains the ?t=timestamp cache buster)
  if (profile?.avatar_url) {
    return profile.avatar_url;
  }

  // 2. Fallback: Auth Metadata (Might be slightly stale)
  const metaAvatar = user.user_metadata?.avatar_url;
  if (metaAvatar && !metaAvatar.includes('dicebear')) {
    return metaAvatar;
  }

  // 3. Fallback: Generic Storage URL
  return getStorageAvatar(user.id);
};

// === NAME LOGIC ===
export const getFallbackName = (user: User, profile: Profile): string => {
  if (profile?.username) return profile.username;
  if (!user) return 'Guest';
  return user.user_metadata?.username || user.email?.split('@')[0] || 'User';
};

// === DEFAULT AVATAR GENERATOR ===
export const getDefaultAvatar = (username: string): string => {
  if (!username) return '/DP1.jpg';
  let hash = 0;
  for (let i = 0; i < username.length; i++)
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  const index = (Math.abs(hash) % 4) + 1;
  return `/DP${index}.jpg`;
};

// === TIMESTAMP FORMATTER ===
export const formatMessageTimestamp = (isoString: string): string =>
  new Date(isoString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

// === SCROLL HELPER ===
export const scrollToMessage = (id: string): void => {
  const element = document.getElementById(`msg-${id}`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add('message-highlight');
    setTimeout(() => element.classList.remove('message-highlight'), 2000);
  }
};

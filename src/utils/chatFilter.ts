/**
 * chatFilter.js
 * Message validator blocking common racial/ethnic slurs only.
 * Swears explicitly allowed. Case-insensitive, handles leetspeak/symbols.f
 * Dev admins (hardcoded emails) automatically bypassed.d
 */

import type { Session } from '@supabase/supabase-js';

export const validateMessage = (
  htmlContent: string,
  options: { session?: Session; DEVELOPER_EMAILS?: string[] } = {},
): { isValid: true } | { isValid: false; error: string } => {
  const { session, DEVELOPER_EMAILS } = options;

  // 0. Dev admin bypass - matches hardcoded list from Admin.jsx
  const isDeveloper =
    session?.user?.email &&
    (DEVELOPER_EMAILS?.includes(session.user.email) ||
      (session?.user?.email && DEVELOPER_EMAILS?.includes(session.user.email)));

  if (isDeveloper) {
    return { isValid: true };
  }

  // 1. Clean and normalize HTML content
  const cleanText = String(htmlContent ?? '')
    .replace(/<[^>]*>/g, ' ') // strip HTML tags
    .replace(/\s+/g, ' ')
    .trim();

  const lowerText = cleanText.toLowerCase();

  // 2. Normalize leetspeak/symbols (e.g., n1gg3r, ch!nk → blocked)
  const normalize = (text: string): string =>
    text
      .replace(/[1i!|]/g, 'i')
      .replace(/[0o]/g, 'o')
      .replace(/[3e]/g, 'e')
      .replace(/[4a@]/g, 'a')
      .replace(/[5$]/g, 's')
      .replace(/[7t]/g, 't')
      .replace(/[^a-z0-9\s]/g, ''); // strip remaining symbols

  const normalizedLower = normalize(lowerText);

  // 3. Block slurs only (standalone words, expanded from Wikipedia/ethnic lists)
  const patterns = [
    // Anti-Black slurs
    /\bnigger\b/i,
    /\bcoon\b/i,
    /\bporch monkey\b/i,
    /\bbluegum\b/i,
    /\bspook\b/i,
    // Anti-Asian slurs
    /\bchink\b/i,
    /\bgook\b/i,
    /\bzipperhead\b/i,
    /\bslope\b/i,
    /\bdink\b/i,
    // Anti-Hispanic/Latino slurs
    /\bspic\b/i,
    /\bwetback\b/i,
    /\bwetback\b/i,
    // Anti-Jewish slurs
    /\bkike\b/i,
    /\bheeb\b/i,
    /\byid\b/i,
    // Anti-Arab/Middle Eastern slurs
    /\bcamel jockey\b/i,
    /\bsand nigger\b/i,
    /\btowelhead\b/i,
    // Anti-Native American slurs
    /\bprairie nigger\b/i,
    /\binjun\b/i,
    // Anti-White slurs
    /\bcracker\b/i,
    /\bhonky\b/i,
    /\bwhitey\b/i,
    // Regional/European slurs
    /\babo\b/i,
    /\bboong\b/i,
    /\bdago\b/i,
    /\beyetie\b/i,
    /\bwog\b/i,
    /\bpaki\b/i,
    // Additional common ones
    /\bnip\b/i,
    /\bcurry muncher\b/i,
    /\braghead\b/i,
    //Banned Terms Bc They Aren't funny
    /\btyresejones\b/i,
  ];

  // 4. Check for violation (original + normalized)
  const violates = patterns.some(
    (rx) => rx.test(lowerText) || rx.test(normalizedLower),
  );

  if (violates) {
    return {
      isValid: false,
      error: 'Slur detected',
    };
  }

  // 5. Blocked terms are also blocked anywhere in chat UI.
  // (Username-filter banned terms should apply to message content too.)
  const bannedUsernameTerms = [
    // exact/normalization-level terms already present in src/utils/usernameFilter.ts
    // kept as a supplement for message content filtering.
    
    'tyresejones',
  ];

  if (bannedUsernameTerms.some((t) => t && lowerText.includes(t))) {
    return { isValid: false, error: 'Banned term detected' };
  }

  // 6. Allow if clean (swears like fuck/shit pass)
  return { isValid: true };
};


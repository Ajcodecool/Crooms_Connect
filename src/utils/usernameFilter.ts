/**
 * Username Filter Utility
 * Client-side validation for banned/inappropriate usernamesS
 * Used during signup to prevent profanity, offensive terms, and inappropriate content
 */

// === UTILITY FUNCTION: Normalize username to catch bypasses ===
/**
 * Aggressively normalizes a username to catch common bypass techniques:
 * - Replaces leetspeak numbers with letters (3→e, 4→a, 1→i, 0→o, 5→s, 7→t, 8→b)
 * - Removes vowels to test consonant-only patterns
 * - Removes all non-letter characters (numbers, underscores)
 * - Converts to lowercase
 */
function normalizeForBypassDetection(username: string): string[] {
  const lower = username.toLowerCase();

  // Leetspeak mapping: common number-to-letter substitutions
  const leetMap: Record<string, string> = {
    '3': 'e',
    '4': 'a',
    '1': 'i',
    '0': 'o',
    '5': 's',
    '7': 't',
    '8': 'b',
    '9': 'g',
    '6': 'b',
    '2': 'z',
  };

  // Replace leetspeak
  let deleeted = lower;
  for (const [num, letter] of Object.entries(leetMap)) {
    deleeted = deleeted.replace(new RegExp(num, 'g'), letter);
  }

  // Remove all non-letters
  const consonantsOnly = lower.replace(/[^a-z]/g, '');

  // Remove vowels (to catch "fck", "sht", etc.)
  const noVowels = lower.replace(/[aeiou0-9_]/g, '');

  return [deleeted, consonantsOnly, noVowels];
}

// === BANNED EXACT USERNAMES (case-insensitive) ===
export const BANNED_EXACT_USERNAMES = new Set([
  'admin',
  'administrator',
  'root',
  'system',
  'moderator',
  'mod',
  'staff',
  'guest',
  'test',
  'testing',
  'demo',
  'example',
  'sample',
  'anonymous',
  'user',
  'username',
  'null',
  'undefined',
  'nobody',
  'crooms',
  'croomsconnect',
  'croomsconnectadmin',
  'croomsadmin',
  'principal',
  'teacher',
  'student',
  'admin123',
  'root123',
  'mod123',
  'owner',
  'founder',
  'creator',
  'developer',
  'webmaster',
  'sysop',
  'help',
  'support',
  'info',
  'contact',
  'abuse',
  'postmaster',
  'superuser',
  'superadmin',
  'supermod',
  'master',
  'server',
  'bot',
  'robot',
  'chatbot',
  'ai',
  'chatgpt',
  'claude',
  'TyreseJones',
]);

// === REGEX HELPERS ===
// Custom boundaries that check for the start/end of the string, an underscore, or a number.
// Prevents blocking "glass" (contains ass) or "skill" (contains kill).
const bStart = '(^|_|[0-9])';
const bEnd = '($|_|[0-9])';

// === BANNED CONSONANT PATTERNS (vowels removed) ===
// These patterns match slurs with vowels stripped out
export const BANNED_CONSONANT_PATTERNS = [
  /f[ck]{1,2}k/, // fuck, fck, fck
  /sh[t]{1,2}/, // shit, sht
  /b[t]{1,2}ch/, // bitch, btch
  /c[nt]{1,2}t/, // cunt, cnt
  /wh[r]{1,2}/, // whore, whr
  /sl[t]{1,2}/, // slut, slt
  /f[g]{1,2}t/, // faggot, fgt
  /n[gg]{1,2}r/, // nigger, nggr
  /ch[nk]{1,3}/, // chink, chnk
  /k[k]{1,3}k/, // kkk
  /d[mn]{1,2}/, // damn, dmn
  /cr[p]{1,2}/, // crap, crp
  /sp[c]{1,2}/, // spic, spc
];

// === BANNED PATTERNS (regex) ===
export const BANNED_PATTERNS = [
  // ----------------------------------------------------------------------
  // 1. UNAMBIGUOUS SUBSTRINGS (Instantly blocked anywhere in the string)
  // ----------------------------------------------------------------------

  // Profanity & Derogatory
  /fuck/i,
  /shit/i,
  /asshole/i,
  /bitch/i,
  /cunt/i,
  /dickhead/i,
  /cockhead/i,
  /puss(y|ies)/i,
  /faggot/i,
  /nigger/i,
  /negro/i,
  /whore/i,
  /slut/i,
  /retard/i,
  /idiot/i,
  /moron/i,
  /asshat/i,
  /bastard/i,
  /douchebag/i,

  // Hate, Racist & Discriminatory
  /chink/i,
  /chinaman/i,
  /kike/i,
  /wetback/i,
  /sambo/i,
  /zambo/i,
  /mulatto/i,
  /miscegenation/i,
  /nazi/i,
  /hitler/i,
  /supremac/i,
  /terroris/i,
  /extremist/i,

  // Sexual & Inappropriate
  /porn/i,
  /erotic/i,
  /xvideos/i,
  /xnxx/i,
  /hentai/i,
  /vagina/i,
  /penis/i,
  /masturbat/i,
  /orgasm/i,
  /vibrator/i,
  /panties/i,

  // Violence (Spaces removed for multi-word phrases)
  /suicide/i,
  /killyourself/i,
  /hangyourself/i,

  // Drugs
  /cannabis/i,
  /marijuana/i,
  /cocaine/i,
  /cocainer/i,
  /heroin/i,
  /mdma/i,
  /ecstasy/i,
  /opioid/i,
  /xanax/i,
  /adderall/i,
  /fentanyl/i,
  /meth/i,
  /LSD/i,
  /PCP/i,

  // Spam, Scams & Hacking Phrases
  /freemoney/i,
  /earnmoney/i,
  /makemoney/i,
  /clickhere/i,
  /buynow/i,
  /limitedoffer/i,
  /viagra/i,
  /cialis/i,
  /phishing/i,
  /malware/i,
  /ddos/i,
  /vulnerabilit/i,

  // ----------------------------------------------------------------------
  // 2. BOUNDARY-REQUIRED (Requires _, numbers, or string start/end)
  // ----------------------------------------------------------------------

  // Ambiguous Profanity & Slang (e.g. avoids "class", "condemn", "spice", "scraper")
  new RegExp(
    `${bStart}(ass|asses|damn(it|ed)?|dicks?|cocks?|fags?|spics?|gooks?|tards?|jerks?|crap(per|py)?|freaks?)${bEnd}`,
    'i',
  ),

  // Ambiguous Anatomy & Sexual (e.g. avoids "essex", "snude", "booby", "entity", "zebra", "analyze", "farther")
  new RegExp(
    `${bStart}(sex(y|ual)?|(nude|naked)s?|xxx|boobs?|titt?(y|ies|s)?|bra|nipples?|genitals?|anus|anal|butts?|farts?)${bEnd}`,
    'i',
  ),

  // Ambiguous Violence (e.g. avoids "skill", "diet", "therapist", "burgundy", "screenshot", "constable")
  new RegExp(
    `${bStart}(kill(s|ing|ed)?|murder(s|er)?|dead|death|die|dies|rap(e|ed|ist)|assault|attack(ed)?|threats?|bombs?|bombing|explosives?|weapons?|guns?|shoot(ing)?|stabb?(ing)?|shot|kkk|hate)${bEnd}`,
    'i',
  ),

  // Ambiguous Drugs, Spam, & Gaming Slang (e.g. avoids "tweed", "choke", "method", "freeman", "shack", "crackerjack")
  new RegExp(
    `${bStart}(drugs?|weed|coke|meth|lsd|mushrooms?|prescription|winner|won|prize|lottery|pharmacy|pills|discount|cheap|free|noob|newbie|rip|trash|scam|garbage|wack|weak|hack(er|s|ing)?|exploits?)${bEnd}`,
    'i',
  ),

  // Ambiguous Religion & Internet Slang (e.g. avoids "hello", "jewel", "lolly")
  new RegExp(
    `${bStart}(devil|satan|hell|heaven|christian|muslim|jew|hindu|blasphem|profane|wtf|omg|lol|lmao|rofl|bloody)${bEnd}`,
    'i',
  ),
];

// === SPAM PATTERNS ===
export const SPAM_PATTERNS = [
  // Repeated characters (e.g., "aaaaa", "11111")
  /(.)\1{4,}/i,

  // Username + numbers at end (Increased to 6 to prevent blocking birth years like "john1995")
  /[a-zA-Z]+[0-9]{6,}/,

  // All numbers
  /^[0-9]+$/,

  // Common spam words (Boundaries added to prevent blocking "abbot", "trainer", "alike")
  new RegExp(
    `${bStart}(follow|followers|followback|likeforlike|like|gains?|train|bot|spam)${bEnd}`,
    'i',
  ),

  // URL patterns (removed dots as they aren't allowed anyway, checking domains)
  /dotcom/i,
  /dotnet/i,
  /dotorg/i,
  /dotio/i,
  /http/i,
  /www/i,
];

/**
 * Validates a username against all banned patterns, including bypass techniques
 */
export const validateUsername = (
  username: string,
): { isValid: boolean; reason: string } => {
  if (!username || typeof username !== 'string') {
    return { isValid: false, reason: 'Username is required' };
  }

  const cleanUsername = username.trim();

  // 1. FAST CHECKS: Length Validation
  if (cleanUsername.length < 3) {
    return { isValid: false, reason: 'Username must be at least 3 characters' };
  }
  if (cleanUsername.length > 25) {
    return { isValid: false, reason: 'Username must be 25 characters or less' };
  }

  // 2. FAST CHECKS: Allowed Characters (Naturally catches and rejects spaces and symbols)
  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return {
      isValid: false,
      reason: 'Username can only contain letters, numbers, and underscores',
    };
  }

  const lowerUsername = cleanUsername.toLowerCase();

  // 3. EXACT MATCH LOOKUP (O(1) lookup using Set)
  if (BANNED_EXACT_USERNAMES.has(lowerUsername)) {
    return {
      isValid: false,
      reason: 'This username is reserved or not allowed',
    };
  }

  // 4. BANNED PATTERNS
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(lowerUsername)) {
      return {
        isValid: false,
        reason: 'This username contains inappropriate content',
      };
    }
  }

  // 5. BYPASS DETECTION: Check leetspeak and vowel-removed variants
  const normalizedVariants = normalizeForBypassDetection(cleanUsername);

  // Check leetspeak variant (3→e, 1→i, etc.)
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(normalizedVariants[0])) {
      return {
        isValid: false,
        reason: 'This username contains inappropriate content',
      };
    }
  }

  // Check consonants-only variant (removes all numbers and vowels)
  for (const pattern of BANNED_CONSONANT_PATTERNS) {
    if (pattern.test(normalizedVariants[1])) {
      return {
        isValid: false,
        reason: 'This username contains inappropriate content',
      };
    }
  }

  // Check vowel-removed variant
  for (const pattern of BANNED_CONSONANT_PATTERNS) {
    if (pattern.test(normalizedVariants[2])) {
      return {
        isValid: false,
        reason: 'This username contains inappropriate content',
      };
    }
  }

  // 6. SPAM PATTERNS
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(lowerUsername)) {
      return { isValid: false, reason: 'This username appears to be spam' };
    }
  }

  return { isValid: true, reason: 'Username is valid' };
};

/**
 * Get a sanitized version of username (removes all invalid characters)
 */
export const sanitizeUsername = (username: string): string =>
  username
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '') // Strips absolutely EVERYTHING except letters, numbers, and underscores
    .substring(0, 25); // Limit length

export default validateUsername;

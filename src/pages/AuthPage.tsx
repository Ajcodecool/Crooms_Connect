import { useState, useEffect, type SubmitEventHandler, type FC } from 'react';
import { supabase } from '../supabaseClient';
import { createClient, type Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { validateUsername } from '../utils/usernameFilter';
import { checkPasswordAgainstHIBP } from '../utils/hibpPassword';
import './AuthPage.css';

// === EXTERNAL DB SETUP FOR VERIFICATION ===
const EXTERNAL_URL = 'https://tencnsastgpixdovllgm.supabase.co';
const EXTERNAL_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlbmNuc2FzdGdwaXhkb3ZsbGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNjA3MjAsImV4cCI6MjA4MzYzNjcyMH0.UduSJ22viX-pRPlrKgHh0yiPT--v9kmi2w_rTB-uQi0';
const externalSupabase = createClient(EXTERNAL_URL, EXTERNAL_KEY);

// ==========================================
//    INTEGRATED ADVANCED FILTER SYSTEM
// ==========================================

/**
 * COMPREHENSIVE USERNAME FILTER
 * Protects against:
 * - Profanity & offensive content
 * - Leetspeak/number substitutions (l33t, 1337)
 * - Unicode/special character bypasses
 * - Homograph attacks (similar looking characters)
 * - Spam patterns
 * - Reserved/system usernames
 */

// === LEETSPEAK NORMALIZATION ===
const LEETSPEAK_MAP: { [key: string]: string } = {
  '@': 'a',
  '3': 'e',
  '5': 's',
  '0': 'o',
  '1': 'i',
  '7': 't',
  '4': 'a',
  '!': 'i',
  '|': 'l',
  '9': 'g',
  '8': 'b',
  '6': 'g',
  ø: 'o',
  ó: 'o',
  ò: 'o',
  ô: 'o',
  õ: 'o',
  é: 'e',
  è: 'e',
  ê: 'e',
  ë: 'e',
  á: 'a',
  à: 'a',
  â: 'a',
  ä: 'a',
  ã: 'a',
  í: 'i',
  ì: 'i',
  î: 'i',
  ï: 'i',
  ú: 'u',
  ù: 'u',
  û: 'u',
  ü: 'u',
  ç: 'c',
  ñ: 'n',
};

/**
 * Normalize username by removing leetspeak and unicode equivalents
 */
const normalizeLeetspeak = (username: string): string => {
  let normalized = username.toLowerCase();
  for (const [char, replacement] of Object.entries(LEETSPEAK_MAP)) {
    normalized = normalized.replace(new RegExp(char, 'gi'), replacement);
  }
  // Remove zero-width characters and other invisible unicode
  normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, '');
  return normalized;
};

// === BANNED EXACT USERNAMES (case-insensitive) ===
const BANNED_EXACT_USERNAMES = new Set([
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
]);

// === REGEX HELPERS FOR BOUNDARIES ===
const bStart = '(^|_|[0-9])';
const bEnd = '($|_|[0-9])';

// === BANNED PATTERNS (regex) ===
const BANNED_PATTERNS = [
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
  /heroin/i,
  /mdma/i,
  /ecstasy/i,
  /opioid/i,
  /xanax/i,
  /adderall/i,

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

  // Ambiguous Profanity & Slang
  new RegExp(
    `${bStart}(ass|asses|damn(it|ed)?|dicks?|cocks?|fags?|spics?|gooks?|tards?|jerks?|crap(per|py)?|freaks?)${bEnd}`,
    'i',
  ),

  // Ambiguous Anatomy & Sexual
  new RegExp(
    `${bStart}(sex(y|ual)?|(nude|naked)s?|xxx|boobs?|titt?(y|ies|s)?|bra|nipples?|genitals?|anus|anal|butts?|farts?)${bEnd}`,
    'i',
  ),

  // Ambiguous Violence
  new RegExp(
    `${bStart}(kill(s|ing|ed)?|murder(s|er)?|dead|death|die|dies|rap(e|ed|ist)|assault|attack(ed)?|threats?|bombs?|bombing|explosives?|weapons?|guns?|shoot(ing)?|stabb?(ing)?|shot|kkk|hate)${bEnd}`,
    'i',
  ),

  // Ambiguous Drugs, Spam, & Gaming Slang
  new RegExp(
    `${bStart}(drugs?|weed|coke|meth|lsd|mushrooms?|prescription|winner|won|prize|lottery|pharmacy|pills|discount|cheap|free|noob|newbie|rip|trash|scam|garbage|wack|weak|hack(er|s|ing)?|exploits?)${bEnd}`,
    'i',
  ),

  // Ambiguous Religion & Internet Slang
  new RegExp(
    `${bStart}(devil|satan|hell|heaven|christian|muslim|jew|hindu|blasphem|profane|wtf|omg|lol|lmao|rofl|bloody)${bEnd}`,
    'i',
  ),
];

// === SPAM PATTERNS ===
const SPAM_PATTERNS = [
  // Repeated characters (e.g., "aaaaa", "11111")
  /(.)\1{4,}/i,

  // Username + numbers at end (6+ numbers)
  /[a-zA-Z]+[0-9]{6,}/,

  // All numbers
  /^[0-9]+$/,

  // Common spam words
  new RegExp(
    `${bStart}(follow|followers|followback|likeforlike|like|gains?|train|bot|spam)${bEnd}`,
    'i',
  ),

  // URL patterns
  /dotcom/i,
  /dotnet/i,
  /dotorg/i,
  /dotio/i,
  /http/i,
  /www/i,
];

/**
 * COMPREHENSIVE USERNAME VALIDATION
 * Multi-layer protection against all known bypass attempts
 */
const validateUsernameAdvanced = (
  username: string,
): { isValid: boolean; reason: string } => {
  if (!username || typeof username !== 'string') {
    return { isValid: false, reason: 'Username is required' };
  }

  const cleanUsername = username.trim();

  // 1. LENGTH VALIDATION
  if (cleanUsername.length < 3) {
    return { isValid: false, reason: 'Username must be at least 3 characters' };
  }
  if (cleanUsername.length > 25) {
    return { isValid: false, reason: 'Username must be 25 characters or less' };
  }

  // 2. CHARACTER VALIDATION (Only letters, numbers, underscores)
  if (!/^[a-zA-Z0-9_]+$/.test(cleanUsername)) {
    return {
      isValid: false,
      reason: 'Username can only contain letters, numbers, and underscores',
    };
  }

  const lowerUsername = cleanUsername.toLowerCase();

  // 3. EXACT MATCH CHECK
  if (BANNED_EXACT_USERNAMES.has(lowerUsername)) {
    return {
      isValid: false,
      reason: 'This username is reserved or not allowed',
    };
  }

  // 4. NORMALIZE FOR BYPASS ATTEMPTS (leetspeak, unicode, etc.)
  const normalizedUsername = normalizeLeetspeak(cleanUsername);

  // Check normalized version against banned patterns
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(normalizedUsername)) {
      return {
        isValid: false,
        reason: 'This username contains inappropriate content',
      };
    }
  }

  // Also check original to catch direct bypasses
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(lowerUsername)) {
      return {
        isValid: false,
        reason: 'This username contains inappropriate content',
      };
    }
  }

  // 5. SPAM PATTERN CHECK
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(normalizedUsername)) {
      return { isValid: false, reason: 'This username appears to be spam' };
    }
  }

  // 6. ADDITIONAL BYPASS CHECKS
  // Check for excessive underscores used to obscure banned words
  const underscoreOnly = cleanUsername.replace(/_/g, '');
  if (underscoreOnly.length < 3) {
    return {
      isValid: false,
      reason: 'Username cannot consist mostly of underscores',
    };
  }

  // Check if normalized version matches banned exact usernames
  if (BANNED_EXACT_USERNAMES.has(normalizedUsername)) {
    return {
      isValid: false,
      reason: 'This username is not allowed (bypass attempt detected)',
    };
  }

  return { isValid: true, reason: 'Username is valid' };
};

// ==========================================
//            END FILTER SYSTEM
// ==========================================

const AuthPage: FC<{
  onLoginSuccess: (newSession: Session | null) => void;
}> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // === NEW STATE FOR VERIFICATION UPON SIGNUP ===
  const [signUpStep, setSignUpStep] = useState(1);
  const [studentId, setStudentId] = useState('');
  const [foundName, setFoundName] = useState<string | null>(null);

  // === NEW STATE FOR RESET ===
  const [resetMode, setResetMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetSession, setResetSession] = useState<Session | null>(null);

  // === SYSTEM SETTINGS STATE ===
  const [signupAllowed, setSignupAllowed] = useState(true);

  // === FAILED ATTEMPTS STATE ===
  const [failedAttempts, setFailedAttempts] = useState(() => {
    const stored = localStorage.getItem('failed_attempts');
    return stored ? JSON.parse(stored) : {};
  });
  const [lockoutUntil, setLockoutUntil] = useState(() => {
    const stored = localStorage.getItem('lockout_until');
    return stored ? parseInt(stored) : null;
  });
  const [, setCountdown] = useState(0);

  // === SIGNUP RATE LIMIT (device/ip) COOLDOWN ===
  const [signupRateLimitedUntil, setSignupRateLimitedUntil] = useState<
    number | null
  >(() => {
    const stored = localStorage.getItem('signup_rate_limited_until');
    return stored ? parseInt(stored) : null;
  });
  const [, setSignupRateLimitCountdown] = useState(0);

  // === PASSWORD VISIBILITY STATE ===
  const [showPassword, setShowPassword] = useState(false);

  // === PASSWORD RESET STATE ===
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [resetCurrentPassword, setResetCurrentPassword] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  const PLACEHOLDER_DOMAIN = '@croomsconnect.local';
  const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,25}$/;
  const BLOCKED_USERNAMES = [
    'admin',
    'guest',
    'test',
    'staff',
    'mod',
    'system',
  ];

  // === DEVICE ID LOGIC ===
  const getDeviceId = (): string => {
    let id = localStorage.getItem('crooms_device_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('crooms_device_id', id);
    }
    return id;
  };

  // === CHECK SYSTEM SETTINGS ON LOAD ===
  useEffect(() => {
    const fetchSettings = async (): Promise<void> => {
      const { data } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', 'allow_signup')
        .single();
      if (data) {
        setSignupAllowed(data.value !== 'false');
      }
    };
    fetchSettings();
  }, []);

  // === COUNTDOWN TIMER FOR LOCKOUT ===
  useEffect(() => {
    if (lockoutUntil) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.ceil((lockoutUntil - now) / 1000);
        if (remaining > 0) {
          setCountdown(remaining);
        } else {
          setLockoutUntil(null);
          setCountdown(0);
          localStorage.removeItem('lockout_until');
          setMessage('');
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lockoutUntil]);

  // === COUNTDOWN TIMER FOR SIGNUP RATE LIMIT ===
  useEffect(() => {
    if (signupRateLimitedUntil) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.ceil((signupRateLimitedUntil - now) / 1000);
        if (remaining > 0) {
          setSignupRateLimitCountdown(remaining);
        } else {
          setSignupRateLimitedUntil(null);
          setSignupRateLimitCountdown(0);
          localStorage.removeItem('signup_rate_limited_until');
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [signupRateLimitedUntil]);

  // ==========================================
  //         SIGNUP FLOW (3-STEP)
  // ==========================================

  const handleSignUpStep1: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setMessage('Username and password required');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    if (!signupAllowed) {
      setMessage('⚠️ Account creation is currently paused by Admins.');
      setLoading(false);
      return;
    }

    if (!USERNAME_REGEX.test(cleanUser)) {
      setMessage(
        'Username must be 3–25 characters and contain only letters, numbers, or underscores.',
      );
      setLoading(false);
      return;
    }

    if (
      BLOCKED_USERNAMES.some(
        (blocked) => blocked.toLowerCase() === cleanUser.toLowerCase(),
      )
    ) {
      setMessage('This username is reserved.');
      setLoading(false);
      return;
    }

    // === IMPOSTER/IMPERSONATION HARD-BLOCK (client-side filter) ===
    // Blocks usernames that *contain*:
    // - "Freetyresejones" (any case)
    // - "tyrese" (any occurrence; case-insensitive)
    // - variations of "TyreseJones" (case-insensitive; ignores '_' and other separators)
    const lowerCleanUser = cleanUser.toLowerCase();


    // Normalize common separators so "ty_rese_jones" and "tyresejones" match.
    const compactForTyreseJones = lowerCleanUser.replace(/_/g, '');

    const isFreetyresejones = lowerCleanUser.includes('freetyresejones');

    // Tyrese short form block (requested)
    const isTyreseShort = lowerCleanUser.includes('tyrese');


    // Allow leet-ish variants: run through the same leetspeak normalizer already used elsewhere.
    const normalizedForTyrese = normalizeLeetspeak(compactForTyreseJones);

    const isTyreseJonesVariant =
      normalizedForTyrese.includes('tyresejones') ||
      // Catch cases where underscores were not removed correctly or users inserted separators.
      // (Since we already strip underscores, this is mostly defensive.)
      lowerCleanUser.replace(/[^a-z0-9]/g, '').includes('tyresejones');

    if (isFreetyresejones || isTyreseShort || isTyreseJonesVariant) {

      setMessage(
        'This username is too similar to an existing user (Impersonation protection).',
      );
      setLoading(false);
      return;
    }

    // === USE ADVANCED FILTER HERE ===
    const usernameValidation = validateUsernameAdvanced(cleanUser);
    if (!usernameValidation.isValid) {
      setMessage(usernameValidation.reason);
      setLoading(false);
      return;
    }

    // === ALSO VALIDATE WITH ORIGINAL FUNCTION FOR REDUNDANCY ===
    const originalValidation = validateUsername(cleanUser);
    if (!originalValidation.isValid) {
      setMessage(originalValidation.reason);
      setLoading(false);
      return;
    }


    try {
      // Block banned devices from creating new accounts (signup only)
      const bannedCookie = document.cookie.match(
        /(?:^|; )crooms_banned_device=([^;]*)/,
      );
      if (bannedCookie && decodeURIComponent(bannedCookie[1]) === 'true') {
        setMessage(
          '⛔ This device has been permanently banned from creating accounts.',
        );
        setLoading(false);
        return;
      }
      // HIBP (k-anonymity) password breach check

      const hibp = await checkPasswordAgainstHIBP(password);
      if (hibp.breached) {
        setMessage(
          'This password appears in known data breaches. Choose a different password.',
        );
        setLoading(false);
        return;
      }

      const { data: isAllowed, error: rpcError } = await supabase.rpc(
        'validate_username',
        { username_input: cleanUser },
      );
      if (rpcError) throw rpcError;
      if (!isAllowed) {
        setMessage('This username contains a word restricted by the server.');
        setLoading(false);
        return;
      }

      const { data: isImposter, error: impError } = await supabase.rpc(
        'check_impersonation',
        { username_input: cleanUser },
      );
      if (impError) throw impError;
      if (isImposter) {
        setMessage(
          'This username is too similar to an existing user (Impersonation protection).',
        );
        setLoading(false);
        return;
      }

      // Pre-check if username is already taken locally
      const { data: profileExists } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', cleanUser)
        .maybeSingle();

      if (profileExists) {
        setMessage('This username is already taken.');
        setLoading(false);
        return;
      }

      setSignUpStep(2); // Passed checks, move to Student ID Verification
    } catch (err) {
      console.error('Validation failed:', err);
      setMessage('Server error during validation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchStudent: SubmitEventHandler<HTMLFormElement> = async (
    e,
  ) => {
    e.preventDefault();
    if (!studentId.trim()) return;
    setLoading(true);
    setFoundName(null);
    setMessage('');

    try {
      const { data: takenCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('verified_student_id', studentId.trim())
        .maybeSingle();

      if (takenCheck) {
        setMessage('⚠️ This Student ID is already linked to another account.');
        setLoading(false);
        return;
      }

      const targetMail = `${studentId.trim()}@student.myscps.us`;
      const { data, error } = await externalSupabase
        .from('members')
        .select('DisplayName')
        .eq('Mail', targetMail)
        .single();

      if (error || !data) {
        setMessage('Student not found. Check ID.');
        setLoading(false);
        return;
      }

      const rawName = data.DisplayName || '';
      let firstName = rawName;
      if (rawName.includes(',')) firstName = rawName.split(',')[1];
      firstName = firstName.replace('(CAIT)', '').trim();

      setFoundName(firstName);
      setSignUpStep(3); // Match found, move to confirmation
    } catch (err) {
      console.error(err);
      setMessage('Error searching database.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSignUp: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const cleanUser = username.trim();
    const deviceId = getDeviceId();
    const email = cleanUser + PLACEHOLDER_DOMAIN;
    const now = new Date().toISOString();

    try {
      // ===============================
      // SIGNUP RATE LIMIT CHECK (device/ip)
      // ===============================
      if (signupRateLimitedUntil && Date.now() < signupRateLimitedUntil) {
        const remaining = Math.ceil(
          (signupRateLimitedUntil - Date.now()) / 1000,
        );
        setLoading(false);
        setMessage(
          `Too many accounts created from this browser/device. Please try again in ${Math.floor(
            remaining / 60,
          )}:${(remaining % 60).toString().padStart(2, '0')}.`,
        );
        return;
      }

      try {
        const { data: rlData, error: rlError } = await supabase.rpc(
          'enforce_signup_rate_limit',
          {
            device_id: getDeviceId(),
            email: email,
          },
        );

        if (rlError) {
          console.error('Rate limit RPC error:', rlError);
        }

        if (rlData && rlData.allowed === false) {
          const retryAfterSeconds = rlData.retry_after_seconds ?? 1800;
          const until = Date.now() + retryAfterSeconds * 1000;
          setSignupRateLimitedUntil(until);
          localStorage.setItem('signup_rate_limited_until', until.toString());
          setLoading(false);
          setMessage(
            `Too many accounts created from this browser/device. Please try again in ${Math.floor(
              retryAfterSeconds / 60,
            )}:${(retryAfterSeconds % 60).toString().padStart(2, '0')}.`,
          );
          return;
        }
      } catch (rlErr) {
        console.error('Rate limit check failed (continuing):', rlErr);
        // If RPC fails, don't hard-block signup on a false negative.
      }

      // Safety net: final HIBP check in case user bypassed step 1
      const hibp = await checkPasswordAgainstHIBP(password);

      if (hibp.breached) {
        setMessage(
          'This password appears in known data breaches. Choose a different password.',
        );
        setLoading(false);
        return;
      }

      // Create User with verified parameters injected in Metadata
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: cleanUser,
            device_id: deviceId,
            croomie: true,
            verified_at: now,
            verified_name: foundName,
            verified_student_id: studentId.trim(),
          },
        },
      });

      if (error) throw error;

      // Ensure profile database trigger has time to run, then explicitly bind verification to table
      if (authData?.session) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        await supabase
          .from('profiles')
          .update({
            croomie: true,
            verified_at: now,
            verified_name: foundName,
            verified_student_id: studentId.trim(),
          })
          .eq('id', authData.user?.id);
      }

      setMessage(
        `Account created and verified for ${cleanUser}! Please Sign In.`,
      );
      setIsSignUp(false);
      setSignUpStep(1);
      setPassword('');
      setStudentId('');
      setFoundName(null);
    } catch (err) {
      console.error('Auth Error:', err);
      let msg = (err instanceof Error && err.message) || 'An error occurred.';
      if (msg.includes('permanently banned'))
        msg =
          '⛔ This device has been permanently banned from creating accounts.';
      if (msg.includes('Database error'))
        msg = 'Server error during account creation. Please try again.';
      setMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  //               LOGIN FLOW
  // ==========================================

  const handleLogin: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const cleanUser = username.trim();
    if (!cleanUser) {
      setMessage('Username required');
      setLoading(false);
      return;
    }

    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setMessage(
        `Too many failed attempts. Please try again in ${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')} minutes.`,
      );
      setLoading(false);
      return;
    }

    try {
      const deviceId = getDeviceId();
      let emailToLogin = '';

      const { data: profileData } = await supabase
        .from('profiles')
        .select('email')
        .ilike('username', cleanUser)
        .single();

      if (profileData?.email) {
        emailToLogin = profileData.email;
      } else {
        emailToLogin = cleanUser + PLACEHOLDER_DOMAIN;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToLogin,
        password,
      });

      if (error) throw error;

      await supabase
        .from('profiles')
        .update({ last_device_id: deviceId })
        .eq('id', data.user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('force_password_reset')
        .eq('id', data.user.id)
        .single();

      if (profile?.force_password_reset) {
        setResetSession(data.session);
        setResetMode(true);
        setLoading(false);
        return;
      }

      const userKey = cleanUser.toLowerCase();
      const attempts = { ...failedAttempts };
      delete attempts[userKey];
      setFailedAttempts(attempts);
      localStorage.setItem('failed_attempts', JSON.stringify(attempts));

      if (onLoginSuccess) onLoginSuccess(data.session);
      navigate('/');
    } catch (err) {
      console.error('Auth Error:', err);
      let msg = (err instanceof Error && err.message) || 'An error occurred.';
      if (msg.toLowerCase().includes('invalid login credentials'))
        msg = 'Incorrect username or password.';

      const userKey = cleanUser.toLowerCase();
      const attempts = { ...failedAttempts };
      attempts[userKey] = (attempts[userKey] || 0) + 1;
      setFailedAttempts(attempts);
      localStorage.setItem('failed_attempts', JSON.stringify(attempts));

      if (attempts[userKey] >= 5) {
        const lockoutTime = Date.now() + 3 * 60 * 1000;
        setLockoutUntil(lockoutTime);
        localStorage.setItem('lockout_until', lockoutTime.toString());
        msg = 'Too many failed attempts. Please try again in 3:00 minutes.';
      }

      setMessage(msg);
    } finally {
      if (!resetMode) setLoading(false);
    }
  };

  // ==========================================
  //               RESET FLOWS
  // ==========================================

  const handlePasswordUpdate: SubmitEventHandler<HTMLFormElement> = async (
    e,
  ) => {
    e.preventDefault();
    setLoading(true);

    if (newPassword.length < 6) {
      setMessage('New password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      const hibp = await checkPasswordAgainstHIBP(newPassword);
      if (hibp.breached) {
        setMessage(
          'This password appears in known data breaches. Choose a different password.',
        );
        setLoading(false);
        return;
      }

      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ force_password_reset: false })
        .eq('id', resetSession?.user.id);

      if (profileError) throw profileError;

      if (onLoginSuccess) onLoginSuccess(resetSession);
      navigate('/');
    } catch (err) {
      console.error('Reset Error:', err);
      setMessage(
        (err instanceof Error && err.message) || 'Failed to update password.',
      );
      setLoading(false);
    }
  };

  const handlePasswordReset: SubmitEventHandler<HTMLFormElement> = async (
    e,
  ) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const cleanUser = resetUsername.trim();
    if (!cleanUser) {
      setMessage('Username required');
      setLoading(false);
      return;
    }
    if (resetNewPassword.length < 6) {
      setMessage('New password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email')
        .ilike('username', cleanUser)
        .single();

      if (!profileData?.email) {
        setMessage('Username not found.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: profileData.email,
        password: resetCurrentPassword,
      });

      if (error) {
        setMessage('Current password is incorrect.');
        setLoading(false);
        return;
      }

      const hibp = await checkPasswordAgainstHIBP(resetNewPassword);
      if (hibp.breached) {
        setMessage(
          'This password appears in known data breaches. Choose a different password.',
        );
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: resetNewPassword,
      });
      if (updateError) throw updateError;

      setMessage(
        'Password updated successfully! You can now sign in with your new password.',
      );
      setIsPasswordReset(false);
      setResetUsername('');
      setResetCurrentPassword('');
      setResetNewPassword('');
    } catch (err) {
      console.error('Password Reset Error:', err);
      setMessage(
        (err instanceof Error && err.message) || 'Failed to reset password.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='auth-page'>
      <div className='stars'>
        {Array.from({ length: 50 }, (_, i) => (
          <div key={i} className='star'></div>
        ))}
      </div>
      <div className='w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-8 animate-in fade-in zoom-in duration-300 relative z-10'>
        <div className='text-center mb-8'>
          <div className='inline-flex items-center justify-center w-16 h-16 bg-slate-800 rounded-full mb-4 border border-slate-700 shadow-lg'>
            <img
              src='/CC.png'
              alt='Logo'
              className='w-10 h-10 object-contain'
            />
          </div>
          <h1 className='text-3xl font-bold text-white tracking-tight'>
            Crooms Connect
          </h1>
          <p className='text-slate-400 text-sm mt-2'>
            {resetMode
              ? 'Password Change Required'
              : isPasswordReset
                ? 'Change Password'
                : isSignUp
                  ? signUpStep === 1
                    ? 'Create your student account'
                    : signUpStep === 2
                      ? 'Verify your identity'
                      : 'Confirm identity'
                  : 'Welcome back, please login'}
          </p>
        </div>

        {/* === MESSAGE BANNER === */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm font-medium border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 ${
              message.includes('created') || message.includes('successfully')
                ? 'border-green-800 bg-green-900/20 text-green-400'
                : 'border-red-800 bg-red-900/20 text-red-400'
            }`}
          >
            <i
              className={`fa-solid mt-0.5 ${message.includes('created') || message.includes('successfully') ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}
            ></i>
            <span>{message}</span>
          </div>
        )}

        {/* === SIGNUP PAUSED BANNER === */}
        {!signupAllowed && isSignUp && (
          <div className='mb-6 p-4 rounded-xl text-sm font-medium border border-yellow-800 bg-yellow-900/20 text-yellow-400 flex items-start gap-3 animate-in fade-in slide-in-from-top-2'>
            <i className='fa-solid fa-triangle-exclamation mt-0.5'></i>
            <span>
              Account creation is temporarily paused by administrators. Please
              try again later.
            </span>
          </div>
        )}

        {resetMode ? (
          // === RESET PASSWORD REQUIRED ===
          <form
            onSubmit={handlePasswordUpdate}
            className='space-y-5 animate-in slide-in-from-right-10'
          >
            <div className='p-4 bg-purple-900/20 border border-purple-900 rounded-xl text-purple-300 text-sm mb-4'>
              <i className='fa-solid fa-triangle-exclamation mr-2'></i>
              An admin has required you to change your password before
              continuing.
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-bold text-slate-500 uppercase tracking-wider ml-1'>
                New Password
              </label>
              <div className='relative group'>
                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <i className='fa-solid fa-key text-slate-500 group-focus-within:text-purple-400 transition-colors'></i>
                </div>
                <input
                  type='password'
                  placeholder='New secure password'
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className='w-full bg-slate-950 border border-slate-700 text-white pl-11 pr-4 py-3.5 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all'
                />
              </div>
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {loading ? (
                <i className='fa-solid fa-circle-notch fa-spin'></i>
              ) : (
                'Set Password & Login'
              )}
            </button>
          </form>
        ) : isPasswordReset ? (
          // === PASSWORD RESET FORM ===
          <form
            onSubmit={handlePasswordReset}
            className='space-y-5 animate-in slide-in-from-left-10'
          >
            <div className='p-4 bg-green-900/20 border border-green-900 rounded-xl text-green-300 text-sm mb-4'>
              <i className='fa-solid fa-key mr-2'></i>
              Update your password by entering your current password and a new
              one.
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-bold text-slate-500 uppercase tracking-wider ml-1'>
                Username
              </label>
              <div className='relative group'>
                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <i className='fa-solid fa-user text-slate-500 group-focus-within:text-green-400 transition-colors'></i>
                </div>
                <input
                  type='text'
                  placeholder='e.g. JohnDoe'
                  value={resetUsername}
                  onChange={(e) => setResetUsername(e.target.value)}
                  className='w-full bg-slate-950 border border-slate-700 text-white pl-11 pr-4 py-3.5 rounded-xl focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none transition-all'
                />
              </div>
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-bold text-slate-500 uppercase tracking-wider ml-1'>
                Current Password
              </label>
              <div className='relative group'>
                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <i className='fa-solid fa-lock text-slate-500 group-focus-within:text-green-400 transition-colors'></i>
                </div>
                <input
                  type='password'
                  placeholder='••••••••'
                  value={resetCurrentPassword}
                  onChange={(e) => setResetCurrentPassword(e.target.value)}
                  className='w-full bg-slate-950 border border-slate-700 text-white pl-11 pr-4 py-3.5 rounded-xl focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none transition-all'
                />
              </div>
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-bold text-slate-500 uppercase tracking-wider ml-1'>
                New Password
              </label>
              <div className='relative group'>
                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <i className='fa-solid fa-key text-slate-500 group-focus-within:text-green-400 transition-colors'></i>
                </div>
                <input
                  type='password'
                  placeholder='••••••••'
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  className='w-full bg-slate-950 border border-slate-700 text-white pl-11 pr-4 py-3.5 rounded-xl focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none transition-all'
                />
              </div>
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-green-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {loading ? (
                <i className='fa-solid fa-circle-notch fa-spin'></i>
              ) : (
                'Update Password'
              )}
            </button>

            <button
              type='button'
              onClick={() => {
                setIsPasswordReset(false);
                setMessage('');
              }}
              className='w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 mt-2'
            >
              <i className='fa-solid fa-arrow-left'></i> Back to Login
            </button>
          </form>
        ) : (
          <>
            {!isSignUp ? (
              // === LOGIN FORM ===
              <form onSubmit={handleLogin} className='space-y-5'>
                <div className='space-y-1'>
                  <label className='text-xs font-bold text-slate-500 uppercase tracking-wider ml-1'>
                    Username
                  </label>
                  <div className='relative group'>
                    <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                      <i className='fa-solid fa-user text-slate-500 group-focus-within:text-blue-400 transition-colors'></i>
                    </div>
                    <input
                      type='text'
                      placeholder='e.g. JohnDoe'
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className='w-full bg-slate-950 border border-slate-700 text-white pl-11 pr-4 py-3.5 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all'
                    />
                  </div>
                </div>

                <div className='space-y-1'>
                  <div className='flex justify-between items-end'>
                    <label className='text-xs font-bold text-slate-500 uppercase tracking-wider ml-1'>
                      Password
                    </label>
                    <button
                      type='button'
                      onClick={() => {
                        setIsPasswordReset(true);
                        setMessage('');
                      }}
                      className='text-xs text-slate-400 hover:text-white transition-colors'
                    >
                      Change Password?
                    </button>
                  </div>
                  <div className='relative group'>
                    <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                      <i className='fa-solid fa-lock text-slate-500 group-focus-within:text-blue-400 transition-colors'></i>
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder='••••••••'
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className='w-full bg-slate-950 border border-slate-700 text-white pl-11 pr-11 py-3.5 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all'
                    />
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-400 transition-colors'
                    >
                      <i
                        className={`fa-solid text-sm ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                      ></i>
                    </button>
                  </div>
                </div>

                <button
                  type='submit'
                  disabled={loading}
                  className='w-full font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
                >
                  {loading ? (
                    <i className='fa-solid fa-circle-notch fa-spin'></i>
                  ) : (
                    'Sign In'
                  )}
                  {!loading && <i className='fa-solid fa-arrow-right'></i>}
                </button>
              </form>
            ) : (
              // === SIGNUP MULTI-STEP FLOW ===
              <>
                {signUpStep === 1 && (
                  <form onSubmit={handleSignUpStep1} className='space-y-5'>
                    <div className='space-y-1'>
                      <label className='text-xs font-bold text-slate-500 uppercase tracking-wider ml-1'>
                        Desired Username
                      </label>
                      <div className='relative group'>
                        <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                          <i className='fa-solid fa-user text-slate-500 group-focus-within:text-blue-400 transition-colors'></i>
                        </div>
                        <input
                          type='text'
                          placeholder='e.g. JohnDoe'
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className='w-full bg-slate-950 border border-slate-700 text-white pl-11 pr-4 py-3.5 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all'
                        />
                      </div>
                    </div>

                    <div className='space-y-1'>
                      <label className='text-xs font-bold text-slate-500 uppercase tracking-wider ml-1'>
                        Secure Password
                      </label>
                      <div className='relative group'>
                        <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                          <i className='fa-solid fa-lock text-slate-500 group-focus-within:text-blue-400 transition-colors'></i>
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder='••••••••'
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className='w-full bg-slate-950 border border-slate-700 text-white pl-11 pr-11 py-3.5 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all'
                        />
                        <button
                          type='button'
                          onClick={() => setShowPassword(!showPassword)}
                          className='absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-400 transition-colors'
                        >
                          <i
                            className={`fa-solid text-sm ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                          ></i>
                        </button>
                      </div>
                    </div>

                    <button
                      type='submit'
                      disabled={loading || !signupAllowed}
                      className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                        !signupAllowed
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
                      }`}
                    >
                      {loading ? (
                        <i className='fa-solid fa-circle-notch fa-spin'></i>
                      ) : (
                        'Next: Verify Student ID'
                      )}
                      {!loading && <i className='fa-solid fa-arrow-right'></i>}
                    </button>
                  </form>
                )}

                {signUpStep === 2 && (
                  <form
                    onSubmit={handleSearchStudent}
                    className='space-y-5 animate-in slide-in-from-right-5'
                  >
                    <div className='p-4 bg-blue-900/20 border border-blue-900 rounded-xl text-blue-300 text-sm mb-4'>
                      <i className='fa-solid fa-id-card mr-2'></i>
                      Student verification is required to create an account.
                      Your name and ID will be kept strictly private.
                    </div>
                    <div className='space-y-1'>
                      <label className='text-xs font-bold text-slate-500 uppercase tracking-wider ml-1'>
                        Student ID Number
                      </label>
                      <div className='relative group'>
                        <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                          <i className='fa-solid fa-hashtag text-slate-500 group-focus-within:text-blue-400 transition-colors'></i>
                        </div>
                        <input
                          type='number'
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          className='w-full bg-slate-950 border border-slate-700 text-white pl-11 pr-4 py-3.5 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all'
                          placeholder='592...'
                        />
                      </div>
                    </div>
                    <button
                      type='submit'
                      disabled={loading || studentId.length < 5}
                      className='w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
                    >
                      {loading ? (
                        <i className='fa-solid fa-circle-notch fa-spin'></i>
                      ) : (
                        'Find Student ID'
                      )}
                    </button>
                    <button
                      type='button'
                      onClick={() => {
                        setSignUpStep(1);
                        setMessage('');
                      }}
                      className='w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 mt-2'
                    >
                      Back
                    </button>
                  </form>
                )}

                {signUpStep === 3 && (
                  <form
                    onSubmit={handleFinalSignUp}
                    className='space-y-5 animate-in slide-in-from-right-5'
                  >
                    <div className='bg-slate-800/50 rounded-xl p-6 text-center border border-slate-700'>
                      <div className='inline-flex items-center justify-center w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-full mb-3 border border-emerald-500/50'>
                        <i className='fa-solid fa-check text-2xl'></i>
                      </div>
                      <p className='text-slate-400 text-sm mb-1'>
                        We found a match for
                      </p>
                      <h3 className='text-2xl font-bold text-white mb-6'>
                        &quot;{foundName}&quot;
                      </h3>

                      <div className='flex gap-3'>
                        <button
                          type='button'
                          onClick={() => {
                            setFoundName(null);
                            setSignUpStep(2);
                            setMessage('');
                          }}
                          className='flex-1 py-3 rounded-lg bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition'
                        >
                          Not Me
                        </button>
                        <button
                          type='submit'
                          disabled={loading}
                          className='flex-1 py-3 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition shadow-lg shadow-emerald-900/20 flex items-center justify-center'
                        >
                          {loading ? (
                            <i className='fa-solid fa-circle-notch fa-spin'></i>
                          ) : (
                            'Create Account'
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </>
            )}
          </>
        )}

        {!resetMode && !isPasswordReset && (
          <div className='mt-8 text-center pt-6 border-t border-slate-800'>
            <p className='text-slate-400 text-sm'>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              <button
                onClick={() => {
                  setMessage('');
                  setIsSignUp(!isSignUp);
                  // Reset states if they flip back and forth
                  if (isSignUp) {
                    setSignUpStep(1);
                    setStudentId('');
                    setFoundName(null);
                  }
                }}
                className='ml-2 text-blue-400 font-bold hover:text-blue-300 transition-colors hover:underline'
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>

            <div className='mt-6 text-xs text-slate-500 bg-slate-950/50 p-2 rounded border border-slate-800/50'>
              Issues signing in? Contact{' '}
              <a
                href='mailto:5929002748@student.myscps.us'
                className='text-blue-400 hover:underline hover:text-blue-300 transition-colors'
              >
                5929002748@student.myscps.us
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;

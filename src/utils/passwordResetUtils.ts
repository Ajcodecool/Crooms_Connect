// Utilities for secure temporary password generation and client-side helpers.

const CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
  '&%$#@?+!-_=^~:;,./';

function randInt(maxExclusive: number): number {
  // Works in modern browsers; fallback to Math.random if needed.
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

/**
 * Generate a strong temporary password.
 * - Length: default 32 (similar strength to the provided example)
 * - Character set: includes uppercase/lowercase/digits + many symbols
 */
export function generateStrongTemporaryPassword(length = 32): string {
  if (length < 16) length = 16;

  // Ensure each category appears at least once
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '&%$#@?+!-_=^~:;,./';

  const first = [
    upper[randInt(upper.length)],
    lower[randInt(lower.length)],
    digits[randInt(digits.length)],
    symbols[randInt(symbols.length)],
  ];

  const remainingCount = Math.max(0, length - first.length);
  const remaining: string[] = Array.from({ length: remainingCount }, () => {
    return CHARS[randInt(CHARS.length)];
  });

  // Shuffle
  const all = [...first, ...remaining];
  for (let i = all.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [all[i], all[j]] = [all[j], all[i]];
  }

  return all.join('');
}

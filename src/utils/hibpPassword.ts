/*
  Have I Been Pwned - Pwned Passwords (k-anonymity)

  API docs: https://haveibeenpwned.com/API/v3#PwnedPasswords
  Strategy:
    - SHA-1(password)test
    - Send first 5 chars of hex hash to /range/{prefix}
    - Receive list of suffixes + counts
    - Compare locally.

  NOTE:
    - Never send the full password or full hash to HIBP.
*/

export type HIBPPasswordCheckResult = {
  breached: boolean;
  matchCount?: number;
  // present if HIBP request fails or parsing fails
  error?: string;
};

const sha1Hex = async (input: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  // Browser WebCrypto
  const digest = await crypto.subtle.digest('SHA-1', data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

export const checkPasswordAgainstHIBP = async (
  password: string,
): Promise<HIBPPasswordCheckResult> => {
  try {
    if (!password) {
      return { breached: false, error: 'Missing password' };
    }

    const sha1 = await sha1Hex(password);
    const prefix = sha1.slice(0, 5).toUpperCase();
    const suffix = sha1.slice(5).toUpperCase();

    const resp = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: 'GET',
      headers: {
        Accept: 'text/plain',
      },
    });

    // Fail open if HIBP is unavailable
    if (!resp.ok) {
      return {
        breached: false,
        error: `HIBP responded with status ${resp.status}`,
      };
    }

    const text = await resp.text();

    // Response format:
    //   {SUFFIX}:{COUNT>\r\n}
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const [lineSuffixRaw, countRaw] = line.split(':');
      const lineSuffix = (lineSuffixRaw || '').trim().toUpperCase();
      if (lineSuffix === suffix) {
        const matchCount = Number.parseInt((countRaw || '').trim(), 10);
        return {
          breached: true,
          matchCount: Number.isFinite(matchCount) ? matchCount : undefined,
        };
      }
    }

    return { breached: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Fail open
    return { breached: false, error: msg };
  }
};

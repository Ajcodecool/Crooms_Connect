import type { FC } from 'react';
import type { ProfileBadges } from '../../utils/databaseDefinitions';
import BadgeIcon from './BadgeIcon';

const BadgeList: FC<{ badgeData: ProfileBadges | string }> = ({
  badgeData,
}) => {
  if (!badgeData) return null;

  let badges: string[] = [];

  // === BULLETPROOF PARSER ===
  if (Array.isArray(badgeData)) {
    badges = badgeData.filter(Boolean).map((b) => String(b).trim());
  } else if (typeof badgeData === 'string') {
    let cleaned = badgeData.trim();
    if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
      // Converts Postgres {arrays} to standard JSON [arrays] safely
      cleaned = cleaned.replace(/^\{|\}$/g, '[').replace(/]$/, ']');
      try {
        badges = JSON.parse(cleaned)
          .filter(Boolean)
          .map((b: unknown) => String(b).trim());
      } catch {
        // Fallback for weirdly formatted arrays
        badges = cleaned
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map((s) => s.replace(/^"|"$/g, '').trim())
          .filter(Boolean);
      }
    } else if (cleaned.length > 0) {
      badges = [cleaned];
    }
  }

  if (badges.length === 0) return null;

  // Filter out "secret definitions" AND "disabled_" inventory items
  const activeBadges = badges.filter(
    (b) => !b.startsWith('secretdef_') && !b.startsWith('disabled_'),
  );

  // Mobile-only optimization:
  // Show only the verified staff badge and the pride/flag badges to reduce clutter/perf.
  // Tailwind breakpoint: <sm
  // Note: in this app we are not rendering on the server, so `window` should exist.
  const isMobile =
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(max-width: 639px)').matches;

  // Fallback for environments where matchMedia is missing/broken.
  // (Prevents mobile filter from silently failing and showing all badges.)
  const isMobileFallback =
    typeof window !== 'undefined' &&
    typeof window.innerWidth === 'number' &&
    window.innerWidth <= 639;

  // If matchMedia exists, prefer it; otherwise fall back to innerWidth.
  const mobile =
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    typeof window.matchMedia === 'function'
      ? isMobile || isMobileFallback
      : isMobileFallback;

  const mobileAllowed = new Set([
    // staff
    'verified',

    // flags (all ids start with these in badges.ts)
    'trans',
    'pan',
    'nonbinary',
    'genderfluid',
    'Femboy',
    'mlm',
    'bi',
    'lesbian',
    'ace',
    'aro',
    'progress',
    'rainbow',
    'aroace',
    'ally',

    // country/other flags in this project use flag_ prefix; keep them too
  ]);

  const finalBadges = mobile
    ? activeBadges.filter((b) => {
        if (b.startsWith('flag_')) return true;
        return mobileAllowed.has(b);
      })
    : activeBadges;

  if (finalBadges.length === 0) return null;

  return (
    <div className='flex items-center gap-1 flex-wrap mr-1'>
      {finalBadges.map((bId, i) => (
        <BadgeIcon key={`${bId}-${i}`} id={bId} />
      ))}
    </div>
  );
};

export default BadgeList;

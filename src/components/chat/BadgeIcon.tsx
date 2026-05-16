import { useState, useEffect, type CSSProperties, type FC } from 'react';
import { supabase } from '../../supabaseClient'; // Adjust path if needed
// Go up two levels (../../) to find the data folder
import { badgeDefinitions } from '../../data/badges';

// WARNING: This should be replaced with a Omit<ComunityBadges, ...> from Superbase types
type StrippedCommunityBadges = {
  id: string;
  name: string;
  image_url: string;
}[];

// === GLOBAL CACHE FOR COMMUNITY BADGES ===
// Ensures we only query Supabase once, even if 100 messages load at the same time
let globalCommunityBadges: StrippedCommunityBadges = [];
let fetchPromise: PromiseLike<StrippedCommunityBadges> | null = null;

const BadgeIcon: FC<{ id: string }> = ({ id }) => {
  const [commBadges, setCommBadges] = useState(globalCommunityBadges);

  // Wrapper style ensures the badge doesn't get squished in flex containers
  const wrapperStyle: CSSProperties = {
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0, // Prevents squashing
  };

  const imgStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block', // Removes inline-block bottom spacing issues
    imageRendering: 'auto',
  };

  // Fetch community badges in the background if needed
  useEffect(() => {
    if (id && typeof id === 'string' && id.startsWith('comm_')) {
      if (!fetchPromise) {
        fetchPromise = supabase
          .from('community_badges')
          .select('id, name, image_url')
          .then(({ data, error }) => {
            if (!error && data) {
              globalCommunityBadges = data;
            }
            return data || [];
          });
      }

      fetchPromise.then((data) => {
        if (data && data.length !== commBadges.length) {
          setCommBadges(data);
        }
      });
    }
  }, [id, commBadges.length]);

  if (!id) return null;

  let src = null;
  let alt = '';
  let title = '';

  // 1. Check if it is a Country Flag (starts with "flag_")
  if (typeof id === 'string' && id.startsWith('flag_')) {
    const countryCode = id.replace('flag_', '');
    src =
      countryCode === 'PR'
        ? 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Flag_of_Puerto_Rico.svg/2560px-Flag_of_Puerto_Rico.svg.png'
        : `https://flagsapi.com/${countryCode}/shiny/64.png`;
    alt = `${countryCode} Flag`;
    title = `Flag: ${countryCode}`;
  }
  // 2. Check if it is a Custom Badge (starts with "custom_")
  else if (typeof id === 'string' && id.startsWith('custom_')) {
    const parts = id.split('_');
    if (parts.length >= 3) {
      try {
        const name = decodeURIComponent(parts[1]);
        const url = decodeURIComponent(parts[2]);
        src = url;
        alt = name;
        title = name;
      } catch (e) {
        console.error('Bad custom badge', e);
      }
    }
  }
  // 3. Check if it is a Community Badge (starts with "comm_")
  else if (typeof id === 'string' && id.startsWith('comm_')) {
    const rawId = id.replace('comm_', '');
    const commBadge = commBadges.find((b) => b.id === rawId);
    if (commBadge) {
      src = commBadge.image_url;
      alt = commBadge.name;
      title = `Community: ${commBadge.name}`;
    } else {
      return null; // Don't render a broken image while waiting for DB fetch
    }
  }
  // 4. Check if it is a Standard Badge (from badges.js)
  else {
    const defs = badgeDefinitions || [];
    const badgeDef = defs.find((b) => b.id === id);
    if (badgeDef) {
      src = badgeDef.fileName;
      alt = badgeDef.name;
      title = badgeDef.name;
    }
  }

  if (!src) return null;

  return (
    <div style={wrapperStyle} title={title}>
      <img
        src={src}
        alt={alt}
        style={imgStyle}
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />
    </div>
  );
};

export default BadgeIcon;

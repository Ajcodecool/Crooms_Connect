import { useState, useEffect, type CSSProperties } from 'react';
import { JAPAN_IMAGES, THEME_OPTIONS, type ThemeId } from '../utils/themeUtils';
// 1. Import the local image (Liquid themSe)
import macTahoe from '../assets/mactahoe.jpg';
import aeroAurora from '../assets/aero-aurora.jpg';
import northernLightsBg from '../assets/northernlights-bg.jpg';

const THEME_BG_IMAGES: Partial<{ [T in ThemeId]: string }> = {
  wood: "url('/wood.png')",
  // 2. Liquid uses the imported variable
  liquid: `url(${macTahoe})`,
  xp: "url('https://wallpaperaccess.com/full/385739.jpg')",
  win7: "url('https://i.imgur.com/UQENXgI.png')",
  // 3. ADD RAIN HERE (Points to public folder directly)
  rain: "url('/croomrain.png')",
  'aero-os': `url(${aeroAurora})`,
  // 4. ADD BULLY HERE
  bully: "url('https://files.catbox.moe/slwelf.png')",
  'northern-lights': `url(${northernLightsBg})`, // Fixed to match ThemeId
};

export const useTheme = (): {
  theme: ThemeId;
  setTheme: (newTheme: ThemeId) => void;
  themeClass: string;
  themeStyle: CSSProperties;
  backgroundEffect: string;
} => {
  const [theme, setTheme] = useState<ThemeId>(() => {
    const rawTheme = localStorage.getItem('chatTheme');
    return (
      (THEME_OPTIONS.some((t) => t.id === rawTheme) && (rawTheme as ThemeId)) ||
      'dark'
    );
  });
  const [themeStyle, setThemeStyle] = useState({});
  const [backgroundEffect] = useState(() => {
    const raw = localStorage.getItem('backgroundEffect');
    return raw === 'rain' || raw === 'snow' ? raw : '';
  });

  useEffect(() => {
    // Sync Transparency
    const savedTrans = localStorage.getItem('chatTransparency');
    if (savedTrans) {
      document.documentElement.style.setProperty(
        '--content-bg-alpha',
        savedTrans,
      );
    }

    // Apply customizations globally
    const cursorPreset = localStorage.getItem('cursorPreset') || 'default';
    const customCursorUrl = localStorage.getItem('customCursorUrl') || '';
    const primaryColor = localStorage.getItem('primaryColor') || '#007bff';
    const secondaryColor = localStorage.getItem('secondaryColor') || '#6c757d';
    const backgroundImageUrl = localStorage.getItem('backgroundImageUrl') || '';

    // Apply cursor
    const cursorValue = customCursorUrl
      ? `url(${customCursorUrl}), ${cursorPreset}`
      : cursorPreset;
    document.body.style.cursor = cursorValue;
    document.documentElement.style.cursor = cursorValue;

    // Apply colors as CSS variables
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty(
      '--secondary-color',
      secondaryColor,
    );

    const style: React.CSSProperties = {
      backgroundColor: theme === 'bully' ? '#050505' : 'var(--primary-bg)', // Added fallback for bully
      minHeight: '100vh',
      transition: 'background-image 0.5s ease, background-color 0.5s ease',
    };

    let themeBackground = '';
    let backgroundSize = 'cover';
    const backgroundPosition = 'center';

    if (theme === 'dark') {
      style.backgroundColor = '#020617';
    } else if (theme === 'japan') {
      const randomImg =
        JAPAN_IMAGES[Math.floor(Math.random() * JAPAN_IMAGES.length)];
      themeBackground = `url('${randomImg}')`;
    } else if (theme in THEME_BG_IMAGES) {
      themeBackground =
        THEME_BG_IMAGES[theme as keyof typeof THEME_BG_IMAGES] || '';

      // APPLY LIQUID/RAIN STRETCH LOGIC (100% 100%)
      if (
        theme === 'liquid' ||
        theme === 'rain' ||
        theme === 'northern-lights'
      ) {
        // Fixed to match ThemeId
        backgroundSize = '100% 100%';
      }
    }

    // Layer custom background over theme background
    if (backgroundImageUrl) {
      const customBg = `url(${backgroundImageUrl})`;
      if (themeBackground) {
        style.backgroundImage = `${customBg}, ${themeBackground}`;
        style.backgroundSize = `${backgroundSize}, ${backgroundSize}`;
        style.backgroundPosition = `${backgroundPosition}, ${backgroundPosition}`;
      } else {
        style.backgroundImage = customBg;
        style.backgroundSize = backgroundSize;
        style.backgroundPosition = backgroundPosition;
      }
      style.backgroundRepeat = 'no-repeat';
      style.backgroundAttachment = 'fixed';
    } else if (themeBackground) {
      style.backgroundImage = themeBackground;
      style.backgroundSize = backgroundSize;
      style.backgroundPosition = backgroundPosition;
      style.backgroundRepeat = 'no-repeat';
      style.backgroundAttachment = 'fixed';
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeStyle(style);
    localStorage.setItem('chatTheme', theme);
  }, [theme]);

  return {
    theme,
    setTheme,
    themeClass: `theme-${theme}`,
    themeStyle,
    backgroundEffect,
  };
};

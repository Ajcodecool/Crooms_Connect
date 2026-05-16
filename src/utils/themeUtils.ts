// === JAPAN THEME IMAGEss ===
export const JAPAN_IMAGES = [
  'https://files.catbox.moe/y6qlyc.JPG',
  'https://files.catbox.moe/zw7lmz.JPG',
  'https://files.catbox.moe/hjcbt5.JPG',
  'https://files.catbox.moe/18nykf.JPG',
  'https://files.catbox.moe/acrxy9.jpg',
  'https://files.catbox.moe/1l768l.jpg',
  'https://files.catbox.moe/0jx9uq.jpg',
  'https://files.catbox.moe/w7flr8.jpg',
  'https://files.catbox.moe/61lkog.jpg',
  'https://files.catbox.moe/ttdpcp.jpg',
  'https://files.catbox.moe/kqq2hr.jpg',
  'https://files.catbox.moe/y5kexz.jpg',
  'https://files.catbox.moe/q74lg8.jpg',
  'https://files.catbox.moe/0atgbh.jpg',
  'https://files.catbox.moe/68b30x.jpg',
  'https://files.catbox.moe/zq1wsx.jpg',
  'https://files.catbox.moe/itgv4h.jpg',
  'https://files.catbox.moe/nwq7is.jpg',
];

// === THEME LIST DEFINITION ===
export const THEME_OPTIONS = [
  {
    id: 'dark',
    label: 'Dark (Default)',
    icon: 'fa-moon',
    desc: 'Sleek and modern dark mode.',
  },
  {
    id: 'light',
    label: 'Light Mode',
    icon: 'fa-sun',
    desc: 'Clean and bright interface.',
  },
  {
    id: 'xp',
    label: 'Windows XP',
    icon: 'fa-brands fa-windows',
    desc: 'Nostalgic Luna blue style.',
  },
  {
    id: 'win7',
    label: 'Windows 7',
    icon: 'fa-brands fa-microsoft',
    desc: 'Aero glass transparency.',
  },
  {
    id: 'win98',
    label: 'Windows 98',
    icon: 'fa-desktop',
    desc: 'Classic gray retro feel.',
  },
  {
    id: 'ios',
    label: 'iOS / iMessage',
    icon: 'fa-brands fa-apple',
    desc: 'Minimalist mobile aesthetic.',
  },
  {
    id: 'dos',
    label: 'DOS Terminal',
    icon: 'fa-terminal',
    desc: 'Green phosphor on black.',
  },
  {
    id: 'wood',
    label: 'Bulletin Board',
    icon: 'fa-clipboard',
    desc: 'Wooden texture and notes.',
  },
  {
    id: 'liquid',
    label: 'Liquid',
    icon: 'fa-water',
    desc: 'Glassmorphism with blurred background.',
  },
  {
    id: 'rain',
    label: 'Rain',
    icon: 'fa-cloud-rain',
    desc: 'The Rain is Coming.',
  },
  {
    id: 'japan',
    label: 'Japan',
    icon: 'fa-torii-gate',
    desc: 'Pictures Taken by AJTech in Kyoto, Tokyo, and Osaka.',
  },
  {
    id: 'aero',
    label: 'Frutiger Aero',
    icon: 'fa-droplet',
    desc: 'Glossy 2000s aesthetic.',
  },
  {
    id: 'aero-os',
    label: 'Aero OS',
    icon: 'fa-droplet',
    desc: 'mac leopard prototype.',
  },
  {
    id: 'crimnet',
    label: 'CRIM.NET',
    icon: 'fa-globe',
    desc: 'The Crime Network.',
  },
  {
    id: 'bully',
    label: 'BULLY',
    icon: 'fa-record-vinyl',
    desc: 'Stark black-and-white brutalist aesthetic.',
  },
  {
    id: 'northern-lights',
    label: 'Northern Lights',
    icon: 'fa-mountain-sun',
    desc: 'Animated aurora borealis with flowing lights.',
  },
] as const satisfies {
  id: string;
  label: string;
  icon: string;
  desc: string;
}[];

export type ThemeId = (typeof THEME_OPTIONS)[number]['id'];

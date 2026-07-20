// Category badge metadata — mirrors the legend on the reference site.
// { code: { label, bg, fg } }
export const CATEGORY_META = {
  BRD: { label: 'BRD', bg: '#b05a5a', fg: '#ffffff' },
  CS: { label: 'Case Study', bg: '#a9c7e8', fg: '#1b1b1b' },
  DV: { label: 'Demo Video', bg: '#a8d5a8', fg: '#1b1b1b' },
  MV: { label: 'Marketing Video', bg: '#a4453c', fg: '#ffffff' },
  SD: { label: 'Solution Document', bg: '#e3e3e3', fg: '#1b1b1b' },
  WP: { label: 'Wireframe PPT', bg: '#6f6f6f', fg: '#ffffff' },
  WU: { label: 'Wireframe URL', bg: '#e6d2a6', fg: '#1b1b1b' },
  O: { label: 'Others', bg: '#bf4a34', fg: '#ffffff' },
};

export const CATEGORY_CODES = Object.keys(CATEGORY_META);

export const STAGES = ['Prototype', 'POV', 'MVP', 'Production'];

export const STATUSES = ['Active', 'Upcoming'];

export const TIERS = ['Free', 'Premium'];

export const categoryMeta = (code) =>
  CATEGORY_META[code] || { label: code, bg: '#cccccc', fg: '#1b1b1b' };

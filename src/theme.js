// Couleurs "Néon doux" — niveaux, groupes, accents
export const LEVEL_COLORS = {
  A: { bg: '#2DD4BF', fg: '#042F2E', group: '#0F766E' },
  B: { bg: '#38BDF8', fg: '#082F49', group: '#0369A1' },
  C: { bg: '#818CF8', fg: '#1E1B4B', group: '#4338CA' },
  D: { bg: '#C084FC', fg: '#3B0764', group: '#7E22CE' },
  E: { bg: '#F472B6', fg: '#500724', group: '#BE185D' },
  TT: { bg: '#FB923C', fg: '#431407', group: '#C2410C' },
  Next: { bg: '#D5E0D8', fg: '#23392C', group: '#52695B' },
  Talak: { bg: '#CBD5E1', fg: '#1E293B', group: '#64748B' },
};

export const CATEGORIES = [
  { id: 'GBB', label: 'GBB' },
  { id: 'IndivBB', label: 'Indiv BB' },
  { id: 'NextClass', label: 'Next class' },
  { id: 'Talak', label: 'Talak' },
];

export const catLabel = (id) => (CATEGORIES.find((c) => c.id === id) || {}).label || id;

// Clé de couleur d'un fruit : niveau pour GBB / Indiv BB, sinon Next / Talak
export function colorKey(f) {
  if (f.categorie === 'NextClass') return 'Next';
  if (f.categorie === 'Talak') return 'Talak';
  return f.niveau || null;
}
export const levelColor = (f) => LEVEL_COLORS[colorKey(f)] || null;

export const T = {
  bg: '#F6F7FB',
  panel: '#FFFFFF',
  line: '#E6E8F0',
  text: '#1F2433',
  muted: '#6B7280',
  yellow: '#FACC15',
  yellowDark: '#422006',
  pill: '#FEF3C7',
  relance: '#B45309',
  gold: '#D4AF37',
  danger: '#DC2626',
  font: 'Georgia, "Times New Roman", serif',
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

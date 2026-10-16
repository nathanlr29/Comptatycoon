/** Formatage des nombres en français (docs/GDD.md §11). Les valeurs sont arrondies à l'inférieur. */

const THIN = ' '; // espace fine insécable, séparateur de milliers
const NBSP = ' '; // espace insécable avant l'unité

function floorTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  // Le petit epsilon évite qu'un 0,3 stocké 0,29999… s'affiche 0,2.
  return Math.floor(value * f + 1e-9) / f;
}

function fixed(value: number, decimals: number): string {
  const [int = '0', frac] = floorTo(value, decimals).toFixed(decimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, THIN);
  return frac ? `${grouped},${frac}` : grouped;
}

const SCALES = [
  { min: 1e9, div: 1e9, unit: 'Md€', decimals: 1 },
  { min: 1e6, div: 1e6, unit: 'M€', decimals: 2 },
  { min: 1e4, div: 1e3, unit: 'k€', decimals: 1 },
] as const;

/** `1 234 €`, `12,5 k€`, `3,40 M€`, `1,2 Md€`, puis `1,23e12 €`. */
export function formatMoney(value: number): string {
  const sign = value < 0 ? '-' : '';
  const v = Math.abs(value);
  if (v >= 1e12) {
    const [mantissa = '0', exp = '0'] = v.toExponential(2).split('e+');
    return `${sign}${mantissa.replace('.', ',')}e${exp}${NBSP}€`;
  }
  for (const s of SCALES) {
    if (v >= s.min) return `${sign}${fixed(v / s.div, s.decimals)}${NBSP}${s.unit}`;
  }
  return `${sign}${fixed(v, 0)}${NBSP}€`;
}

/** Revenu par seconde : une décimale sous 100 €/s. */
export function formatRate(value: number): string {
  if (Math.abs(value) < 100) return `${fixed(value, 1)}${NBSP}€/s`;
  return `${formatMoney(value)}/s`;
}

/** Durée lisible : `45 s`, `12 min`, `2 h 15 min`, `8 h` (arrondie à l'inférieur). */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}${NBSP}s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}${NBSP}min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}${NBSP}h` : `${hours}${NBSP}h ${minutes}${NBSP}min`;
}

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Date de dernière partie : `16 oct., 14:05`. */
export function formatDate(timestamp: number): string {
  return DATE_FORMAT.format(timestamp);
}

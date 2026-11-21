import { de as t, fill } from '../data/texts.de';

const formatters = new Map<number, Intl.NumberFormat>();
function nf(digits: number): Intl.NumberFormat {
  let f = formatters.get(digits);
  if (!f) {
    f = new Intl.NumberFormat(t.locale, { maximumFractionDigits: digits, minimumFractionDigits: digits });
    formatters.set(digits, f);
  }
  return f;
}

/** "0,45 m", "3,2 m", "50 m", "∞" – precision shrinks with distance. */
export function formatMeters(m: number, digits = m < 1 ? 2 : m < 10 ? 1 : 0): string {
  if (!Number.isFinite(m)) return t.graph.infinity;
  return fill(t.graph.meters, { value: nf(digits).format(m) });
}

/** "2,6 m – 3,5 m"; adds decimals for shallow ranges so the ends never read the same ("2,95 m – 3,05 m"). */
export function formatMeterRange(near: number, far: number): string {
  if (!Number.isFinite(far)) return `${formatMeters(near)} – ${formatMeters(far)}`;
  let digits = near < 1 ? 2 : near < 10 ? 1 : 0;
  while (digits < 3 && formatMeters(near, digits) === formatMeters(far, digits)) digits++;
  return `${formatMeters(near, digits)} – ${formatMeters(far, digits)}`;
}

/** Plain number in the UI locale, for axis ticks. Default precision: one decimal below 1. */
/** "0,12" below 1 MP, "4,3" below 10 MP, "24" above. */
export const formatMp = (mp: number) => formatNumber(mp, mp < 1 ? 2 : mp < 10 ? 1 : 0);

export function formatNumber(x: number, digits = x > 0 && x < 1 ? 1 : 0): string {
  return nf(digits).format(x);
}

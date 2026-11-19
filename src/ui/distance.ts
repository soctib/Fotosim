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
export function formatMeters(m: number): string {
  if (!Number.isFinite(m)) return t.graph.infinity;
  const digits = m < 1 ? 2 : m < 10 ? 1 : 0;
  return fill(t.graph.meters, { value: nf(digits).format(m) });
}

/** Plain number in the UI locale, for axis ticks. */
export function formatNumber(x: number): string {
  const digits = x < 1 ? 1 : 0;
  return nf(digits).format(x);
}

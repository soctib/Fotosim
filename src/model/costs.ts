// What the current gear roughly costs: camera (or phone), lens and – on a tripod – the tripod.

import { BODY_PRICES, FILM_COSTS, LENS_KINDS_BY_TYPE, LENS_PRICES, TRIPOD_PRICES, type LensKind, type PriceRange } from '../data/prices';
import type { LensId, Motion, SensorId } from './types';

export interface Costs {
  camera: PriceRange;
  /** null: lens built in (phones, compacts). */
  lens: { kind: LensKind; priceEur: PriceRange } | null;
  /** null: handheld. */
  tripod: PriceRange | null;
  totalEur: PriceRange;
  /** Camera and lens are only available used. */
  used: boolean;
  phone: boolean;
  /** Film: running cost per roll and per frame (rounded to 0.1 €); null for digital. */
  film: { rollEur: PriceRange; framesPerRoll: number; perFrameEur: number } | null;
}

/** Round to a "price-like" number: 2 significant digits, at least to 5 €. */
export function roundPrice(eur: number): number {
  if (eur <= 0) return 0;
  const step = Math.max(5, 10 ** (Math.floor(Math.log10(eur)) - 1));
  return Math.round(eur / step) * step;
}

export function lensKind(lensId: LensId, equivalentMm: number): LensKind {
  return LENS_KINDS_BY_TYPE[lensId].find((k) => equivalentMm <= k.maxEqMm)!.kind;
}

export function costs(sensorId: SensorId, lensId: LensId, equivalentMm: number, motion: Motion, phone: boolean): Costs {
  const body = BODY_PRICES[sensorId];
  let lens: Costs['lens'] = null;
  if (!body.fixedLens) {
    const kind = lensKind(lensId, equivalentMm);
    const [min, max] = LENS_PRICES[kind];
    lens = { kind, priceEur: [roundPrice(min * body.lensFactor), roundPrice(max * body.lensFactor)] };
  }
  // 'frozen' = tripod or leaning against something; we assume the tripod.
  const tripod = motion === 'frozen' ? (phone ? TRIPOD_PRICES.phone : TRIPOD_PRICES.camera) : null;
  const parts = [body.priceEur, lens?.priceEur, tripod].filter((p): p is PriceRange => !!p);
  // Rounded like the parts: 4 360 € would suggest a precision none of this has.
  const totalEur = [0, 1].map((i) => roundPrice(parts.reduce((a, p) => a + p[i], 0))) as PriceRange;
  const fc = FILM_COSTS[sensorId];
  const film = fc
    ? { ...fc, perFrameEur: Math.round(((fc.rollEur[0] + fc.rollEur[1]) / 2 / fc.framesPerRoll) * 10) / 10 }
    : null;
  return { camera: body.priceEur, lens, tripod, totalEur, used: !!body.used, phone, film };
}

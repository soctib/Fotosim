import type { LensId, SensorId } from '../model/types';

// Very rough prices in EUR (late 2026), orders of magnitude only. Display names and examples
// live in data/texts.*.ts (texts.costs).

export type PriceRange = [number, number];

export interface BodyPrice {
  priceEur: PriceRange;
  /** Only available used (old phones, film cameras); their lenses are then used too. */
  used?: boolean;
  /** Lens built in (phones, compacts): no separate lens price. */
  fixedLens?: boolean;
  /** Price factor for this system's lenses relative to the full-frame prices in LENS_PRICES. */
  lensFactor: number;
}

export const BODY_PRICES: Record<SensorId, BodyPrice> = {
  iphoneXR: { priceEur: [100, 200], used: true, fixedLens: true, lensFactor: 0 },
  // No longer sold new by Apple; used/refurbished.
  iphone15ProMax: { priceEur: [500, 750], used: true, fixedLens: true, lensFactor: 0 },
  // Still sold new after the Fairphone 6 launch.
  fairphone5: { priceEur: [380, 550], fixedLens: true, lensFactor: 0 },
  oneInch: { priceEur: [500, 1400], fixedLens: true, lensFactor: 0 },
  // Lenses for smaller sensors are smaller and cheaper (e.g. a 12–40 mm f/2.8 vs. a 24–70 mm f/2.8).
  mft: { priceEur: [400, 1800], lensFactor: 0.6 },
  apsc: { priceEur: [500, 1800], lensFactor: 0.6 },
  // Older entry models (Nikon Z5, Canon RP, a used Sony A7 III) from ~800 € up to Sony A7 V ~2,800 €.
  fullFrame: { priceEur: [800, 2800], lensFactor: 1 },
  // Nikon Z8 ~3,700 € up to Canon R1 / Sony A1 II ~7,500 €.
  fullFramePro: { priceEur: [3500, 7500], lensFactor: 1 },
  // Film, used market: a classic program SLR (AE-1 Program, X-700) ~50–400 €.
  film35: { priceEur: [50, 400], used: true, lensFactor: 0.3 },
  // Used Canon EOS 3 / Nikon F100 ~150–400 €, up to a Nikon F6 (~2,000 €).
  film35Dx: { priceEur: [150, 2000], used: true, lensFactor: 0.5 },
  // Used GFX 50S II (~2,200 €) up to a new Hasselblad X2D II (~7,500 €). GF lenses cost about twice
  // the full-frame ones (Hasselblad XCD more).
  mf4433: { priceEur: [2500, 7500], lensFactor: 2 },
  mf645: { priceEur: [300, 1200], used: true, lensFactor: 0.6 },
  mf66: { priceEur: [300, 2500], used: true, lensFactor: 0.8 },
  // RB67 kit from ~500 € up to a Mamiya 7 with lens (~4,000 €).
  mf67: { priceEur: [500, 4000], used: true, lensFactor: 0.7 },
};

/** Concrete lens a lens type stands for at a given framing. */
export type LensKind =
  | 'wideZoomBudget'
  | 'kitZoom'
  | 'teleZoomBudget'
  | 'superTele'
  | 'wideZoom28'
  | 'standardZoom28'
  | 'teleZoom28'
  | 'tele300'
  | 'fastTele'
  | 'widePrime'
  | 'prime35'
  | 'prime50'
  | 'prime85'
  | 'prime135';

/** New prices of full-frame lenses. */
export const LENS_PRICES: Record<LensKind, PriceRange> = {
  wideZoomBudget: [300, 900],
  kitZoom: [100, 300],
  teleZoomBudget: [300, 700],
  superTele: [900, 2500],
  wideZoom28: [1000, 2500],
  standardZoom28: [700, 2500],
  teleZoom28: [1500, 3000],
  // e.g. Sony FE 300 mm f/2.8 GM
  tele300: [6000, 7000],
  fastTele: [9000, 14000],
  widePrime: [900, 1700],
  prime35: [500, 1500],
  prime50: [400, 1500],
  prime85: [800, 1800],
  prime135: [1000, 2000],
};

/**
 * Lens kinds per lens type, each up to a full-frame-equivalent focal length (inclusive, with
 * ~10 % slack so 77 mm still counts as a 24–70). The last entry covers everything longer.
 */
export const LENS_KINDS_BY_TYPE: Record<LensId, { maxEqMm: number; kind: LensKind }[]> = {
  kit: [
    { maxEqMm: 23, kind: 'wideZoomBudget' },
    { maxEqMm: 94, kind: 'kitZoom' },
    { maxEqMm: 330, kind: 'teleZoomBudget' },
    { maxEqMm: Infinity, kind: 'superTele' },
  ],
  fastZoom: [
    { maxEqMm: 23, kind: 'wideZoom28' },
    { maxEqMm: 77, kind: 'standardZoom28' },
    { maxEqMm: 220, kind: 'teleZoom28' },
    { maxEqMm: 330, kind: 'tele300' },
    { maxEqMm: Infinity, kind: 'fastTele' },
  ],
  // f/1.4 primes only exist up to ~135 mm; longer, the nearest thing is a 300 or 400 mm f/2.8.
  prime: [
    { maxEqMm: 23, kind: 'widePrime' },
    { maxEqMm: 40, kind: 'prime35' },
    { maxEqMm: 60, kind: 'prime50' },
    { maxEqMm: 100, kind: 'prime85' },
    { maxEqMm: 150, kind: 'prime135' },
    { maxEqMm: 330, kind: 'tele300' },
    { maxEqMm: Infinity, kind: 'fastTele' },
  ],
};

/** Tripod: a phone needs only a small one with a clamp. */
export const TRIPOD_PRICES = { phone: [20, 80] as PriceRange, camera: [60, 400] as PriceRange };

/** Film running cost per roll (C-41 colour negative incl. development and scan) and frames per roll. */
export interface FilmCost {
  rollEur: PriceRange;
  framesPerRoll: number;
}

export const FILM_COSTS: Partial<Record<SensorId, FilmCost>> = {
  // Kodak Gold 200 (36 exp.) ~11 €, development + scan 17–27 €
  film35: { rollEur: [25, 40], framesPerRoll: 36 },
  film35Dx: { rollEur: [25, 40], framesPerRoll: 36 },
  // Portra 400 120 ~17 €, development + scan 17.50–28 €
  mf645: { rollEur: [30, 45], framesPerRoll: 15 },
  mf66: { rollEur: [30, 45], framesPerRoll: 12 },
  mf67: { rollEur: [30, 45], framesPerRoll: 10 },
};

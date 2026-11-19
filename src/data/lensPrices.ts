// Very rough new prices in EUR (2025/26), orders of magnitude only.
// Focal ranges are full-frame equivalents, so "50 mm f/1.8" is the normal prime of any system
// (a 35 mm on APS-C, a 25 mm on MFT); lenses for smaller sensors cost somewhat less.
// Display names live in data/texts.*.ts (texts.lenses[id]).

export interface LensClass {
  id: string;
  /** Full-frame-equivalent focal range. */
  minEqMm: number;
  maxEqMm: number;
  /** Widest aperture (at the long end for zooms). */
  maxAperture: number;
  priceEur: [number, number];
}

export const LENS_CLASSES: LensClass[] = [
  { id: 'kitZoom', minEqMm: 28, maxEqMm: 85, maxAperture: 5.6, priceEur: [100, 300] },
  { id: 'nifty50', minEqMm: 50, maxEqMm: 50, maxAperture: 1.8, priceEur: [100, 250] },
  { id: 'fast35', minEqMm: 35, maxEqMm: 35, maxAperture: 1.4, priceEur: [500, 1500] },
  { id: 'portrait85', minEqMm: 85, maxEqMm: 85, maxAperture: 1.8, priceEur: [400, 700] },
  { id: 'wideZoom', minEqMm: 16, maxEqMm: 35, maxAperture: 4, priceEur: [400, 1200] },
  { id: 'standardZoom28', minEqMm: 24, maxEqMm: 70, maxAperture: 2.8, priceEur: [800, 2500] },
  { id: 'teleZoomBudget', minEqMm: 70, maxEqMm: 300, maxAperture: 6.3, priceEur: [300, 700] },
  { id: 'teleZoom28', minEqMm: 70, maxEqMm: 200, maxAperture: 2.8, priceEur: [1500, 3000] },
  { id: 'superTele', minEqMm: 150, maxEqMm: 600, maxAperture: 6.3, priceEur: [900, 2000] },
];

/** Lens classes that can deliver this equivalent focal length at this aperture. */
export function matchingLenses(equivalentMm: number, aperture: number): LensClass[] {
  return LENS_CLASSES.filter(
    (l) => equivalentMm >= l.minEqMm * 0.9 && equivalentMm <= l.maxEqMm * 1.1 && l.maxAperture <= aperture + 1e-9,
  );
}

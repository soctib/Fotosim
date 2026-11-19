// Very rough new prices in EUR (2025/26), orders of magnitude only.
// Real focal lengths; lenses for smaller sensors cost somewhat less.
// Display names live in data/texts.*.ts (texts.lenses[id]).

export interface LensClass {
  id: string;
  minMm: number;
  maxMm: number;
  /** Widest aperture (at the long end for zooms). */
  maxAperture: number;
  priceEur: [number, number];
}

export const LENS_CLASSES: LensClass[] = [
  { id: 'kitZoom', minMm: 18, maxMm: 55, maxAperture: 5.6, priceEur: [100, 300] },
  { id: 'nifty50', minMm: 50, maxMm: 50, maxAperture: 1.8, priceEur: [100, 250] },
  { id: 'fast35', minMm: 35, maxMm: 35, maxAperture: 1.4, priceEur: [500, 1500] },
  { id: 'portrait85', minMm: 85, maxMm: 85, maxAperture: 1.8, priceEur: [400, 700] },
  { id: 'wideZoom', minMm: 16, maxMm: 35, maxAperture: 4, priceEur: [400, 1200] },
  { id: 'standardZoom28', minMm: 24, maxMm: 70, maxAperture: 2.8, priceEur: [800, 2500] },
  { id: 'teleZoomBudget', minMm: 70, maxMm: 300, maxAperture: 6.3, priceEur: [300, 700] },
  { id: 'teleZoom28', minMm: 70, maxMm: 200, maxAperture: 2.8, priceEur: [1500, 3000] },
  { id: 'superTele', minMm: 150, maxMm: 600, maxAperture: 6.3, priceEur: [900, 2000] },
];

/** Lens classes that can deliver a real focal length at a given aperture. */
export function matchingLenses(realMm: number, aperture: number): LensClass[] {
  return LENS_CLASSES.filter(
    (l) => realMm >= l.minMm * 0.9 && realMm <= l.maxMm * 1.1 && l.maxAperture <= aperture + 1e-9,
  );
}

import type { LensKind } from './prices';

// Rough outlines of the concrete full-frame lenses behind each lens kind (see prices.ts), seen
// from above, for the camera panel. Sections run from the mount to the front, lengths and
// diameters in mm, from the makers' data sheets where they were at hand, otherwise estimated.
// Other systems scale these (model/cameraPanel.ts: systemLensScale) – rough, like the prices.
// The widest aperture is the simulation's (derive().maxAperture), not the concrete lens's: the
// front element is widened if the entrance pupil needs it.

export type LensSectionKind =
  | 'mount'
  | 'barrel' // plain barrel: the only part a very long lens may be drawn shortened
  | 'zoom' // zoom ring
  | 'focus' // focus ring
  | 'inner' // inner tube that slides out towards the long end
  | 'collar' // tripod collar
  | 'front'; // front barrel around the front element

export interface LensSection {
  kind: LensSectionKind;
  lengthMm: number;
  /** Diameter at the front end of the section. */
  dMm: number;
  /** Diameter at the rear end, if the section tapers. */
  d0Mm?: number;
  /** The focal length and aperture are printed on this section (primes). */
  engraved?: boolean;
}

export interface LensShape {
  /** Focal range (full-frame mm); equal for primes. */
  focalMm: [number, number];
  /** How far the inner tube slides out at the long end (mm); 0 = internal zoom. */
  extensionMm: number;
  /** Front element bulge (mm). */
  bulgeMm?: number;
  sections: LensSection[];
}

const s = (kind: LensSectionKind, lengthMm: number, dMm: number, o: Partial<LensSection> = {}): LensSection => ({
  kind,
  lengthMm,
  dMm,
  ...o,
});

export const LENS_SHAPES: Record<LensKind, LensShape> = {
  // e.g. Sony FE 16–35 F4
  wideZoomBudget: {
    focalMm: [16, 35],
    extensionMm: 0,
    sections: [s('mount', 6, 64), s('barrel', 10, 80, { d0Mm: 70 }), s('zoom', 18, 80), s('barrel', 8, 80), s('focus', 14, 80), s('barrel', 22, 80), s('front', 12, 82, { d0Mm: 80 })],
  },
  // e.g. Sony FE 28–70
  kitZoom: {
    focalMm: [28, 70],
    extensionMm: 28,
    sections: [s('mount', 6, 62), s('barrel', 8, 72, { d0Mm: 66 }), s('zoom', 26, 72), s('barrel', 6, 72), s('inner', 8, 66), s('focus', 12, 68), s('front', 17, 68)],
  },
  // e.g. Sony FE 70–300 G
  teleZoomBudget: {
    focalMm: [70, 300],
    extensionMm: 50,
    sections: [s('mount', 6, 64), s('barrel', 30, 80, { d0Mm: 70 }), s('zoom', 34, 84), s('barrel', 20, 84), s('inner', 8, 78), s('focus', 16, 80), s('front', 29, 82)],
  },
  // e.g. Sigma 150–600 C
  superTele: {
    focalMm: [150, 600],
    extensionMm: 70,
    sections: [s('mount', 6, 68), s('barrel', 30, 86, { d0Mm: 76 }), s('focus', 22, 90), s('barrel', 18, 92), s('zoom', 50, 95), s('barrel', 22, 95), s('inner', 20, 92), s('front', 92, 105, { d0Mm: 98 })],
  },
  // e.g. Nikon Z 14–24/2.8 S
  wideZoom28: {
    focalMm: [14, 24],
    extensionMm: 0,
    bulgeMm: 3,
    sections: [s('mount', 6, 64), s('barrel', 20, 84, { d0Mm: 72 }), s('zoom', 24, 88), s('barrel', 10, 88), s('focus', 16, 88), s('barrel', 30, 88), s('front', 18.5, 88)],
  },
  // e.g. Canon RF 24–70/2.8
  standardZoom28: {
    focalMm: [24, 70],
    extensionMm: 30,
    sections: [s('mount', 6, 64), s('barrel', 12, 86, { d0Mm: 74 }), s('zoom', 30, 88), s('barrel', 10, 88), s('focus', 20, 88), s('barrel', 8, 88), s('inner', 8, 84), s('front', 31.7, 88)],
  },
  // e.g. Sony FE 70–200 GM: zooms internally, the length never changes
  teleZoom28: {
    focalMm: [70, 200],
    extensionMm: 0,
    sections: [s('mount', 6, 64), s('barrel', 28, 80, { d0Mm: 72 }), s('collar', 12, 86), s('barrel', 10, 84), s('zoom', 32, 88), s('barrel', 14, 88), s('focus', 26, 88), s('barrel', 30, 88), s('front', 42, 88)],
  },
  // e.g. Sony FE 300 GM
  tele300: {
    focalMm: [300, 300],
    extensionMm: 0,
    sections: [s('mount', 6, 68), s('barrel', 40, 92, { d0Mm: 82 }), s('collar', 14, 100), s('barrel', 30, 96, { engraved: true }), s('focus', 28, 102), s('barrel', 20, 126.5, { d0Mm: 104 }), s('front', 109, 126.5)],
  },
  // e.g. Sony FE 400 GM
  fastTele: {
    focalMm: [400, 400],
    extensionMm: 0,
    sections: [s('mount', 6, 68), s('barrel', 60, 96, { d0Mm: 82 }), s('collar', 16, 108), s('barrel', 40, 100, { engraved: true }), s('focus', 30, 110), s('barrel', 40, 110), s('barrel', 30, 158, { d0Mm: 110 }), s('front', 137, 158)],
  },
  // e.g. Sigma 20/1.4 DG DN
  widePrime: {
    focalMm: [20, 20],
    extensionMm: 0,
    bulgeMm: 5,
    sections: [s('mount', 6, 64), s('barrel', 20, 82, { d0Mm: 70 }), s('focus', 22, 84), s('barrel', 30, 86, { engraved: true }), s('front', 35.2, 88, { d0Mm: 86 })],
  },
  // e.g. Sony FE 35 GM
  prime35: {
    focalMm: [35, 35],
    extensionMm: 0,
    sections: [s('mount', 6, 62), s('barrel', 16, 74, { d0Mm: 68 }), s('focus', 30, 76), s('barrel', 20, 76, { engraved: true }), s('front', 24, 76)],
  },
  // e.g. Sony FE 50 GM
  prime50: {
    focalMm: [50, 50],
    extensionMm: 0,
    sections: [s('mount', 6, 62), s('barrel', 16, 78, { d0Mm: 68 }), s('focus', 30, 80.6), s('barrel', 20, 80.6, { engraved: true }), s('front', 24, 80.6)],
  },
  // e.g. Sony FE 85 GM II
  prime85: {
    focalMm: [85, 85],
    extensionMm: 0,
    sections: [s('mount', 6, 64), s('barrel', 20, 82, { d0Mm: 70 }), s('focus', 34, 84.7), s('barrel', 22, 84.7, { engraved: true }), s('front', 25.3, 84.7)],
  },
  // e.g. Sony FE 135 GM
  prime135: {
    focalMm: [135, 135],
    extensionMm: 0,
    sections: [s('mount', 6, 64), s('barrel', 28, 86, { d0Mm: 72 }), s('focus', 36, 89.5), s('barrel', 27, 89.5, { engraved: true }), s('front', 30, 89.5)],
  },
};

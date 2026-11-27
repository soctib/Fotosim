import type { SensorId } from '../model/types';

// Rough top-view outlines of one representative body per camera type (see texts.costs.examples),
// for the camera panel. All sizes in mm; y = 0 is the lens mount face, the lens points to −y.

interface Common {
  /** The real representative body has a top display. The panel draws one anyway (ui/camera). */
  realTopDisplay: boolean;
}

/** Phone seen from its top edge: the camera bump faces the subject, the screen faces you. */
export interface PhoneShape extends Common {
  type: 'phone';
  widthMm: number;
  thicknessMm: number;
  bumps: { x0: number; w: number; h: number; metal?: boolean }[];
  /** Lens windows visible from the top edge (x = centre). */
  lenses: { x: number; d: number; h: number }[];
}

/** Compact with a built-in, telescoping zoom; `lensX` = lens axis. */
export interface CompactShape extends Common {
  type: 'compact';
  widthMm: number;
  depthMm: number;
  lensX: number;
}

/** Mirrorless body: grip towards the front right, finder hump over the lens axis (`humpX`). */
export interface MirrorlessShape extends Common {
  type: 'ml';
  widthMm: number;
  depthMm: number;
  gripMm: number;
  gripWidthMm: number;
  humpWidthMm: number;
  humpX: number;
  eyecupMm: number;
}

/** Film SLR: mirror box in front, prism on top, shutter speed dial, rewind crank with the film speed. */
export interface SlrShape extends Common {
  type: 'slr';
  widthMm: number;
  depthMm: number;
  mirrorBoxMm: number;
  mirrorBoxWidthMm: number;
  prismWidthMm: number;
  eyecupMm: number;
  /** Separate film back (6×4.5). */
  backMm?: number;
  /** Winder grip. */
  winder?: { w: number; front: number };
}

/** 6×6 box camera with magazine and waist-level finder; the shutter is in the lens. */
export interface BoxShape extends Common {
  type: 'box';
  widthMm: number;
  depthMm: number;
  magazineMm: number;
}

export type BodyShape = PhoneShape | CompactShape | MirrorlessShape | SlrShape | BoxShape;

export const BODY_SHAPES: Record<SensorId, BodyShape> = {
  // 75.7 × 8.3 mm
  iphoneXR: {
    type: 'phone', widthMm: 75.7, thicknessMm: 8.3, realTopDisplay: false,
    bumps: [{ x0: 21.8, w: 11, h: 1, metal: true }],
    lenses: [{ x: 27.3, d: 8.5, h: 0.4 }],
  },
  // 76.7 × 8.25 mm, camera bump 4 mm
  iphone15ProMax: {
    type: 'phone', widthMm: 76.7, thicknessMm: 8.25, realTopDisplay: false,
    bumps: [{ x0: 2.3, w: 36, h: 1.6 }],
    lenses: [{ x: 11.9, d: 15, h: 2.5 }, { x: 25.8, d: 15.5, h: 2.6 }],
  },
  // 75.8 × 9.6 mm
  fairphone5: {
    type: 'phone', widthMm: 75.8, thicknessMm: 9.6, realTopDisplay: false,
    bumps: [{ x0: 11.9, w: 22, h: 1.3 }],
    lenses: [{ x: 22.9, d: 12, h: 0.7 }],
  },
  // Sony RX100: 102 × 41 mm
  oneInch: { type: 'compact', widthMm: 101.6, depthMm: 35, lensX: -14, realTopDisplay: false },
  // OM System OM-5: 125 × 50 mm
  mft: { type: 'ml', widthMm: 125.3, depthMm: 34, gripMm: 9, gripWidthMm: 30, humpWidthMm: 38, humpX: -8, eyecupMm: 7, realTopDisplay: false },
  // Canon R50: 116 × 69 mm
  apsc: { type: 'ml', widthMm: 116.3, depthMm: 38, gripMm: 22, gripWidthMm: 32, humpWidthMm: 36, humpX: -4, eyecupMm: 8, realTopDisplay: false },
  // Nikon Z5: 134 × 70 mm
  fullFrame: { type: 'ml', widthMm: 134, depthMm: 42, gripMm: 20, gripWidthMm: 36, humpWidthMm: 44, humpX: -6, eyecupMm: 7.5, realTopDisplay: false },
  // Nikon Z8: 144 × 83 mm
  fullFramePro: { type: 'ml', widthMm: 144, depthMm: 50, gripMm: 24, gripWidthMm: 40, humpWidthMm: 50, humpX: -6, eyecupMm: 9, realTopDisplay: true },
  // Nikon FM2: 143 × 55 mm
  film35: { type: 'slr', widthMm: 142.5, depthMm: 36, mirrorBoxMm: 14, mirrorBoxWidthMm: 66, prismWidthMm: 58, eyecupMm: 5, realTopDisplay: false },
  // Fujifilm GFX 100S: 150 × 87 mm
  mf4433: { type: 'ml', widthMm: 150, depthMm: 50, gripMm: 25, gripWidthMm: 42, humpWidthMm: 58, humpX: -8, eyecupMm: 12, realTopDisplay: true },
  // Mamiya 645 Pro: 150 × 106 mm
  mf645: {
    type: 'slr', widthMm: 150, depthMm: 58, mirrorBoxMm: 18, mirrorBoxWidthMm: 80, prismWidthMm: 68, eyecupMm: 6,
    backMm: 24, winder: { w: 30, front: 22 }, realTopDisplay: false,
  },
  // Hasselblad 500C/M: 98 (+16) × 122 mm
  mf66: { type: 'box', widthMm: 98, depthMm: 72, magazineMm: 50, realTopDisplay: false },
  // Pentax 67: 184 × 96 mm
  mf67: { type: 'slr', widthMm: 184, depthMm: 64, mirrorBoxMm: 24, mirrorBoxWidthMm: 98, prismWidthMm: 92, eyecupMm: 8, realTopDisplay: false },
};

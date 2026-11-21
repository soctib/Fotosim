// Effective resolution: how much real detail the photo of the subject in focus holds.
//
// Every factor becomes a blur width on the sensor (µm). They combine as a root sum of squares –
// the usual stand-in for multiplying MTFs – into one total blur b. The photo then holds about one
// independent detail per b, so frame height / b effective pixels along the height, and
// effective MP = frame area / b².
//
// Presentation as a budget: the ceiling is what the recording medium delivers with a perfect lens and
// technique – the sensor's pixels (colour filter included) or the film's grain. Every other factor
// costs a share of it. Since 1/MP grows with b², which is a plain sum, these shares and the share
// reached add up to exactly 100 %: factor i costs b_i² / b² of the ceiling, the medium keeps b_0² / b².
//
// Consistency with the depth-of-field model: a blur of exactly one circle of confusion
// (diagonal/1500) leaves 1500 effective pixels along the diagonal – the classic "sharp" standard.

import { lensMaxApertureRaw } from './lens';
import type { CameraLens } from './types';

export type ResolutionFactor =
  | 'pixels'
  | 'diffraction'
  | 'lens'
  | 'defocus'
  | 'motion'
  | 'shake'
  | 'processing'
  | 'film'
  | 'scanner';

export interface Contribution {
  factor: ResolutionFactor;
  um: number;
}

export interface Loss {
  factor: ResolutionFactor;
  /** Share of the ceiling this factor costs (0–1). */
  share: number;
}

/** Below this total loss the photo counts as at the ceiling: nothing worth pointing at. */
export const AT_CEILING_LOSS = 0.1;

/**
 * A Bayer sensor (one colour per pixel) resolves a bit less than its pixel grid: demosaicing
 * costs ≈ 10 % linear resolution. Scanners with a full-colour line sensor don't pay it.
 */
export const BAYER_BLUR_FACTOR = 1.1;

/** Green light (µm). */
export const WAVELENGTH_UM = 0.55;
/**
 * Share of the Airy disc (2.44·λ·N) that acts as blur. Calibrated so diffraction starts to cost
 * detail around f/11 on 24 MP full frame and around f/8 on 45 MP.
 */
export const DIFFRACTION_SHARE = 0.45;

/** Zooms are softer at the ends of their range: blur × (1 + this) at either end. */
export const ZOOM_END_PENALTY = 0.25;

/**
 * Shake smear on the sensor at the handheld limit, as a share of the circle of confusion. The limit
 * (1/(2·f·crop)) keeps the smear well under the CoC; on high-resolution sensors it still shows.
 */
export const SHAKE_SHARE_AT_LIMIT = 0.25;

/**
 * Noise reduction smears fine detail once the noise index passes `startStops`; per stop beyond it
 * the smear grows by `umPerStop` pixel pitches. Phones start earlier and smear harder
 * ("watercolour" look in low light).
 */
export const NOISE_REDUCTION = {
  camera: { startStops: 5, pitchPerStop: 0.5 },
  phone: { startStops: 3, pitchPerStop: 0.7 },
};

/**
 * Film resolving power at normal subject contrast (lp/mm), falling with film speed. ISO stands
 * for the film stock: ≈ 90 lp/mm at ISO 100, 65 at ISO 400, 40 at ISO 3200.
 */
export function filmLpPerMm(iso: number): number {
  return 65 * (400 / iso) ** 0.25;
}

/** One line pair = two details, so the film acts like a blur of half a line pair. */
export function filmBlurUm(iso: number): number {
  return 1000 / (2 * filmLpPerMm(iso));
}

export function diffractionBlurUm(aperture: number): number {
  return DIFFRACTION_SHARE * 2.44 * WAVELENGTH_UM * aperture;
}

/**
 * Lens blur (µm) for a lens class at an equivalent focal length and aperture: a residual at the sweet
 * spot plus aberrations that are largest wide open and fade with (wide open / N)². `formatScale`
 * scales it to the format the lens is built for (sensor diagonal / full-frame diagonal): lenses
 * for small sensors resolve finer, lenses for medium format coarser – in µm, not in the photo.
 */
export function lensBlurUm(lens: CameraLens, equivalentFocalMm: number, aperture: number, formatScale: number): number {
  const { bestUm, aberrationUm, zoomEndFactor } = lensBlurParts(lens, equivalentFocalMm, aperture);
  return Math.hypot(bestUm, aberrationUm) * zoomEndFactor * formatScale;
}

/** The parts of lens blur: residual at the sweet spot, aberrations from the aperture, and the zoom-end factor. */
function lensBlurParts(lens: CameraLens, equivalentFocalMm: number, aperture: number) {
  const wideOpen = lensMaxApertureRaw(lens, equivalentFocalMm);
  const aberrationUm = lens.wideOpenUm * Math.min(1, wideOpen / aperture) ** 2;
  let zoomEndFactor = 1;
  if (lens.zoom) {
    const u = Math.log(equivalentFocalMm / lens.wideEqMm) / Math.log(lens.teleEqMm / lens.wideEqMm);
    zoomEndFactor = 1 + ZOOM_END_PENALTY * Math.abs(2 * Math.min(1, Math.max(0, u)) - 1);
  }
  return { bestUm: lens.bestUm, aberrationUm, zoomEndFactor };
}

/**
 * Why the lens blurs, i.e. what would help: 'wideOpen' – stop down; 'zoomEnd' – zoom back towards
 * the middle; 'design' – nothing but a sharper lens. Judged by each part's share of the lens blur².
 */
export type LensCause = 'wideOpen' | 'zoomEnd' | 'design';
/** Aperture aberrations name the cause from this share of the lens blur² on. */
export const LENS_WIDE_OPEN_SHARE = 0.3;
/** The zoom end names the cause from this share of the lens blur² on (the outer ≈ quarter of the range). */
export const LENS_ZOOM_END_SHARE = 0.2;

export function lensBlurCause(lens: CameraLens, equivalentFocalMm: number, aperture: number): LensCause {
  const { bestUm, aberrationUm, zoomEndFactor } = lensBlurParts(lens, equivalentFocalMm, aperture);
  const core = bestUm * bestUm + aberrationUm * aberrationUm;
  const total = core * zoomEndFactor * zoomEndFactor;
  if ((aberrationUm * aberrationUm) / total >= LENS_WIDE_OPEN_SHARE) return 'wideOpen';
  if ((total - core) / total >= LENS_ZOOM_END_SHARE) return 'zoomEnd';
  return 'design';
}

/** Shake smear (µm) from the shake factor (1 = at the handheld limit) and the circle of confusion. */
export function shakeBlurUm(shakeFactor: number, cocMm: number): number {
  return shakeFactor * SHAKE_SHARE_AT_LIMIT * cocMm * 1000;
}

export function processingBlurUm(noiseIndexStops: number, pixelPitchUm: number, phone: boolean): number {
  const nr = phone ? NOISE_REDUCTION.phone : NOISE_REDUCTION.camera;
  return Math.max(0, noiseIndexStops - nr.startStops) * nr.pitchPerStop * pixelPitchUm;
}

export interface ResolutionInput {
  /** The frame the photo shows (after any digital zoom), mm. */
  frameWidthMm: number;
  frameHeightMm: number;
  /** Distance between the file's pixels on the sensor or film (µm). */
  pixelPitchUm: number;
  /** Blur per pixel pitch from sampling: BAYER_BLUR_FACTOR for sensors, 1 for scanners. */
  samplingFactor: number;
  /**
   * Film: the pixels are the scanner's, so they count – together with the scanner's own optical
   * blur – as one 'scanner' contribution instead of 'pixels'.
   */
  scannerBlurUm?: number;
  /** All other contributions (µm); zero ones may be left out. */
  blurs: Partial<Record<Exclude<ResolutionFactor, 'pixels' | 'scanner'>, number>>;
}

export interface Resolution {
  /** Effective megapixels: detail the photo really holds. */
  effectiveMp: number;
  /** Pixels in the file (after any crop). */
  nominalMp: number;
  /** Pixel columns of the file, for rendering pixels. */
  pixelsAcross: number;
  /** Resolvable line pairs per picture height. */
  linePairsPerHeight: number;
  /** Largest contribution. */
  bottleneck: ResolutionFactor;
  /** The recording medium: the sensor's pixels, or the film (the scan is a loss like the lens). */
  base: 'pixels' | 'film';
  /** Effective MP the medium delivers with a perfect lens and technique. */
  ceilingMp: number;
  /** Share of the ceiling reached: effectiveMp / ceilingMp. */
  reached: number;
  /** What every other factor costs, as shares of the ceiling, largest first; with `reached` they sum to 1. */
  losses: Loss[];
  /** The largest loss – unless all losses together stay under AT_CEILING_LOSS. */
  mainLoss: ResolutionFactor | null;
  /** All non-zero contributions, largest first. */
  contributions: Contribution[];
  totalBlurUm: number;
  /** Blur of the whole frame regardless of distance and motion (pixels, diffraction, lens, processing, film, scanner) – for rendering. */
  systemBlurUm: number;
}

/** Contributions that blur the whole frame alike; defocus, motion and shake are drawn per layer. */
const SYSTEM_FACTORS: ResolutionFactor[] = ['pixels', 'diffraction', 'lens', 'processing', 'film', 'scanner'];

export function effectiveResolution(input: ResolutionInput): Resolution {
  const { frameWidthMm: W, frameHeightMm: H, pixelPitchUm: p } = input;
  const scan = input.scannerBlurUm;
  const contributions: Contribution[] = [
    scan === undefined
      ? { factor: 'pixels', um: p * input.samplingFactor }
      : { factor: 'scanner', um: Math.hypot(p * input.samplingFactor, scan) },
  ];
  for (const [factor, um] of Object.entries(input.blurs) as [ResolutionFactor, number][]) {
    if (um > 0) contributions.push({ factor, um });
  }
  contributions.sort((a, b) => b.um - a.um);
  const rss = (list: Contribution[]) => Math.sqrt(list.reduce((s, c) => s + c.um * c.um, 0));
  const total = rss(contributions);
  const areaUm2 = W * H * 1e6;
  const nominalMp = areaUm2 / (p * p) / 1e6;
  const base: Resolution['base'] = scan === undefined ? 'pixels' : 'film';
  const baseUm = contributions.find((c) => c.factor === base)?.um ?? total;
  const losses = contributions
    .filter((c) => c.factor !== base)
    .map((c) => ({ factor: c.factor, share: (c.um * c.um) / (total * total) }));
  const reached = (baseUm * baseUm) / (total * total);
  return {
    effectiveMp: Math.min(nominalMp, areaUm2 / (total * total) / 1e6),
    nominalMp,
    pixelsAcross: (W * 1000) / p,
    linePairsPerHeight: (H * 1000) / total / 2,
    bottleneck: contributions[0].factor,
    base,
    ceilingMp: areaUm2 / (baseUm * baseUm) / 1e6,
    reached,
    losses,
    mainLoss: losses.length && 1 - reached >= AT_CEILING_LOSS ? losses[0].factor : null,
    contributions,
    totalBlurUm: total,
    systemBlurUm: rss(contributions.filter((c) => SYSTEM_FACTORS.includes(c.factor))),
  };
}

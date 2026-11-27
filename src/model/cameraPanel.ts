// Mechanics of the camera panel (ui/camera): lens outline and scales, how the drawing fits the
// screen, and which dial does what in which mode. Pure – the UI only draws what this returns.
// Units: mm for the drawing, m for distances, s for shutter.

import type { LensSection, LensSectionKind, LensShape } from '../data/lensShapes';
import { ISOS } from './stops';
import type { Mode } from './types';

// ---------- lens outline ----------

/**
 * Other systems' lenses for the same framing, relative to full frame: real focal length goes with
 * 1/crop, but mounts, rings and glass thickness don't shrink or grow with it – so roughly its root
 * (MFT ≈ 0.7, APS-C ≈ 0.8, 44×33 ≈ 1.1, 6×7 ≈ 1.4).
 */
export function systemLensScale(crop: number): number {
  return Math.min(1.6, Math.max(0.6, Math.sqrt(1 / crop)));
}

/** Room around the entrance pupil at the front: barrel wall, filter thread, hood. */
export const FRONT_MARGIN_MM = 8;

/** A ring only film bodies' lenses carry (aperture ring; the 6×6's leaf-shutter speed ring). */
export type LensPartKind = LensSectionKind | 'aperture' | 'speed';

export interface LensPart {
  kind: LensPartKind;
  lengthMm: number;
  dMm: number;
  d0Mm: number;
  engraved: boolean;
}

/** Position 0…1 in a zoom range (log scale), clamped; 0 for primes. */
export function zoomFraction(focalMm: number, loMm: number, hiMm: number): number {
  if (hiMm <= loMm) return 0;
  return Math.min(1, Math.max(0, Math.log(focalMm / loMm) / Math.log(hiMm / loMm)));
}

export interface LensPartsOptions {
  /** Size factor for the system (systemLensScale). */
  scale: number;
  /** Zoom position 0…1: zooms with an inner tube grow towards the long end. */
  zoom: number;
  /** Entrance pupil at the widest aperture (mm): the front must be at least this plus a margin. */
  pupilMm: number;
  /** Film bodies: an aperture ring behind the focus ring; the 6×6 adds the leaf shutter's speed ring. */
  apertureRing?: boolean;
  speedRing?: boolean;
}

/** The lens's sections, scaled for the system, extended for the zoom position, front widened for the pupil. */
export function lensParts(shape: LensShape, o: LensPartsOptions): LensPart[] {
  const part = (sec: LensSection): LensPart => ({
    kind: sec.kind,
    lengthMm: (sec.lengthMm + (sec.kind === 'inner' ? shape.extensionMm * o.zoom : 0)) * o.scale,
    dMm: sec.dMm * o.scale,
    d0Mm: (sec.d0Mm ?? sec.dMm) * o.scale,
    engraved: !!sec.engraved,
  });
  const parts = shape.sections.map(part);
  const mount = parts[0];
  const ring = (kind: LensPartKind, lengthMm: number): LensPart => ({
    kind,
    lengthMm: lengthMm * o.scale,
    dMm: mount.dMm * 1.06,
    d0Mm: mount.dMm * 1.06,
    engraved: false,
  });
  const extra: LensPart[] = [];
  if (o.speedRing) extra.push(ring('speed', 12));
  if (o.apertureRing) extra.push(ring('aperture', 9));
  parts.splice(1, 0, ...extra);
  const front = parts[parts.length - 1];
  const need = o.pupilMm + FRONT_MARGIN_MM;
  if (front.dMm < need) {
    // Taper out from the barrel behind it to the size the pupil needs.
    front.d0Mm = parts[parts.length - 2]?.dMm ?? front.d0Mm;
    front.dMm = need;
  }
  return parts;
}

export const lensLengthMm = (parts: LensPart[]): number => parts.reduce((a, p) => a + p.lengthMm, 0);

// ---------- fitting the drawing on screen ----------

/** The body takes this share of the panel width – the same on-screen size for every camera. */
export const BODY_SCREEN_FRACTION = 0.74;
/** A body deeper than wide is sized by this share of its depth instead of its width. */
export const DEPTH_WEIGHT = 0.9;
/** Tallest the panel may get (px) in a narrow column. */
export const MAX_DRAWING_HEIGHT_PX = 460;
/** Upper bound for the height cap in wide layouts (px). */
export const MAX_DRAWING_HEIGHT_WIDE_PX = 760;

/**
 * Height cap for the panel: 460 px in a narrow column; a wider panel may grow to about its
 * width, but never past 75 % of the viewport, so the controls below stay reachable.
 */
export function drawingMaxHeight(availWidthPx: number, viewportHeightPx: number): number {
  const wish = Math.min(availWidthPx * 1.1, viewportHeightPx * 0.75, MAX_DRAWING_HEIGHT_WIDE_PX);
  return Math.max(MAX_DRAWING_HEIGHT_PX, Math.round(wish));
}

/** Room above the body for the lens, as a share of the body width: a standard zoom fits, longer lenses scroll. */
export const LENS_ROOM_FACTOR = 1.3;

export interface PanelInput {
  bodyWidthMm: number;
  /** Body from the mount to the back, with anything folded out behind it (readout cards). */
  bodyDepthMm: number;
  /** Bounds of the drawing without an interchangeable lens (flash on, compact at both zoom ends). */
  frameWidthMm: number;
  frameHeightMm: number;
  /** Extra height above the body for the lens (0 for phones and compacts). */
  lensRoomMm: number;
  availWidthPx: number;
  maxHeightPx: number;
}

/**
 * Scale (px per mm) and panel height for a camera. Both depend on the body only, so the camera stays
 * put while zooming or changing lenses; a lens longer than the room above the body scrolls.
 */
export function panelLayout(i: PanelInput): { pxPerMm: number; heightPx: number } {
  // Deep, narrow bodies (the 6×6 box with its magazine) count by depth, so they don't tower.
  const size = Math.max(i.bodyWidthMm, i.bodyDepthMm * DEPTH_WEIGHT);
  const k = Math.min((i.availWidthPx * BODY_SCREEN_FRACTION) / size, i.availWidthPx / i.frameWidthMm, i.maxHeightPx / i.frameHeightMm);
  return { pxPerMm: k, heightPx: Math.round(Math.min(i.maxHeightPx, (i.frameHeightMm + i.lensRoomMm) * k)) };
}

// ---------- rings ----------

/** A zoom ring turns this far from the short to the long end. */
export const ZOOM_RING_SPAN_DEG = 100;
/** A focus ring turns this far from its near limit to ∞. */
export const FOCUS_RING_SPAN_DEG = 150;
/**
 * Open question settled for now: the focus scale starts at the lens's own near limit (the
 * simulation's, ≈ 8× focal length; a 400 mm starts at 3.2 m) rather than a fixed 0.3 m.
 * Set to a distance (e.g. 0.3) to use one scale for all lenses.
 */
export const FOCUS_SCALE_FIXED_MIN_M: number | null = null;

export const focusScaleMinM = (lensNearLimitM: number): number => FOCUS_SCALE_FIXED_MIN_M ?? lensNearLimitM;

/** Ring angle of a focal length: 0 at the short end, ZOOM_RING_SPAN_DEG at the long end (not clamped). */
export function zoomRingAngle(focalMm: number, loMm: number, hiMm: number): number {
  if (hiMm <= loMm) return 0;
  return (ZOOM_RING_SPAN_DEG * Math.log(focalMm / loMm)) / Math.log(hiMm / loMm);
}

/** Focal length after turning the zoom ring by `deg` (+ = towards the long end), on this lens's scale. */
export function focalAfterZoomTurn(focalMm: number, loMm: number, hiMm: number, deg: number): number {
  if (hiMm <= loMm) return focalMm;
  return focalMm * (hiMm / loMm) ** (deg / ZOOM_RING_SPAN_DEG);
}

/** Focus ring angle: 0 at ∞, FOCUS_RING_SPAN_DEG at the near limit; √-spaced like real scales. */
export function focusRingAngle(distanceM: number, minM: number): number {
  if (!Number.isFinite(distanceM)) return 0;
  return Math.min(FOCUS_RING_SPAN_DEG, Math.max(0, FOCUS_RING_SPAN_DEG * Math.sqrt(minM / distanceM)));
}

/** Distance for a focus ring angle; at (or past) the ∞ end: `farM`. */
export function focusFromRingAngle(deg: number, minM: number, farM: number): number {
  const a = Math.min(FOCUS_RING_SPAN_DEG, deg);
  if (a <= 0) return farM;
  return Math.min(farM, minM * (FOCUS_RING_SPAN_DEG / a) ** 2);
}

/** Distances printed on focus rings (m). */
export const FOCUS_MARKS_M = [0.3, 0.4, 0.5, 0.7, 1, 1.5, 2, 3, 5, 10, 20, Infinity];

export interface RingMark {
  value: number;
  deg: number;
}

/**
 * Focus scale: the near limit, round distances beyond it and ∞, thinned so neighbours stay
 * `minGapDeg` apart (the near limit and ∞ always stay).
 */
export function focusMarks(minM: number, minGapDeg = 15): RingMark[] {
  const all = [minM, ...FOCUS_MARKS_M.filter((d) => d > minM * 1.12)].map((d) => ({ value: d, deg: focusRingAngle(d, minM) }));
  const kept: RingMark[] = [all[0]];
  for (const m of all.slice(1, -1)) {
    if (kept[kept.length - 1].deg - m.deg >= minGapDeg) kept.push(m);
  }
  const inf = all[all.length - 1];
  while (kept.length > 1 && kept[kept.length - 1].deg - inf.deg < minGapDeg) kept.pop();
  kept.push(inf);
  return kept;
}

/** Focal lengths printed on zoom rings (mm). */
export const NICE_FOCALS_MM = [
  6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 24, 28, 35, 40, 50, 55, 70, 85, 100, 105, 135, 150, 200, 250, 300, 400, 500, 600, 800, 1000,
];

/** Zoom scale: both ends (rounded) and round focal lengths between, at least `minGapDeg` apart. */
export function zoomMarks(loMm: number, hiMm: number, minGapDeg = 18): RingMark[] {
  if (hiMm <= loMm) return [];
  const lo = Math.round(loMm);
  const hi = Math.round(hiMm);
  const deg = (f: number) => zoomRingAngle(f, loMm, hiMm);
  const kept: RingMark[] = [{ value: lo, deg: deg(loMm) }];
  for (const f of NICE_FOCALS_MM) {
    if (f <= lo || f >= hi) continue;
    if (deg(f) - kept[kept.length - 1].deg >= minGapDeg && deg(hiMm) - deg(f) >= minGapDeg) kept.push({ value: f, deg: deg(f) });
  }
  kept.push({ value: hi, deg: deg(hiMm) });
  return kept;
}

/** Diameter of the entrance pupil (mm): focal length ÷ f-number. */
export const entrancePupilMm = (focalMm: number, aperture: number): number => focalMm / aperture;

// ---------- dials, buttons, drag ----------

/** Order of the positions on the mode dial. */
export const MODE_DIAL: Mode[] = ['auto', 'P', 'Av', 'Tv', 'M'];

/** One click of the mode dial (it turns all the way round). */
export function stepMode(mode: Mode, dir: number): Mode {
  const n = MODE_DIAL.length;
  return MODE_DIAL[(((MODE_DIAL.indexOf(mode) + Math.sign(dir)) % n) + n) % n];
}

export type Dial = 'front' | 'rear';
export type DialRole = 'aperture' | 'shutter' | 'shift' | 'iso' | null;

/**
 * What a command dial does: Av = aperture (both), Tv = shutter (both), M = rear shutter and front
 * aperture, P = the rear dial shifts the program, A = nothing. While the ISO button is active
 * both dials change the ISO (except in A, where the camera sets it).
 */
export function dialRole(mode: Mode, dial: Dial, isoEdit: boolean): DialRole {
  if (isoEdit && mode !== 'auto') return 'iso';
  switch (mode) {
    case 'auto':
      return null;
    case 'P':
      return dial === 'rear' ? 'shift' : null;
    case 'Av':
      return 'aperture';
    case 'Tv':
      return 'shutter';
    case 'M':
      return dial === 'rear' ? 'shutter' : 'aperture';
  }
}

/**
 * Next value of a list (sorted either way) beyond `current` in direction `dir` (+1 = later in the
 * list), skipping what lies outside `ok`. Off-list values (e.g. ⅓ stops on a whole-stop ring) go to
 * the next list value in that direction. Stays put at the end.
 */
export function stepInList<T extends number>(list: readonly T[], current: number, dir: number, ok: (v: T) => boolean = () => true): T | number {
  const asc = list[list.length - 1] >= list[0];
  const later = (v: number) => (asc ? v > current * (1 + 1e-6) : v < current * (1 - 1e-6));
  const earlier = (v: number) => (asc ? v < current * (1 - 1e-6) : v > current * (1 + 1e-6));
  const allowed = list.filter(ok);
  if (dir > 0) return allowed.find(later) ?? current;
  if (dir < 0) return [...allowed].reverse().find(earlier) ?? current;
  return current;
}

/** ISO positions: "AUTO" first where the mode offers auto ISO (P, Av, Tv – not on film). */
export type IsoChoice = 'auto' | number;

export function isoChoices(mode: Mode, film: boolean): IsoChoice[] {
  const autoOk = !film && (mode === 'P' || mode === 'Av' || mode === 'Tv');
  return autoOk ? ['auto', ...ISOS] : [...ISOS];
}

/** One click of the ISO setting: "AUTO" sits below the lowest ISO. */
export function stepIso(mode: Mode, film: boolean, autoIso: boolean, iso: number, dir: number): { autoIso: boolean; iso: number } {
  const autoOk = isoChoices(mode, film)[0] === 'auto';
  if (autoIso && autoOk) return dir > 0 ? { autoIso: false, iso: ISOS[0] } : { autoIso: true, iso };
  const next = stepInList(ISOS, iso, dir);
  if (dir < 0 && next === iso && autoOk) return { autoIso: true, iso };
  return { autoIso: false, iso: next };
}

/** A compact's built-in zoom (no ring): dragging the lens this far runs the whole focal range. */
export const COMPACT_ZOOM_DRAG_MM = 60;

/** Equivalent focal length after dragging a compact's lens sideways by `dMm` (+ = longer) within lo…hi. */
export function compactZoomAfterDrag(eqMm: number, dMm: number, loMm: number, hiMm: number): number {
  return Math.min(hiMm, Math.max(loMm, eqMm * (hiMm / loMm) ** (dMm / COMPACT_ZOOM_DRAG_MM)));
}

/** Sideways drag needed for one click (mm of the drawing). */
export const DRAG_STEP_MM = { dial: 4, modeDial: 7, display: 5, filmDial: 5 } as const;

/** Whole clicks in an accumulated drag, and the rest carried over to the next move. */
export function dragClicks(accMm: number, stepMm: number): { clicks: number; restMm: number } {
  const clicks = Math.trunc(accMm / stepMm);
  return { clicks, restMm: accMm - clicks * stepMm };
}

// ---------- film bodies ----------

/** Whole-stop shutter speeds on a film body's speed dial (after its "A" position). */
export const FILM_SPEEDS_S = [1, 1 / 2, 1 / 4, 1 / 8, 1 / 15, 1 / 30, 1 / 60, 1 / 125, 1 / 250, 1 / 500, 1 / 1000] as const;

/** The speeds engraved on a body's dial or ring: up to its fastest (a leaf shutter stops at 1/500 s). */
export function filmSpeeds(fastestS: number): number[] {
  return FILM_SPEEDS_S.filter((x) => x >= fastestS * 0.999);
}
/** Whole stops on a film lens's aperture ring (before its "A" position). */
export const FILM_APERTURES = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22] as const;

/**
 * Film bodies have no mode dial: "A" on the speed dial lets the camera pick the time, "A" on the
 * aperture ring the aperture – both A = P, only the speed dial = Av, only the ring = Tv, neither = M.
 * Full auto shows as both on A.
 */
export function filmDialsAuto(mode: Mode): { speed: boolean; aperture: boolean } {
  return { speed: mode === 'auto' || mode === 'P' || mode === 'Av', aperture: mode === 'auto' || mode === 'P' || mode === 'Tv' };
}

export function filmMode(speedAuto: boolean, apertureAuto: boolean): Mode {
  if (speedAuto) return apertureAuto ? 'P' : 'Av';
  return apertureAuto ? 'Tv' : 'M';
}

/** Whole-stop ring values the lens can open to: its widest aperture (if not a whole stop) first. */
export function filmApertureStops(maxAperture: number): number[] {
  const whole = FILM_APERTURES.filter((n) => n > maxAperture * 1.02);
  return [maxAperture, ...whole];
}

/** Positions of a ring or dial with an "A" end: index of `value` (nearest, log scale) or of "A". */
export function dialIndex(values: readonly number[], value: number, auto: boolean, autoFirst: boolean): number {
  if (auto) return autoFirst ? 0 : values.length;
  let best = 0;
  values.forEach((v, i) => {
    if (Math.abs(Math.log(v / value)) < Math.abs(Math.log(values[best] / value))) best = i;
  });
  return best + (autoFirst ? 1 : 0);
}


// Pixel <-> distance / blur mappings for the sharpness graph. Pure, no DOM.

export interface XView {
  log: boolean;
  /** Visible distance range in metres. */
  min: number;
  max: number;
}

export const LOG_VIEW: XView = { log: true, min: 0.2, max: 1000 };
export const LINEAR_DEFAULT: XView = { log: false, min: 0, max: 15 };
const LINEAR_MAX = 1000;
const LINEAR_MIN_SPAN = 0.5;

/** Largest relative blur on the y axis. */
export const Y_MAX = 100;
/** Share of the plot height for the "sharp" range 0…1 (linear); 1…Y_MAX above it is logarithmic. */
const SHARP_FRACTION = 0.25;

export interface XScale {
  toPx(m: number): number;
  toM(px: number): number;
}

export function xScale(view: XView, px0: number, px1: number): XScale {
  const w = px1 - px0;
  if (view.log) {
    const l0 = Math.log(view.min);
    const l1 = Math.log(view.max);
    return {
      toPx: (m) => px0 + ((Math.log(m) - l0) / (l1 - l0)) * w,
      toM: (px) => Math.exp(l0 + ((px - px0) / w) * (l1 - l0)),
    };
  }
  const span = view.max - view.min;
  return {
    toPx: (m) => px0 + ((m - view.min) / span) * w,
    toM: (px) => view.min + ((px - px0) / w) * span,
  };
}

/**
 * Piecewise y axis: 0…1 linear (so the curve really reaches 0 at the focus),
 * 1…Y_MAX logarithmic (so strong blur still fits).
 */
export function yScale(top: number, bottom: number): (blur: number) => number {
  const h = bottom - top;
  const sharpH = h * SHARP_FRACTION;
  return (b) => {
    if (!(b > 0)) return bottom;
    if (b <= 1) return bottom - b * sharpH;
    // Allow a bit beyond the top so the clip path cuts the curve cleanly.
    const v = Math.log10(Math.min(Y_MAX * 2, b)) / Math.log10(Y_MAX);
    return bottom - sharpH - v * (h - sharpH);
  };
}

/** Keep a linear view inside [0, LINEAR_MAX] with a minimum span. */
export function clampLinear(min: number, max: number): XView {
  let span = Math.min(LINEAR_MAX, Math.max(LINEAR_MIN_SPAN, max - min));
  let lo = Math.max(0, min);
  if (lo + span > LINEAR_MAX) lo = LINEAR_MAX - span;
  return { log: false, min: lo, max: lo + span };
}

/** Zoom a linear view by `factor` (>1 = zoom out) keeping `anchorM` under the same pixel. */
export function zoomLinear(view: XView, factor: number, anchorM: number): XView {
  return clampLinear(anchorM - (anchorM - view.min) * factor, anchorM + (view.max - anchorM) * factor);
}

const LOG_TICKS = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
const LINEAR_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200];

export function xTicks(view: XView, widthPx: number): number[] {
  if (view.log) {
    const perDecade = widthPx / Math.log10(view.max / view.min);
    // On narrow screens keep only the powers of ten.
    return perDecade < 90 ? LOG_TICKS.filter((v) => Number.isInteger(Math.log10(v))) : LOG_TICKS;
  }
  const span = view.max - view.min;
  const step = LINEAR_STEPS.find((s) => (s / span) * widthPx >= 56) ?? 500;
  const ticks: number[] = [];
  for (let v = Math.ceil(view.min / step) * step; v <= view.max + 1e-9; v += step) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  return ticks;
}

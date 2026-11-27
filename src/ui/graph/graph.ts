// Sharpness graph: blur curve over distance, depth-of-field band, draggable
// elements and focus line. Renders only from derive()'s result.

import { de as t, fill } from '../../data/texts.de';
import type { Derived, DerivedElement } from '../../model/derive';
import type { FlashZone } from '../../model/flash';
import type { ElementId } from '../../model/types';
import { focusOn, setElementDistance, setFocus, setInfo, setLogScale, setShowDetails } from '../../state/actions';
import type { Store } from '../../state/store';
import { formatMeterRange, formatMeters, formatNumber } from '../distance';
import { FACE_DEPTH_M } from '../face';
import { personColors } from '../sim/figurine';
import {
  LINEAR_DEFAULT,
  LOG_VIEW,
  Y_MAX,
  clampLinear,
  xScale,
  xTicks,
  yScale,
  zoomLinear,
  type XScale,
  type XView,
} from './scale';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Pointer travel (px) below which a press counts as a tap. */
const TAP_SLOP = 5;
const Y_TICKS = [0, 1, 10, 100];
/** Rough text width per character at the 11–12 px label size. */
const CHAR_W = 6.2;

interface Layout {
  w: number;
  h: number;
  left: number;
  right: number;
  plotTop: number;
  plotBottom: number;
  groundY: number;
}

function layoutFor(width: number, details: boolean): Layout {
  const w = Math.max(280, width);
  // Without the curve the plot only holds the DOF band, so it can be much shorter.
  const h = details ? Math.round(Math.min(400, Math.max(300, w * 0.55))) : 200;
  // Left margin holds the y axis (details) and the photographer; right margin the axis arrow + unit.
  return { w, h, left: 46, right: w - 24, plotTop: 34, plotBottom: h - 92, groundY: h - 24 };
}

type Gesture =
  | { kind: 'element'; id: ElementId; startX: number; moved: boolean }
  | { kind: 'tap-element'; id: ElementId }
  | { kind: 'focus' }
  | { kind: 'pan'; startX: number; startView: XView; moved: boolean }
  | { kind: 'pinch'; startSpanPx: number; startView: XView; anchorM: number };

export function mountGraph(root: HTMLElement, store: Store): void {
  root.classList.add('graph');
  root.innerHTML = `
    <svg xmlns="${SVG_NS}" role="img" aria-label="${t.graph.sharpness}"></svg>
    <div class="graph-footer">
      <p class="graph-hint"></p>
      <div class="graph-options">
        <label class="toggle"><input type="checkbox" data-role="log"> ${t.controls.logScale}</label>
        <label class="toggle"><input type="checkbox" data-role="details"> ${t.controls.details}</label>
        <button type="button" data-role="reset">${t.graph.resetView}</button>
      </div>
    </div>`;
  const svg = root.querySelector('svg')!;
  const logBox = root.querySelector<HTMLInputElement>('[data-role="log"]')!;
  const detailsBox = root.querySelector<HTMLInputElement>('[data-role="details"]')!;
  const resetBtn = root.querySelector<HTMLButtonElement>('[data-role="reset"]')!;
  const hint = root.querySelector<HTMLParagraphElement>('.graph-hint')!;

  let linearView: XView = LINEAR_DEFAULT;
  const details = () => store.get().ui.showDetails;
  let layout = layoutFor(root.clientWidth, details());
  let gesture: Gesture | null = null;
  const pointers = new Map<number, number>(); // pointerId -> local x

  const view = (): XView => (store.get().ui.logScale ? LOG_VIEW : linearView);
  const scale = () => xScale(view(), layout.left, layout.right);

  // ---- rendering ---------------------------------------------------------

  let frame = 0;
  const scheduleRender = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  function render(): void {
    frame = 0;
    const log = store.get().ui.logScale;
    layout = layoutFor(root.clientWidth, details());
    logBox.checked = log;
    detailsBox.checked = details();
    resetBtn.hidden = log;
    const afOn = store.derived().settings.afTarget !== null;
    hint.textContent = log
      ? afOn ? t.graph.hintAutofocus : t.graph.hintLog
      : afOn ? t.graph.hintLinearAutofocus : t.graph.hintLinear;
    svg.style.touchAction = log ? 'pan-y' : 'none';
    svg.setAttribute('viewBox', `0 0 ${layout.w} ${layout.h}`);
    svg.setAttribute('height', String(layout.h));
    svg.innerHTML = draw(store.derived(), view(), layout, details());
  }

  store.subscribe(scheduleRender);
  new ResizeObserver(() => {
    if (layoutFor(root.clientWidth, details()).w !== layout.w) scheduleRender();
  }).observe(root);

  // ---- controls ----------------------------------------------------------

  logBox.addEventListener('change', () => {
    setLogScale(store, logBox.checked);
    setInfo(store, 'graph');
  });
  detailsBox.addEventListener('change', () => {
    setShowDetails(store, detailsBox.checked);
    setInfo(store, 'graph');
  });
  resetBtn.addEventListener('click', () => {
    linearView = LINEAR_DEFAULT;
    scheduleRender();
  });

  // ---- pointer interaction -----------------------------------------------

  const localX = (e: PointerEvent | WheelEvent) => {
    const r = svg.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * layout.w;
  };

  svg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const x = localX(e);
    pointers.set(e.pointerId, x);
    svg.setPointerCapture(e.pointerId);

    if (pointers.size === 2 && !view().log) {
      const [a, b] = [...pointers.values()];
      gesture = {
        kind: 'pinch',
        startSpanPx: Math.max(20, Math.abs(a - b)),
        startView: linearView,
        anchorM: scale().toM((a + b) / 2),
      };
      return;
    }
    if (pointers.size > 1) return;

    const target = (e.target as Element).closest<SVGElement>('[data-drag]');
    const kind = target?.dataset.drag;
    if (kind === 'focus') gesture = { kind: 'focus' };
    else if (kind === 'element') gesture = { kind: 'element', id: target!.dataset.id as ElementId, startX: x, moved: false };
    else if (kind === 'offscreen') gesture = { kind: 'tap-element', id: target!.dataset.id as ElementId };
    else gesture = { kind: 'pan', startX: x, startView: linearView, moved: false };
    const afOn = store.derived().settings.afTarget !== null;
    setInfo(store, kind ? (afOn ? 'autofocus' : 'focus') : 'graph');
    e.preventDefault();
  });

  svg.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId) || !gesture) return;
    const x = localX(e);
    pointers.set(e.pointerId, x);
    const s = scale();

    switch (gesture.kind) {
      case 'element':
        if (Math.abs(x - gesture.startX) > TAP_SLOP) gesture.moved = true;
        if (gesture.moved) setElementDistance(store, gesture.id, s.toM(clampX(x)));
        break;
      case 'focus':
        setFocus(store, s.toM(clampX(x)));
        break;
      case 'pan': {
        if (Math.abs(x - gesture.startX) > TAP_SLOP) gesture.moved = true;
        if (!gesture.moved || view().log) break;
        const v = gesture.startView;
        const dm = ((gesture.startX - x) / (layout.right - layout.left)) * (v.max - v.min);
        linearView = clampLinear(v.min + dm, v.max + dm);
        scheduleRender();
        break;
      }
      case 'pinch': {
        const [a, b] = [...pointers.values()];
        const factor = gesture.startSpanPx / Math.max(20, Math.abs(a - b));
        linearView = zoomLinear(gesture.startView, factor, gesture.anchorM);
        scheduleRender();
        break;
      }
      case 'tap-element':
        break;
    }
  });

  const endPointer = (e: PointerEvent, cancelled: boolean) => {
    if (!pointers.delete(e.pointerId)) return;
    const g = gesture;
    if (pointers.size === 0) gesture = null;
    else if (g?.kind === 'pinch') gesture = null; // lifting one finger ends the pinch without a tap
    if (cancelled || !g || pointers.size > 0) return;

    // The graph never touches the autofocus (that's the dropdown and the camera image);
    // while it's on, taps don't refocus at all – figures can only be dragged.
    if (store.derived().settings.afTarget !== null) return;
    if (g.kind === 'element' && !g.moved) focusOn(store, g.id);
    else if (g.kind === 'tap-element') focusOn(store, g.id);
    else if (g.kind === 'pan' && !g.moved) {
      const x = localX(e);
      if (x >= layout.left && x <= layout.right) setFocus(store, scale().toM(x));
    }
  };
  svg.addEventListener('pointerup', (e) => endPointer(e, false));
  svg.addEventListener('pointercancel', (e) => endPointer(e, true));

  svg.addEventListener(
    'wheel',
    (e) => {
      if (view().log) return;
      e.preventDefault();
      const anchor = scale().toM(localX(e));
      linearView = zoomLinear(linearView, Math.exp(e.deltaY * 0.002), anchor);
      scheduleRender();
    },
    { passive: false },
  );

  const clampX = (x: number) => Math.min(layout.right, Math.max(layout.left, x));

  render();
}

// ---- SVG markup ------------------------------------------------------------

function draw(d: Derived, v: XView, L: Layout, details: boolean): string {
  const sx = xScale(v, L.left, L.right);
  const sy = yScale(L.plotTop, L.plotBottom);
  const inView = (m: number) => m >= v.min && m <= v.max;
  const xOf = (m: number) => Math.min(L.right, Math.max(L.left, sx.toPx(m)));
  const parts: string[] = [];

  parts.push(`<defs>
    <clipPath id="plot-clip"><rect x="${L.left}" y="${L.plotTop}" width="${L.right - L.left}" height="${L.plotBottom - L.plotTop}"/></clipPath>
    ${d.elements.map((el) => `<filter id="blur-${el.id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${figureBlurPx(el)}"/></filter>`).join('')}
  </defs>`);

  // Digital zoom: the band the uncropped photo had, as a faint outline behind the narrower one.
  if (d.zoom.factor > 1) {
    const u = d.zoom.dofUncropped;
    const gNear = xOf(u.nearM);
    const gFar = Number.isFinite(u.farM) ? xOf(u.farM) : L.right;
    if (gFar - gNear >= 3) {
      parts.push(`<rect class="dof-uncropped" x="${gNear}" y="${L.plotTop}" width="${gFar - gNear}" height="${L.groundY - L.plotTop}"/>`);
    }
  }
  // Depth-of-field band (spans plot and scene strip).
  const near = xOf(d.dof.nearM);
  const far = Number.isFinite(d.dof.farM) ? xOf(d.dof.farM) : L.right;
  if (far > near) {
    // At least 3 px wide, so a few-millimetre depth of field doesn't vanish behind the focus line.
    const w = Math.max(3, far - near);
    const x = far - near < 3 ? (near + far) / 2 - 1.5 : near;
    parts.push(`<rect class="dof" x="${x}" y="${L.plotTop}" width="${w}" height="${L.groundY - L.plotTop}"/>`);
  }
  // Label just under the "sharp" line (or mid-plot without details): right of the band,
  // else left of it, else inside – always within the plot.
  const dofLabel = fill(t.graph.dofRange, { range: formatMeterRange(d.dof.nearM, d.dof.farM) });
  const lw = dofLabel.length * CHAR_W;
  // With details, the "↓ scharf" label occupies the left end of the same row.
  const minX = details ? L.left + 6 + (t.graph.sharp.length + 2) * CHAR_W + 12 : L.left + 6;
  let lx: number;
  if (far + 6 + lw <= L.right && far + 6 >= minX) lx = far + 6;
  else if (near - 6 - lw >= minX) lx = near - 6 - lw;
  else lx = Math.min(L.right - lw - 4, Math.max(minX, (near + far) / 2 - lw / 2));
  const labelY = details ? sy(1) + 16 : (L.plotTop + L.plotBottom) / 2 + 4;
  parts.push(`<text class="dof-label" x="${lx}" y="${labelY}">${dofLabel}</text>`);

  const yAxis = details ? drawYAxis(sy, L) : null;
  if (yAxis) parts.push(yAxis.under);
  if (d.flash?.zone) parts.push(drawFlashZone(d.flash.zone, xOf, L));

  // X axis.
  parts.push(`<line class="axis" x1="${L.left}" x2="${L.right}" y1="${L.plotBottom}" y2="${L.plotBottom}"/>`);
  const ticks = xTicks(v, L.right - L.left);
  // Linear ticks share one precision derived from their spacing (0.1 m steps need a decimal).
  const tickDigits = !v.log && ticks.length > 1 && ticks[1] - ticks[0] < 1 ? 1 : undefined;
  for (const m of ticks) {
    if (!inView(m)) continue;
    const px = sx.toPx(m);
    parts.push(`<line class="axis" x1="${px}" x2="${px}" y1="${L.plotBottom}" y2="${L.plotBottom + 4}"/>`);
    parts.push(`<text class="tick" x="${px}" y="${L.plotBottom + 16}" text-anchor="middle">${formatNumber(m, tickDigits)}</text>`);
  }
  // Axis arrow with the unit, so the scale reads "… m".
  const ax = L.right + 10;
  parts.push(`<path class="axis axis-arrow" d="M${L.right},${L.plotBottom} H${ax} M${ax - 5},${L.plotBottom - 3.5} L${ax},${L.plotBottom} L${ax - 5},${L.plotBottom + 3.5}"/>`);
  parts.push(`<text class="tick axis-unit" x="${ax - 2}" y="${L.plotBottom - 7}" text-anchor="middle">${t.graph.unit}</text>`);
  parts.push(`<line class="ground" x1="${L.left}" x2="${L.right}" y1="${L.groundY}" y2="${L.groundY}"/>`);
  // Where distances are measured from: a photographer – or, zoomed in (linear) to face scale, just the camera.
  const pxPerM = (L.right - L.left) / (v.max - v.min);
  const closeUp = !v.log && pxPerM * (FACE_DEPTH_M.backOfHead - FACE_DEPTH_M.noseTip) >= HEAD_MIN_PX;
  // Close up, the camera sits at the heads' eye level.
  const eyeY = closeUp ? L.groundY - (HEAD_NECK_M + HEAD_EYE_M) * headScaleY(pxPerM, L) : L.groundY;
  // With details the left margin holds the y axis; close up there's no room for the camera icon as well.
  parts.push(drawCameraMarker(L, closeUp, eyeY, !(closeUp && details)));

  if (details) parts.push(drawCurve(d, sx, sy, L));

  // Elements: marker on the curve + figure in the scene strip.
  // Draw far to near so nearer figures overlap farther ones.
  const visible = d.elements.filter((el) => el.visible).sort((a, b) => b.distanceM - a.distanceM);
  const onScreen = visible.filter((el) => inView(el.distanceM));
  const labelDx = spreadLabels(
    onScreen.map((el) => ({ x: sx.toPx(el.distanceM), text: formatMeters(el.distanceM) })),
    { x: L.left - CAMERA_X_OFFSET, text: t.graph.camera },
    L.w,
  );
  onScreen.forEach((el, i) => parts.push(drawElement(el, sx, sy, L, details, d.blurAt, labelDx[i])));
  if (yAxis) parts.push(yAxis.over);
  // Off-screen elements: one stacked label per side, nearest to the view on the bottom row.
  const left = visible.filter((el) => el.distanceM < v.min);
  const right = visible.filter((el) => el.distanceM > v.max).reverse();
  left.forEach((el, i) => parts.push(drawOffscreen(el, true, i, L)));
  right.forEach((el, i) => parts.push(drawOffscreen(el, false, i, L)));

  // Focus line with handle on top.
  const focus = d.settings.focusDistanceM;
  if (inView(focus)) {
    const fx = sx.toPx(focus);
    const af = d.settings.afTarget !== null;
    const label = `${af ? t.controls.autofocusShort : t.controls.focus} ${formatMeters(focus)}`;
    const lw = label.length * 6.6 + 16;
    const lx = Math.min(L.right - lw / 2, Math.max(L.left + lw / 2, fx));
    // Under autofocus the line is display-only: no drag handle.
    parts.push(`<g class="focus${af ? ' af' : ''}"${af ? '' : ' data-drag="focus"'}>
      <!-- Grab area stops at the axis so figures in the scene strip below stay tappable/draggable. -->
      <line class="focus-hit" x1="${fx}" x2="${fx}" y1="${L.plotTop - 24}" y2="${L.plotBottom}"/>
      <line class="focus-line" x1="${fx}" x2="${fx}" y1="${L.plotTop}" y2="${L.groundY}"/>
      <rect class="focus-handle" x="${lx - lw / 2}" y="${L.plotTop - 28}" width="${lw}" height="22" rx="11"/>
      <text class="focus-text" x="${lx}" y="${L.plotTop - 13}" text-anchor="middle">${label}</text>
    </g>`);
  }

  return parts.join('');
}

/** Y axis: sharp zone 0…1 below the dashed line, increasingly blurry above it. */
function drawYAxis(sy: (b: number) => number, L: Layout): { under: string; over: string } {
  const out: string[] = [];
  const labels: string[] = [];
  const y1 = sy(1);
  out.push(`<rect class="sharp-zone" x="${L.left}" y="${y1}" width="${L.right - L.left}" height="${L.plotBottom - y1}"/>`);
  for (const y of Y_TICKS) {
    const py = sy(y);
    out.push(`<line class="grid" x1="${L.left}" x2="${L.right}" y1="${py}" y2="${py}"/>`);
    const label = y === 0 ? formatNumber(0) : fill(t.graph.blurTimes, { value: formatNumber(y) });
    labels.push(`<text class="tick halo" x="${L.left - 6}" y="${py + 4}" text-anchor="end">${label}</text>`);
  }
  out.push(`<line class="sharp-line" x1="${L.left}" x2="${L.right}" y1="${y1}" y2="${y1}"/>`);
  out.push(`<text class="unsharp-label" x="${L.left + 6}" y="${y1 - 6}">↑ ${t.graph.unsharp}</text>`);
  out.push(`<text class="sharp-label" x="${L.left + 6}" y="${y1 + 15}">↓ ${t.graph.sharp}</text>`);
  labels.push(
    `<text class="axis-title halo" transform="translate(12 ${(L.plotTop + L.plotBottom) / 2}) rotate(-90)" text-anchor="middle">${t.graph.sharpness}</text>`,
  );
  // The labels sit in the left margin, where a close-up head's nose can reach: they're drawn after the figures.
  return { under: out.join(''), over: labels.join('') };
}

/** Blur curve, sampled every 2 px plus the exact focus point so the dip reaches 0. */
function drawCurve(d: Derived, sx: XScale, sy: (b: number) => number, L: Layout): string {
  const focusPx = sx.toPx(d.settings.focusDistanceM);
  const samples: number[] = [];
  for (let px = L.left; px <= L.right; px += 2) samples.push(px);
  if (focusPx > L.left && focusPx < L.right) samples.push(focusPx);
  samples.sort((a, b) => a - b);
  const pts: string[] = [];
  for (const px of samples) {
    const m = px === focusPx ? d.settings.focusDistanceM : sx.toM(px);
    if (m <= 0) continue;
    pts.push(`${px.toFixed(1)},${sy(d.blurAt(m)).toFixed(1)}`);
  }
  return `<polyline class="curve" clip-path="url(#plot-clip)" points="${pts.join(' ')}"/>`;
}

/**
 * Strip along the bottom of the plot: too close / in range / fading out, nothing beyond.
 * Boundaries the ambient light already clears are infinite and land on the right edge; then
 * the fade runs to the edge and "too weak" isn't claimed.
 */
function drawFlashZone(z: FlashZone, xOf: (m: number) => number, L: Layout): string {
  const h = 12;
  const y = L.plotBottom - h - 2;
  const close = xOf(z.tooCloseM);
  const range = xOf(z.maxRangeM);
  const weakEnd = xOf(z.strongUnderM);
  const weakLabel = Number.isFinite(z.slightUnderM) ? t.flash.zoneWeak : '';
  const label = (x0: number, x1: number, text: string) =>
    x1 - x0 > text.length * 5.6 + 6
      ? `<text class="flash-label" x="${(x0 + x1) / 2}" y="${y + h - 3}" text-anchor="middle">${text}</text>`
      : '';
  return `<g class="flash-zone">
    <defs><linearGradient id="flash-fade" gradientUnits="userSpaceOnUse" x1="${range}" x2="${weakEnd}">
      <stop offset="0" class="flash-stop"/><stop offset="1" class="flash-stop" style="stop-opacity:0"/></linearGradient></defs>
    <rect class="flash-close" x="${L.left}" y="${y}" width="${Math.max(0, close - L.left)}" height="${h}"/>
    <rect class="flash-range" x="${close}" y="${y}" width="${Math.max(0, range - close)}" height="${h}"/>
    <rect fill="url(#flash-fade)" x="${range}" y="${y}" width="${Math.max(0, weakEnd - range)}" height="${h}"/>
    ${label(L.left, close, t.flash.zoneTooClose)}${label(close, range, t.flash.zoneRange)}${weakLabel && label(range, weakEnd, weakLabel)}
  </g>`;
}

/** Head drawing proportions (metres): neck below the chin, eye height above the chin. */
const HEAD_NECK_M = 0.07;
const HEAD_EYE_M = 0.132;

/** Vertical px per metre for heads: true proportions while they fit, capped by the graph height. */
function headScaleY(pxPerM: number, L: Layout): number {
  return Math.min(pxPerM, (L.groundY - L.plotTop - 8) / 0.3);
}

/** Photographer (or close up: a camera at eye level `y`) in the left margin, facing the scene, labelled "Kamera". */
const CAMERA_X_OFFSET = 22;
function drawCameraMarker(L: Layout, closeUp: boolean, y: number, icon: boolean): string {
  const x = L.left - CAMERA_X_OFFSET;
  const figure = closeUp
    ? `<rect class="cam-body" x="-13" y="-30" width="22" height="15" rx="2.5"/>
       <rect class="cam-body" x="-8" y="-34" width="8" height="5" rx="1"/>
       <rect class="cam-lens" x="9" y="-28" width="9" height="11" rx="1.5"/>
       <circle class="cam-glass" cx="-2" cy="-22.5" r="3.6"/>`
    : `<circle class="ph-line" cx="-3" cy="-38" r="5.5"/>
       <path class="ph-line" d="M-3,-32 V-14 M-3,-14 L-9,0 M-3,-14 L3,0 M-3,-27 L5,-35"/>
       <rect class="cam-body" x="2" y="-42" width="10" height="7" rx="1.2"/>
       <rect class="cam-lens" x="12" y="-40.5" width="4" height="4"/>`;
  // Close up the lens centre (−22.5 in icon units) sits on the eye line; the label stays at the ground.
  const iconY = closeUp ? y + 22.5 : L.groundY;
  return `<g class="camera-marker">
    <title>${t.graph.cameraTitle}</title>
    ${icon ? `<g transform="translate(${x} ${iconY})">${figure}</g>` : ''}
    <text class="camera-label" x="${x}" y="${L.groundY + 16}" text-anchor="middle">${t.graph.camera}</text>
  </g>`;
}

/** Cartoon cue only: figures get fuzzy once they leave the sharp zone. */
function figureBlurPx(el: DerivedElement): number {
  return blurCuePx(el.relativeBlur);
}

/** Cartoon cue for a relative blur value: nothing while sharp, then growing slowly. */
function blurCuePx(relativeBlur: number): number {
  if (!(relativeBlur > 1)) return 0;
  return Math.min(3, Math.log2(relativeBlur) * 0.6);
}

/**
 * Horizontal shifts for the distance labels under the figures so they don't overprint each other
 * or the fixed "Kamera" label: left to right, each label moves right just enough to clear the previous
 * one, then the row is pulled back if it ran past the right edge. Returns one shift per label, in input order.
 */
function spreadLabels(labels: { x: number; text: string }[], fixed: { x: number; text: string }, width: number): number[] {
  const GAP = 6;
  const halfW = (text: string) => (text.length * CHAR_W) / 2 + 2;
  const order = labels.map((_, i) => i).sort((a, b) => labels[a].x - labels[b].x);
  const pos = labels.map((l) => l.x);
  let prevRight = fixed.x + halfW(fixed.text);
  for (const i of order) {
    const h = halfW(labels[i].text);
    pos[i] = Math.max(pos[i], prevRight + GAP + h);
    prevRight = pos[i] + h;
  }
  const overflow = prevRight - (width - 2);
  if (overflow > 0) {
    // Pull the rightmost labels back inside, keeping the gaps (only when figures crowd the right edge).
    let limit = width - 2;
    for (const i of [...order].reverse()) {
      const h = halfW(labels[i].text);
      pos[i] = Math.min(pos[i], limit - h);
      limit = pos[i] - h - GAP;
    }
  }
  return pos.map((p, i) => p - labels[i].x);
}

/** A person turns into a profile head once the head would be at least this wide on screen. */
const HEAD_MIN_PX = 36;

function drawElement(
  el: DerivedElement,
  sx: XScale,
  sy: (b: number) => number,
  L: Layout,
  details: boolean,
  blurAt: (m: number) => number,
  labelDx = 0,
): string {
  const x = sx.toPx(el.distanceM);
  const cy = sy(Math.min(Y_MAX, el.relativeBlur));
  const headPx = sx.toPx(el.distanceM + FACE_DEPTH_M.backOfHead) - sx.toPx(el.distanceM + FACE_DEPTH_M.noseTip);
  const asHead = el.id !== 'background' && headPx >= HEAD_MIN_PX;
  let figure: string;
  let big = false;
  let hit = `<rect class="hit" x="-22" y="-54" width="44" height="74"/>`;
  if (asHead) {
    const head = drawHead(el, sx, x, L, blurAt);
    figure = head.markup;
    big = head.big;
    hit = `<rect class="hit" x="${head.left - 6}" y="${head.top - 4}" width="${head.right - head.left + 12}" height="${-head.top + 24}"/>`;
  } else {
    figure =
      el.id === 'background'
        ? `<g filter="url(#blur-${el.id})"><polygon points="-26,0 -8,-34 2,-20 10,-30 28,0"/><circle class="sun" cx="16" cy="-40" r="5"/></g>`
        : `<g filter="url(#blur-${el.id})"><circle cx="0" cy="-38" r="6"/><path d="M0,-32 V-14 M0,-14 L-7,0 M0,-14 L7,0 M-9,-20 L0,-27 L9,-20"/></g>`;
  }
  return `<g class="el el-${el.id}">
    ${details ? `<line class="el-stem" x1="${x}" x2="${x}" y1="${cy}" y2="${L.groundY - 48}"/>
    <circle class="el-dot" cx="${x}" cy="${cy}" r="5"/>` : ''}
    <g data-drag="element" data-id="${el.id}" transform="translate(${x} ${L.groundY})">
      ${hit}
      <g class="figure${asHead ? ' head' : ''}${big ? ' big' : ''}">${figure}</g>
      <text class="el-label halo" x="${labelDx}" y="16" text-anchor="middle">${formatMeters(el.distanceM)}</text>
    </g>
  </g>`;
}

/**
 * Profile head looking towards the camera (left), in coordinates relative to the eyes at (0, ground).
 * Horizontal positions are true distances, so nose, eye and ear line up with the DOF band;
 * each gets its own blur cue. Vertical scale follows, capped to the scene strip.
 */
function drawHead(el: DerivedElement, sx: XScale, x0: number, L: Layout, blurAt: (m: number) => number) {
  const d = el.distanceM;
  const X = (dx: number) => sx.toPx(d + dx) - x0;
  const kx = (X(0.1) - X(-0.1)) / 0.2;
  // Keep true proportions as long as possible: the head may grow up into the plot (drawn see-through there).
  const ky = headScaleY(kx, L);
  const neck = HEAD_NECK_M;
  const Y = (dy: number) => -(neck + dy) * ky; // dy: metres above the chin
  const pts = (list: [number, number][]) => list.map(([dx, dy]) => `${X(dx).toFixed(1)},${Y(dy).toFixed(1)}`).join(' ');
  const filter = (part: string, dx: number) =>
    `<filter id="head-${el.id}-${part}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${blurCuePx(blurAt(d + dx)).toFixed(2)}"/></filter>`;
  const skullL = X(-0.02);
  const skullR = X(FACE_DEPTH_M.backOfHead);
  // The figurine's colours (skin, hair) from the camera image; the collar keeps the person's graph colour.
  const c = personColors(el.id as Exclude<ElementId, 'background'>);
  const paint = (color: string) => `style="fill:${color}"`;
  // Hair: an arc around the skull from the forehead over the top to the back (down to the jaw for
  // long hair), back along the hairline.
  const skull = { x: (-0.02 + FACE_DEPTH_M.backOfHead) / 2, y: 0.13, rx: (FACE_DEPTH_M.backOfHead + 0.02) / 2, ry: 0.105 };
  const around = (deg: number, grow: number): [number, number] => {
    const a = (deg * Math.PI) / 180;
    return [skull.x + Math.cos(a) * skull.rx * grow, skull.y + Math.sin(a) * skull.ry * grow];
  };
  const arc = (from: number, to: number, grow: number) =>
    Array.from({ length: 13 }, (_, i) => around(from + ((to - from) * i) / 12, grow));
  const hair: [number, number][] = c.longHair
    ? [...arc(150, -62, 1.08), [0.135, 0.03], [0.07, 0.05], [0.055, 0.15], [0.025, 0.19]]
    : [...arc(150, -22, 1.05), [0.15, 0.1], [0.1, 0.165], [0.035, 0.192]];
  const markup = `
    <defs>${filter('ears', FACE_DEPTH_M.ears)}${filter('face', 0)}${filter('nose', FACE_DEPTH_M.noseTip)}</defs>
    <g filter="url(#head-${el.id}-face)">
      <rect x="${X(0.04)}" y="${Y(0.02)}" width="${X(0.11) - X(0.04)}" height="${-Y(0.02)}" ${paint(c.skin)}/>
      <rect class="head-collar" x="${X(-0.01)}" y="${Y(-0.035)}" width="${X(0.16) - X(-0.01)}" height="${-Y(-0.035)}" rx="${0.008 * kx}"/>
      <ellipse cx="${(skullL + skullR) / 2}" cy="${Y(0.13)}" rx="${(skullR - skullL) / 2}" ry="${0.105 * ky}" ${paint(c.face)}/>
      <polygon points="${pts([[0.02, 0.21], [-0.006, 0.16], [-0.005, 0.125], [-0.01, 0.07], [-0.014, 0.055], [-0.008, 0.045], [-0.012, 0.032], [-0.003, 0.008], [0.06, 0], [0.06, 0.21]])}" ${paint(c.face)}/>
      <polygon points="${pts(hair)}" ${paint(c.hair)}/>
      <circle class="head-eye" cx="${X(0.008)}" cy="${Y(HEAD_EYE_M)}" r="${Math.max(1.5, 0.008 * ky)}"/>
      <polyline class="head-mouth" points="${pts([[-0.006, 0.042], [0.008, 0.04]])}" style="stroke:${c.mouth}"/>
    </g>
    <g filter="url(#head-${el.id}-ears)">
      <ellipse cx="${X(FACE_DEPTH_M.ears)}" cy="${Y(0.115)}" rx="${Math.max(2, 0.02 * kx)}" ry="${0.032 * ky}" ${paint(c.skin)}/>
      <ellipse class="head-ear-fold" cx="${X(FACE_DEPTH_M.ears)}" cy="${Y(0.115)}" rx="${Math.max(1, 0.01 * kx)}" ry="${0.018 * ky}" style="stroke:${c.earFold}"/>
    </g>
    <g filter="url(#head-${el.id}-nose)">
      <polygon points="${pts([[-0.004, 0.128], [FACE_DEPTH_M.noseTip, 0.085], [-0.008, 0.07]])}" ${paint(c.nose)}/>
    </g>`;
  return { markup, left: X(FACE_DEPTH_M.noseTip), right: skullR, top: Y(0.235), big: L.groundY + Y(0.235) < L.plotBottom };
}

/** Arrow at the plot edge for an element outside the visible range (linear zoom). */
function drawOffscreen(el: DerivedElement, leftSide: boolean, row: number, L: Layout): string {
  const x = leftSide ? L.left + 4 : L.right - 4;
  const anchor = leftSide ? 'start' : 'end';
  const text = `${leftSide ? '← ' : ''}${t.elements[el.id]} ${formatMeters(el.distanceM)}${leftSide ? '' : ' →'}`;
  return `<g class="el el-${el.id}" data-drag="offscreen" data-id="${el.id}">
    <text class="el-offscreen" x="${x}" y="${L.groundY - 8 - row * 18}" text-anchor="${anchor}">${text}</text>
  </g>`;
}

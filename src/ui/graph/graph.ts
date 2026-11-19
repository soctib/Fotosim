// Sharpness graph: blur curve over distance, depth-of-field band, draggable
// elements and focus line. Renders only from derive()'s result.

import { de as t, fill } from '../../data/texts.de';
import type { Derived, DerivedElement } from '../../model/derive';
import type { ElementId } from '../../model/types';
import { focusOn, setElementDistance, setFocus, setInfo, setLogScale, setShowDetails } from '../../state/actions';
import type { Store } from '../../state/store';
import { formatMeterRange, formatMeters, formatNumber } from '../distance';
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
  return { w, h, left: details ? 44 : 14, right: w - 14, plotTop: 34, plotBottom: h - 92, groundY: h - 24 };
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
    hint.textContent = !log ? t.graph.hintLinear : afOn ? t.graph.hintAutofocus : t.graph.hintLog;
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

  // Depth-of-field band (spans plot and scene strip).
  const near = xOf(d.dof.nearM);
  const far = Number.isFinite(d.dof.farM) ? xOf(d.dof.farM) : L.right;
  if (far > near) {
    parts.push(`<rect class="dof" x="${near}" y="${L.plotTop}" width="${far - near}" height="${L.groundY - L.plotTop}"/>`);
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

  if (details) parts.push(drawYAxis(sy, L));

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
  parts.push(`<line class="ground" x1="${L.left}" x2="${L.right}" y1="${L.groundY}" y2="${L.groundY}"/>`);

  if (details) parts.push(drawCurve(d, sx, sy, L));

  // Elements: marker on the curve + figure in the scene strip.
  // Draw far to near so nearer figures overlap farther ones.
  const visible = d.elements.filter((el) => el.visible).sort((a, b) => b.distanceM - a.distanceM);
  for (const el of visible) if (inView(el.distanceM)) parts.push(drawElement(el, sx.toPx(el.distanceM), sy, L, details));
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
function drawYAxis(sy: (b: number) => number, L: Layout): string {
  const out: string[] = [];
  const y1 = sy(1);
  out.push(`<rect class="sharp-zone" x="${L.left}" y="${y1}" width="${L.right - L.left}" height="${L.plotBottom - y1}"/>`);
  for (const y of Y_TICKS) {
    const py = sy(y);
    out.push(`<line class="grid" x1="${L.left}" x2="${L.right}" y1="${py}" y2="${py}"/>`);
    const label = y === 0 ? formatNumber(0) : fill(t.graph.blurTimes, { value: formatNumber(y) });
    out.push(`<text class="tick" x="${L.left - 6}" y="${py + 4}" text-anchor="end">${label}</text>`);
  }
  out.push(`<line class="sharp-line" x1="${L.left}" x2="${L.right}" y1="${y1}" y2="${y1}"/>`);
  out.push(`<text class="unsharp-label" x="${L.left + 6}" y="${y1 - 6}">↑ ${t.graph.unsharp}</text>`);
  out.push(`<text class="sharp-label" x="${L.left + 6}" y="${y1 + 15}">↓ ${t.graph.sharp}</text>`);
  out.push(
    `<text class="axis-title" transform="translate(12 ${(L.plotTop + L.plotBottom) / 2}) rotate(-90)" text-anchor="middle">${t.graph.sharpness}</text>`,
  );
  return out.join('');
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

/** Cartoon cue only: figures get fuzzy once they leave the sharp zone. */
function figureBlurPx(el: DerivedElement): number {
  const b = el.relativeBlur;
  if (!(b > 1)) return 0;
  return Math.min(3, Math.log2(b) * 0.6);
}

function drawElement(el: DerivedElement, x: number, sy: (b: number) => number, L: Layout, details: boolean): string {
  const cy = sy(Math.min(Y_MAX, el.relativeBlur));
  const figure =
    el.id === 'background'
      ? `<polygon points="-26,0 -8,-34 2,-20 10,-30 28,0"/><circle class="sun" cx="16" cy="-40" r="5"/>`
      : `<circle cx="0" cy="-38" r="6"/><path d="M0,-32 V-14 M0,-14 L-7,0 M0,-14 L7,0 M-9,-20 L0,-27 L9,-20"/>`;
  return `<g class="el el-${el.id}">
    ${details ? `<line class="el-stem" x1="${x}" x2="${x}" y1="${cy}" y2="${L.groundY - 48}"/>
    <circle class="el-dot" cx="${x}" cy="${cy}" r="5"/>` : ''}
    <g data-drag="element" data-id="${el.id}" transform="translate(${x} ${L.groundY})">
      <rect class="hit" x="-22" y="-54" width="44" height="74"/>
      <g class="figure" filter="url(#blur-${el.id})">${figure}</g>
      <text class="el-label" y="16" text-anchor="middle">${formatMeters(el.distanceM)}</text>
    </g>
  </g>`;
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

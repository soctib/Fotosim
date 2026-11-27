// Camera bodies seen from above, with their controls. y = 0 is the lens mount face; the lens
// points to −y, the photographer is at +y.

import type { BodyShape, BoxShape, CompactShape, MirrorlessShape, PhoneShape, SlrShape } from '../../data/cameraBodies';
import { de as t } from '../../data/texts.de';
import { lcdPanel, meterBar, type LcdState } from './lcd';
import { drawLens, type LensView, type RingMarkView } from './lens';
import { flashIcon, norm, Painter, RAD, r2 } from './svg';

type Attrs = Record<string, string | number | boolean | undefined>;

export type CtlId =
  | 'mode'
  | 'front'
  | 'rear'
  | 'iso'
  | 'flash'
  | 'zoom'
  | 'focus'
  | 'lcd-t'
  | 'lcd-n'
  | 'lcd-iso'
  | 'speed'
  | 'aperture'
  | 'film-iso'
  | `module-${number}`;

export interface RigView {
  /** Hit-target attributes for a control, null where it isn't drawn as interactive. */
  ctl: (id: CtlId) => Attrs | null;
  locked: (id: CtlId) => boolean;
  held: CtlId | null;
  lcd: LcdState;
  /** Draw the top display (else the values go on a folded-out rear screen card). */
  topDisplay: boolean;
  /** Mode dial: labels in dial order and the current index. */
  modeDial: RingMarkView[];
  modeIndex: number;
  /** Rib rotation of the command dials (degrees; turns while dragged). */
  frontDeg: number;
  rearDeg: number;
  isoEdit: boolean;
  /** Flash attached / popped up / LED on. */
  flash: boolean;
  lens: LensView | null;
  /** Compact: zoom position 0…1 (lens tubes extend). */
  compactZoom: number;
  /** Film SLRs: the speed dial on the body (the 6×6 has a speed ring on the lens instead). */
  speedDial: { labels: RingMarkView[]; index: number } | null;
  filmIso: number;
  /** Folded-out card under film bodies (finder readout) and phones (screen). */
  readout: { line1: string; line2: string; meter: number | null };
  /** Phones: the camera app's settable values on the screen card (null otherwise). */
  phoneFields: { shutter: string; aperture: string; iso: string; isoLabel: string } | null;
  phoneModules: { label: string; active: boolean }[];
}

const lk = (v: RigView, id: CtlId) => (v.locked(id) ? ' locked' : '');
const held = (v: RigView, id: CtlId) => (v.held === id ? ' held' : '');
const at = (v: RigView, id: CtlId): Attrs => v.ctl(id) ?? {};

/** A dial seen from above with labels round it; the label at `index` faces the photographer. */
function labelDial(p: Painter, cx: number, cy: number, r: number, labels: RingMarkView[], index: number, step: number, face: string, attrs: Attrs, cls: string, labelCls = 'tm', maxDeg = 180): string {
  let s = p.circ(cx, cy, r + 0.8, `rub${cls}`, attrs) + p.circ(cx, cy, r, face) + `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" class="dome"/>`;
  s += `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r + 0.4)}" fill="none" class="rib" stroke-width=".8" stroke-dasharray=".5 .7"/>`;
  labels.forEach((m, i) => {
    const a = (i - index) * step;
    if (Math.abs(a) > maxDeg) return;
    const len = m.label.length;
    const size = r * (len > 3 ? 0.21 : len > 2 ? 0.26 : len > 1 ? 0.38 : 0.46);
    s += `<g transform="rotate(${r2(a)} ${r2(cx)} ${r2(cy)})">` + p.text(cx, cy + r * 0.7, m.label, size, m.alt ? 'aut' : labelCls) + '</g>';
  });
  s += `<polygon points="${r2(cx - 1.4)},${r2(cy + r + 3.4)} ${r2(cx + 1.4)},${r2(cy + r + 3.4)} ${r2(cx)},${r2(cy + r + 1)}" class="acc"/>`;
  return s;
}

function shutterButton(p: Painter, x: number, y: number, r = 6.2): string {
  return (
    p.circ(x, y, r, 'b') +
    `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(r)}" fill="none" class="rib" stroke-width=".7" stroke-dasharray=".6 .6"/>` +
    p.circ(x, y, r * 0.61, 'mt') +
    `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(r * 0.61)}" class="dome"/>`
  );
}

/** Command dial seen from above: only its ribbed edge shows; `deg` turns the ribs. */
function cmdDial(p: Painter, cx: number, y: number, w: number, h: number, deg: number, cls: string, attrs: Attrs): string {
  let s = p.rect(cx - w / 2, y, w, h, `rub${cls}`, 1.2, attrs);
  for (let k = 0; k < 30; k++) {
    const th = norm(k * 12 - deg);
    if (Math.abs(th) > 80) continue;
    const c = Math.cos(th * RAD);
    const x = cx + (w / 2 - 0.6) * Math.sin(th * RAD);
    s += `<line x1="${r2(x)}" x2="${r2(x)}" y1="${r2(y + 0.5)}" y2="${r2(y + h - 0.5)}" class="rib" stroke-width="${r2(0.3 + 0.6 * c)}" stroke-opacity="${r2(0.3 + 0.7 * c)}"/>`;
  }
  return s;
}

function hotShoe(p: Painter, cx: number, cy: number, attrs: Attrs, cls: string): string {
  return (
    p.rect(cx - 9, cy - 9, 18, 18, `mt2${cls}`, 1, attrs) +
    p.rect(cx - 7, cy - 9, 14, 18, 'b', 0.6) +
    p.rect(cx - 9, cy - 9, 2.2, 18, 'mt', 0.4) +
    p.rect(cx + 6.8, cy - 9, 2.2, 18, 'mt', 0.4)
  );
}

/** Compact speedlite seen from above, its reflector facing the subject. */
function speedlite(p: Painter, cx: number, cy: number, attrs: Attrs, cls: string): string {
  const w = 58;
  const d = 40;
  return (
    p.rect(cx - w / 2 + 1.2, cy - d / 2 + 1.5, w, d, 'rub', 3, { opacity: 0.5 }) +
    p.rect(cx - w / 2, cy - d / 2, w, d, `bh${cls}`, 3, attrs) +
    p.shade(cx - w / 2, cy - d / 2, w, d, 3) +
    p.rect(cx - w / 2 + 3, cy - d / 2 - 1.2, w - 6, 4, 'fl', 1) +
    flashIcon(cx, cy - 13, 11, 'tm2') +
    p.text(cx, cy + 6, t.camera.speedlite, 4.5, 'tm2')
  );
}

/**
 * Folded-out view through a film body's finder: the frame on the focusing screen with its split
 * circle, the values as red LEDs below it and, on SLRs, a needle meter at the right edge. The needle
 * shows what the camera believes (its ISO dial), not what the film gets.
 */
function viewfinderCard(p: Painter, v: RigView, w: number, y: number, square: boolean): string {
  const ch = square ? 52 : 44;
  const x0 = -w / 2 + 1;
  let s = p.rect(x0, y, w - 2, ch, 'vf', 6);
  // Frame: 3:2 (35 mm) or square (6×6), left of the meter scale.
  const fh = ch - 14;
  const fw = square ? fh : Math.min(fh * 1.5, w - 30);
  const fx = x0 + (w - 2 - 16 - fw) / 2;
  const fy = y + 4;
  s += p.rect(fx, fy, fw, fh, 'vf-screen', 1);
  const cx = fx + fw / 2;
  const cy = fy + fh / 2;
  s += `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(fh * 0.26)}" class="vf-ring"/>`;
  s += `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(fh * 0.13)}" class="vf-line"/>`;
  s += `<line x1="${r2(cx - fh * 0.13)}" x2="${r2(cx + fh * 0.13)}" y1="${r2(cy)}" y2="${r2(cy)}" class="vf-line"/>`;
  // Values below the frame.
  if (v.readout.line1) s += p.text(cx, fy + fh + 5, v.readout.line1, 4, square ? 'vf-text' : 'vf-led');
  // Needle meter: + at the top, − at the bottom, 2 stops each way.
  if (!square && v.readout.meter !== null) {
    const mx = fx + fw + 9;
    const half = fh / 2 - 3;
    for (let i = -2; i <= 2; i++) {
      const ty = cy - (half * i) / 2;
      s += `<line x1="${r2(mx - (i === 0 ? 2.4 : 1.4))}" x2="${r2(mx)}" y1="${r2(ty)}" y2="${r2(ty)}" class="vf-line"/>`;
    }
    s += p.text(mx + 2.6, cy - half, '+', 3.6, 'vf-text') + p.text(mx + 2.6, cy + half, '−', 3.6, 'vf-text');
    const ny = cy - (half * Math.min(2.3, Math.max(-2.3, v.readout.meter))) / 2;
    s += `<line x1="${r2(mx - 5)}" x2="${r2(mx + 1)}" y1="${r2(ny)}" y2="${r2(ny)}" class="vf-needle"/>`;
  }
  s += p.text(0, y + ch + 4, square ? t.camera.waistFinderView : t.camera.viewfinder, 3.6, 'lab');
  p.ext(-w / 2, y, w / 2, y + ch + 6.5);
  return s;
}

const lugs = (p: Painter, w: number, y: number) => p.rect(-w / 2 - 2, y, 2.4, 6, 'mt', 1) + p.rect(w / 2 - 0.4, y, 2.4, 6, 'mt', 1);
const bodyCap = (p: Painter, ax: number, d = 60) => p.rect(ax - d / 2, -3, d, 3, 'mt', 0.6);

/** Folded-out card under the body: the phone's screen or a digital body's rear screen. */
function readoutCard(p: Painter, v: RigView, w: number, y: number, caption: string, extra = ''): string {
  const ch = v.phoneModules.length ? 34 : 24;
  let s = p.rect(-w / 2 + 1, y, w - 2, ch, 'scrcard', 4);
  if (v.readout.line1) s += p.text(0, y + 7.5, v.readout.line1, 5, 'ts');
  if (v.readout.line2) s += p.text(0, y + 14.5, v.readout.line2, 4.2, 'ts');
  if (v.readout.meter !== null && !v.phoneFields) s += `<g class="on-dark">${meterBar(-16, 16, y + 17, 4.5, v.readout.meter)}</g>`;
  s += extra;
  s += p.text(0, y + ch + 4, caption, 3.6, 'lab');
  p.ext(-w / 2, y, w / 2, y + ch + 6.5);
  return s;
}

function drawMirrorless(p: Painter, b: MirrorlessShape, v: RigView): { under: string; top: string } {
  const ax = b.humpX;
  const w = b.widthMm;
  const d = b.depthMm;
  let s = lugs(p, w, d * 0.3);
  s += p.rect(w / 2 - b.gripWidthMm, -b.gripMm, b.gripWidthMm, d + b.gripMm, 'b', 8);
  s += p.rect(-w / 2, 0, w, d, 'b', 5);
  s += p.rect(ax - 13, d - 2, 26, b.eyecupMm + 2, 'rub', 3);
  s += p.rect(ax - b.humpWidthMm / 2, 1, b.humpWidthMm, d - 2, 'bh', 4);
  if (!v.flash) s += hotShoe(p, ax, d / 2, at(v, 'flash'), lk(v, 'flash'));
  // Mode dial on the left shoulder.
  const left = -w / 2 + 3;
  const right = ax - b.humpWidthMm / 2 - 3;
  const r = Math.min(12.5, (right - left) / 2 - 1, d / 2 - 4.5);
  s += labelDial(p, (left + right) / 2, d / 2 - 1.5, r, v.modeDial, v.modeIndex, 62, 'bh', at(v, 'mode'), held(v, 'mode'));
  // Top display right of the hump.
  const lx0 = ax + b.humpWidthMm / 2 + 4;
  const lx1 = w / 2 - 5;
  const ly0 = b.gripMm < 14 ? 9 : 4;
  const ly1 = d - 4;
  const lh = Math.min(ly1 - ly0, lx1 - lx0 >= 40 ? 20 : 26);
  s += v.topDisplay ? lcdPanel(p, lx0, ly0, lx1 - lx0, lh, v.lcd) : p.rect(lx0, ly0, lx1 - lx0, lh, 'bh', 3);
  // Shutter button on the grip, front dial under it, rear dial at the back edge.
  const bigGrip = b.gripMm >= 14;
  const sbX = w / 2 - b.gripWidthMm / 2 + (bigGrip ? 0 : 4);
  const sbY = bigGrip ? -b.gripMm / 2 + 1 : 1;
  s += cmdDial(p, sbX, -b.gripMm - 2.6, 18, 3.4, v.frontDeg, lk(v, 'front') + held(v, 'front'), at(v, 'front'));
  s += cmdDial(p, w / 2 - 17, d - 0.8, 22, 3.6, v.rearDeg, lk(v, 'rear') + held(v, 'rear'), at(v, 'rear'));
  // ISO button under the display.
  const iby = ly0 + lh + 1.6;
  const ibh = Math.max(3, Math.min(5, ly1 - iby + 2));
  s += p.rect(lx0, iby, 9, ibh, (v.isoEdit ? 'mt' : 'btn') + lk(v, 'iso'), 1, at(v, 'iso')) + p.text(lx0 + 4.5, iby + ibh / 2, t.camera.isoButton, Math.min(2.6, ibh * 0.6), v.isoEdit ? 'tl' : 'tm2');
  s += shutterButton(p, sbX, sbY);
  s += v.lens ? drawLens(p, v.lens, ax) : bodyCap(p, ax);
  if (!v.topDisplay) s += readoutCard(p, v, Math.min(w, 110), d + b.eyecupMm + 4, t.camera.rearScreen);
  return { under: s, top: v.flash ? speedlite(p, ax, d / 2, at(v, 'flash'), lk(v, 'flash')) : '' };
}

function drawCompact(p: Painter, b: CompactShape, v: RigView): string {
  const ax = b.lensX;
  const w = b.widthMm;
  let s = lugs(p, w, b.depthMm * 0.3);
  s += p.rect(-w / 2, 0, w, b.depthMm, 'b', 6);
  // Control ring at the lens base (the "front dial"), then the telescoping zoom.
  const z = v.compactZoom;
  s += cmdDial(p, ax, -4, 46, 4, v.frontDeg, lk(v, 'front') + held(v, 'front'), at(v, 'front'));
  let y = -4;
  const tubes: [number, number, string][] = [[7 + 5 * z, 41, 'ln'], [8 + 6 * z, 37, 'ln2'], [3, 35, 'ln']];
  const y0 = y;
  for (const [l, d, c] of tubes) {
    s += p.rect(ax - d / 2, y - l, d, l, c, 0.5) + p.shade(ax - d / 2, y - l, d, l);
    y -= l;
  }
  s += `<path d="M${r2(ax - 14)},${r2(y)}Q${r2(ax)},${r2(y - 2.4)} ${r2(ax + 14)},${r2(y)}Z" class="gl"/>`;
  p.ext(ax - 14, y - 2, ax + 14, y);
  // The tubes are the zoom control (no zoom ring on a compact).
  s += p.rect(ax - 20.5, y, 41, y0 - y, `hit${held(v, 'zoom')}`, 0, at(v, 'zoom'));
  // Pop-up flash, raised when on.
  const fa = at(v, 'flash');
  s += v.flash
    ? p.rect(-w / 2 + 5, 2, 24, 13, `bh${lk(v, 'flash')}`, 2, fa) + p.rect(-w / 2 + 6, 1, 22, 3, 'fl', 1) + p.shade(-w / 2 + 5, 2, 24, 13, 2)
    : p.rect(-w / 2 + 5, 3, 24, 12, `b${lk(v, 'flash')}`, 2, fa);
  s += lcdPanel(p, -w / 2 + 32, 5, 15.5 - (-w / 2 + 32), 25, v.lcd);
  s += p.circ(23.5, 8, 6.6, 'mt2') + p.rect(28.5, 6.5, 3, 3, 'mt2', 1) + shutterButton(p, 23.5, 8, 4.6);
  s += labelDial(p, w / 2 - 11.5, 19.5, 9, v.modeDial, v.modeIndex, 62, 'bh', at(v, 'mode'), held(v, 'mode'));
  s += cmdDial(p, w / 2 - 22, b.depthMm - 0.8, 16, 3.4, v.rearDeg, lk(v, 'rear') + held(v, 'rear'), at(v, 'rear'));
  return s;
}

function drawSlr(p: Painter, b: SlrShape, v: RigView): { under: string; top: string } {
  const bf = b.mirrorBoxMm;
  const ax = 0;
  const w = b.widthMm;
  const backD = b.backMm ?? 0;
  let s = lugs(p, w, bf + b.depthMm * 0.35);
  if (b.winder) s += p.rect(w / 2 - b.winder.w, bf - b.winder.front, b.winder.w, b.depthMm + b.winder.front, 'b', 8);
  s += p.rect(-w / 2, bf, w, b.depthMm, 'b', 4);
  if (backD) s += p.rect(-w / 2 + 4, bf + b.depthMm, w - 8, backD, 'rub', 3) + p.text(-w / 2 + 22, bf + b.depthMm + backD / 2, t.camera.filmBack, 3.6, 'tm2');
  s += p.rect(-b.mirrorBoxWidthMm / 2, 0, b.mirrorBoxWidthMm, bf + 2, 'b', 1.5);
  // Pentaprism, wider at the back, eyepiece behind.
  const py0 = bf - Math.min(10, bf - 2);
  const py1 = bf + b.depthMm + backD - 1;
  s += p.rect(ax - 11, py1 - 1, 22, b.eyecupMm + 1, 'rub', 2);
  s += p.trap(ax, py1, py0, b.prismWidthMm, b.prismWidthMm * 0.72, 'bh');
  s += `<path d="M${r2(ax - b.prismWidthMm * 0.36)},${r2(py0)}L${r2(ax)},${r2((py0 + py1) / 2)}L${r2(ax + b.prismWidthMm * 0.36)},${r2(py0)}" fill="none" class="edge-line"/>`;
  const shoeY = (py0 + py1) / 2 + 4;
  if (!v.flash) s += hotShoe(p, ax, shoeY, at(v, 'flash'), lk(v, 'flash'));
  // Rewind crank on the left with the film speed window.
  const rx = -w / 2 + Math.min(20, (w - b.prismWidthMm) / 4 + 6);
  const ry = bf + b.depthMm / 2;
  s += p.circ(rx, ry, 11, 'b') + p.circ(rx, ry, 9, 'mt') + `<path d="M${r2(rx)},${r2(ry)}L${r2(rx + 7)},${r2(ry + 9)}" class="crank"/>`;
  s += p.rect(rx - 10, ry - 16.5, 20, 7, `lcd${held(v, 'film-iso')}`, 1, at(v, 'film-iso')) + `<text x="${r2(rx)}" y="${r2(ry - 13)}" font-size="3.4" class="tl" text-anchor="middle" dy=".36em">${t.camera.filmIso.replace('{iso}', String(v.filmIso))}</text>`;
  // Shutter speed dial, advance lever with the release button.
  const sx = w / 2 - Math.min(40, (w - b.prismWidthMm) / 4 + 18);
  const sy = bf + b.depthMm / 2;
  if (v.speedDial) {
    s += labelDial(p, sx, sy - 1, Math.min(13, b.depthMm / 2 - 4.5), v.speedDial.labels, v.speedDial.index, 50, 'mt', at(v, 'speed'), lk(v, 'speed') + held(v, 'speed'), 'tl', 105);
  }
  const vx = w / 2 - 13;
  const vy = bf + 9;
  s += `<path d="M${r2(vx)},${r2(vy)}L${r2(vx - 22)},${r2(vy + b.depthMm - 14)}" class="lever"/>`;
  s += p.circ(vx, vy, 6, 'mt2') + p.circ(vx, vy, 3.3, 'mt') + `<circle cx="${r2(vx)}" cy="${r2(vy)}" r="3.3" class="dome"/>`;
  s += v.lens ? drawLens(p, v.lens, ax) : bodyCap(p, ax, 56);
  s += viewfinderCard(p, v, Math.min(w, 110), py1 + b.eyecupMm + 4, false);
  return { under: s, top: v.flash ? speedlite(p, ax, shoeY, at(v, 'flash'), lk(v, 'flash')) : '' };
}

function drawBox(p: Painter, b: BoxShape, v: RigView): string {
  const w = b.widthMm;
  const d = b.depthMm;
  let s = p.rect(-w / 2, d, w, b.magazineMm, 'mt', 3) + p.rect(-w / 2 + 3, d + 4, w - 6, b.magazineMm - 8, 'b', 2);
  s += p.rect(w / 2, d + 14, 6, 14, 'mt2', 1.5);
  // Winding knob, seen edge-on.
  s += p.rect(w / 2 - 1, 14, 16, 44, 'b', 4) + p.shade(w / 2 - 1, 14, 16, 44, 4);
  for (let i = 0; i < 9; i++) s += `<line x1="${r2(w / 2 + 1 + i * 1.6)}" x2="${r2(w / 2 + 1 + i * 1.6)}" y1="15" y2="57" class="rib" stroke-width=".5"/>`;
  s += p.rect(-w / 2, 0, w, d, 'b', 3);
  // Folded waist-level finder.
  s += p.rect(-41, 4, 82, d - 7, 'bh', 3) + p.rect(-34, 10, 68, d - 19, 'b', 2) + p.circ(0, d / 2 - 1.5, 13, 'gl');
  s += p.text(0, d - 8, t.camera.waistFinder, 3.6, 'tm2');
  s += p.rect(w / 2 - 20, -5, 8, 5, 'mt', 1.5);
  // Film speed reminder dial on the magazine.
  s += p.rect(-w / 2 + 6, d + b.magazineMm - 13, 22, 7, `lcd${held(v, 'film-iso')}`, 1, at(v, 'film-iso')) + `<text x="${r2(-w / 2 + 17)}" y="${r2(d + b.magazineMm - 9.5)}" font-size="3.4" class="tl" text-anchor="middle" dy=".36em">${t.camera.filmIso.replace('{iso}', String(v.filmIso))}</text>`;
  s += v.lens ? drawLens(p, v.lens, 0) : bodyCap(p, 0, 64);
  s += viewfinderCard(p, v, Math.min(w, 96), d + b.magazineMm + 5, true);
  return s;
}

function drawPhone(p: Painter, b: PhoneShape, v: RigView): string {
  let s = '';
  const w = b.widthMm;
  const th = b.thicknessMm;
  for (const bump of b.bumps) s += p.rect(bump.x0, -bump.h, bump.w, bump.h + 0.6, bump.metal ? 'mt' : 'phb', 0.6);
  for (const l of b.lenses) {
    const base = b.bumps.find((q) => l.x >= q.x0 && l.x <= q.x0 + q.w);
    const y0 = -(base ? base.h : 0);
    s += p.rect(l.x - l.d / 2, y0 - l.h, l.d, l.h + 0.4, 'mt', 0.5);
    s += `<path d="M${r2(l.x - l.d / 2 + 1.5)},${r2(y0 - l.h)}Q${r2(l.x)},${r2(y0 - l.h - 1.2)} ${r2(l.x + l.d / 2 - 1.5)},${r2(y0 - l.h)}Z" class="gl"/>`;
    p.ext(l.x - l.d / 2, y0 - l.h - 1, l.x + l.d / 2, y0);
  }
  s += p.rect(-w / 2, 0, w, th, 'ph', th * 0.42);
  s += p.rect(-w / 2 + 1.2, th - 1.1, w - 2.4, 1.1, 'scr', 0.5);
  if (v.flash) {
    const fx = b.lenses[0].x - 11;
    s += `<path d="M${r2(fx - 4)},-1L${r2(fx - 9)},-12L${r2(fx + 9)},-12L${r2(fx + 4)},-1Z" class="fl" opacity=".5"/>`;
    p.ext(fx - 9, -12, fx + 9, 0);
  }
  // Screen card: readout, camera choice (0,5× 1× 5×) and the flash button, like a camera app.
  const cy = th + 4;
  let extra = '';
  const n = v.phoneModules.length;
  const bw = 11;
  const gap = 3;
  const x0 = -((n * bw + (n - 1) * gap) / 2);
  v.phoneModules.forEach((m, i) => {
    const id: CtlId = `module-${i}`;
    const x = x0 + i * (bw + gap);
    extra +=
      p.rect(x, cy + 21, bw, 7.5, `phbtn${m.active ? ' on' : ''}${held(v, id)}`, 3.75, at(v, id)) +
      p.text(x + bw / 2, cy + 24.8, m.label, 3.6, m.active ? 'phbtn-t on' : 'phbtn-t');
  });
  // Values like a camera app's pro mode: shutter and ISO are dragged sideways, the aperture is fixed.
  const f = v.phoneFields;
  if (f) {
    const x0f = -w / 2 + 3;
    const span = w - 18;
    const col = (i: number) => x0f + (span * (2 * i + 1)) / 6;
    const field = (i: number, id: CtlId | null, label: string, value: string) => {
      const x = col(i);
      const vw = Math.max(8, value.length * 2.5);
      let g = p.text(x, cy + 4.2, label, 2.6, 'lab-dark') + p.text(x, cy + 9.2, value, 4.6, 'ts');
      if (id) g += `<line x1="${r2(x - vw / 2)}" x2="${r2(x + vw / 2)}" y1="${r2(cy + 12.4)}" y2="${r2(cy + 12.4)}" class="hov"/>` + p.rect(x - span / 6 + 0.5, cy + 1.5, span / 3 - 1, 12, 'hit', 0, at(v, id));
      return id ? `<g class="fld scr${lk(v, id)}${held(v, id)}">${g}</g>` : g;
    };
    extra += field(0, 'lcd-t', t.camera.phoneLabels.shutter, f.shutter) + field(1, null, t.camera.phoneLabels.aperture, f.aperture) + field(2, 'lcd-iso', f.isoLabel, f.iso);
    if (v.readout.meter !== null) extra += `<g class="on-dark">${meterBar(-w / 2 + 6, w / 2 - 16, cy + 14.6, 3.6, v.readout.meter)}</g>`;
  }
  const fx = w / 2 - 9;
  extra += p.rect(fx - 4.5, cy + 2.5, 9, 9, `phbtn${v.flash ? ' on' : ''}${lk(v, 'flash')}${held(v, 'flash')}`, 4.5, at(v, 'flash')) + flashIcon(fx, cy + 3.8, 6.4, v.flash ? 'fl' : 'ts');
  s += readoutCard(p, v, w, cy, t.camera.phoneScreen, extra);
  return s;
}

/** Draws body (and lens); returns the markup and its bounds. */
export function drawRig(body: BodyShape, v: RigView): { svg: string; p: Painter } {
  const p = new Painter();
  let svg: string;
  switch (body.type) {
    case 'phone':
      svg = drawPhone(p, body, v);
      break;
    case 'compact':
      svg = drawCompact(p, body, v);
      break;
    case 'ml': {
      const r = drawMirrorless(p, body, v);
      svg = r.under + r.top;
      break;
    }
    case 'slr': {
      const r = drawSlr(p, body, v);
      svg = r.under + r.top;
      break;
    }
    case 'box':
      svg = drawBox(p, body, v);
      break;
  }
  return { svg, p };
}

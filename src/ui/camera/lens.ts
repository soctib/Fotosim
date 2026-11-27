// The lens seen from above: barrel sections, rings drawn as turning cylinders, front element.

import { lensLengthMm, type LensPart } from '../../model/cameraPanel';
import { indexMark, norm, Painter, RAD, r2 } from './svg';

type Attrs = Record<string, string | number | boolean | undefined>;

export interface RingMarkView {
  deg: number;
  label: string;
  /** Second colour (e.g. the "A" position). */
  alt?: boolean;
}

export interface RingView {
  marks: RingMarkView[];
  /** Angle now at the index mark. */
  cur: number;
  /** Hit-target attributes (interactive rings). */
  attrs?: Attrs | null;
  /** The mode leaves this value to the camera. */
  locked?: boolean;
  /** Share of the ring taken by the ribbed grip (rest: the scale). */
  ribFrac?: number;
}

/** A ring seen from above: a ribbed cylinder band; a mark at angle a sits at x = R·sin(a − cur). */
function ring(p: Painter, ax: number, y: number, h: number, d: number, o: RingView | undefined): string {
  const R = d / 2;
  let s = p.rect(ax - R, y, d, h, `rg${o?.locked ? ' locked' : ''}`, 0.8, o?.attrs ?? {}) + p.shade(ax - R, y, d, h, 0.8);
  const marks = o?.marks ?? [];
  const ribH = marks.length ? h * (o?.ribFrac ?? 0.48) : h;
  const cur = o?.cur ?? 0;
  for (let k = 0; k < 72; k++) {
    const th = norm(k * 5 - cur);
    if (Math.abs(th) > 86) continue;
    const c = Math.cos(th * RAD);
    const x = ax + R * Math.sin(th * RAD);
    s += `<line x1="${r2(x)}" x2="${r2(x)}" y1="${r2(y + 0.7)}" y2="${r2(y + ribH - 0.7)}" class="rib" stroke-width="${r2(0.35 + 0.7 * c)}" stroke-opacity="${r2(0.25 + 0.75 * c)}"/>`;
  }
  if (marks.length) {
    const zh = h - ribH;
    const fs = Math.min(4.6, zh * 0.66, d * 0.06 + 1.2);
    const ty = y + ribH + zh * 0.44;
    for (const m of marks) {
      const th = norm(m.deg - cur);
      if (Math.abs(th) > 76) continue;
      const c = Math.cos(th * RAD);
      const x = ax + R * Math.sin(th * RAD);
      s +=
        `<g transform="translate(${r2(x)},${r2(ty)}) scale(${r2(c)},1)" opacity="${r2(0.3 + 0.7 * c)}">` +
        `<text font-size="${r2(fs)}" class="${m.alt ? 'aut' : 'tm'}" text-anchor="middle" dy=".36em">${m.label}</text></g>` +
        `<line x1="${r2(x)}" x2="${r2(x)}" y1="${r2(y + h - 0.9)}" y2="${r2(y + h)}" class="tk" opacity="${r2(c)}"/>`;
    }
  }
  return s;
}

export interface LensView {
  parts: LensPart[];
  rings: Partial<Record<'zoom' | 'focus' | 'aperture' | 'speed', RingView>>;
  /** Entrance pupil at the widest aperture (dashed line behind the front element). */
  pupilMm: number;
  bulgeMm: number;
  /** Engraving on primes ("50 mm 1:1.4"). */
  engraving: string;
}

/** Draws the lens with its mount at y = 0, pointing to −y, on axis ax. */
export function drawLens(p: Painter, L: LensView, ax: number): string {
  let y = 0;
  let s = '';
  let over = '';
  L.parts.forEach((sec) => {
    const l = sec.lengthMm;
    const yt = y - l;
    const d = sec.dMm;
    if (sec.kind === 'zoom' || sec.kind === 'focus' || sec.kind === 'aperture' || sec.kind === 'speed') {
      const o = L.rings[sec.kind];
      s += ring(p, ax, yt, l, d, o);
      if (o?.marks.length) over += indexMark(ax, y + 0.15);
    } else {
      const cls = sec.kind === 'mount' ? 'mt' : sec.kind === 'inner' ? 'ln2' : sec.kind === 'collar' ? 'bh' : 'ln';
      if (Math.abs(sec.d0Mm - d) > 0.05) s += p.trap(ax, y, yt, sec.d0Mm, d, cls);
      else s += p.rect(ax - d / 2, yt, d, l, cls, sec.kind === 'front' ? 1.2 : 0.4) + p.shade(ax - d / 2, yt, d, l);
      if (sec.kind === 'collar') s += p.rect(ax - d / 2 - 2, yt + l / 2 - 3, 4, 6, 'bh', 1) + p.rect(ax + d / 2 - 2, yt + l / 2 - 3, 4, 6, 'bh', 1);
      if (sec.engraved && L.engraving) s += p.text(ax, yt + l / 2, L.engraving, Math.min(4.2, l * 0.42, d * 0.06), 'tm2');
    }
    y = yt;
  });
  // Front element and the entrance pupil behind it.
  const dF = L.parts[L.parts.length - 1].dMm;
  const bulge = L.bulgeMm;
  p.ext(ax - dF / 2, y - bulge, ax + dF / 2, y);
  s += `<path d="M${r2(ax - dF / 2 + 3)},${r2(y)}Q${r2(ax)},${r2(y - bulge * 2)} ${r2(ax + dF / 2 - 3)},${r2(y)}Z" class="gl"/>`;
  const pw = L.pupilMm;
  const py = y + 1.8;
  s +=
    `<path d="M${r2(ax - pw / 2)},${r2(py - 1)}v2M${r2(ax + pw / 2)},${r2(py - 1)}v2" class="pup"/>` +
    `<line x1="${r2(ax - pw / 2)}" x2="${r2(ax + pw / 2)}" y1="${r2(py)}" y2="${r2(py)}" class="pup" stroke-dasharray="1.6 1"/>`;
  return s + over;
}

export { lensLengthMm };

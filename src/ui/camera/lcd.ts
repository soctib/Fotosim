// Top display in seven-segment digits: slight italic, faint unlit segments, printed labels.
// Field sizes come from the widest value ("1/8000", "F5.6", "12800"), so digits never change size.

import { de as t } from '../../data/texts.de';
import { flashIcon, Painter, r2 } from './svg';

/** Seven-segment glyphs: a top, b upper right, c lower right, d bottom, e lower left, f upper left, g middle. */
const SEG: Record<string, string> = {
  0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg',
  F: 'aefg', '-': 'g',
};
const NARROW: Record<string, number> = { '.': 0.32, '/': 0.55, '"': 0.42 };
const SPACING = 0.22;
const glyphW = (c: string, w: number) => (NARROW[c] ?? 1) * w;

/** One glyph in a cell of width w, height h, top left (x, y). Digits show their unlit segments faintly. */
function glyph(c: string, x: number, y: number, w: number, h: number): string {
  const th = Math.max(0.35, w * 0.19);
  const gap = th * 0.14;
  const H = h / 2;
  const hz = (y0: number, x0 = x + th / 2, x1 = x + w - th / 2) =>
    `M${r2(x0 + gap)},${r2(y0)}l${r2(th / 2)},${r2(-th / 2)}H${r2(x1 - gap - th / 2)}l${r2(th / 2)},${r2(th / 2)}l${r2(-th / 2)},${r2(th / 2)}H${r2(x0 + gap + th / 2)}Z`;
  const vt = (x0: number, y0: number, y1: number) =>
    `M${r2(x0)},${r2(y0 + gap)}l${r2(th / 2)},${r2(th / 2)}V${r2(y1 - gap - th / 2)}l${r2(-th / 2)},${r2(th / 2)}l${r2(-th / 2)},${r2(-th / 2)}V${r2(y0 + gap + th / 2)}Z`;
  if (c === '.') return `<rect x="${r2(x + w * 0.5 - th / 2)}" y="${r2(y + h - th)}" width="${r2(th)}" height="${r2(th)}" class="sg1"/>`;
  if (c === '/') return `<path d="M${r2(x + w - th * 0.2)},${r2(y)}h${r2(-th)}L${r2(x + th * 0.2)},${r2(y + h)}h${r2(th)}Z" class="sg1"/>`;
  if (c === '"')
    return `<path d="M${r2(x + w * 0.2)},${r2(y)}h${r2(th * 0.8)}l${r2(-th * 0.3)},${r2(h * 0.3)}h${r2(-th * 0.5)}ZM${r2(x + w * 0.62)},${r2(y)}h${r2(th * 0.8)}l${r2(-th * 0.3)},${r2(h * 0.3)}h${r2(-th * 0.5)}Z" class="sg1"/>`;
  const on = SEG[c] ?? '';
  const segs: Record<string, string> = {
    a: hz(y + th / 2),
    d: hz(y + h - th / 2),
    g: hz(y + H),
    f: vt(x + th / 2, y + th / 2, y + H),
    b: vt(x + w - th / 2, y + th / 2, y + H),
    e: vt(x + th / 2, y + H, y + h - th / 2),
    c: vt(x + w - th / 2, y + H, y + h - th / 2),
  };
  const lit = Object.entries(segs).filter(([k]) => on.includes(k)).map(([, d]) => d).join('');
  // Letters are printed segments of their own; only digit cells show the unlit rest.
  const unlit = /\d/.test(c) ? Object.entries(segs).filter(([k]) => !on.includes(k)).map(([, d]) => d).join('') : '';
  return (unlit ? `<path d="${unlit}" class="sg0"/>` : '') + (lit ? `<path d="${lit}" class="sg1"/>` : '');
}

/** Width of a string in cell widths, spacing included. */
export const segWidth = (str: string): number => [...str].reduce((k, c) => k + (NARROW[c] ?? 1), 0) + ([...str].length - 1) * SPACING;

/** Right-aligned segment text ending at xr; slightly italic like real LCD digits. */
function segText(str: string, xr: number, y: number, w: number, h: number): string {
  let x = xr;
  let out = '';
  for (const c of [...str].reverse()) {
    const gw = glyphW(c, w);
    x -= gw;
    out = glyph(c, x, y, gw, h) + out;
    x -= w * SPACING;
  }
  return `<g transform="translate(0 ${r2(y + h)}) skewX(-7) translate(0 ${r2(-y - h)})">${out}</g>`;
}

/** Shutter as the display shows it: "1/250", "0"6", "2"5", "30"". */
export function lcdShutter(s: number): string {
  if (s >= 0.3 - 1e-9) {
    const v = Math.round(s * 10) / 10;
    const [whole, frac] = String(v).split('.');
    return frac ? `${whole}"${frac}` : `${whole}"`;
  }
  return `1/${Math.round(1 / s)}`;
}

export const lcdAperture = (n: number): string => `${t.camera.lcdAperture}${Math.round(n * 10) / 10}`;

export type LcdField = 'lcd-t' | 'lcd-n' | 'lcd-iso';

export interface LcdState {
  shutterS: number;
  aperture: number;
  iso: number;
  /** Label printed next to the ISO: "ISO", or "DX" where the camera reads it from the film. */
  isoLabel: string;
  autoIso: boolean;
  flash: boolean;
  /** Light meter (stops, + = over) in M; null otherwise. */
  meter: number | null;
  /** ISO button active: the ISO blinks. */
  isoEdit: boolean;
  /** Hit-target attributes for a field (null: not interactive). */
  field: (id: LcdField) => Record<string, string | number | boolean | undefined> | null;
  locked: (id: LcdField) => boolean;
  held: string | null;
}

function lcdField(p: Painter, id: LcdField, x: number, y: number, w: number, h: number, body: string, st: LcdState, blink = false): string {
  const a = st.field(id);
  const cls = `fld${st.locked(id) ? ' locked' : ''}${st.held === id ? ' held' : ''}`;
  return (
    `<g class="${cls}"><g${blink ? ' class="blink"' : ''}>${body}</g>` +
    (a
      ? `<line x1="${r2(x)}" x2="${r2(x + w)}" y1="${r2(y + h + 0.9)}" y2="${r2(y + h + 0.9)}" class="hov"/>` +
        p.rect(x - 1, y - 1, w + 2, h + 2, 'hit', 0, a)
      : '') +
    '</g>'
  );
}

/** Light meter bar as on real top displays: ticks −2…+2, a marker for over/under exposure. */
function meterBar(x0: number, x1: number, y: number, h: number, stops: number): string {
  const cx = (x0 + x1) / 2;
  const half = (x1 - x0) / 2 - 1.2;
  const line = (xa: number, xb: number, ya: number, yb: number) =>
    `<line x1="${r2(xa)}" x2="${r2(xb)}" y1="${r2(ya)}" y2="${r2(yb)}" class="lcd-tick"/>`;
  let s = line(x0 + 1.2, x1 - 1.2, y + h * 0.35, y + h * 0.35);
  for (let i = -6; i <= 6; i++) {
    const x = cx + (half * i) / 6;
    s += line(x, x, y + h * (i % 3 === 0 ? 0 : 0.18), y + h * 0.35);
  }
  const v = Math.min(2.3, Math.max(-2.3, stops));
  const mx = cx + (half * v) / 2;
  s += `<polygon points="${r2(mx - h * 0.28)},${r2(y + h)} ${r2(mx + h * 0.28)},${r2(y + h)} ${r2(mx)},${r2(y + h * 0.48)}" class="sg1"/>`;
  return (
    s +
    `<text x="${r2(x0 - 0.2)}" y="${r2(y + h)}" font-size="${r2(h * 0.55)}" class="tlab">−</text>` +
    `<text x="${r2(x1 - h * 0.35)}" y="${r2(y + h)}" font-size="${r2(h * 0.55)}" class="tlab">+</text>`
  );
}

/**
 * The display: shutter | aperture in the top row; ISO, light meter (M) and flash in the bottom row.
 * Narrow displays (compact) stack one value per row.
 */
export function lcdPanel(p: Painter, x: number, y: number, w: number, h: number, st: LcdState): string {
  let s = p.rect(x, y, w, h, 'lcd', 1.6);
  const tStr = lcdShutter(st.shutterS);
  const nStr = lcdAperture(st.aperture);
  const isoStr = String(st.iso);
  const pad = 2.4;
  const kT = segWidth('1/8000');
  const kN = segWidth(lcdAperture(5.6));
  const kI = segWidth('12800');
  const autoLabel = (x0: number, y0: number, size: number) =>
    st.autoIso ? `<text x="${r2(x0)}" y="${r2(y0)}" font-size="${r2(size)}" class="tlab${st.isoEdit ? ' blink' : ''}">${t.camera.lcdAuto}</text>` : '';
  if (w >= 40) {
    const cw = Math.min((w - 2 * pad) / (kT + kN + 1.3), (h * 0.46) / 1.8);
    const ch = cw * 1.8;
    const y1 = y + pad;
    const tw = kT * cw;
    const nw = kN * cw;
    s += lcdField(p, 'lcd-t', x + pad, y1, tw, ch, segText(tStr, x + pad + tw, y1, cw, ch), st);
    s += lcdField(p, 'lcd-n', x + w - pad - nw, y1, nw, ch, segText(nStr, x + w - pad, y1, cw, ch), st);
    const cw2 = cw * 0.62;
    const ch2 = ch * 0.62;
    const y2 = y + h - pad - ch2;
    const lab = ch2 * 0.62;
    const iw = kI * cw2;
    const ix = x + pad + lab * 2.1;
    s += `<text x="${r2(x + pad)}" y="${r2(y2 + ch2)}" font-size="${r2(lab)}" class="tlab">${st.isoLabel}</text>`;
    s += autoLabel(x + pad, y2 - lab * 0.25, lab * 0.8);
    s += lcdField(p, 'lcd-iso', ix, y2, iw, ch2, segText(isoStr, ix + iw, y2, cw2, ch2), st, st.isoEdit);
    const fx = x + w - pad - ch2 * 0.4;
    if (st.flash) s += flashIcon(fx, y2, ch2, 'sg1');
    if (st.meter !== null) s += meterBar(ix + iw + 2, fx - ch2 * 0.5 - 1, y2 + ch2 * 0.1, ch2 * 0.85, st.meter);
  } else {
    const cw = Math.min((w - 2 * pad) / kT, (h - 2 * pad) / (1.8 * 2.62 + 1));
    const ch = cw * 1.8;
    const ch2 = ch * 0.62;
    const rowGap = (h - 2 * pad - ch * 2 - ch2) / 2;
    const xr = x + w - pad;
    const y1 = y + pad;
    const y2 = y1 + ch + rowGap;
    const y3 = y2 + ch + rowGap;
    s += lcdField(p, 'lcd-t', xr - kT * cw, y1, kT * cw, ch, segText(tStr, xr, y1, cw, ch), st);
    s += lcdField(p, 'lcd-n', xr - kN * cw, y2, kN * cw, ch, segText(nStr, xr, y2, cw, ch), st);
    const cw2 = cw * 0.62;
    const iw = kI * cw2;
    s += `<text x="${r2(x + pad)}" y="${r2(y3 + ch2)}" font-size="${r2(ch2 * 0.62)}" class="tlab">${st.isoLabel}</text>`;
    s += autoLabel(x + pad, y3 + ch2 * 0.2, ch2 * 0.5);
    s += lcdField(p, 'lcd-iso', xr - iw, y3, iw, ch2, segText(isoStr, xr, y3, cw2, ch2), st, st.isoEdit);
    if (st.flash) s += flashIcon(x + pad + 1.5, y1, ch * 0.8, 'sg1');
    if (st.meter !== null) s += meterBar(x + pad, x + pad + 14, y2 + ch * 0.3, ch * 0.5, st.meter);
  }
  return s;
}

export { meterBar };

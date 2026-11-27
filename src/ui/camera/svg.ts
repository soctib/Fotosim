// SVG primitives for the camera panel. One user unit = 1 mm; every primitive grows the
// drawing's bounds so the view box can be fitted afterwards.

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export const r2 = (n: number): number => Math.round(n * 100) / 100;
export const RAD = Math.PI / 180;
/** Angle in −180…180. */
export const norm = (a: number): number => ((((a + 180) % 360) + 360) % 360) - 180;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Attributes as a string; values are escaped, `undefined`/`false` dropped. */
export function attrs(a: Record<string, string | number | boolean | undefined> = {}): string {
  return Object.entries(a)
    .filter(([, v]) => v !== undefined && v !== false)
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(String(v))}"`))
    .join('');
}

export class Painter {
  b: Bounds = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };

  ext(x0: number, y0: number, x1: number, y1: number): void {
    this.b.x0 = Math.min(this.b.x0, x0, x1);
    this.b.x1 = Math.max(this.b.x1, x0, x1);
    this.b.y0 = Math.min(this.b.y0, y0, y1);
    this.b.y1 = Math.max(this.b.y1, y0, y1);
  }

  rect(x: number, y: number, w: number, h: number, cls: string, rx = 0, a: Record<string, string | number | boolean | undefined> = {}): string {
    this.ext(x, y, x + w, y + h);
    return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" rx="${r2(rx)}" class="${cls}"${attrs(a)}/>`;
  }

  /** Cylinder shading over a rect (gradient defined once in the panel's <defs>). */
  shade(x: number, y: number, w: number, h: number, rx = 0): string {
    return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" rx="${r2(rx)}" class="cyl"/>`;
  }

  circ(cx: number, cy: number, r: number, cls: string, a: Record<string, string | number | boolean | undefined> = {}): string {
    this.ext(cx - r, cy - r, cx + r, cy + r);
    return `<circle cx="${r2(cx)}" cy="${r2(cy)}" r="${r2(r)}" class="${cls}"${attrs(a)}/>`;
  }

  /** Centred text (no bounds: labels sit on parts that already count). */
  text(x: number, y: number, s: string, size: number, cls: string, a: Record<string, string | number | boolean | undefined> = {}): string {
    return `<text x="${r2(x)}" y="${r2(y)}" font-size="${r2(size)}" class="${cls}" text-anchor="middle" dy=".36em"${attrs(a)}>${esc(s)}</text>`;
  }

  /** Section of a cylinder seen from the side: a trapezoid from diameter dRear at yRear to dFront at yFront. */
  trap(cx: number, yRear: number, yFront: number, dRear: number, dFront: number, cls: string, a: Record<string, string | number | boolean | undefined> = {}): string {
    this.ext(cx - Math.max(dRear, dFront) / 2, yFront, cx + Math.max(dRear, dFront) / 2, yRear);
    const d = `M${r2(cx - dRear / 2)},${r2(yRear)}L${r2(cx - dFront / 2)},${r2(yFront)}L${r2(cx + dFront / 2)},${r2(yFront)}L${r2(cx + dRear / 2)},${r2(yRear)}Z`;
    return `<path d="${d}" class="${cls}"${attrs(a)}/><path d="${d}" class="cyl"/>`;
  }

  path(d: string, cls: string, a: Record<string, string | number | boolean | undefined> = {}): string {
    return `<path d="${d}" class="${cls}"${attrs(a)}/>`;
  }
}

/** Lightning bolt, h tall, top at (x, y). */
export function flashIcon(x: number, y: number, h: number, cls: string): string {
  const k = h / 10;
  const pts = [[1, 0], [-3, 5.6], [-0.3, 5.6], [-1.6, 10], [3, 3.6], [0.4, 3.6], [1.8, 0]]
    .map(([a, b]) => `${r2(x + a * k)},${r2(y + b * k)}`)
    .join(' ');
  return `<polygon points="${pts}" class="${cls}"/>`;
}

/** Index triangle pointing at a dial or ring from behind (towards −y), tip at (x, y). */
export function indexMark(x: number, y: number, size = 1.5): string {
  return `<polygon points="${r2(x - size)},${r2(y + size * 1.7)} ${r2(x + size)},${r2(y + size * 1.7)} ${r2(x)},${r2(y)}" class="acc"/>`;
}

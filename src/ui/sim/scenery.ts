// One backdrop per light situation, so a beginner can see what kind of light the preset means:
// sunny garden, overcast, dusk, office, living room, night street, candle-lit table.
// Each scenery draws two layers. The backdrop (sky or wall, horizon strip, ground) is "infinitely"
// far; the scenery proper (house, desk, sofa …) stands at the background element's distance and is
// drawn in metres, so it scales with focal length, sensor and distance like the persons do.
// Colours are what a correctly exposed photo would show: a night street stays dark with bright lamps.

import type { DerivedElement } from '../../model/derive';
import { CAMERA_HEIGHT_M, projection } from './projection';

export interface Scenery {
  /** Shows through where blur fades the layers out at the frame edges. */
  frameColor: string;
  backdrop: (bg: DerivedElement, W: number, H: number) => string;
  scenery: (el: DerivedElement, W: number, H: number) => string;
  /** The backdrop is a room's walls, not the sky (named so in the caption). */
  indoor?: boolean;
  /** The object the autofocus frame sits on: lateral centre, centre height and frame size (metres). */
  afTarget: { lateralM: number; heightM: number; sizeM: number };
}

/** Metre → pixel helpers at an element's distance. */
function geom(el: DerivedElement, W: number, H: number) {
  const { perM, groundY } = projection(el, W, H);
  return {
    perM,
    groundY,
    x: (lateralM: number) => W / 2 + lateralM * perM,
    y: (heightM: number) => groundY - heightM * perM,
    px: (m: number) => m * perM,
  };
}
type Geom = ReturnType<typeof geom>;

/** Below this many pixels per brick course the texture would be sub-pixel noise (and slow); draw flat. */
const MIN_TEXTURE_PX = 1.5;
const CEILING_M = 2.8;

// ---- outdoors ----

interface OutdoorColors {
  skyTop: string;
  skyBottom: string;
  /** Extra stops between top and bottom (offset, colour), for dusk. */
  skyMid?: [number, string][];
  farGround: string;
  nearGround: string;
}

function outdoorBackdrop(c: OutdoorColors, between: (W: number, H: number) => string) {
  return (bg: DerivedElement, W: number, H: number): string => {
    const { groundY } = geom(bg, W, H);
    const mid = (c.skyMid ?? []).map(([o, col]) => `<stop offset="${o}" stop-color="${col}"/>`).join('');
    return `
      <defs><linearGradient id="sc-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c.skyTop}"/>${mid}<stop offset="1" stop-color="${c.skyBottom}"/></linearGradient></defs>
      <rect width="${W}" height="${H / 2 + 1}" fill="url(#sc-sky)"/>
      ${between(W, H)}
      <rect fill="${c.farGround}" y="${H / 2}" width="${W}" height="${Math.max(0, groundY - H / 2)}"/>
      <rect fill="${c.nearGround}" y="${groundY}" width="${W}" height="${Math.max(0, H - groundY)}"/>`;
  };
}

const sun = (W: number, H: number, color: string, cy = H * 0.16) =>
  `<circle fill="${color}" cx="${W * 0.82}" cy="${cy}" r="${H * 0.06}"/>`;

/** Fluffy clusters at fixed screen positions (the sky is at infinity, like the sun). */
function clouds(W: number, H: number, color: string, opacity: number, dark = false): string {
  const rows: [number, number, number][] = dark
    ? [[0.1, 0.06, 1.3], [0.42, 0.1, 1.6], [0.78, 0.05, 1.4], [0.25, 0.22, 1.1], [0.62, 0.26, 1.2], [0.95, 0.2, 1]]
    : [[0.15, 0.14, 1], [0.5, 0.09, 1.3], [0.85, 0.18, 0.9]];
  const cluster = ([fx, fy, s]: [number, number, number]) => {
    const r = H * 0.05 * s;
    const cx = W * fx, cy = H * fy;
    return `<ellipse cx="${cx}" cy="${cy}" rx="${r * 2.2}" ry="${r * 0.9}"/>
      <circle cx="${cx - r * 0.9}" cy="${cy - r * 0.3}" r="${r * 0.9}"/>
      <circle cx="${cx + r * 0.4}" cy="${cy - r * 0.6}" r="${r * 1.1}"/>`;
  };
  return `<g fill="${color}" opacity="${opacity}">${rows.map(cluster).join('')}</g>`;
}

interface GardenColors {
  trunk: string;
  crown: string;
  wall: string;
  mortar: string;
  roof: string;
  tile: string;
  window: string;
  frame: string;
  door: string;
}

/** Trees (height, lateral position) and a brick house, all standing at the background distance. */
function garden(c: GardenColors) {
  return (el: DerivedElement, W: number, H: number): string => {
    const g = geom(el, W, H);
    const { x, y, px, groundY } = g;
    const trees: [number, number][] = [
      [11, -14], [9, -9.5], [12, -5.5], [10, 9], [13, 13.5], [8, 18], [12, -20], [10, 23],
    ];
    const tree = ([h, lat]: [number, number]) =>
      `<rect fill="${c.trunk}" x="${x(lat) - px(0.25)}" y="${y(h * 0.35)}" width="${px(0.5)}" height="${px(h * 0.35)}"/>
       <ellipse fill="${c.crown}" cx="${x(lat)}" cy="${y(h * 0.62)}" rx="${px(h * 0.24)}" ry="${px(h * 0.38)}"/>`;

    const hx = x(1.5);
    const wallX = hx - px(4);
    const wallY = y(5);
    const roofTop = y(8.5);
    // Real-world brick: 24 cm long, 7.5 cm per course incl. 1 cm mortar. Roof tiles: 30 cm rows.
    const course = px(0.075);
    const textured = course >= MIN_TEXTURE_PX;
    const mortar = Math.max(0.5, px(0.012));
    const brickW = px(0.24);
    const defs = textured
      ? `<pattern id="sc-bricks" patternUnits="userSpaceOnUse" x="${wallX}" y="${groundY}" width="${brickW}" height="${2 * course}">
           <path stroke="${c.mortar}" fill="none" stroke-width="${mortar}" d="M0,0 H${brickW} M0,${course} H${brickW} M0,0 V${course} M${brickW / 2},${course} V${2 * course}"/>
         </pattern>
         <pattern id="sc-tiles" patternUnits="userSpaceOnUse" x="${wallX}" y="${roofTop}" width="${px(0.3)}" height="${px(0.3)}">
           <path stroke="${c.tile}" fill="none" stroke-width="${mortar * 1.5}" d="M0,${px(0.3)} H${px(0.3)} M${px(0.15)},0 V${px(0.3)}"/>
         </pattern>`
      : '';
    const roofPts = `${hx - px(4.6)},${wallY} ${hx},${roofTop} ${hx + px(4.6)},${wallY}`;
    const win = (wx: number) => {
      const s = px(1.4);
      const top = y(3.8);
      return `<rect fill="${c.window}" x="${wx}" y="${top}" width="${s}" height="${s}"/>
        <path stroke="${c.frame}" fill="none" stroke-width="${Math.max(0.5, px(0.06))}" d="M${wx},${top} h${s} v${s} h${-s} Z M${wx + s / 2},${top} v${s} M${wx},${top + s / 2} h${s}"/>`;
    };
    const house = `
      <rect fill="${c.wall}" x="${wallX}" y="${wallY}" width="${px(8)}" height="${px(5)}"/>
      ${textured ? `<rect fill="url(#sc-bricks)" x="${wallX}" y="${wallY}" width="${px(8)}" height="${px(5)}"/>` : ''}
      <polygon fill="${c.roof}" points="${roofPts}"/>
      ${textured ? `<polygon fill="url(#sc-tiles)" points="${roofPts}"/>` : ''}
      ${win(hx - px(2.8))}${win(hx + px(1.4))}
      <rect fill="${c.door}" x="${hx - px(0.6)}" y="${y(2.2)}" width="${px(1.2)}" height="${px(2.2)}"/>`;
    return `<defs>${defs}</defs>${trees.map(tree).join('')}${house}`;
  };
}

const HOUSE_AF = { lateralM: 1.5, heightM: 4.5, sizeM: 7 };

const DAY_GARDEN: GardenColors = {
  trunk: '#7a5230', crown: '#3f7d3a', wall: '#b5603a', mortar: '#e6d9c6', roof: '#5a4a48',
  tile: '#3a2f2e', window: '#6fa3c9', frame: '#f4f1ea', door: '#7a5230',
};

// ---- indoors ----

interface RoomColors {
  ceiling: string;
  wall: string;
  floor: string;
}

/**
 * Ceiling, back wall and floor. The wall stands at the background distance, so its top and bottom
 * edges move with it; ceiling and floor run from there towards the camera.
 */
function roomBackdrop(c: RoomColors, extra: (g: Geom, W: number, H: number) => string = () => '') {
  return (bg: DerivedElement, W: number, H: number): string => {
    const g = geom(bg, W, H);
    const ceilY = g.y(CEILING_M);
    return `
      <rect fill="${c.ceiling}" width="${W}" height="${Math.max(0, ceilY)}"/>
      <rect fill="${c.wall}" y="${ceilY}" width="${W}" height="${Math.max(0, g.groundY - ceilY)}"/>
      <rect fill="${c.floor}" y="${g.groundY}" width="${W}" height="${Math.max(0, H - g.groundY)}"/>
      ${extra(g, W, H)}`;
  };
}

/** Rows of ceiling light panels receding from the camera to the back wall (two columns). */
function ceilingPanels(g: Geom, W: number, H: number, color: string): string {
  const parts: string[] = [];
  const drop = CEILING_M - CAMERA_HEIGHT_M;
  // Each row is 1.6× closer than the previous: the same panel spacing seen in perspective.
  for (let k = 1, n = 0; n < 12; k *= 1.6, n++) {
    const perM = g.perM * k;
    const yc = H / 2 - drop * perM;
    if (yc < -perM) break;
    const w = 1.2 * perM, h = Math.max(1, 0.6 * perM * 0.3);
    for (const lat of [-1.6, 1.6]) {
      parts.push(`<rect fill="${color}" x="${W / 2 + lat * perM - w / 2}" y="${yc - h}" width="${w}" height="${h}" rx="${h / 3}"/>`);
    }
  }
  return parts.join('');
}

/** Radial glow around a light source; opacity falls off to the rim. (A gradient needs no <defs>.) */
const glow = (id: string, color: string, cx: number, cy: number, r: number, opacity: number) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/>
     <stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>
   <circle fill="url(#${id})" cx="${cx}" cy="${cy}" r="${r}"/>`;

function office(el: DerivedElement, W: number, H: number): string {
  const { x, y, px } = geom(el, W, H);
  const stroke = Math.max(0.5, px(0.03));
  const whiteboard = `
    <rect fill="#f7f7f5" stroke="#b8bcc2" stroke-width="${stroke}" x="${x(-3.4)}" y="${y(2.2)}" width="${px(2.2)}" height="${px(1.2)}"/>
    <path stroke="#3b5bdb" fill="none" stroke-width="${stroke}" stroke-linecap="round"
      d="M${x(-3.2)},${y(1.9)} h${px(1.2)} M${x(-3.2)},${y(1.7)} h${px(0.8)} M${x(-3.2)},${y(1.5)} h${px(1.5)}"/>
    <path stroke="#e03131" fill="none" stroke-width="${stroke}" d="M${x(-1.9)},${y(1.95)} l${px(0.5)},${px(0.35)} l${px(-0.5)},${px(0.3)}"/>`;
  const plant = `
    <rect fill="#8d6e4c" x="${x(-1.0)}" y="${y(0.4)}" width="${px(0.4)}" height="${px(0.4)}"/>
    <ellipse fill="#4c9a3f" cx="${x(-0.8)}" cy="${y(0.85)}" rx="${px(0.45)}" ry="${px(0.5)}"/>
    <ellipse fill="#3e8a35" cx="${x(-0.95)}" cy="${y(1.1)}" rx="${px(0.3)}" ry="${px(0.4)}"/>`;
  const chair = `
    <rect fill="#2f3b4e" x="${x(0.95)}" y="${y(1.2)}" width="${px(0.55)}" height="${px(0.7)}" rx="${px(0.08)}"/>
    <rect fill="#3a3f47" x="${x(1.205)}" y="${y(0.5)}" width="${px(0.04)}" height="${px(0.5)}"/>`;
  const desk = `
    <rect fill="#d8c7a9" x="${x(0.4)}" y="${y(0.75)}" width="${px(1.6)}" height="${px(0.05)}"/>
    <rect fill="#9aa0a8" x="${x(0.5)}" y="${y(0.7)}" width="${px(0.05)}" height="${px(0.7)}"/>
    <rect fill="#9aa0a8" x="${x(1.85)}" y="${y(0.7)}" width="${px(0.05)}" height="${px(0.7)}"/>
    <rect fill="#2b2f36" x="${x(0.93)}" y="${y(1.16)}" width="${px(0.6)}" height="${px(0.36)}" rx="${px(0.02)}"/>
    <rect fill="#dbe9ff" x="${x(0.955)}" y="${y(1.135)}" width="${px(0.55)}" height="${px(0.31)}"/>
    <rect fill="#2b2f36" x="${x(1.2)}" y="${y(0.8)}" width="${px(0.06)}" height="${px(0.06)}"/>
    <rect fill="#2b2f36" x="${x(1.08)}" y="${y(0.77)}" width="${px(0.3)}" height="${px(0.02)}"/>
    <rect fill="#e9ecef" x="${x(1.6)}" y="${y(0.77)}" width="${px(0.3)}" height="${px(0.02)}"/>`;
  return whiteboard + plant + chair + desk;
}

function livingRoom(el: DerivedElement, W: number, H: number): string {
  const { x, y, px } = geom(el, W, H);
  const stroke = Math.max(0.5, px(0.04));
  const win = `
    <rect fill="#1a2742" stroke="#f1e9dc" stroke-width="${stroke}" x="${x(-3.0)}" y="${y(2.3)}" width="${px(1.4)}" height="${px(1.3)}"/>
    <path stroke="#f1e9dc" fill="none" stroke-width="${stroke}" d="M${x(-2.3)},${y(2.3)} v${px(1.3)} M${x(-3.0)},${y(1.65)} h${px(1.4)}"/>
    <rect fill="#a8564a" x="${x(-3.25)}" y="${y(2.4)}" width="${px(0.35)}" height="${px(1.6)}"/>
    <rect fill="#a8564a" x="${x(-1.7)}" y="${y(2.4)}" width="${px(0.35)}" height="${px(1.6)}"/>`;
  const picture = `
    <rect fill="#3d2b1f" x="${x(0.4)}" y="${y(2.1)}" width="${px(0.9)}" height="${px(0.65)}"/>
    <rect fill="#7fa7d9" x="${x(0.47)}" y="${y(2.03)}" width="${px(0.76)}" height="${px(0.3)}"/>
    <rect fill="#5f8f4a" x="${x(0.47)}" y="${y(1.73)}" width="${px(0.76)}" height="${px(0.21)}"/>`;
  const sofa = `
    <rect fill="#6b7f3a" x="${x(-0.1)}" y="${y(0.95)}" width="${px(2.0)}" height="${px(0.6)}" rx="${px(0.08)}"/>
    <rect fill="#7c9245" x="${x(-0.1)}" y="${y(0.5)}" width="${px(2.0)}" height="${px(0.5)}" rx="${px(0.06)}"/>
    <rect fill="#6b7f3a" x="${x(-0.25)}" y="${y(0.7)}" width="${px(0.3)}" height="${px(0.7)}" rx="${px(0.1)}"/>
    <rect fill="#6b7f3a" x="${x(1.75)}" y="${y(0.7)}" width="${px(0.3)}" height="${px(0.7)}" rx="${px(0.1)}"/>
    <rect fill="#d9a441" x="${x(0.15)}" y="${y(0.9)}" width="${px(0.45)}" height="${px(0.4)}" rx="${px(0.06)}"/>
    <rect fill="#c25b4e" x="${x(1.2)}" y="${y(0.9)}" width="${px(0.45)}" height="${px(0.4)}" rx="${px(0.06)}"/>`;
  const lampX = x(2.7);
  const lamp = `
    ${glow('sc-lamp', '#ffd98a', lampX, y(1.75), px(1.4), 0.55)}
    <rect fill="#5c5c5c" x="${lampX - px(0.02)}" y="${y(1.7)}" width="${px(0.04)}" height="${px(1.7)}"/>
    <ellipse fill="#5c5c5c" cx="${lampX}" cy="${y(0)}" rx="${px(0.18)}" ry="${px(0.04)}"/>
    <polygon fill="#f5d99b" points="${lampX - px(0.15)},${y(2.0)} ${lampX + px(0.15)},${y(2.0)} ${lampX + px(0.25)},${y(1.65)} ${lampX - px(0.25)},${y(1.65)}"/>`;
  return win + picture + sofa + lamp;
}

function nightStreet(el: DerivedElement, W: number, H: number): string {
  const { x, y, px } = geom(el, W, H);
  // Blocks (left edge, width, height); windows every 3 m with a deterministic mix of lit and dark.
  const blocks: [number, number, number][] = [[-15, 9, 13], [-4.5, 10, 11], [7, 9, 16]];
  const building = ([left, w, h]: [number, number, number], b: number) => {
    let wins = '';
    for (let col = 0; col * 3 + 2.4 < w; col++) {
      for (let row = 0; row * 3 + 3.1 < h; row++) {
        const lit = (col * 7 + row * 5 + b * 3) % 5 < 2;
        wins += `<rect fill="${lit ? '#ffd27a' : '#232a38'}" x="${x(left + 1.0 + col * 3)}" y="${y(row * 3 + 3.1)}" width="${px(1.2)}" height="${px(1.6)}"/>`;
      }
    }
    return `<rect fill="#171c27" x="${x(left)}" y="${y(h)}" width="${px(w)}" height="${px(h)}"/>${wins}`;
  };
  const lamp = (lat: number, id: string) => {
    const lx = x(lat);
    return `${glow(id, '#fff1b8', lx, y(4.8), px(3), 0.85)}
      <rect fill="#4a4f58" x="${lx - px(0.08)}" y="${y(5)}" width="${px(0.16)}" height="${px(5)}"/>
      <rect fill="#fff6d0" x="${lx - px(0.3)}" y="${y(5.1)}" width="${px(0.6)}" height="${px(0.35)}" rx="${px(0.08)}"/>`;
  };
  return blocks.map(building).join('') + lamp(-5, 'sc-lamp-l') + lamp(5, 'sc-lamp-r');
}

function candleTable(el: DerivedElement, W: number, H: number): string {
  const { x, y, px } = geom(el, W, H);
  const table = `
    <rect fill="#4a3324" x="${x(-0.1)}" y="${y(0.75)}" width="${px(1.2)}" height="${px(0.05)}"/>
    <rect fill="#3a281c" x="${x(0.0)}" y="${y(0.7)}" width="${px(0.06)}" height="${px(0.7)}"/>
    <rect fill="#3a281c" x="${x(0.94)}" y="${y(0.7)}" width="${px(0.06)}" height="${px(0.7)}"/>
    <rect fill="#8c4a5c" x="${x(0.35)}" y="${y(0.87)}" width="${px(0.3)}" height="${px(0.12)}" rx="${px(0.02)}"/>
    <rect fill="#e8c6cf" x="${x(0.35)}" y="${y(0.87)}" width="${px(0.3)}" height="${px(0.03)}"/>`;
  const candle = (lat: number, i: number) => {
    const cx = x(lat), top = y(0.99);
    return `${glow(`sc-candle-${i}`, '#ffb24d', cx, top, px(0.7), 0.75)}
      <rect fill="#f3e9d2" x="${cx - px(0.012)}" y="${top}" width="${px(0.024)}" height="${px(0.12)}"/>
      <ellipse fill="#ffd86b" cx="${cx}" cy="${top - px(0.03)}" rx="${px(0.018)}" ry="${px(0.035)}"/>
      <ellipse fill="#fff4c2" cx="${cx}" cy="${top - px(0.022)}" rx="${px(0.008)}" ry="${px(0.018)}"/>`;
  };
  return table + [0.42, 0.5, 0.58].map((lat, i) => candle(lat, i)).join('');
}

// ---- the sceneries, keyed by light preset ----

const SCENERIES: Record<string, Scenery> = {
  sun: {
    frameColor: '#cfe5f5',
    backdrop: outdoorBackdrop(
      { skyTop: '#5b9bd5', skyBottom: '#cfe5f5', farGround: '#8fbf6a', nearGround: '#74a854' },
      (W, H) => sun(W, H, '#ffe066'),
    ),
    scenery: garden(DAY_GARDEN),
    afTarget: HOUSE_AF,
  },
  cloudy: {
    frameColor: '#d9dee3',
    backdrop: outdoorBackdrop(
      { skyTop: '#8c9bab', skyBottom: '#d9dee3', farGround: '#86b068', nearGround: '#6f9a52' },
      (W, H) => clouds(W, H, '#eef1f4', 0.95),
    ),
    scenery: garden({ ...DAY_GARDEN, crown: '#4a7a45', window: '#8aa6bd' }),
    afTarget: HOUSE_AF,
  },
  shade: {
    frameColor: '#a8b0b8',
    backdrop: outdoorBackdrop(
      { skyTop: '#6b7682', skyBottom: '#a8b0b8', farGround: '#6f9553', nearGround: '#5c7f45' },
      (W, H) => clouds(W, H, '#5c6670', 0.9, true),
    ),
    scenery: garden({ ...DAY_GARDEN, crown: '#3a6436', trunk: '#5e3f25', wall: '#9a5232', window: '#7a909f' }),
    afTarget: HOUSE_AF,
  },
  dusk: {
    frameColor: '#f6a24b',
    backdrop: outdoorBackdrop(
      {
        skyTop: '#2b2d5e',
        skyMid: [[0.55, '#c2607a']],
        skyBottom: '#f6a24b',
        farGround: '#5f7f48',
        nearGround: '#4e6c3c',
      },
      // Sun sitting on the horizon; the ground strip covers its lower half.
      (W, H) => sun(W, H, '#ffb347', H / 2),
    ),
    scenery: garden({
      trunk: '#4a3220', crown: '#2e4a2a', wall: '#7a4530', mortar: '#9c8a74', roof: '#3a302e',
      tile: '#2a2221', window: '#ffd66b', frame: '#d9d2c4', door: '#4a3220',
    }),
    afTarget: HOUSE_AF,
  },
  office: {
    indoor: true,
    frameColor: '#eceff1',
    backdrop: roomBackdrop({ ceiling: '#dfe3e8', wall: '#eceff1', floor: '#8d98a8' }, (g, W, H) =>
      ceilingPanels(g, W, H, '#fbfdff'),
    ),
    scenery: office,
    afTarget: { lateralM: 1.23, heightM: 1.0, sizeM: 1.2 },
  },
  livingRoom: {
    indoor: true,
    frameColor: '#e8d9c0',
    backdrop: roomBackdrop({ ceiling: '#d8ccb8', wall: '#e8d9c0', floor: '#9b6b43' }),
    scenery: livingRoom,
    afTarget: { lateralM: 0.9, heightM: 0.7, sizeM: 1.6 },
  },
  nightStreet: {
    frameColor: '#1c2a4a',
    backdrop: outdoorBackdrop(
      { skyTop: '#0b1630', skyBottom: '#1c2a4a', farGround: '#3a3d44', nearGround: '#2a2c31' },
      (W, H) => `
        <circle fill="#f4f1d6" cx="${W * 0.8}" cy="${H * 0.14}" r="${H * 0.045}"/>
        <g fill="#ffffff" opacity="0.8">${[[0.08, 0.1], [0.2, 0.22], [0.33, 0.07], [0.47, 0.17], [0.6, 0.05], [0.7, 0.26], [0.92, 0.3], [0.15, 0.35], [0.55, 0.32]]
          .map(([fx, fy]) => `<circle cx="${W * fx}" cy="${H * fy}" r="${Math.max(0.6, H * 0.004)}"/>`)
          .join('')}</g>`,
    ),
    scenery: nightStreet,
    afTarget: { lateralM: 0.5, heightM: 5.5, sizeM: 9 },
  },
  candle: {
    indoor: true,
    frameColor: '#4a3424',
    backdrop: roomBackdrop({ ceiling: '#33231a', wall: '#4a3424', floor: '#2e1f16' }),
    scenery: candleTable,
    afTarget: { lateralM: 0.5, heightM: 0.9, sizeM: 0.6 },
  },
};

export function sceneryFor(lightPresetId: string): Scenery {
  return SCENERIES[lightPresetId] ?? SCENERIES.sun;
}

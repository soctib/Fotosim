// Simulated camera image: sky/ground, background scenery and the persons as
// separate layers, each with its own blur and brightness from derive().
// Scenery and persons are stacked by distance, so nearer things cover farther ones. Noise overlay and
// directional shake blur on top. Layout uses each element's projected scale
// (heightFractionPerM), so framing follows focal length and sensor.

import { de as t, fill } from '../../data/texts.de';
import type { Derived, DerivedElement } from '../../model/derive';
import { formatAperture, formatShutter } from '../../model/stops';
import type { ElementId } from '../../model/types';
import { focusOn, setAutofocus, setInfo } from '../../state/actions';
import { FACE_DEPTH_M } from '../face';
import type { Store } from '../../state/store';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Scene composition (metres). Camera is level, so the horizon sits mid-frame.
const CAMERA_HEIGHT_M = 1.6;
const LATERAL_M: Record<ElementId, number> = { person1: -0.35, person2: 0.55, background: 0 };
/** Closer than this, the photographer aims at the person: the sideways offset shrinks (quadratically). */
const AIM_DISTANCE_M = 3;

/** CSS blur takes a Gaussian sigma; the blur disc diameter is roughly 2 sigma. */
const SIGMA_PER_DISC = 0.5;
const MAX_BLUR_PX = 60;
/** How long the AF frame stays visible after a one-shot tap-to-focus (matches the CSS animation). */
const AF_FLASH_MS = 900;

export function mountSim(root: HTMLElement, store: Store): void {
  root.classList.add('sim');
  root.innerHTML = `
    <div class="sim-frame" role="img" aria-label="${t.sim.title}">
      <svg class="layer" data-layer="sky" xmlns="${SVG_NS}"></svg>
      <svg class="layer" data-layer="background" xmlns="${SVG_NS}"></svg>
      <svg class="layer" data-layer="person2" xmlns="${SVG_NS}"></svg>
      <svg class="layer" data-layer="person1" xmlns="${SVG_NS}"></svg>
      <svg class="noise" xmlns="${SVG_NS}" aria-hidden="true">
        <filter id="sim-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
          <!-- grey from the red channel, opaque, then stretched for contrast -->
          <feColorMatrix type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1"/>
          <feComponentTransfer>
            <feFuncR type="linear" slope="4" intercept="-1.5"/><feFuncG type="linear" slope="4" intercept="-1.5"/>
            <feFuncB type="linear" slope="4" intercept="-1.5"/>
          </feComponentTransfer>
        </filter>
        <rect width="100%" height="100%" filter="url(#sim-noise)"/>
      </svg>
      <svg class="af-overlay" xmlns="${SVG_NS}" aria-hidden="true"></svg>
    </div>
    <svg width="0" height="0" aria-hidden="true" style="position:absolute">
      <filter id="sim-shake" x="-10%" width="120%"><feGaussianBlur stdDeviation="0 0"/></filter>
    </svg>
    <p class="sim-caption"></p>`;

  const frame = root.querySelector<HTMLElement>('.sim-frame')!;
  const noise = root.querySelector<SVGSVGElement>('.noise')!;
  const shake = root.querySelector<SVGFEGaussianBlurElement>('#sim-shake feGaussianBlur')!;
  const caption = root.querySelector<HTMLElement>('.sim-caption')!;
  const layer = (id: ElementId | 'sky') => root.querySelector<SVGSVGElement>(`[data-layer="${id}"]`)!;

  const afOverlay = root.querySelector<SVGSVGElement>('.af-overlay')!;

  // Tap-to-focus: tapping a person or the house focuses on it once. Only if focus tracking
  // was switched on explicitly does the tap move the tracked target. Anything else explains the image.
  let tapped: { id: ElementId; at: number } | null = null;
  frame.addEventListener('click', (e) => {
    const id = (e.target as Element).closest<SVGElement>('[data-layer]')?.dataset.layer;
    if (id !== 'person1' && id !== 'person2' && id !== 'background') return setInfo(store, 'sim');
    if (store.derived().settings.afTarget !== null) {
      setAutofocus(store, id);
      setInfo(store, 'autofocus');
    } else {
      tapped = { id, at: performance.now() };
      focusOn(store, id);
      setInfo(store, 'focus');
    }
  });

  let width = 0;
  let last: Derived | null = null;

  function render(d: Derived): void {
    last = d;
    frame.style.aspectRatio = `${d.sensor.widthMm} / ${d.sensor.heightMm}`;
    const W = frame.clientWidth;
    const H = (W * d.sensor.heightMm) / d.sensor.widthMm;
    if (!W) return;

    const sigmaAt = (m: number) => Math.min(MAX_BLUR_PX, d.blurFractionAt(m) * W * SIGMA_PER_DISC);
    const brightness = (el: DerivedElement) =>
      `brightness(${Math.min(8, Math.max(0.03, 2 ** el.exposureOffsetStops)).toFixed(3)})`;
    const filterFor = (el: DerivedElement) =>
      `blur(${Math.min(MAX_BLUR_PX, el.blurFractionOfWidth * W * SIGMA_PER_DISC).toFixed(2)}px) ${brightness(el)}`;

    // Sky and open ground are always furthest back; they share the background's blur and light.
    const bg = d.elements.find((e) => e.id === 'background')!;
    const sky = layer('sky');
    sky.setAttribute('viewBox', `0 0 ${W} ${H}`);
    sky.innerHTML = drawSky(bg, W, H);
    sky.style.filter = filterFor(bg);
    sky.style.zIndex = '0';

    // Far to near: a person behind the house disappears behind it.
    const byDistance = [...d.elements].sort((a, b) => b.distanceM - a.distanceM);
    byDistance.forEach((el, i) => {
      const svg = layer(el.id);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.style.display = el.visible ? '' : 'none';
      svg.style.zIndex = String(i + 1);
      if (el.id === 'background') {
        svg.innerHTML = drawScenery(el, W, H);
        svg.style.filter = filterFor(el);
      } else {
        // Persons blur per part (nose, face, ears sit at different distances), so the layer only gets the light.
        svg.innerHTML = drawPerson(el, W, H, (dm) => sigmaAt(el.distanceM + dm));
        svg.style.filter = brightness(el);
      }
    });

    afOverlay.setAttribute('viewBox', `0 0 ${W} ${H}`);
    // Tracking: steady frame on the target. One-shot tap: the frame flashes briefly, then fades.
    const tracked = d.elements.find((e) => e.id === d.settings.afTarget && e.visible);
    const sinceTap = tapped ? performance.now() - tapped.at : Infinity;
    const flashed = sinceTap < AF_FLASH_MS ? d.elements.find((e) => e.id === tapped!.id) : undefined;
    afOverlay.innerHTML = tracked
      ? drawAfFrame(tracked, W, H)
      : flashed
        ? `<g class="af-flash" style="animation-delay:-${sinceTap.toFixed(0)}ms">${drawAfFrame(flashed, W, H)}</g>`
        : '';

    // Quadratic so "low" noise stays nearly clean and "very high" is unmistakable.
    noise.style.opacity = Math.min(0.9, d.noise.amount ** 2 * 1.2).toFixed(3);

    // Directional blur once the shutter is slower than the handheld limit.
    const k = d.shake.blurFactor;
    const sigma = k > 1 ? Math.min(30, (k * W) / 1000) : 0;
    shake.setAttribute('stdDeviation', `${sigma.toFixed(2)} 0`);
    frame.style.filter = sigma > 0 ? 'url(#sim-shake)' : '';

    const parts = [
      fill(t.sim.caption, {
        shutter: formatShutter(d.settings.shutterS),
        aperture: formatAperture(d.settings.aperture),
        iso: d.settings.iso,
      }),
    ];
    if (d.shake.cls !== 'safe') parts.push(t.shake[d.shake.cls]);
    caption.textContent = parts.join(' · ');
  }

  store.subscribe((_s, d) => render(d));
  new ResizeObserver(() => {
    if (frame.clientWidth !== width && last) {
      width = frame.clientWidth;
      render(last);
    }
  }).observe(frame);
}

/** Pixels per metre at an element's distance, plus the y of its ground contact. */
function projection(el: DerivedElement, W: number, H: number) {
  const perM = el.heightFractionPerM * H;
  const aim = Math.min(1, (el.distanceM / AIM_DISTANCE_M) ** 2);
  return { perM, groundY: H / 2 + CAMERA_HEIGHT_M * perM, cx: W / 2 + LATERAL_M[el.id] * aim * perM };
}

function drawSky(bg: DerivedElement, W: number, H: number): string {
  const { groundY } = projection(bg, W, H);
  return `
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" class="sky-top"/><stop offset="1" class="sky-bottom"/></linearGradient></defs>
    <rect width="${W}" height="${H / 2 + 1}" fill="url(#sky)"/>
    <circle class="sun" cx="${W * 0.82}" cy="${H * 0.16}" r="${H * 0.06}"/>
    <rect class="far-ground" y="${H / 2}" width="${W}" height="${Math.max(0, groundY - H / 2)}"/>
    <rect class="near-ground" y="${groundY}" width="${W}" height="${Math.max(0, H - groundY)}"/>`;
}

/** Below this many pixels per brick course the texture would be sub-pixel noise (and slow); draw flat. */
const MIN_TEXTURE_PX = 1.5;

function drawScenery(el: DerivedElement, W: number, H: number): string {
  const { perM, groundY } = projection(el, W, H);
  const x = (m: number) => W / 2 + m * perM;
  const px = (m: number) => m * perM;
  // Trees (height, lateral position) and a brick house, all standing at the background distance.
  const trees: [number, number][] = [
    [11, -14], [9, -9.5], [12, -5.5], [10, 9], [13, 13.5], [8, 18], [12, -20], [10, 23],
  ];
  const tree = ([h, lat]: [number, number]) =>
    `<rect class="trunk" x="${x(lat) - px(0.25)}" y="${groundY - px(h * 0.35)}" width="${px(0.5)}" height="${px(h * 0.35)}"/>
     <ellipse class="crown" cx="${x(lat)}" cy="${groundY - px(h * 0.62)}" rx="${px(h * 0.24)}" ry="${px(h * 0.38)}"/>`;

  const hx = x(1.5);
  const wallX = hx - px(4);
  const wallY = groundY - px(5);
  const roofTop = groundY - px(8.5);
  // Real-world brick: 24 cm long, 7.5 cm per course incl. 1 cm mortar. Roof tiles: 30 cm rows.
  const course = px(0.075);
  const textured = course >= MIN_TEXTURE_PX;
  const mortar = Math.max(0.5, px(0.012));
  const brickW = px(0.24);
  const defs = textured
    ? `<pattern id="bricks" patternUnits="userSpaceOnUse" x="${wallX}" y="${groundY}" width="${brickW}" height="${2 * course}">
         <path class="mortar" stroke-width="${mortar}" d="M0,0 H${brickW} M0,${course} H${brickW} M0,0 V${course} M${brickW / 2},${course} V${2 * course}"/>
       </pattern>
       <pattern id="tiles" patternUnits="userSpaceOnUse" x="${wallX}" y="${roofTop}" width="${px(0.3)}" height="${px(0.3)}">
         <path class="tile-line" stroke-width="${mortar * 1.5}" d="M0,${px(0.3)} H${px(0.3)} M${px(0.15)},0 V${px(0.3)}"/>
       </pattern>`
    : '';
  const roofPts = `${hx - px(4.6)},${wallY} ${hx},${roofTop} ${hx + px(4.6)},${wallY}`;
  const win = (wx: number) => {
    const s = px(1.4);
    return `<rect class="window" x="${wx}" y="${groundY - px(3.8)}" width="${s}" height="${s}"/>
      <path class="frame" stroke-width="${Math.max(0.5, px(0.06))}" d="M${wx},${groundY - px(3.8)} h${s} v${s} h${-s} Z M${wx + s / 2},${groundY - px(3.8)} v${s} M${wx},${groundY - px(3.8) + s / 2} h${s}"/>`;
  };
  const house = `
    <rect class="house" x="${wallX}" y="${wallY}" width="${px(8)}" height="${px(5)}"/>
    ${textured ? `<rect fill="url(#bricks)" x="${wallX}" y="${wallY}" width="${px(8)}" height="${px(5)}"/>` : ''}
    <polygon class="roof" points="${roofPts}"/>
    ${textured ? `<polygon fill="url(#tiles)" points="${roofPts}"/>` : ''}
    ${win(hx - px(2.8))}${win(hx + px(1.4))}
    <rect class="door" x="${hx - px(0.6)}" y="${groundY - px(2.2)}" width="${px(1.2)}" height="${px(2.2)}"/>`;
  return `<defs>${defs}</defs>${trees.map(tree).join('')}${house}`;
}

/** Camera-style AF frame (corner brackets) around the face, or the house. */
function drawAfFrame(el: DerivedElement, W: number, H: number): string {
  const { perM, groundY, cx } = projection(el, W, H);
  const isPerson = el.id !== 'background';
  const x = isPerson ? cx : W / 2 + 1.5 * perM; // house centre, see drawScenery
  const y = isPerson ? groundY - 1.63 * perM : groundY - 4.5 * perM;
  const size = Math.min(H * 0.6, Math.max(18, (isPerson ? 0.45 : 7) * perM));
  // Keep the frame inside the image even when the target is huge or at the edge.
  const half = size / 2;
  const fx = Math.min(W - half - 2, Math.max(half + 2, x));
  const fy = Math.min(H - half - 2, Math.max(half + 2, y));
  const c = size * 0.28;
  const l = fx - half, r = fx + half, t = fy - half, b = fy + half;
  return `<path class="af-frame" d="M${l},${t + c} V${t} H${l + c} M${r - c},${t} H${r} V${t + c}
    M${r},${b - c} V${b} H${r - c} M${l + c},${b} H${l} V${b - c}"/>`;
}

/** Iris must be at least this many pixels in radius before the eye is drawn in detail. */
const EYE_DETAIL_MIN_PX = 3;

/**
 * One eye at (x, -165 cm). Close up: white, textured iris, pupil, catchlight and lid line –
 * fine detail to judge sharpness by (the catchlight especially). Far away: just white and iris.
 */
function drawEye(x: number, perM: number): string {
  const y = -165;
  const irisR = 1.0;
  const white = `<ellipse class="sclera" cx="${x}" cy="${y}" rx="2.3" ry="1.45"/>`;
  // Same size from afar, just without the fine detail – no jump when crossing the threshold.
  if (irisR * (perM / 100) < EYE_DETAIL_MIN_PX) return `${white}<circle class="iris eye-simple" cx="${x}" cy="${y}" r="${irisR}"/>`;
  const rays = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    return `M${(x + c * 0.5).toFixed(3)},${(y + s * 0.5).toFixed(3)} L${(x + c * 0.92).toFixed(3)},${(y + s * 0.92).toFixed(3)}`;
  }).join(' ');
  return `<g class="eye-detail">
    ${white}
    <circle class="iris" cx="${x}" cy="${y}" r="${irisR}"/>
    <path class="iris-rays" d="${rays}"/>
    <circle class="limbus" cx="${x}" cy="${y}" r="${irisR - 0.04}"/>
    <circle class="pupil" cx="${x}" cy="${y}" r="0.42"/>
    <circle class="catchlight" cx="${x + 0.32}" cy="${y - 0.34}" r="0.19"/>
    <path class="lid" d="M${x - 2.4},${y + 0.15} Q${x},${y - 2.1} ${x + 2.4},${y + 0.15}"/>
  </g>`;
}

/**
 * Nose (front view). Close up the tip gets fine detail – highlight, nostrils, freckles – so
 * you can tell whether the tip itself is sharp.
 */
function drawNose(perM: number): string {
  const shape = `<path class="nose" d="M0,-165 L-2.4,-158.6 Q0,-157.2 2.4,-158.6 Z"/>`;
  if (perM / 100 < EYE_DETAIL_MIN_PX) return shape;
  const freckles: [number, number][] = [[-1.1, -160.4], [-0.5, -161.6], [0.6, -160.9], [1.2, -159.9], [0.1, -162.6], [-1.5, -159.3]];
  return `${shape}
    <ellipse class="nostril" cx="-0.95" cy="-158.15" rx="0.5" ry="0.26"/>
    <ellipse class="nostril" cx="0.95" cy="-158.15" rx="0.5" ry="0.26"/>
    ${freckles.map(([x, y]) => `<circle class="freckle" cx="${x}" cy="${y}" r="0.13"/>`).join('')}
    <ellipse class="nose-highlight" cx="0.25" cy="-159.3" rx="0.42" ry="0.3"/>`;
}

/**
 * Person facing the camera. Distance = eyes. Nose, face/body and ears each get their own
 * blur from their own distance – with a shallow enough depth of field the nose tip can be
 * sharp while the eyes are not. `sigma(dm)` gives the blur for an offset from the eye plane.
 */
function drawPerson(el: DerivedElement, W: number, H: number, sigma: (dm: number) => number): string {
  const { perM, groundY, cx } = projection(el, W, H);
  const filter = (part: string, dm: number) =>
    `<filter id="${el.id}-${part}" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
       <feGaussianBlur stdDeviation="${sigma(dm).toFixed(2)}"/></filter>`;
  // Drawn in centimetres with the origin at the feet; 175 cm tall. The transform sits on an inner
  // group so each filter works in pixel units.
  const part = (name: string, body: string) =>
    `<g filter="url(#${el.id}-${name})"><g transform="translate(${cx} ${groundY}) scale(${perM / 100})">${body}</g></g>`;
  return `<defs>${filter('ears', FACE_DEPTH_M.ears)}${filter('body', 0)}${filter('nose', FACE_DEPTH_M.noseTip)}</defs>
  <g class="person person-${el.id}">
    ${part('ears', `<ellipse class="ear" cx="-11.6" cy="-163" rx="2.8" ry="4.2"/><ellipse class="ear" cx="11.6" cy="-163" rx="2.8" ry="4.2"/>`)}
    ${part(
      'body',
      `<path class="legs" d="M-15,0 L-12,-88 L12,-88 L15,0 L5,0 L0,-60 L-5,0 Z"/>
       <path class="arm" d="M-21,-140 Q-30,-110 -26,-82" />
       <path class="arm" d="M21,-140 Q30,-110 26,-82" />
       <rect class="shirt" x="-22" y="-146" width="44" height="64" rx="12"/>
       <rect class="skin" x="-4.5" y="-152" width="9" height="8"/>
       <circle class="skin" cx="0" cy="-163" r="11.5"/>
       <path class="hair" d="M-11.8,-163 Q-12,-178 0,-177 Q12,-178 11.8,-163 Q8,-171 0,-171 Q-8,-171 -11.8,-163 Z"/>
       ${drawEye(-4.2, perM)}${drawEye(4.2, perM)}
       <path class="mouth" d="M-3.8,-155.8 Q0,-153 3.8,-155.8"/>`,
    )}
    ${part('nose', drawNose(perM))}
  </g>`;
}

// Simulated camera image: background, person 2, person 1 as separate layers,
// each with its own blur and brightness from derive(). Noise overlay and
// directional shake blur on top. Layout uses each element's projected scale
// (heightFractionPerM), so framing follows focal length and sensor.

import { de as t, fill } from '../../data/texts.de';
import type { Derived, DerivedElement } from '../../model/derive';
import { formatAperture, formatShutter } from '../../model/stops';
import type { ElementId } from '../../model/types';
import { setInfo } from '../../state/actions';
import type { Store } from '../../state/store';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Scene composition (metres). Camera is level, so the horizon sits mid-frame.
const CAMERA_HEIGHT_M = 1.6;
const LATERAL_M: Record<ElementId, number> = { person1: -0.35, person2: 0.55, background: 0 };

/** CSS blur takes a Gaussian sigma; the blur disc diameter is roughly 2 sigma. */
const SIGMA_PER_DISC = 0.5;
const MAX_BLUR_PX = 60;

export function mountSim(root: HTMLElement, store: Store): void {
  root.classList.add('sim');
  root.innerHTML = `
    <div class="sim-frame" role="img" aria-label="${t.sim.title}">
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
    </div>
    <svg width="0" height="0" aria-hidden="true" style="position:absolute">
      <filter id="sim-shake" x="-10%" width="120%"><feGaussianBlur stdDeviation="0 0"/></filter>
    </svg>
    <p class="sim-caption"></p>`;

  const frame = root.querySelector<HTMLElement>('.sim-frame')!;
  const noise = root.querySelector<SVGSVGElement>('.noise')!;
  const shake = root.querySelector<SVGFEGaussianBlurElement>('#sim-shake feGaussianBlur')!;
  const caption = root.querySelector<HTMLElement>('.sim-caption')!;
  const layer = (id: ElementId) => root.querySelector<SVGSVGElement>(`[data-layer="${id}"]`)!;

  frame.addEventListener('click', () => setInfo(store, 'sim'));

  let width = 0;
  let last: Derived | null = null;

  function render(d: Derived): void {
    last = d;
    frame.style.aspectRatio = `${d.sensor.widthMm} / ${d.sensor.heightMm}`;
    const W = frame.clientWidth;
    const H = (W * d.sensor.heightMm) / d.sensor.widthMm;
    if (!W) return;

    for (const el of d.elements) {
      const svg = layer(el.id);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.style.display = el.visible ? '' : 'none';
      svg.innerHTML = el.id === 'background' ? drawBackground(el, W, H) : drawPerson(el, W, H);
      const blur = Math.min(MAX_BLUR_PX, el.blurFractionOfWidth * W * SIGMA_PER_DISC);
      const bright = Math.min(8, Math.max(0.03, 2 ** el.exposureOffsetStops));
      svg.style.filter = `blur(${blur.toFixed(2)}px) brightness(${bright.toFixed(3)})`;
    }

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
  return { perM, groundY: H / 2 + CAMERA_HEIGHT_M * perM, cx: W / 2 + LATERAL_M[el.id] * perM };
}

function drawBackground(el: DerivedElement, W: number, H: number): string {
  const { perM, groundY } = projection(el, W, H);
  const x = (m: number) => W / 2 + m * perM;
  // Trees (height, lateral position) and a house, all standing at the background distance.
  const trees: [number, number][] = [
    [11, -14], [9, -9.5], [12, -5.5], [10, 9], [13, 13.5], [8, 18], [12, -20], [10, 23],
  ];
  const tree = ([h, lat]: [number, number]) =>
    `<rect class="trunk" x="${x(lat) - 0.25 * perM}" y="${groundY - h * 0.35 * perM}" width="${0.5 * perM}" height="${h * 0.35 * perM}"/>
     <ellipse class="crown" cx="${x(lat)}" cy="${groundY - h * 0.62 * perM}" rx="${h * 0.24 * perM}" ry="${h * 0.38 * perM}"/>`;
  const hx = x(1.5);
  const house = `
    <rect class="house" x="${hx - 4 * perM}" y="${groundY - 5 * perM}" width="${8 * perM}" height="${5 * perM}"/>
    <polygon class="roof" points="${hx - 4.6 * perM},${groundY - 5 * perM} ${hx},${groundY - 8.5 * perM} ${hx + 4.6 * perM},${groundY - 5 * perM}"/>
    <rect class="window" x="${hx - 2.8 * perM}" y="${groundY - 3.8 * perM}" width="${1.4 * perM}" height="${1.4 * perM}"/>
    <rect class="window" x="${hx + 1.4 * perM}" y="${groundY - 3.8 * perM}" width="${1.4 * perM}" height="${1.4 * perM}"/>
    <rect class="door" x="${hx - 0.6 * perM}" y="${groundY - 2.2 * perM}" width="${1.2 * perM}" height="${2.2 * perM}"/>`;
  return `
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" class="sky-top"/><stop offset="1" class="sky-bottom"/></linearGradient></defs>
    <rect width="${W}" height="${H / 2 + 1}" fill="url(#sky)"/>
    <circle class="sun" cx="${W * 0.82}" cy="${H * 0.16}" r="${H * 0.06}"/>
    <rect class="far-ground" y="${H / 2}" width="${W}" height="${Math.max(0, groundY - H / 2)}"/>
    <rect class="near-ground" y="${groundY}" width="${W}" height="${Math.max(0, H - groundY)}"/>
    ${trees.map(tree).join('')}${house}`;
}

function drawPerson(el: DerivedElement, W: number, H: number): string {
  const { perM, groundY, cx } = projection(el, W, H);
  // Drawn in centimetres with the origin at the feet; 175 cm tall.
  return `<g class="person person-${el.id}" transform="translate(${cx} ${groundY}) scale(${perM / 100})">
    <path class="legs" d="M-15,0 L-12,-88 L12,-88 L15,0 L5,0 L0,-60 L-5,0 Z"/>
    <path class="arm" d="M-21,-140 Q-30,-110 -26,-82" />
    <path class="arm" d="M21,-140 Q30,-110 26,-82" />
    <rect class="shirt" x="-22" y="-146" width="44" height="64" rx="12"/>
    <rect class="skin" x="-4.5" y="-152" width="9" height="8"/>
    <circle class="skin" cx="0" cy="-163" r="11.5"/>
    <path class="hair" d="M-11.8,-163 Q-12,-178 0,-177 Q12,-178 11.8,-163 Q8,-171 0,-171 Q-8,-171 -11.8,-163 Z"/>
    <circle class="eye" cx="-4.2" cy="-164" r="1.4"/><circle class="eye" cx="4.2" cy="-164" r="1.4"/>
    <path class="mouth" d="M-4,-158 Q0,-155 4,-158"/>
  </g>`;
}

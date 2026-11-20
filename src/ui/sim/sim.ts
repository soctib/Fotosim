// Simulated camera image: sky/ground, background scenery and the persons as
// separate layers, each with its own blur and brightness from derive(). The backdrop and
// scenery follow the light situation (see scenery.ts), so dusk looks like dusk.
// Scenery and persons are stacked by distance, so nearer things cover farther ones. Movement smears
// each layer sideways on its own (persons relative to the photographer); noise overlay and
// directional shake blur on top. Layout uses each element's projected scale
// (heightFractionPerM), so framing follows focal length and sensor.

import { de as t, fill } from '../../data/texts.de';
import type { Derived, DerivedElement } from '../../model/derive';
import { formatAperture, formatShutter } from '../../model/stops';
import { formatNumber } from '../distance';
import type { ElementId } from '../../model/types';
import { focusOn, setAutofocus, setInfo } from '../../state/actions';
import { FACE_DEPTH_M } from '../face';
import { mountLightStepper } from '../lightStepper';
import type { Store } from '../../state/store';
import { projection } from './projection';
import { sceneryFor, type Scenery } from './scenery';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** CSS blur takes a Gaussian sigma; the blur disc diameter is roughly 2 sigma. */
const SIGMA_PER_DISC = 0.5;
/** A sideways smear of length L as a Gaussian: sigma ≈ L/√12 for a box, a bit more so it reads as motion. */
const SIGMA_PER_SMEAR = 0.35;
const MAX_BLUR_PX = 60;
/** Below this sigma (px) a blur filter changes nothing visible – skip it. */
const MIN_VISIBLE_SIGMA = 0.3;
/**
 * Exposure is shown as a brightness factor of 2^stops. The upper bound must be high enough that
 * even the darkest drawn colour (pupils, #111) clips to white – a lower cap freezes the image a
 * few stops over, with the pupils and dark outlines left floating in a white frame.
 *
 * The factor is applied before any blur: blurred edges are stored as 8-bit premultiplied colour,
 * so a dark channel at low alpha rounds to 0 and no factor can lift it – brightening afterwards
 * leaves tinted ghost outlines. Both steps are linear, so the order only matters once colours clip.
 */
const MAX_BRIGHTNESS = 2 ** 6;
const MIN_BRIGHTNESS = 0.03;
/** Grain frequency of the noise overlay at 1× (per display pixel). */
const GRAIN_FREQUENCY = 0.9;
/** Show pixels once one pixel of the file covers this many display pixels (drawn as whole-pixel cells, at least 2). */
const MIN_PIXEL_PX = 1.5;
/** How long the AF frame stays visible after a one-shot tap-to-focus (matches the CSS animation). */
const AF_FLASH_MS = 900;

export function mountSim(root: HTMLElement, store: Store): void {
  root.classList.add('sim');
  root.innerHTML = `
    <div class="sim-frame" role="img" aria-label="${t.sim.title}">
      <div class="sim-image">
        <svg class="layer" data-layer="sky" xmlns="${SVG_NS}"></svg>
        <svg class="layer" data-layer="background" xmlns="${SVG_NS}"></svg>
        <svg class="layer" data-layer="person2" xmlns="${SVG_NS}"></svg>
        <svg class="layer" data-layer="person1" xmlns="${SVG_NS}"></svg>
      </div>
      <svg class="noise" xmlns="${SVG_NS}" aria-hidden="true">
        <filter id="sim-noise">
          <feTurbulence type="fractalNoise" baseFrequency="${GRAIN_FREQUENCY}" numOctaves="2" stitchTiles="stitch"/>
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
      <filter id="sim-move-background" x="-10%" width="120%"><feGaussianBlur stdDeviation="0 0"/></filter>
      <filter id="sim-pixelate" x="0" y="0" width="100%" height="100%">
        <feFlood x="1" y="1" width="1" height="1"/>
        <feComposite width="2" height="2"/>
        <feTile result="samples"/>
        <feComposite in="SourceGraphic" in2="samples" operator="in"/>
        <feMorphology operator="dilate" radius="1"/>
      </filter>
    </svg>
    <div class="sim-footer">
      <p class="sim-caption"></p>
      <div data-role="light-stepper"></div>
    </div>`;

  const frame = root.querySelector<HTMLElement>('.sim-frame')!;
  // Optics and sampling (system blur, shake, pixels) filter the image; grain and the AF frame sit on top.
  const image = root.querySelector<HTMLElement>('.sim-image')!;
  const noise = root.querySelector<SVGSVGElement>('.noise')!;
  const shake = root.querySelector<SVGFEGaussianBlurElement>('#sim-shake feGaussianBlur')!;
  const moveBackground = root.querySelector<SVGFEGaussianBlurElement>('#sim-move-background feGaussianBlur')!;
  const pixelate = root.querySelector<SVGFilterElement>('#sim-pixelate')!;
  const grain = root.querySelector<SVGElement>('#sim-noise feTurbulence')!;
  const caption = root.querySelector<HTMLElement>('.sim-caption')!;
  // Shown in simplified mode only (CSS), where the scene panel is hidden.
  mountLightStepper(root.querySelector<HTMLElement>('[data-role="light-stepper"]')!, store);
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
  let last: { d: Derived; scenery: Scenery } | null = null;

  function render(d: Derived, scenery: Scenery): void {
    last = { d, scenery };
    frame.style.aspectRatio = `${d.sensor.widthMm} / ${d.sensor.heightMm}`;
    const W = frame.clientWidth;
    const H = (W * d.sensor.heightMm) / d.sensor.widthMm;
    if (!W) return;

    // Digital zoom: the layers draw the uncropped photo, enlarged z× around the subject in focus
    // by one transform. Inside it, lengths are in uncropped pixels (they get enlarged with
    // everything else); CSS filters on whole layers act after it, in display pixels.
    const z = d.zoom.factor;
    const uncropped = (el: DerivedElement): DerivedElement =>
      z === 1
        ? el
        : {
            ...el,
            heightFractionPerM: el.heightFractionPerM / z,
            blurFractionOfWidth: el.blurFractionOfWidth / z,
            movementBlurFractionOfWidth: el.movementBlurFractionOfWidth / z,
          };
    const view = cropView(d, scenery, W, H);
    const zoomed = (svg: string) => (z === 1 ? svg : `<g transform="matrix(${z} 0 0 ${z} ${view.tx.toFixed(2)} ${view.ty.toFixed(2)})">${svg}</g>`);

    const sigmaAt = (m: number) => Math.min(MAX_BLUR_PX, (d.blurFractionAt(m) / z) * W * SIGMA_PER_DISC);
    const gain = (el: DerivedElement) => Math.min(MAX_BRIGHTNESS, Math.max(MIN_BRIGHTNESS, 2 ** el.exposureOffsetStops));
    const moveSigma = (el: DerivedElement) => Math.min(MAX_BLUR_PX, el.movementBlurFractionOfWidth * W * SIGMA_PER_SMEAR);

    // Sky (or wall) and open ground are always furthest back; they share the background's blur, smear and light.
    const bg = d.elements.find((e) => e.id === 'background')!;
    const bgMove = moveSigma(bg);
    moveBackground.setAttribute('stdDeviation', `${bgMove.toFixed(2)} 0`);
    const filterFor = (el: DerivedElement) =>
      `brightness(${gain(el).toFixed(3)}) ` +
      `blur(${Math.min(MAX_BLUR_PX, el.blurFractionOfWidth * W * SIGMA_PER_DISC).toFixed(2)}px)` +
      `${bgMove > 0.1 ? ' url(#sim-move-background)' : ''}`;
    const sky = layer('sky');
    sky.setAttribute('viewBox', `0 0 ${W} ${H}`);
    sky.innerHTML = zoomed(scenery.backdrop(uncropped(bg), W, H));
    sky.style.filter = filterFor(bg);
    sky.style.zIndex = '0';
    frame.style.background = scenery.frameColor;

    // Far to near: a person behind the house disappears behind it.
    const byDistance = [...d.elements].sort((a, b) => b.distanceM - a.distanceM);
    byDistance.forEach((el, i) => {
      const svg = layer(el.id);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.style.display = el.visible ? '' : 'none';
      svg.style.zIndex = String(i + 1);
      if (el.id === 'background') {
        svg.innerHTML = zoomed(scenery.scenery(uncropped(el), W, H));
        svg.style.filter = filterFor(el);
      } else {
        // Persons blur per part (nose, face, ears sit at different distances), so the light goes into
        // each part's filter too, ahead of the blur. Movement adds a sideways smear on top of the defocus.
        const move = moveSigma(el) / z;
        svg.innerHTML = zoomed(
          drawPerson(uncropped(el), W, H, z, gain(el), (dm) => {
            const sigma = sigmaAt(el.distanceM + dm);
            return `${Math.min(MAX_BLUR_PX, Math.hypot(sigma, move)).toFixed(2)} ${sigma.toFixed(2)}`;
          }),
        );
        svg.style.filter = '';
      }
    });

    afOverlay.setAttribute('viewBox', `0 0 ${W} ${H}`);
    // Tracking: steady frame on the target. One-shot tap: the frame flashes briefly, then fades.
    const tracked = d.elements.find((e) => e.id === d.settings.afTarget && e.visible);
    const sinceTap = tapped ? performance.now() - tapped.at : Infinity;
    const flashed = sinceTap < AF_FLASH_MS ? d.elements.find((e) => e.id === tapped!.id) : undefined;
    const afFrame = (el: DerivedElement) => drawAfFrame(uncropped(el), scenery.afTarget, W, H, view);
    afOverlay.innerHTML = tracked
      ? afFrame(tracked)
      : flashed
        ? `<g class="af-flash" style="animation-delay:-${sinceTap.toFixed(0)}ms">${afFrame(flashed)}</g>`
        : '';

    // Quadratic so "low" noise stays nearly clean and "very high" is unmistakable.
    noise.style.opacity = Math.min(0.9, d.noise.amount ** 2 * 1.2).toFixed(3);
    // Noise sits in the file's pixels: finer than a display pixel at normal size, enlarged with them once zoomed in.
    const pixelPx = W / d.resolution.pixelsAcross;
    grain.setAttribute('baseFrequency', (GRAIN_FREQUENCY / Math.max(1, pixelPx)).toFixed(3));

    // Directional blur once the shutter is slower than the handheld limit.
    const k = d.shake.blurFactor;
    const sigma = k > 1 ? Math.min(30, (k * W) / 1000) : 0;
    shake.setAttribute('stdDeviation', `${sigma.toFixed(2)} 0`);
    // What blurs the whole frame alike – pixels, diffraction, lens, noise filter, film, scan. At
    // normal size it stays below a display pixel; digital zoom makes it show.
    const system = Math.min(MAX_BLUR_PX, (d.resolution.systemBlurUm / 1000 / d.sensor.widthMm) * z * W * SIGMA_PER_DISC);
    // Once one pixel of the file covers a few display pixels, show the pixels: sample each cell
    // once and fill the cell with it (last, like the sensor sampling the blurred image).
    const cell = pixelPx >= MIN_PIXEL_PX ? Math.max(2, Math.round(pixelPx)) : 0;
    if (cell) setPixelate(pixelate, cell);
    const filters = [
      system >= MIN_VISIBLE_SIGMA ? `blur(${system.toFixed(2)}px)` : '',
      sigma > 0 ? 'url(#sim-shake)' : '',
      cell ? 'url(#sim-pixelate)' : '',
    ];
    image.style.filter = filters.filter(Boolean).join(' ');

    const parts = [
      fill(t.sim.caption, {
        shutter: formatShutter(d.settings.shutterS, t.locale),
        aperture: formatAperture(d.settings.aperture),
        iso: d.settings.iso,
      }),
    ];
    if (z > 1) parts.push(fill(t.sim.zoomCaption, { factor: formatNumber(z, z < 10 ? 1 : 0) }));
    if (d.shake.cls !== 'safe') parts.push(t.shake[d.shake.cls]);
    caption.textContent = parts.join(' · ');
  }

  store.subscribe((s, d) => render(d, sceneryFor(s.scene.lightPresetId)));
  new ResizeObserver(() => {
    if (frame.clientWidth !== width && last) {
      width = frame.clientWidth;
      render(last.d, last.scenery);
    }
  }).observe(frame);
}

/** Digital zoom transform: display = z · uncropped + (tx, ty). */
interface CropView {
  z: number;
  tx: number;
  ty: number;
}

/** Where the AF frame sits – the face, or the scenery's main object – and its size, in uncropped pixels. */
function focusTarget(el: DerivedElement, target: Scenery['afTarget'], W: number, H: number) {
  const { perM, groundY, cx } = projection(el, W, H);
  const isPerson = el.id !== 'background';
  return {
    x: isPerson ? cx : W / 2 + target.lateralM * perM,
    y: groundY - (isPerson ? 1.63 : target.heightM) * perM,
    size: (isPerson ? 0.45 : target.sizeM) * perM,
  };
}

/**
 * The crop is centred on the subject in focus (the frame centre if there is none), shifted only as
 * far as needed to stay inside the uncropped photo.
 */
function cropView(d: Derived, scenery: Scenery, W: number, H: number): CropView {
  const z = d.zoom.factor;
  if (z === 1) return { z, tx: 0, ty: 0 };
  const el = d.subject && d.elements.find((e) => e.id === d.subject!.id);
  let x = W / 2;
  let y = H / 2;
  if (el) {
    const p = focusTarget({ ...el, heightFractionPerM: el.heightFractionPerM / z }, scenery.afTarget, W, H);
    x = p.x;
    y = p.y;
  }
  const clamp = (v: number, size: number) => Math.min(size - size / (2 * z), Math.max(size / (2 * z), v));
  return { z, tx: W / 2 - z * clamp(x, W), ty: H / 2 - z * clamp(y, H) };
}

/** Point the pixelate filter at a cell size: one sample in the middle of each cell, dilated over the cell. */
function setPixelate(filter: SVGFilterElement, cell: number): void {
  const [flood, crop, , , dilate] = [...filter.children];
  const mid = String(Math.floor(cell / 2));
  flood.setAttribute('x', mid);
  flood.setAttribute('y', mid);
  crop.setAttribute('width', String(cell));
  crop.setAttribute('height', String(cell));
  dilate.setAttribute('radius', String(Math.ceil(cell / 2)));
}

/** Camera-style AF frame (corner brackets) around the face, or the scenery's main object, in display pixels. */
function drawAfFrame(el: DerivedElement, target: Scenery['afTarget'], W: number, H: number, view: CropView): string {
  const p = focusTarget(el, target, W, H);
  const x = view.z * p.x + view.tx;
  const y = view.z * p.y + view.ty;
  const size = Math.min(H * 0.6, Math.max(18, p.size * view.z));
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
 * sharp while the eyes are not. `stdDeviation(dm)` gives the blur ("x y" in px) for an offset from the eye plane;
 * `zoom` is the digital zoom the drawing will be enlarged by (fine detail needs display pixels);
 * `gain` is the exposure factor, applied before the blur (see MAX_BRIGHTNESS).
 */
function drawPerson(
  el: DerivedElement,
  W: number,
  H: number,
  zoom: number,
  gain: number,
  stdDeviation: (dm: number) => string,
): string {
  const { perM, groundY, cx } = projection(el, W, H);
  // sRGB like CSS brightness(), so the persons match the background layers.
  const fn = (c: string) => `<feFunc${c} type="linear" slope="${gain.toFixed(3)}"/>`;
  const light = `<feComponentTransfer color-interpolation-filters="sRGB">${fn('R')}${fn('G')}${fn('B')}</feComponentTransfer>`;
  const filter = (part: string, dm: number) =>
    `<filter id="${el.id}-${part}" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
       ${light}<feGaussianBlur stdDeviation="${stdDeviation(dm)}"/></filter>`;
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
       ${drawEye(-4.2, perM * zoom)}${drawEye(4.2, perM * zoom)}
       <path class="mouth" d="M-3.8,-155.8 Q0,-153 3.8,-155.8"/>`,
    )}
    ${part('nose', drawNose(perM * zoom))}
  </g>`;
}

// Simulated camera image: sky/ground, background scenery and the persons as
// separate layers, each with its own blur and brightness from derive(). The backdrop and
// scenery follow the light situation (see scenery.ts), so dusk looks like dusk.
// Scenery and persons are stacked by distance, so nearer things cover farther ones. Movement smears
// each layer sideways on its own (persons relative to the photographer); noise overlay and
// directional shake blur on top. Each layer's brightness is a tone curve with a hard top and
// bottom: beyond the dynamic range it fades to flat white (blown out) or flat dark (crushed). Layout uses each element's projected scale
// (heightFractionPerM), so framing follows focal length and sensor.

import { de as t, fill } from '../../data/texts.de';
import type { Derived, DerivedElement, Layer } from '../../model/derive';
import type { LayerTone } from '../../model/dynamicRange';
import { formatAperture, formatShutter } from '../../model/stops';
import { formatNumber } from '../distance';
import type { ElementId } from '../../model/types';
import { focusOn, setAutofocus, setInfo } from '../../state/actions';
import { FACE_DEPTH_M } from '../face';
import { mountLightStepper } from '../lightStepper';
import type { Store } from '../../state/store';
import { figure } from './figurine';
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
 * Exposure is shown as a brightness factor on the sRGB colours. Light per stop doubles in linear terms,
 * but sRGB values are gamma-encoded (≈ linear^(1/2.2)), so one stop is a factor of 2^(1/2.2) ≈ 1.37 on
 * them – multiplying sRGB by 2 per stop would clip mid-tones to white at "slightly over". The upper bound must be high enough that
 * even the darkest drawn colour (pupils, #111) clips to white – a lower cap freezes the image a
 * few stops over, with the pupils and dark outlines left floating in a white frame.
 *
 * The factor is applied before any blur: blurred edges are stored as 8-bit premultiplied colour,
 * so a dark channel at low alpha rounds to 0 and no factor can lift it – brightening afterwards
 * leaves tinted ghost outlines. Both steps are linear, so the order only matters once colours clip.
 */
const MAX_BRIGHTNESS = 2 ** 6;
const DISPLAY_GAMMA = 2.2;
const MIN_BRIGHTNESS = 0.03;
/** Flat level (sRGB) a crushed layer sinks to: not pure black, so its extra grain still shows. */
const CRUSHED_LEVEL = 0.06;
/** Opacity of the extra grain on a fully crushed backdrop (screen blend: noise lifted out of the black). */
const CRUSHED_GRAIN = 0.2;
/** Side of the pre-computed grain tile, in its own pixels (one per display pixel at 1×). */
const GRAIN_TILE = 256;
/** Grain contrast: standard deviation of the tile's grey values around mid-grey (0–1). */
const GRAIN_SPREAD = 0.4;
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
        <div class="sky-grain" aria-hidden="true"></div>
        <svg class="layer" data-layer="background" xmlns="${SVG_NS}"></svg>
        <svg class="layer" data-layer="person2" xmlns="${SVG_NS}"></svg>
        <svg class="layer" data-layer="person1" xmlns="${SVG_NS}"></svg>
      </div>
      <div class="noise" aria-hidden="true"></div>
      <svg class="af-overlay" xmlns="${SVG_NS}" aria-hidden="true"></svg>
    </div>
    <svg width="0" height="0" aria-hidden="true" style="position:absolute">
      <filter id="sim-shake" x="-10%" width="120%"><feGaussianBlur stdDeviation="0 0"/></filter>
      <filter id="sim-move-background" x="-10%" width="120%"><feGaussianBlur stdDeviation="0 0"/></filter>
      <filter id="sim-pixelate" x="0" y="0" width="1" height="1" primitiveUnits="objectBoundingBox">
        <feFlood/>
        <feComposite x="0" y="0"/>
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
  const noise = root.querySelector<HTMLElement>('.noise')!;
  noise.style.backgroundImage = `url(${grainTile()})`;
  // A crushed backdrop: shadows that drowned in noise. Inside the image, above the sky, under everything else.
  const skyGrain = root.querySelector<HTMLElement>('.sky-grain')!;
  skyGrain.style.backgroundImage = noise.style.backgroundImage;
  const shake = root.querySelector<SVGFEGaussianBlurElement>('#sim-shake feGaussianBlur')!;
  const moveBackground = root.querySelector<SVGFEGaussianBlurElement>('#sim-move-background feGaussianBlur')!;
  const pixelate = root.querySelector<SVGFilterElement>('#sim-pixelate')!;
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
  let frameRequest = 0;

  // A slider can fire several updates per display frame; rebuilding and re-filtering the image for
  // each one only delays the frame. Draw the latest state once per frame instead.
  function schedule(d: Derived, scenery: Scenery): void {
    last = { d, scenery };
    frameRequest ||= requestAnimationFrame(() => {
      frameRequest = 0;
      render(last!.d, last!.scenery);
    });
  }

  function render(d: Derived, scenery: Scenery): void {
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
    const gain = (stops: number) => Math.min(MAX_BRIGHTNESS, Math.max(MIN_BRIGHTNESS, 2 ** (stops / DISPLAY_GAMMA)));
    const moveSigma = (el: DerivedElement) => Math.min(MAX_BLUR_PX, el.movementBlurFractionOfWidth * W * SIGMA_PER_SMEAR);

    // Sky (or wall) and open ground are always furthest back; they share the background's blur, smear and light.
    const bg = d.elements.find((e) => e.id === 'background')!;
    const bgMove = moveSigma(bg);
    moveBackground.setAttribute('stdDeviation', `${bgMove.toFixed(2)} 0`);
    const filterFor = (el: DerivedElement, light: { exposureOffsetStops: number; tone: LayerTone }) =>
      `${toneCss(toneLine(gain(light.exposureOffsetStops), light.tone))} ` +
      `blur(${Math.min(MAX_BLUR_PX, el.blurFractionOfWidth * W * SIGMA_PER_DISC).toFixed(2)}px)` +
      `${bgMove > 0.1 ? ' url(#sim-move-background)' : ''}`;
    const sky = layer('sky');
    sky.setAttribute('viewBox', `0 0 ${W} ${H}`);
    sky.innerHTML = zoomed(scenery.backdrop(uncropped(bg), W, H));
    sky.style.filter = filterFor(bg, d.dynamicRange.sky);
    sky.style.zIndex = '0';
    const crushed = d.dynamicRange.sky.tone.shadow;
    skyGrain.style.display = crushed > 0 ? '' : 'none';
    skyGrain.style.opacity = (crushed * CRUSHED_GRAIN).toFixed(3);
    skyGrain.style.zIndex = '1';
    frame.style.background = scenery.frameColor;

    // Far to near: a person behind the house disappears behind it.
    const byDistance = [...d.elements].sort((a, b) => b.distanceM - a.distanceM);
    byDistance.forEach((el, i) => {
      const svg = layer(el.id);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.style.display = el.visible ? '' : 'none';
      svg.style.zIndex = String(i + 2);
      if (el.id === 'background') {
        svg.innerHTML = zoomed(scenery.scenery(uncropped(el), W, H));
        svg.style.filter = filterFor(el, el);
      } else {
        // Persons blur per part (nose, face, ears sit at different distances), so the light goes into
        // each part's filter too, ahead of the blur. Movement adds a sideways smear on top of the defocus.
        const move = moveSigma(el) / z;
        svg.innerHTML = zoomed(
          drawPerson(uncropped(el), W, H, z, toneLine(gain(el.exposureOffsetStops), el.tone), (dm) => {
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
    const pixelPx = W / d.resolution.pixelsAcross;

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
    if (cell) setPixelate(pixelate, cell, W, H);
    // Noise sits in the file's pixels: one grain per display pixel at normal size (the file's pixels
    // are finer than that), one per drawn pixel cell once they show – aligned with the cells. Drawn
    // crisp (pixelated, in CSS): smoothing would blur the grain into soft blotches.
    noise.style.backgroundSize = `${GRAIN_TILE * (cell || 1)}px`;
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
    const names = (layers: Layer[]) =>
      joinNames(layers.map((id) => (id === 'sky' ? (scenery.indoor ? t.sim.layers.skyIndoor : t.sim.layers.sky) : t.sim.layers[id])));
    if (d.dynamicRange.clipped.length) parts.push(fill(t.sim.clipped, { names: names(d.dynamicRange.clipped) }));
    if (d.dynamicRange.crushed.length) parts.push(fill(t.sim.crushed, { names: names(d.dynamicRange.crushed) }));
    caption.textContent = parts.join(' · ');
  }

  store.subscribe((s, d) => schedule(d, sceneryFor(s.scene.lightPresetId)));
  new ResizeObserver(() => {
    if (frame.clientWidth !== width && last) {
      width = frame.clientWidth;
      schedule(last.d, last.scenery);
    }
  }).observe(frame);
}

/** "A", "A und B", "A, B und C". */
function joinNames(names: string[]): string {
  return names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')}${t.motion.and}${names[names.length - 1]}`;
}

/** A layer's tone curve on its sRGB colours: out = intercept + slope · in, clamped to 0…1. */
interface ToneLine {
  slope: number;
  intercept: number;
}

/**
 * Exposure gain plus the dynamic range's hard ends: towards the clip the layer fades to flat white
 * (detail gone, not just bright), towards the floor to flat dark.
 */
function toneLine(gain: number, tone: LayerTone): ToneLine {
  const keep = (1 - tone.highlight) * (1 - tone.shadow);
  return { slope: gain * keep, intercept: tone.highlight + (1 - tone.highlight) * tone.shadow * CRUSHED_LEVEL };
}

/**
 * The same as CSS filter functions, which have no intercept: brightness(s/(1−a)), invert, brightness(1−a),
 * invert gives a + (1−a)·min(1, s·x/(1−a)) = min(1, a + s·x). Plain brightness() when there is no
 * intercept – cheap functions only, no SVG filter (those are slow in WebKit).
 */
function toneCss({ slope, intercept: a }: ToneLine): string {
  if (a <= 0) return `brightness(${slope.toFixed(3)})`;
  if (a >= 1) return 'brightness(0) invert(1)';
  return `brightness(${(slope / (1 - a)).toFixed(3)}) invert(1) brightness(${(1 - a).toFixed(3)}) invert(1)`;
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

/**
 * Point the pixelate filter at a cell size (display px): one sample in the middle of each cell,
 * dilated over the cell. Sub-regions are fractions of the image (objectBoundingBox): in pixel units
 * WebKit (Safari) measures them from the page instead of the element, the sample misses and the
 * whole image turns transparent.
 */
function setPixelate(filter: SVGFilterElement, cell: number, W: number, H: number): void {
  const [flood, crop, , , dilate] = [...filter.children];
  const fx = (px: number) => (px / W).toFixed(6);
  const fy = (px: number) => (px / H).toFixed(6);
  const mid = Math.floor(cell / 2);
  flood.setAttribute('x', fx(mid));
  flood.setAttribute('y', fy(mid));
  flood.setAttribute('width', fx(1));
  flood.setAttribute('height', fy(1));
  crop.setAttribute('width', fx(cell));
  crop.setAttribute('height', fy(cell));
  const r = Math.ceil(cell / 2);
  dilate.setAttribute('radius', `${fx(r)} ${fy(r)}`);
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

/**
 * Person facing the camera. Distance = eyes. Nose, face/body and ears each get their own
 * blur from their own distance – with a shallow enough depth of field the nose tip can be
 * sharp while the eyes are not. `stdDeviation(dm)` gives the blur ("x y" in px) for an offset from the eye plane;
 * `zoom` is the digital zoom the drawing will be enlarged by (fine detail needs display pixels);
 * `tone` is the exposure gain with the dynamic range's ends, applied before the blur (see MAX_BRIGHTNESS).
 */
function drawPerson(
  el: DerivedElement,
  W: number,
  H: number,
  zoom: number,
  tone: ToneLine,
  stdDeviation: (dm: number) => string,
): string {
  const { perM, groundY, cx } = projection(el, W, H);
  // sRGB like CSS brightness(), so the persons match the background layers.
  const fn = (c: string) =>
    `<feFunc${c} type="linear" slope="${tone.slope.toFixed(3)}"${tone.intercept > 0 ? ` intercept="${tone.intercept.toFixed(3)}"` : ''}/>`;
  const light = `<feComponentTransfer color-interpolation-filters="sRGB">${fn('R')}${fn('G')}${fn('B')}</feComponentTransfer>`;
  const filter = (part: string, dm: number) =>
    `<filter id="${el.id}-${part}" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
       ${light}<feGaussianBlur stdDeviation="${stdDeviation(dm)}"/></filter>`;
  // The figure is drawn in centimetres with the origin at the feet (see figurine.ts). The transform
  // sits on an inner group so each filter works in pixel units.
  const id = el.id as Exclude<ElementId, 'background'>;
  const parts = figure(id, (perM / 100) * zoom);
  const part = (name: string, body: string) =>
    `<g filter="url(#${el.id}-${name})"><g transform="translate(${cx} ${groundY}) scale(${perM / 100})">${body}</g></g>`;
  return `<defs>${filter('ears', FACE_DEPTH_M.ears)}${filter('body', 0)}${filter('nose', FACE_DEPTH_M.noseTip)}${parts.defs}</defs>
  <g class="person person-${el.id}">
    ${part('ears', parts.ears)}
    ${part('body', parts.body)}
    ${part('nose', parts.nose)}
  </g>`;
}

let grainUrl = '';

/**
 * Grey grain as a small tile, made once: random values (sum of three uniforms ≈ Gaussian) around
 * mid-grey, opaque, laid over the image with an overlay blend. A pre-made image tiles almost for
 * free, where an SVG turbulence filter recomputes every pixel on each repaint.
 */
function grainTile(): string {
  if (grainUrl) return grainUrl;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = GRAIN_TILE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(GRAIN_TILE, GRAIN_TILE);
  // Three uniforms on [-0.5, 0.5] sum to a standard deviation of 0.5.
  const scale = (GRAIN_SPREAD / 0.5) * 255;
  for (let i = 0; i < img.data.length; i += 4) {
    const g = Math.random() + Math.random() + Math.random() - 1.5;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 128 + g * scale;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return (grainUrl = canvas.toDataURL());
}

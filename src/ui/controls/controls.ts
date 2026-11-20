// Camera controls in two panels: camera body (type, mode, aperture, shutter, ISO, flash)
// and lens (type, focal length, stabiliser, focus tracking, focus).
// DOM is built once; the subscriber only syncs values so sliders aren't replaced mid-drag.
// Fields the current mode sets itself are disabled and show the camera's choice.

import { LENS_ORDER } from '../../data/cameraLenses';
import { SENSORS, SENSOR_ORDER } from '../../data/sensors';
import { de as t, fill } from '../../data/texts.de';
import type { Derived } from '../../model/derive';
import { focalOptions, formatFocal } from '../../model/focal';
import { MOTIONS } from '../../model/motion';
import { APERTURES, ISOS, SHUTTER_SPEEDS_S, formatAperture, formatShutter } from '../../model/stops';
import type { AutoField, ElementId, LensId, Mode, Motion, SensorId } from '../../model/types';
import {
  MAX_DISTANCE_M,
  MIN_DISTANCE_M,
  setAutofocus,
  setCamera,
  setFocus,
  setInfo,
  setMode,
} from '../../state/actions';
import type { InfoKey, Store } from '../../state/store';
import { formatMeters } from '../distance';
import { movementBlurredText } from '../motionText';

const AF_TARGETS: ElementId[] = ['person1', 'person2', 'background'];
/** Shutter ranges for handheld shooting, slow → fast as on the slider. */
const SHAKE_ZONES = ['tripod', 'is', 'hand'] as const;
type ShakeZone = (typeof SHAKE_ZONES)[number];
const SHAKE_ZONE_LABELS: Record<ShakeZone, string> = {
  tripod: t.shake.zoneTripod,
  is: t.shake.zoneIS,
  hand: t.shake.zoneHand,
};
const MODES: Mode[] = ['auto', 'P', 'Av', 'Tv', 'M'];

/** Focus slider resolution; positions map logarithmically onto the distance range. */
const FOCUS_STEPS = 1000;
const focusToPos = (m: number) => Math.round((Math.log(m / MIN_DISTANCE_M) / Math.log(MAX_DISTANCE_M / MIN_DISTANCE_M)) * FOCUS_STEPS);
const posToFocus = (p: number) => MIN_DISTANCE_M * (MAX_DISTANCE_M / MIN_DISTANCE_M) ** (p / FOCUS_STEPS);

/** Position (0…1) of a shutter time on the shutter slider, which runs slow → `fastest` in even ⅓ stops. */
const SLOWEST = SHUTTER_SPEEDS_S[0];
const shutterPos = (s: number, fastest: number) => Math.log(SLOWEST / s) / Math.log(SLOWEST / fastest);

function nearestIndex(values: readonly number[], target: number): number {
  let best = 0;
  values.forEach((v, i) => {
    if (Math.abs(Math.log(v / target)) < Math.abs(Math.log(values[best] / target))) best = i;
  });
  return best;
}

/** A labelled range input; `extra` goes below the track (shutter: handheld ranges). */
const range = (id: string, label: string, max: number, info: string, extra = '') => `
  <div class="control" data-info="${info}">
    <label for="c-${id}">${label} <output id="o-${id}"></output></label>
    <div class="range-wrap"><input id="c-${id}" type="range" min="0" max="${max}" step="1">${extra}</div>
    <small class="hint" id="h-${id}"></small>
  </div>`;

const checkbox = (id: string, label: string, info: string) => `
  <div class="control control-check" data-info="${info}">
    <label class="toggle"><input id="c-${id}" type="checkbox"> ${label}</label>
    <small class="hint" id="h-${id}"></small>
  </div>`;

export function mountControls(root: HTMLElement, store: Store): void {
  root.classList.add('controls');
  // The layout may move the lens panel to another column (see main.ts), so lookups are by id
  // on the document and listeners sit on the panels, not on `root`.
  // Two panels like the real thing: the body (type, mode, exposure – modern bodies set the
  // aperture too) and the lens (type, zoom, stabiliser, focus). Each starts with its type dropdown.
  root.innerHTML = `
    <section class="panel" id="camera-panel" aria-label="${t.controls.sectionCamera}">
      <h3>${t.controls.sectionCamera}</h3>
      <div class="control" data-info="sensor">
        <select id="c-sensor" aria-label="${t.controls.cameraType}">
          ${SENSOR_ORDER.map((id) => `<option value="${id}">${t.sensors[id]}</option>`).join('')}
        </select>
      </div>
      <div class="control" data-info="mode">
        <span class="control-label">${t.controls.mode}</span>
        <div class="segmented" role="radiogroup" aria-label="${t.controls.mode}">
          ${MODES.map((m) => `<button type="button" role="radio" data-mode="${m}" title="${t.modes[m].name}">${t.modes[m].short}</button>`).join('')}
        </div>
        <p class="mode-desc"><strong id="mode-name"></strong> <span id="mode-text"></span></p>
      </div>
      ${range('aperture', t.controls.aperture, APERTURES.length - 1, 'aperture')}
      ${range(
        'shutter',
        t.controls.shutter,
        SHUTTER_SPEEDS_S.length - 1,
        'shutter',
        `<div class="shake-zones" id="shake-zones" aria-hidden="true">
          ${SHAKE_ZONES.map((z) => `<span class="zone zone-${z}"></span>`).join('')}
          ${SHAKE_ZONES.map((z) => `<span class="zone-label zone-${z}">${SHAKE_ZONE_LABELS[z]}</span>`).join('')}
        </div>`,
      )}
      ${range('iso', t.controls.iso, ISOS.length - 1, 'iso')}
      ${checkbox('autoiso', t.controls.autoIso, 'iso')}
      ${checkbox('flash', t.controls.flash, 'flash')}
    </section>

    <section class="panel" id="lens-panel" aria-label="${t.controls.sectionLens}">
      <h3>${t.controls.sectionLens}</h3>
      <div class="control" data-info="lens">
        <select id="c-lens" aria-label="${t.controls.lensType}">
          ${LENS_ORDER.map((id) => `<option value="${id}">${t.cameraLenses[id]}</option>`).join('')}
        </select>
        <small class="hint" id="h-lens"></small>
      </div>
      ${range('focal', t.controls.focalLength, 0, 'focalLength')}
      ${checkbox('stabilized', t.controls.stabilized, 'stabilized')}
      <div class="control" data-info="cameraMotion">
        <label for="c-motion">${t.controls.cameraMotion}</label>
        <select id="c-motion">
          ${MOTIONS.map((m) => `<option value="${m}">${t.motion.camera[m]}</option>`).join('')}
        </select>
      </div>
      <div class="control" data-info="autofocus">
        <label for="c-af">${t.controls.autofocus}</label>
        <select id="c-af">
          <option value="">${t.controls.autofocusOff}</option>
          ${AF_TARGETS.map((id) => `<option value="${id}">${t.elements[id]}</option>`).join('')}
        </select>
      </div>
      ${range('focus', t.controls.focus, FOCUS_STEPS, 'focus')}
    </section>`;

  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const sensor = $<HTMLSelectElement>('c-sensor');
  const lens = $<HTMLSelectElement>('c-lens');
  const focal = $<HTMLInputElement>('c-focal');
  const stabilized = $<HTMLInputElement>('c-stabilized');
  const cameraMotion = $<HTMLSelectElement>('c-motion');
  const modeButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-mode]')];
  const aperture = $<HTMLInputElement>('c-aperture');
  const shutter = $<HTMLInputElement>('c-shutter');
  const iso = $<HTMLInputElement>('c-iso');
  const autoIso = $<HTMLInputElement>('c-autoiso');
  const flash = $<HTMLInputElement>('c-flash');
  const af = $<HTMLSelectElement>('c-af');
  const focus = $<HTMLInputElement>('c-focus');

  // Touching a control shows its explanation in the infobox.
  const showInfo = (e: Event) => {
    const key = (e.target as Element).closest<HTMLElement>('[data-info]')?.dataset.info;
    if (key) setInfo(store, key as InfoKey);
  };
  for (const panel of root.querySelectorAll('.panel')) {
    panel.addEventListener('pointerdown', showInfo);
    panel.addEventListener('focusin', showInfo);
  }

  sensor.addEventListener('change', () => {
    // Keep the angle of view: pick the new sensor's step closest to the current equivalent focal length.
    const next = SENSORS[sensor.value as SensorId];
    const opts = focalOptions(next);
    const i = nearestIndex(opts.map((o) => o.equivalentMm), store.derived().equivalentFocalMm);
    setCamera(store, { sensorId: next.id, focalLengthMm: opts[i].realMm });
  });
  lens.addEventListener('change', () => setCamera(store, { lensId: lens.value as LensId }));
  focal.addEventListener('input', () => {
    const opts = focalOptions(store.derived().sensor);
    setCamera(store, { focalLengthMm: opts[Number(focal.value)].realMm });
  });
  stabilized.addEventListener('change', () => setCamera(store, { stabilized: stabilized.checked }));
  cameraMotion.addEventListener('change', () => setCamera(store, { motion: cameraMotion.value as Motion }));
  modeButtons.forEach((b) => b.addEventListener('click', () => setMode(store, b.dataset.mode as Mode)));
  aperture.addEventListener('input', () => setCamera(store, { aperture: APERTURES[Number(aperture.value)] }));
  shutter.addEventListener('input', () => setCamera(store, { shutterS: SHUTTER_SPEEDS_S[Number(shutter.value)] }));
  iso.addEventListener('input', () => setCamera(store, { iso: ISOS[Number(iso.value)] }));
  autoIso.addEventListener('change', () => {
    // Turning auto ISO off keeps the ISO the camera had chosen.
    setCamera(store, { autoIso: autoIso.checked, iso: store.derived().settings.iso });
  });
  flash.addEventListener('change', () => setCamera(store, { flashOn: flash.checked }));
  af.addEventListener('change', () => setAutofocus(store, (af.value || null) as ElementId | null));
  focus.addEventListener('input', () => setFocus(store, posToFocus(Number(focus.value))));

  const hint = (id: string, text: string) => ($(`h-${id}`).textContent = text);
  const shakeZones = mountShakeZones($('shake-zones'));

  store.subscribe((_state, d: Derived) => {
    const s = d.settings;
    const auto = d.autoFields;
    const autoHint = (field: AutoField) => (auto.has(field) ? t.controls.autoSetHint : '');

    sensor.value = s.sensorId;

    const opts = focalOptions(d.sensor);
    const fi = nearestIndex(opts.map((o) => o.realMm), s.focalLengthMm);
    focal.max = String(opts.length - 1);
    focal.disabled = opts.length < 2; // e.g. iPhone XR: a single back camera
    focal.value = String(fi);
    $('o-focal').textContent = formatFocal(opts[fi].realMm, d.sensor, t.kb, t.locale);

    const fixed = d.sensor.fixedAperture !== undefined;
    // Phones have built-in lenses: no lens choice, just a note.
    lens.value = s.lensId;
    lens.hidden = fixed;
    hint('lens', fixed ? t.controls.phoneLensHint : '');
    stabilized.checked = s.stabilized;
    cameraMotion.value = s.motion;

    for (const b of modeButtons) {
      const on = b.dataset.mode === s.mode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', String(on));
    }
    $('mode-name').textContent = t.modes[s.mode].name + ':';
    $('mode-text').textContent = t.modes[s.mode].description;

    // Aperture: fixed on phones, set by the camera in A/P/Tv, otherwise limited by the lens.
    // The slider starts at the lens's widest aperture here, so its track only covers what the lens can do.
    const limited = !fixed && d.maxAperture > APERTURES[0];
    aperture.disabled = fixed || auto.has('aperture');
    aperture.min = String(fixed ? 0 : nearestIndex(APERTURES, d.maxAperture));
    aperture.value = String(nearestIndex(APERTURES, s.aperture));
    $('o-aperture').textContent = formatAperture(s.aperture);
    hint(
      'aperture',
      fixed
        ? t.controls.fixedApertureHint
        : auto.has('aperture')
          ? t.controls.autoSetHint
          : limited
            ? fill(t.controls.lensLimitHint, { aperture: formatAperture(d.maxAperture) })
            : '',
    );

    // Shutter, with handheld markers that move with focal length.
    // The slider ends at this camera's fastest shutter (phones go further: electronic shutter).
    const fastestIdx = nearestIndex(SHUTTER_SPEEDS_S, d.fastestShutterS);
    shutter.max = String(fastestIdx);
    shutter.disabled = auto.has('shutterS');
    shutter.value = String(nearestIndex(SHUTTER_SPEEDS_S, s.shutterS));
    $('o-shutter').textContent = formatShutter(s.shutterS, t.locale);
    const fastest = SHUTTER_SPEEDS_S[fastestIdx];
    // On a tripod there are no handheld limits: the band is hidden (keeping its space).
    const tripod = !Number.isFinite(d.shake.limitS);
    $('shake-zones').classList.toggle('tripod', tripod);
    shakeZones.update(
      tripod ? 1 : shutterPos(d.shake.limitIsS, fastest),
      tripod ? 1 : shutterPos(d.shake.limitS, fastest),
      s.stabilized,
    );
    // The knob takes the colour of the range it sits in (stays coloured while the camera sets the time).
    shutter.dataset.zone = d.shake.cls;
    hint(
      'shutter',
      [autoHint('shutterS'), d.shake.cls !== 'safe' ? t.shake[d.shake.cls] : '', movementBlurredText(d)]
        .filter(Boolean)
        .join(' · '),
    );

    // ISO: always automatic in A; auto ISO is a choice in P/Av/Tv; M is fully manual.
    iso.disabled = auto.has('iso');
    iso.value = String(nearestIndex(ISOS, s.iso));
    $('o-iso').textContent = String(s.iso);
    hint('iso', d.autoIsoCapped !== null ? fill(t.controls.autoIsoCapHint, { iso: String(d.autoIsoCapped) }) : autoHint('iso'));
    autoIso.checked = s.autoIso;
    // Hidden where it means nothing: A (always auto), M (always manual), film (the film decides).
    autoIso.closest<HTMLElement>('.control')!.hidden = s.mode === 'auto' || s.mode === 'M' || !!d.sensor.isFilm;

    flash.checked = s.flashOn;
    flash.disabled = auto.has('flashOn');
    hint('flash', autoHint('flashOn'));

    // With focus tracking on, the focus slider only displays where the camera focused.
    // The slider starts at the lens's near limit, which moves out with the focal length.
    af.value = s.afTarget ?? '';
    focus.disabled = s.afTarget !== null;
    focus.min = String(focusToPos(d.minDistanceM));
    focus.value = String(focusToPos(s.focusDistanceM));
    $('o-focus').textContent = formatMeters(s.focusDistanceM);
    const nearLimit = d.minDistanceM > MIN_DISTANCE_M + 1e-9;
    hint(
      'focus',
      s.afTarget
        ? fill(t.controls.autofocusHint, { target: t.elements[s.afTarget] })
        : nearLimit
          ? fill(t.controls.nearLimitHint, { min: formatMeters(d.minDistanceM) })
          : '',
    );
  });
}

/** Range thumb width (px): positions on the track run from half a thumb in to half a thumb before the end. */
const THUMB_PX = 16;

/**
 * Coloured band below the shutter slider: tripod | handheld with stabiliser | handheld, split at the two
 * handheld limits (slider fractions, may lie outside 0…1). Without a stabiliser its range is shown struck out.
 * The limits sit where the thumb's centre would be; the outer ends run the full width of the slider.
 * Labels sit centred under their range, nudged apart if a range is too narrow, and kept inside the slider.
 */
function mountShakeZones(root: HTMLElement) {
  const zone = (z: ShakeZone) => root.querySelector<HTMLElement>(`.zone.zone-${z}`)!;
  const label = (z: ShakeZone) => root.querySelector<HTMLElement>(`.zone-label.zone-${z}`)!;
  let last: [number, number, boolean] | null = null;

  const place = () => {
    if (!last) return;
    const [isLimit, handLimit, stabilized] = last;
    const clamp = (p: number) => Math.min(1, Math.max(0, p));
    const a = clamp(isLimit);
    const b = clamp(Math.max(isLimit, handLimit));
    const ranges: Record<ShakeZone, [number, number]> = { tripod: [0, a], is: [a, b], hand: [b, 1] };
    const w = root.clientWidth;
    // Thumb centre at fraction p; the band's outer ends reach the slider's edges.
    const px = (p: number) => (p <= 0 ? 0 : p >= 1 ? w : THUMB_PX / 2 + p * (w - THUMB_PX));
    const css = (p: number) =>
      p <= 0 ? '0px' : p >= 1 ? '100%' : `calc(${(p * 100).toFixed(2)}% + ${(THUMB_PX / 2 - p * THUMB_PX).toFixed(2)}px)`;
    const GAP = 6;
    const lefts: Partial<Record<ShakeZone, number>> = {};
    const widths: Partial<Record<ShakeZone, number>> = {};
    let prevRight = -Infinity;
    for (const z of SHAKE_ZONES) {
      const [from, to] = ranges[z];
      const el = zone(z);
      const lab = label(z);
      const empty = to - from < 1e-6;
      el.hidden = empty;
      lab.hidden = empty;
      el.style.left = css(from);
      el.style.width = `calc(${css(to)} - ${css(from)})`;
      const off = z === 'is' && !stabilized;
      el.classList.toggle('off', off);
      lab.classList.toggle('off', off);
      if (empty || w === 0) continue;
      const lw = lab.offsetWidth;
      // Left to right: centred, but clear of the previous label.
      const left = Math.max(0, (px(from) + px(to)) / 2 - lw / 2, prevRight + GAP);
      lefts[z] = left;
      widths[z] = lw;
      prevRight = left + lw;
    }
    // Right to left: pull back whatever ran past the end, keeping the gaps.
    let limit = w;
    for (const z of [...SHAKE_ZONES].reverse()) {
      if (lefts[z] === undefined) continue;
      const left = Math.min(lefts[z]!, limit - widths[z]!);
      label(z).style.left = `${left.toFixed(1)}px`;
      limit = left - GAP;
    }
  };
  // Label positions are in px, so redo them when the slider changes width.
  new ResizeObserver(place).observe(root);

  return {
    update(isLimit: number, handLimit: number, stabilized: boolean) {
      last = [isLimit, handLimit, stabilized];
      place();
    },
  };
}

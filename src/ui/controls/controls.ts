// Camera controls, grouped: camera (sensor, lens, focal length, stabiliser),
// mode, exposure (aperture, shutter, ISO, flash) and sharpness (focus tracking, focus).
// DOM is built once; the subscriber only syncs values so sliders aren't replaced mid-drag.
// Fields the current mode sets itself are disabled and show the camera's choice.

import { LENS_ORDER } from '../../data/cameraLenses';
import { SENSORS, SENSOR_ORDER } from '../../data/sensors';
import { de as t, fill } from '../../data/texts.de';
import type { Derived } from '../../model/derive';
import { focalOptions, formatFocal } from '../../model/focal';
import { APERTURES, ISOS, SHUTTER_SPEEDS_S, formatAperture, formatShutter } from '../../model/stops';
import type { AutoField, ElementId, LensId, Mode, SensorId } from '../../model/types';
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

const AF_TARGETS: ElementId[] = ['person1', 'person2', 'background'];
const MODES: Mode[] = ['auto', 'P', 'Av', 'Tv', 'M'];

/** Focus slider resolution; positions map logarithmically onto the distance range. */
const FOCUS_STEPS = 1000;
const focusToPos = (m: number) => Math.round((Math.log(m / MIN_DISTANCE_M) / Math.log(MAX_DISTANCE_M / MIN_DISTANCE_M)) * FOCUS_STEPS);
const posToFocus = (p: number) => MIN_DISTANCE_M * (MAX_DISTANCE_M / MIN_DISTANCE_M) ** (p / FOCUS_STEPS);

/** Position (0…1) of a shutter time on the shutter slider, which runs slow → fast in even ⅓ stops. */
const SLOWEST = SHUTTER_SPEEDS_S[0];
const FASTEST = SHUTTER_SPEEDS_S[SHUTTER_SPEEDS_S.length - 1];
const shutterPos = (s: number) => Math.log(SLOWEST / s) / Math.log(SLOWEST / FASTEST);

function nearestIndex(values: readonly number[], target: number): number {
  let best = 0;
  values.forEach((v, i) => {
    if (Math.abs(Math.log(v / target)) < Math.abs(Math.log(values[best] / target))) best = i;
  });
  return best;
}

const range = (id: string, label: string, max: number, info: string, extra = '') => `
  <div class="control" data-info="${info}">
    <label for="c-${id}">${label} <output id="o-${id}"></output></label>
    <div class="range-wrap">${extra}<input id="c-${id}" type="range" min="0" max="${max}" step="1"></div>
    <small class="hint" id="h-${id}"></small>
  </div>`;

const checkbox = (id: string, label: string, info: string) => `
  <div class="control control-check" data-info="${info}">
    <label class="toggle"><input id="c-${id}" type="checkbox"> ${label}</label>
    <small class="hint" id="h-${id}"></small>
  </div>`;

export function mountControls(root: HTMLElement, store: Store): void {
  root.classList.add('controls');
  root.innerHTML = `
    <h3>${t.controls.sectionCamera}</h3>
    <div class="control" data-info="sensor">
      <label for="c-sensor">${t.controls.sensor}</label>
      <select id="c-sensor">
        ${SENSOR_ORDER.map((id) => `<option value="${id}">${t.sensors[id]}</option>`).join('')}
      </select>
    </div>
    <div class="control" data-info="lens">
      <label for="c-lens">${t.controls.lens}</label>
      <select id="c-lens">
        ${LENS_ORDER.map((id) => `<option value="${id}">${t.cameraLenses[id]}</option>`).join('')}
      </select>
    </div>
    ${range('focal', t.controls.focalLength, 0, 'focalLength')}
    ${checkbox('stabilized', t.controls.stabilized, 'stabilized')}

    <h3>${t.controls.mode}</h3>
    <div class="control" data-info="mode">
      <div class="segmented" role="radiogroup" aria-label="${t.controls.mode}">
        ${MODES.map((m) => `<button type="button" role="radio" data-mode="${m}" title="${t.modes[m].name}">${t.modes[m].short}</button>`).join('')}
      </div>
      <p class="mode-desc"><strong id="mode-name"></strong> <span id="mode-text"></span></p>
    </div>

    <h3>${t.controls.sectionExposure}</h3>
    ${range('aperture', t.controls.aperture, APERTURES.length - 1, 'aperture')}
    ${range(
      'shutter',
      t.controls.shutter,
      SHUTTER_SPEEDS_S.length - 1,
      'shutter',
      `<span class="range-marker" id="m-hand"><span>${t.shake.markerHand}</span></span>
       <span class="range-marker" id="m-is"><span>${t.shake.markerIS}</span></span>`,
    )}
    ${range('iso', t.controls.iso, ISOS.length - 1, 'iso')}
    ${checkbox('autoiso', t.controls.autoIso, 'iso')}
    ${checkbox('flash', t.controls.flash, 'flash')}

    <h3>${t.controls.sectionFocus}</h3>
    <div class="control" data-info="autofocus">
      <label for="c-af">${t.controls.autofocus}</label>
      <select id="c-af">
        <option value="">${t.controls.autofocusOff}</option>
        ${AF_TARGETS.map((id) => `<option value="${id}">${t.elements[id]}</option>`).join('')}
      </select>
    </div>
    ${range('focus', t.controls.focus, FOCUS_STEPS, 'focus')}`;

  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const sensor = $<HTMLSelectElement>('c-sensor');
  const lens = $<HTMLSelectElement>('c-lens');
  const focal = $<HTMLInputElement>('c-focal');
  const stabilized = $<HTMLInputElement>('c-stabilized');
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
  root.addEventListener('pointerdown', showInfo);
  root.addEventListener('focusin', showInfo);

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

  store.subscribe((state, d: Derived) => {
    const s = d.settings;
    const auto = d.autoFields;
    const autoHint = (field: AutoField) => (auto.has(field) ? t.controls.autoSetHint : '');

    sensor.value = s.sensorId;

    const opts = focalOptions(d.sensor);
    const fi = nearestIndex(opts.map((o) => o.realMm), s.focalLengthMm);
    focal.max = String(opts.length - 1);
    focal.value = String(fi);
    $('o-focal').textContent = formatFocal(opts[fi].realMm, d.sensor, t.kb);
    hint('focal', opts[fi].native ? '' : t.controls.digitalCropHint);

    const fixed = d.sensor.fixedAperture !== undefined;
    // Phones have built-in lenses: no lens choice at all.
    lens.value = s.lensId;
    lens.closest<HTMLElement>('.control')!.hidden = fixed;
    stabilized.checked = s.stabilized;

    for (const b of modeButtons) {
      const on = b.dataset.mode === s.mode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', String(on));
    }
    $('mode-name').textContent = t.modes[s.mode].name + ':';
    $('mode-text').textContent = t.modes[s.mode].description;

    // Aperture: fixed on phones, set by the camera in A/P/Tv, otherwise limited by the lens.
    const limited = !fixed && state.camera.aperture < d.maxAperture;
    aperture.disabled = fixed || auto.has('aperture');
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
    shutter.disabled = auto.has('shutterS');
    shutter.value = String(nearestIndex(SHUTTER_SPEEDS_S, s.shutterS));
    $('o-shutter').textContent = formatShutter(s.shutterS);
    placeMarker($('m-hand'), shutterPos(d.shake.limitS));
    placeMarker($('m-is'), shutterPos(d.shake.limitIsS));
    $('m-is').classList.toggle('off', !s.stabilized);
    hint('shutter', [autoHint('shutterS'), d.shake.cls !== 'safe' ? t.shake[d.shake.cls] : ''].filter(Boolean).join(' · '));

    // ISO: always automatic in A; auto ISO is a choice in P/Av/Tv; M is fully manual.
    iso.disabled = auto.has('iso');
    iso.value = String(nearestIndex(ISOS, s.iso));
    $('o-iso').textContent = String(s.iso);
    hint('iso', autoHint('iso'));
    autoIso.checked = s.autoIso;
    autoIso.closest<HTMLElement>('.control')!.hidden = s.mode === 'auto' || s.mode === 'M';

    flash.checked = s.flashOn;
    flash.disabled = auto.has('flashOn');
    hint('flash', autoHint('flashOn'));

    // With focus tracking on, the focus slider only displays where the camera focused.
    af.value = s.afTarget ?? '';
    focus.disabled = s.afTarget !== null;
    focus.value = String(focusToPos(s.focusDistanceM));
    $('o-focus').textContent = formatMeters(s.focusDistanceM);
    hint('focus', s.afTarget ? fill(t.controls.autofocusHint, { target: t.elements[s.afTarget] }) : '');
  });
}

/** Marker above a range input at fraction `pos`; hidden outside the slider. Accounts for the thumb width. */
function placeMarker(el: HTMLElement, pos: number): void {
  el.hidden = !(pos >= 0 && pos <= 1);
  el.style.left = `calc(${(pos * 100).toFixed(2)}% + ${(8 - pos * 16).toFixed(2)}px)`;
}

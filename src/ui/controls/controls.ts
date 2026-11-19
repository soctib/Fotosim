// Basic camera controls: sensor, focal length, aperture, focus.
// DOM is built once; render() only syncs values so sliders aren't replaced mid-drag.

import { de as t } from '../../data/texts.de';
import { SENSORS, SENSOR_ORDER } from '../../data/sensors';
import type { Derived } from '../../model/derive';
import { focalOptions, formatFocal } from '../../model/focal';
import { APERTURES, formatAperture } from '../../model/stops';
import type { SensorId } from '../../model/types';
import { MAX_DISTANCE_M, MIN_DISTANCE_M, setCamera, setFocus } from '../../state/actions';
import type { Store } from '../../state/store';
import { formatMeters } from '../distance';

/** Focus slider resolution; positions map logarithmically onto the distance range. */
const FOCUS_STEPS = 1000;
const focusToPos = (m: number) => Math.round((Math.log(m / MIN_DISTANCE_M) / Math.log(MAX_DISTANCE_M / MIN_DISTANCE_M)) * FOCUS_STEPS);
const posToFocus = (p: number) => MIN_DISTANCE_M * (MAX_DISTANCE_M / MIN_DISTANCE_M) ** (p / FOCUS_STEPS);

function nearestIndex(values: readonly number[], target: number): number {
  let best = 0;
  values.forEach((v, i) => {
    if (Math.abs(Math.log(v / target)) < Math.abs(Math.log(values[best] / target))) best = i;
  });
  return best;
}

export function mountControls(root: HTMLElement, store: Store): void {
  root.classList.add('controls');
  root.innerHTML = `
    <div class="control">
      <label for="c-sensor">${t.controls.sensor}</label>
      <select id="c-sensor">
        ${SENSOR_ORDER.map((id) => `<option value="${id}">${t.sensors[id]}</option>`).join('')}
      </select>
    </div>
    <div class="control">
      <label for="c-focal">${t.controls.focalLength} <output id="o-focal"></output></label>
      <input id="c-focal" type="range" min="0" step="1">
      <small class="hint" id="h-focal"></small>
    </div>
    <div class="control">
      <label for="c-aperture">${t.controls.aperture} <output id="o-aperture"></output></label>
      <input id="c-aperture" type="range" min="0" max="${APERTURES.length - 1}" step="1">
      <small class="hint" id="h-aperture"></small>
    </div>
    <div class="control">
      <label for="c-focus">${t.controls.focus} <output id="o-focus"></output></label>
      <input id="c-focus" type="range" min="0" max="${FOCUS_STEPS}" step="1">
    </div>`;

  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const sensor = $<HTMLSelectElement>('c-sensor');
  const focal = $<HTMLInputElement>('c-focal');
  const aperture = $<HTMLInputElement>('c-aperture');
  const focus = $<HTMLInputElement>('c-focus');

  sensor.addEventListener('change', () => {
    // Keep the angle of view: pick the new sensor's step closest to the current equivalent focal length.
    const next = SENSORS[sensor.value as SensorId];
    const opts = focalOptions(next);
    const i = nearestIndex(opts.map((o) => o.equivalentMm), store.derived().equivalentFocalMm);
    setCamera(store, { sensorId: next.id, focalLengthMm: opts[i].realMm });
  });
  focal.addEventListener('input', () => {
    const opts = focalOptions(store.derived().sensor);
    setCamera(store, { focalLengthMm: opts[Number(focal.value)].realMm });
  });
  aperture.addEventListener('input', () => setCamera(store, { aperture: APERTURES[Number(aperture.value)] }));
  focus.addEventListener('input', () => setFocus(store, posToFocus(Number(focus.value))));

  store.subscribe((_state, d: Derived) => {
    const s = d.settings;
    sensor.value = s.sensorId;

    const opts = focalOptions(d.sensor);
    const fi = nearestIndex(opts.map((o) => o.realMm), s.focalLengthMm);
    focal.max = String(opts.length - 1);
    focal.value = String(fi);
    $('o-focal').textContent = formatFocal(opts[fi].realMm, d.sensor, t.kb);
    $('h-focal').textContent = opts[fi].native ? '' : t.controls.digitalCropHint;

    const fixed = d.sensor.fixedAperture !== undefined;
    aperture.disabled = fixed;
    aperture.value = String(nearestIndex(APERTURES, s.aperture));
    $('o-aperture').textContent = formatAperture(s.aperture);
    $('h-aperture').textContent = fixed ? t.controls.fixedApertureHint : '';

    focus.value = String(focusToPos(s.focusDistanceM));
    $('o-focus').textContent = formatMeters(s.focusDistanceM);
  });
}


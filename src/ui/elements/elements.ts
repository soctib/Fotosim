// Scene panel – what's in front of the camera: the light situation, and one compact row
// per element (show/hide, distance read + edit, focus on it).

import { LIGHT_PRESETS } from '../../data/lightPresets';
import { de as t } from '../../data/texts.de';
import type { ElementId } from '../../model/types';
import {
  MAX_DISTANCE_M,
  MIN_DISTANCE_M,
  focusOn,
  setElementDistance,
  setElementVisible,
  setInfo,
  setLight,
} from '../../state/actions';
import type { Store } from '../../state/store';

const IDS: ElementId[] = ['person1', 'person2', 'background'];

const showMeters = (m: number) => String(Math.round(m * 100) / 100);

export function mountElements(root: HTMLElement, store: Store): void {
  root.classList.add('elements');
  root.innerHTML = `
    <h3>${t.controls.sectionScene}</h3>
    <label class="scene-light" data-info="light">${t.controls.light}
      <select data-role="light">
        ${LIGHT_PRESETS.map((p) => `<option value="${p.id}">${t.light[p.id as keyof typeof t.light]}</option>`).join('')}
      </select>
    </label>` + IDS.map(
    (id) => `
    <div class="el-row el-${id}" data-id="${id}">
      <label class="toggle el-name"><input type="checkbox" data-role="visible" aria-label="${t.elements.visible}">
        <span class="swatch"></span>${t.elements[id]}</label>
      <label class="el-distance"><span class="sr-only">${t.elements.distance}</span>
        <input type="number" data-role="distance" min="${MIN_DISTANCE_M}" max="${MAX_DISTANCE_M}" step="0.1" inputmode="decimal"> m</label>
      <button type="button" data-role="focus" aria-label="${t.elements.focusHere}">
        <span class="long">${t.elements.focusHere}</span><span class="short">${t.elements.focusHereShort}</span></button>
    </div>`,
  ).join('');

  const light = root.querySelector<HTMLSelectElement>('[data-role="light"]')!;
  light.addEventListener('change', () => setLight(store, light.value));
  light.addEventListener('pointerdown', () => setInfo(store, 'light'));
  light.addEventListener('focus', () => setInfo(store, 'light'));

  for (const id of IDS) {
    const row = root.querySelector<HTMLElement>(`[data-id="${id}"]`)!;
    const visible = row.querySelector<HTMLInputElement>('[data-role="visible"]')!;
    const distance = row.querySelector<HTMLInputElement>('[data-role="distance"]')!;
    const focus = row.querySelector<HTMLButtonElement>('[data-role="focus"]')!;

    visible.addEventListener('change', () => setElementVisible(store, id, visible.checked));
    // Apply while typing as soon as the number is valid; out-of-range values are clamped by the action.
    distance.addEventListener('input', () => {
      const m = distance.valueAsNumber;
      if (Number.isFinite(m) && m > 0) setElementDistance(store, id, m);
    });
    // On commit (blur/Enter) show what the store kept: clamped, or unchanged after empty/invalid input.
    distance.addEventListener('change', () => {
      const el = store.get().scene.elements.find((e) => e.id === id);
      if (el) distance.value = showMeters(el.distanceM);
    });
    focus.addEventListener('click', () => {
      focusOn(store, id);
      setInfo(store, 'focus');
    });
  }

  store.subscribe((state, d) => {
    light.value = state.scene.lightPresetId;
    const tracking = d.settings.afTarget !== null;
    for (const el of state.scene.elements) {
      const row = root.querySelector<HTMLElement>(`[data-id="${el.id}"]`)!;
      const distance = row.querySelector<HTMLInputElement>('[data-role="distance"]')!;
      const focus = row.querySelector<HTMLButtonElement>('[data-role="focus"]')!;
      row.querySelector<HTMLInputElement>('[data-role="visible"]')!.checked = el.visible;
      row.classList.toggle('hidden-el', !el.visible);
      // Don't overwrite what the user is typing.
      if (document.activeElement !== distance) distance.value = showMeters(el.distanceM);
      distance.min = showMeters(d.minDistanceM);
      distance.disabled = !el.visible;
      // Manual focusing is locked while focus tracking is on.
      focus.disabled = !el.visible || tracking;
    }
  });
}

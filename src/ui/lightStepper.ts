// Light situation as a stepper: the current name between "darker" and "brighter" buttons.
// Used in simplified mode under the camera image, where the scene panel with its dropdown is hidden.

import { LIGHT_PRESETS } from '../data/lightPresets';
import { de as t } from '../data/texts.de';
import { setInfo, setLight } from '../state/actions';
import type { Store } from '../state/store';

const MOON = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 2.2a6 6 0 1 0 3.3 9.6A5 5 0 0 1 10.5 2.2z"/></svg>`;
const SUN = `<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" stroke-width="1.6" stroke-linecap="round"/></svg>`;

export function mountLightStepper(root: HTMLElement, store: Store): void {
  root.classList.add('light-stepper');
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', t.controls.light);
  // All names share one grid cell, so the stepper is as wide as the longest name and the buttons don't move.
  root.innerHTML = `
    <button type="button" data-step="1" aria-label="${t.controls.lightDarker}" title="${t.controls.lightDarker}">${MOON}</button>
    <span class="names" aria-live="polite">
      ${LIGHT_PRESETS.map((p) => `<span data-id="${p.id}">${t.light[p.id as keyof typeof t.light]}</span>`).join('')}
    </span>
    <button type="button" data-step="-1" aria-label="${t.controls.lightBrighter}" title="${t.controls.lightBrighter}">${SUN}</button>`;

  // LIGHT_PRESETS runs bright → dark, so +1 is darker.
  const index = () => LIGHT_PRESETS.findIndex((p) => p.id === store.get().scene.lightPresetId);
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('button')];
  for (const b of buttons) {
    b.addEventListener('click', () => {
      const next = LIGHT_PRESETS[index() + Number(b.dataset.step)];
      if (!next) return;
      setLight(store, next.id);
      setInfo(store, 'light');
    });
  }

  store.subscribe((s) => {
    const i = index();
    root.querySelectorAll<HTMLElement>('.names > span').forEach((el) => {
      el.classList.toggle('current', el.dataset.id === s.scene.lightPresetId);
    });
    for (const b of buttons) b.disabled = !LIGHT_PRESETS[i + Number(b.dataset.step)];
  });
}

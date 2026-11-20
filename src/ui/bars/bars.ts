// Vertical exposure, noise and movement bars. Pure output of derive().

import { de as t, fill } from '../../data/texts.de';
import type { Derived } from '../../model/derive';
import { EXPOSURE_SLIGHT, EXPOSURE_STRONG } from '../../model/exposure';
import { setInfo } from '../../state/actions';
import type { Store } from '../../state/store';
import { formatNumber } from '../distance';

/** The exposure bar spans ±3 stops; beyond that the marker sticks to the end. */
const EXPOSURE_RANGE = 3;

/** Movement bar: smear in multiples of the sharpness limit, log scale from ¼× (empty) to 16× (full). */
const MOVEMENT_MIN = 1 / 4;
const MOVEMENT_MAX = 16;
const movementPct = (x: number) =>
  Math.min(100, Math.max(0, (Math.log(x / MOVEMENT_MIN) / Math.log(MOVEMENT_MAX / MOVEMENT_MIN)) * 100));

const signed = (x: number, digits = 1) => {
  const r = Number(x.toFixed(digits));
  return `${r > 0 ? '+' : r < 0 ? '−' : '±'}${formatNumber(Math.abs(r), digits)}`;
};

export function mountBars(root: HTMLElement, store: Store): void {
  root.classList.add('bars');
  const ticks = [-EXPOSURE_STRONG, -EXPOSURE_SLIGHT, 0, EXPOSURE_SLIGHT, EXPOSURE_STRONG];
  const pct = (stops: number) => 50 + (stops / EXPOSURE_RANGE) * 50;
  root.innerHTML = `
    <button type="button" class="bar bar-exposure" data-info="exposure">
      <span class="bar-title">${t.exposure.title}</span>
      <span class="bar-track">
        ${ticks.map((s) => `<span class="bar-tick${s === 0 ? ' zero' : ''}" style="--pos:${pct(s)}%"><span>${s === 0 ? '0' : signed(s, 0)}</span></span>`).join('')}
        <span class="bar-marker"></span>
      </span>
      <span class="bar-value"></span>
      <span class="bar-class"></span>
    </button>
    <button type="button" class="bar bar-noise" data-info="noise">
      <span class="bar-title">${t.noise.title}</span>
      <span class="bar-track"><span class="bar-fill"></span></span>
      <span class="bar-value"></span>
      <span class="bar-class"></span>
    </button>
    <button type="button" class="bar bar-movement" data-info="movement">
      <span class="bar-title">${t.movement.title}</span>
      <span class="bar-track"><span class="bar-fill"></span><span class="bar-limit" style="--pos:${movementPct(1)}%"></span></span>
      <span class="bar-value"></span>
      <span class="bar-class"></span>
    </button>`;

  const exp = root.querySelector<HTMLElement>('.bar-exposure')!;
  const noise = root.querySelector<HTMLElement>('.bar-noise')!;
  exp.addEventListener('click', () => setInfo(store, 'exposure'));
  noise.addEventListener('click', () => setInfo(store, 'noise'));
  const movement = root.querySelector<HTMLElement>('.bar-movement')!;
  movement.addEventListener('click', () => setInfo(store, 'movement'));

  store.subscribe((_s, d: Derived) => {
    const off = d.exposureOffsetStops;
    const clamped = Math.max(-EXPOSURE_RANGE, Math.min(EXPOSURE_RANGE, off));
    const marker = exp.querySelector<HTMLElement>('.bar-marker')!;
    marker.style.setProperty('--pos', `${pct(clamped)}%`);
    marker.classList.toggle('beyond', clamped !== off);
    exp.dataset.cls = d.exposureClass;
    exp.querySelector('.bar-value')!.textContent = fill(t.exposure.stops, { value: signed(off) });
    exp.querySelector('.bar-class')!.textContent = t.exposure[d.exposureClass];

    noise.dataset.cls = d.noise.cls;
    noise.querySelector<HTMLElement>('.bar-fill')!.style.setProperty('--fill', `${Math.max(2, d.noise.amount * 100)}%`);
    noise.querySelector('.bar-class')!.textContent = t.noise[d.noise.cls];
    noise.querySelector('.bar-value')!.textContent = fill(t.noise.equivalentIso, {
      iso: formatNumber(roundIso(d.noise.equivalentIso)),
    });

    const subj = d.subject;
    movement.dataset.cls = subj?.movementCls ?? 'sharp';
    movement.classList.toggle('empty', !subj);
    const movementFill = movement.querySelector<HTMLElement>('.bar-fill')!;
    movementFill.style.setProperty('--fill', subj ? `${Math.max(2, movementPct(subj.movementBlur))}%` : '0%');
    movement.querySelector('.bar-class')!.textContent = subj ? t.movement[subj.movementCls] : '';
    const kmh = subj ? subj.relativeSpeedMs * 3.6 : 0;
    movement.querySelector('.bar-value')!.textContent = subj
      ? fill(t.movement.value, { name: t.elements[subj.id], speed: formatNumber(kmh, kmh < 1 ? 1 : 0) })
      : t.movement.none;
  });
}

/** Two significant digits – "ISO 3800" reads better than "ISO 3829". */
function roundIso(iso: number): number {
  const p = 10 ** Math.max(0, Math.floor(Math.log10(iso)) - 1);
  return Math.round(iso / p) * p;
}

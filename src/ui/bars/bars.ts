// Vertical exposure and noise bars. Pure output of derive().

import { de as t, fill } from '../../data/texts.de';
import type { Derived } from '../../model/derive';
import { EXPOSURE_SLIGHT, EXPOSURE_STRONG } from '../../model/exposure';
import { setInfo } from '../../state/actions';
import type { Store } from '../../state/store';
import { formatNumber } from '../distance';

/** The exposure bar spans ±3 stops; beyond that the marker sticks to the end. */
const EXPOSURE_RANGE = 3;

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
        ${ticks.map((s) => `<span class="bar-tick${s === 0 ? ' zero' : ''}" style="bottom:${pct(s)}%"><span>${s === 0 ? '0' : signed(s, 0)}</span></span>`).join('')}
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
    </button>`;

  const exp = root.querySelector<HTMLElement>('.bar-exposure')!;
  const noise = root.querySelector<HTMLElement>('.bar-noise')!;
  exp.addEventListener('click', () => setInfo(store, 'exposure'));
  noise.addEventListener('click', () => setInfo(store, 'noise'));

  store.subscribe((_s, d: Derived) => {
    const off = d.exposureOffsetStops;
    const clamped = Math.max(-EXPOSURE_RANGE, Math.min(EXPOSURE_RANGE, off));
    const marker = exp.querySelector<HTMLElement>('.bar-marker')!;
    marker.style.bottom = `${pct(clamped)}%`;
    marker.classList.toggle('beyond', clamped !== off);
    exp.dataset.cls = d.exposureClass;
    exp.querySelector('.bar-value')!.textContent = fill(t.exposure.stops, { value: signed(off) });
    exp.querySelector('.bar-class')!.textContent = t.exposure[d.exposureClass];

    noise.dataset.cls = d.noise.cls;
    noise.querySelector<HTMLElement>('.bar-fill')!.style.height = `${Math.max(2, d.noise.amount * 100)}%`;
    noise.querySelector('.bar-class')!.textContent = t.noise[d.noise.cls];
    noise.querySelector('.bar-value')!.textContent = fill(t.noise.equivalentIso, {
      iso: formatNumber(roundIso(d.noise.equivalentIso)),
    });
  });
}

/** Two significant digits – "ISO 3800" reads better than "ISO 3829". */
function roundIso(iso: number): number {
  const p = 10 ** Math.max(0, Math.floor(Math.log10(iso)) - 1);
  return Math.round(iso / p) * p;
}

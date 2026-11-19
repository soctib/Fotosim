// Lens classes with rough prices and phone classes; highlights what fits the current settings.

import { LENS_CLASSES } from '../../data/lensPrices';
import { PHONE_CLASSES } from '../../data/phones';
import { de as t, fill } from '../../data/texts.de';
import type { Store } from '../../state/store';
import { formatNumber } from '../distance';

export function mountGear(root: HTMLDetailsElement, store: Store): void {
  root.classList.add('gear');
  root.innerHTML = `
    <summary>${t.gear.title}</summary>
    <h3>${t.gear.lenses}</h3>
    <p class="gear-note" data-role="lens-note"></p>
    <ul data-role="lenses">
      ${LENS_CLASSES.map(
        (l) => `<li data-id="${l.id}"><span>${t.lenses[l.id as keyof typeof t.lenses]}</span>
          <span class="price">${fill(t.gear.price, { min: formatNumber(l.priceEur[0]), max: formatNumber(l.priceEur[1]) })}</span></li>`,
      ).join('')}
    </ul>
    <h3>${t.gear.phones}</h3>
    <p class="gear-note" data-role="phone-note"></p>
    <ul data-role="phones">
      ${PHONE_CLASSES.map(
        (p) => `<li data-id="${p.id}"><span>${t.phones[p.id as keyof typeof t.phones]}
          <small>${fill(t.gear.phoneLenses, { list: p.lensesEqMm.join(' / ') })}</small></span></li>`,
      ).join('')}
    </ul>
    <p class="gear-note">${t.phones.portraitModeNote}</p>`;

  // Open by default where it has its own column; collapsed where it would push things down.
  const wide = window.matchMedia('(min-width: 1400px)');
  root.open = wide.matches;
  wide.addEventListener('change', () => (root.open = wide.matches));

  const lensNote = root.querySelector<HTMLElement>('[data-role="lens-note"]')!;
  const phoneNote = root.querySelector<HTMLElement>('[data-role="phone-note"]')!;

  store.subscribe((_s, d) => {
    const isPhone = d.sensor.fixedAperture !== undefined;
    const mark = (list: string, ids: string[]) =>
      root.querySelectorAll<HTMLElement>(`[data-role="${list}"] li`).forEach((li) => {
        const match = ids.includes(li.dataset.id!);
        li.classList.toggle('match', match);
        li.title = match ? t.gear.matches : '';
      });
    mark('lenses', d.gear.lensIds);
    mark('phones', d.gear.phoneIds);
    lensNote.textContent = isPhone ? t.gear.phoneHasNoLenses : d.gear.lensIds.length ? '' : t.gear.noLensMatch;
    phoneNote.textContent = isPhone && !d.gear.phoneIds.length ? t.gear.noPhoneMatch : '';
  });
}

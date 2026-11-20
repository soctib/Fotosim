// Rough price of the gear in use: camera (or phone), lens, tripod and the sum.

import type { PriceRange } from '../../data/prices';
import { de as t, fill } from '../../data/texts.de';
import { rememberFold } from '../../state/persist';
import type { Store } from '../../state/store';
import { formatNumber } from '../distance';

const price = ([min, max]: PriceRange) =>
  fill(t.costs.price, { min: formatNumber(min), max: formatNumber(max) });

const row = (label: string, name: string, detail: string, value: string, cls = '') =>
  `<li class="${cls}"><span><b>${label}</b> ${name}${detail ? `<small>${detail}</small>` : ''}</span>
    <span class="price">${value}</span></li>`;

export function mountCosts(root: HTMLDetailsElement, store: Store): void {
  root.classList.add('costs');
  root.innerHTML = `
    <summary>${t.costs.title}</summary>
    <p class="costs-note">${t.costs.intro}</p>
    <ul data-role="items"></ul>
    <p class="costs-note" data-role="notes"></p>`;

  // Open by default where it has its own column; collapsed where it would push things down.
  // The user's choice is remembered per layout, since the two place it so differently.
  const wide = window.matchMedia('(min-width: 1400px)');
  const fold = rememberFold(root, () => (wide.matches ? 'costs.wide' : 'costs.narrow'), () => wide.matches);
  wide.addEventListener('change', fold.restore);

  const items = root.querySelector<HTMLElement>('[data-role="items"]')!;
  const notes = root.querySelector<HTMLElement>('[data-role="notes"]')!;

  store.subscribe((s, d) => {
    const c = d.costs;
    const used = c.used ? ` · ${t.costs.used}` : '';
    const sensorId = s.camera.sensorId;
    items.innerHTML = [
      row(c.phone ? t.costs.phone : t.costs.camera, t.sensors[sensorId], t.costs.examples[sensorId], price(c.camera) + used),
      c.lens
        ? row(t.costs.lens, t.costs.lenses[c.lens.kind], '', price(c.lens.priceEur) + used)
        : !c.phone
          ? row(t.costs.lens, t.costs.builtIn, '', '')
          : '',
      c.tripod ? row(t.costs.tripod, '', c.phone ? t.costs.tripodFor.phone : t.costs.tripodFor.camera, price(c.tripod)) : '',
      row(t.costs.total, '', '', price(c.totalEur), 'total'),
    ].join('');
    notes.innerHTML = [
      c.used ? t.costs.usedNote : '',
      c.film
        ? fill(t.costs.filmNote, {
            min: formatNumber(c.film.rollEur[0]),
            max: formatNumber(c.film.rollEur[1]),
            frames: c.film.framesPerRoll,
            perFrame: formatNumber(c.film.perFrameEur, 1),
          })
        : '',
      d.sensor.isFilm && d.crop < 0.9 ? t.costs.mediumFormatFilmNote : '',
      c.lens && Math.abs(d.crop - 1) > 0.05 ? t.costs.lensEquivalent : '',
    ]
      .filter(Boolean)
      .join(' ');
  });
}

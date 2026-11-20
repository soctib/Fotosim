// Explanation for the last touched element, filled with live values. Foldable: folded, the
// summary just says "Hilfe"; unfolded it shows the current title.

import { de as t, fill } from '../../data/texts.de';
import { formatAperture, formatShutter } from '../../model/stops';
import type { Store } from '../../state/store';
import { formatMeterRange } from '../distance';

export function mountInfobox(root: HTMLDetailsElement, store: Store): void {
  root.classList.add('infobox');
  root.innerHTML = `<summary><span class="info-folded">${t.infoFolded}</span><h2></h2></summary><p aria-live="polite"></p>`;
  const title = root.querySelector('h2')!;
  const text = root.querySelector('p')!;

  store.subscribe((state, d) => {
    // Without details there is no curve to talk about.
    const key = state.ui.infoKey === 'graph' && !state.ui.showDetails ? 'graphSimple' : state.ui.infoKey;
    title.textContent = t.infoTitles[key];
    text.textContent = fill(t.info[key], {
      aperture: formatAperture(d.settings.aperture),
      maxAperture: formatAperture(d.maxAperture),
      eqAperture: formatAperture(d.equivalentAperture),
      handLimit: formatShutter(d.shake.limitS, t.locale),
      isLimit: formatShutter(d.shake.limitIsS, t.locale),
      dof: formatMeterRange(d.dof.nearM, d.dof.farM),
    });
  });
}

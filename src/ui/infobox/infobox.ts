// Explanation for the last touched element, filled with live values. Foldable: folded, the
// summary just says "Hilfe"; unfolded it shows the current title.

import { de as t, fill } from '../../data/texts.de';
import { formatAperture, formatShutter } from '../../model/stops';
import type { InfoKey, Store } from '../../state/store';
import { formatMeterRange, formatMp, formatNumber } from '../distance';

/** Stops to the nearest half: "14", "13,5". */
const stops = (x: number) => {
  const r = Math.round(x * 2) / 2;
  return formatNumber(r, r % 1 ? 1 : 0);
};
const signedStops = (x: number) => `${x > 0 ? '+' : x < 0 ? '−' : '±'}${stops(Math.abs(x))}`;

export function mountInfobox(root: HTMLDetailsElement, store: Store): void {
  root.classList.add('infobox');
  root.innerHTML = `<summary><span class="info-folded">${t.infoFolded}</span><h2></h2></summary><div aria-live="polite"></div>`;
  const title = root.querySelector('h2')!;
  const text = root.querySelector('div')!;

  store.subscribe((state, d) => {
    // Without details there is no curve to talk about.
    // On a tripod there is no handheld limit to quote.
    const tripod = !Number.isFinite(d.shake.limitS);
    const key: InfoKey =
      state.ui.infoKey === 'graph' && !state.ui.showDetails
        ? 'graphSimple'
        : state.ui.infoKey === 'shutter' && tripod
          ? 'shutterTripod'
          : state.ui.infoKey;
    title.textContent = t.infoTitles[key];
    const aperture = formatAperture(d.settings.aperture);
    const filled = fill(t.info[key], {
      aperture,
      maxAperture: formatAperture(d.maxAperture),
      eqAperture: formatAperture(d.equivalentAperture),
      handLimit: formatShutter(d.shake.limitS, t.locale),
      isLimit: formatShutter(d.shake.limitIsS, t.locale),
      dof: formatMeterRange(d.dof.nearM, d.dof.farM),
      subject: d.subject ? t.elements[d.subject.id] : t.movement.none,
      mp: formatMp(d.resolution.nominalMp),
      range: stops(d.dynamicRange.rangeStops),
      clip: signedStops(d.dynamicRange.clipStops),
      floor: signedStops(d.dynamicRange.floorStops),
      sharpMp: formatMp(d.outputSize.results.find((x) => x.id === 'a4' && x.view === 'normal')!.sharpMp),
    });
    // Paragraphs: "\n\n" in the texts.
    text.replaceChildren(
      ...filled.split('\n\n').map((para) => Object.assign(document.createElement('p'), { textContent: para })),
    );
  });
}


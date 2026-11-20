// Explanation for the last touched element, filled with live values. Foldable: folded, the
// summary just says "Hilfe"; unfolded it shows the current title. Some topics add a live detail
// block below the text (resolution: what costs the detail).

import { de as t, fill } from '../../data/texts.de';
import type { Derived } from '../../model/derive';
import { formatAperture, formatShutter } from '../../model/stops';
import type { InfoKey, Store } from '../../state/store';
import { formatMp } from '../bars/bars';
import { formatMeterRange } from '../distance';

export function mountInfobox(root: HTMLDetailsElement, store: Store): void {
  root.classList.add('infobox');
  root.innerHTML = `<summary><span class="info-folded">${t.infoFolded}</span><h2></h2></summary><p aria-live="polite"></p><div class="info-extra"></div>`;
  const title = root.querySelector('h2')!;
  const text = root.querySelector('p')!;
  const extra = root.querySelector<HTMLElement>('.info-extra')!;

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
    text.textContent = fill(t.info[key], {
      aperture,
      maxAperture: formatAperture(d.maxAperture),
      eqAperture: formatAperture(d.equivalentAperture),
      handLimit: formatShutter(d.shake.limitS, t.locale),
      isLimit: formatShutter(d.shake.limitIsS, t.locale),
      dof: formatMeterRange(d.dof.nearM, d.dof.farM),
      subject: d.subject ? t.elements[d.subject.id] : t.movement.none,
      nominal: formatMp(d.resolution.nominalMp),
      mp: formatMp(d.resolution.nominalMp),
      because: fill(t.resolution.because[d.resolution.bottleneck], { aperture }),
    });
    extra.innerHTML = key === 'resolution' ? resolutionShares(d) : '';
  });
}

/**
 * The contributions as shares of the total blur. They add as squares (see model/resolution.ts),
 * so each one's share of the sum of squares is what removing it would win back, roughly.
 */
function resolutionShares(d: Derived): string {
  const r = d.resolution;
  const total = r.totalBlurUm ** 2;
  const rows = r.contributions
    .map((c) => ({ c, share: (c.um * c.um) / total }))
    .filter(({ share }) => share >= 0.02)
    .map(
      ({ c, share }) =>
        `<li><span>${t.resolution.factors[c.factor]}</span><span class="share-bar" style="--share:${(share * 100).toFixed(1)}%"></span><span>${Math.round(share * 100)} %</span></li>`,
    )
    .join('');
  return `<h3>${t.resolution.sharesTitle}</h3><ul class="shares">${rows}</ul>`;
}

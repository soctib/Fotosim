// Explanation for the last touched element, filled with live values. Foldable: folded, the
// summary just says "Hilfe"; unfolded it shows the current title. Some topics add a live detail
// block below the text (resolution: how big the photo can be shown, and what costs the detail).

import { de as t, fill } from '../../data/texts.de';
import type { Derived } from '../../model/derive';
import { OUTPUT_TARGETS, type OutputTargetId, type OutputView } from '../../model/outputSize';
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
    extra.innerHTML = key === 'resolution' ? outputTable(d) + resolutionShares(d) : '';
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

const SYMBOLS = { sharp: '✓', ok: '~', soft: '✗' } as const;

/** Summary sentence plus a compact table: each screen and print size, up close and at normal distance. */
function outputTable(d: Derived): string {
  const o = d.outputSize;
  const ts = t.outputSize;
  const summary = [
    o.close ? fill(ts.summaryClose[o.close.verdict === 'sharp' ? 'sharp' : 'ok'], { size: ts.targets[o.close.id] }) : ts.summaryClose.none,
    o.normal.reason === 'noise' && o.normal.verdict !== 'sharp' ? ts.summaryNormal.grainy : ts.summaryNormal[o.normal.verdict],
  ].join(' ');
  const cell = (id: OutputTargetId, view: OutputView) => {
    const r = o.results.find((x) => x.id === id && x.view === view);
    if (!r) return '<td class="na">–</td>';
    const label = r.reason === 'noise' ? ts.grainy : ts.verdicts[r.verdict];
    return `<td class="out-${r.verdict}" title="${label}" aria-label="${label}">${SYMBOLS[r.verdict]}</td>`;
  };
  const rows = OUTPUT_TARGETS.map(
    (target) => `<tr><th scope="row">${ts.targets[target.id]}</th>${cell(target.id, 'close')}${cell(target.id, 'normal')}</tr>`,
  ).join('');
  return `<h3>${ts.title}</h3>
    <p class="out-summary">${summary}</p>
    <table class="out-table"><thead><tr><th></th><th scope="col">${ts.close}</th><th scope="col">${ts.normal}</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="out-note">${ts.legend}</p>
    <p class="out-note">${ts.intro}</p>`;
}

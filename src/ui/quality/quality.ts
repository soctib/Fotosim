// "Wofür reicht das Foto?" – how much real detail the photo holds, what costs it, and which
// screens and prints it still looks good on. Pure output of derive().

import { de as t, fill } from '../../data/texts.de';
import type { Derived } from '../../model/derive';
import { OUTPUT_TARGETS, type OutputTargetId, type OutputView } from '../../model/outputSize';
import { formatAperture } from '../../model/stops';
import { setInfo } from '../../state/actions';
import { rememberFold } from '../../state/persist';
import type { Store } from '../../state/store';
import { formatMp } from '../distance';

const SYMBOLS = { sharp: '✓', ok: '~', soft: '✗' } as const;

export function mountQuality(root: HTMLDetailsElement, store: Store): void {
  root.classList.add('quality');
  root.innerHTML = `
    <summary>${t.outputSize.title}</summary>
    <div class="quality-body">
      <div class="quality-detail">
        <p class="quality-headline"><b data-role="mp"></b> ${t.resolution.headlineLabel}<small data-role="file"></small></p>
        <p class="quality-because" data-role="because"></p>
        <h3>${t.resolution.sharesTitle}</h3>
        <ul class="shares" data-role="shares"></ul>
        <p class="out-note">${t.resolution.sharesNote}</p>
        <button type="button" class="link" data-role="more">${t.resolution.more}</button>
      </div>
      <div class="quality-output">
        <p class="out-summary" data-role="summary"></p>
        <table class="out-table">
          <thead><tr><th scope="col">${t.outputSize.size}</th><th scope="col">${t.outputSize.close}</th><th scope="col">${t.outputSize.normal}</th><th scope="col">${t.outputSize.need}</th></tr></thead>
          <tbody data-role="rows"></tbody>
        </table>
        <p class="out-note">${t.outputSize.legend}</p>
        <p class="out-note" data-role="intro"></p>
      </div>
    </div>`;
  rememberFold(root, () => 'quality', () => true);

  const $ = (role: string) => root.querySelector<HTMLElement>(`[data-role="${role}"]`)!;
  $('more').addEventListener('click', () => setInfo(store, 'resolution'));

  store.subscribe((_, d) => {
    const r = d.resolution;
    $('mp').textContent = fill(t.resolution.megapixels, { value: formatMp(r.effectiveMp) });
    const nominal = formatMp(r.nominalMp);
    $('file').textContent = d.sensor.isFilm
      ? fill(t.resolution.fileFilm, { nominal })
      : d.zoom.factor > 1
        ? fill(t.resolution.fileZoom, { nominal, factor: formatMp(d.zoom.factor) })
        : fill(t.resolution.file, { nominal });
    $('because').textContent = fill(t.resolution.because[r.bottleneck], { aperture: formatAperture(d.settings.aperture) });
    $('shares').innerHTML = shares(d);
    $('summary').textContent = summary(d);
    $('rows').innerHTML = rows(d);
    const normal = d.outputSize.results.find((x) => x.id === 'a4' && x.view === 'normal')!;
    $('intro').textContent = fill(t.outputSize.intro, { mp: formatMp(normal.sharpMp) });
  });
}

/**
 * The contributions as shares of the total blur. They add as squares (see model/resolution.ts),
 * so each one's share of the sum of squares is what removing it would win back, roughly.
 */
function shares(d: Derived): string {
  const r = d.resolution;
  const total = r.totalBlurUm ** 2;
  return r.contributions
    .map((c) => ({ c, share: (c.um * c.um) / total }))
    .filter(({ share }) => share >= 0.02)
    .map(
      ({ c, share }) =>
        `<li><span>${t.resolution.factors[c.factor]}</span><span class="share-bar" style="--share:${(share * 100).toFixed(1)}%"></span><span>${Math.round(share * 100)} %</span></li>`,
    )
    .join('');
}

function summary(d: Derived): string {
  const o = d.outputSize;
  const ts = t.outputSize;
  return [
    o.close ? fill(ts.summaryClose[o.close.verdict === 'sharp' ? 'sharp' : 'ok'], { size: ts.targets[o.close.id] }) : ts.summaryClose.none,
    o.normal.reason === 'noise' && o.normal.verdict !== 'sharp' ? ts.summaryNormal.grainy : ts.summaryNormal[o.normal.verdict],
  ].join(' ');
}

/** Each screen and print size: verdict up close and at normal distance, and the MP it needs to look sharp. */
function rows(d: Derived): string {
  const ts = t.outputSize;
  const find = (id: OutputTargetId, view: OutputView) => d.outputSize.results.find((x) => x.id === id && x.view === view);
  const cell = (id: OutputTargetId, view: OutputView) => {
    const r = find(id, view);
    if (!r) return '<td class="na">–</td>';
    const label = r.reason === 'noise' ? ts.grainy : ts.verdicts[r.verdict];
    return `<td class="out-${r.verdict}" title="${label}" aria-label="${label}">${SYMBOLS[r.verdict]}</td>`;
  };
  return OUTPUT_TARGETS.map((target) => {
    const need = (find(target.id, 'close') ?? find(target.id, 'normal'))!.sharpMp;
    return `<tr><th scope="row">${ts.targets[target.id]}</th>${cell(target.id, 'close')}${cell(target.id, 'normal')}<td class="out-need">${fill(t.resolution.megapixels, { value: formatMp(need) })}</td></tr>`;
  }).join('');
}

// "Wofür reicht das Foto?" – the effective resolution as a budget (how much of what the sensor or
// film can deliver the photo reaches, and what each factor costs), and which screens and prints it
// still looks good on. Pure output of derive().

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
        <p class="quality-headline"><b data-role="mp"></b> ${t.resolution.headlineLabel}</p>
        <p class="quality-reached"><span data-role="reached"></span><small data-role="file"></small></p>
        <p class="quality-because" data-role="because"></p>
        <div data-role="losses-block">
          <h3>${t.resolution.lossesTitle}</h3>
          <ul class="shares" data-role="losses"></ul>
        </div>
      </div>
      <div class="quality-output">
        <p class="out-summary" data-role="summary"></p>
        <table class="out-table">
          <thead><tr><th scope="col">${t.outputSize.size}</th><th scope="col">${t.outputSize.close}</th><th scope="col">${t.outputSize.normal}</th><th scope="col">${t.outputSize.need}</th></tr></thead>
          <tbody data-role="rows"></tbody>
        </table>
        <p class="out-note">${t.outputSize.legend}</p>
      </div>
    </div>`;
  rememberFold(root, () => 'quality', () => true);

  const $ = (role: string) => root.querySelector<HTMLElement>(`[data-role="${role}"]`)!;
  // The help box explains whichever half the pointer is on (touch: whichever was tapped).
  const explain = (selector: string, key: 'resolution' | 'output') =>
    root.querySelector(selector)!.addEventListener('pointerenter', () => setInfo(store, key));
  explain('.quality-detail', 'resolution');
  explain('.quality-output', 'output');

  store.subscribe((_, d) => {
    const r = d.resolution;
    $('mp').textContent = fill(t.resolution.megapixels, { value: formatMp(r.effectiveMp) });
    const nominal = formatMp(r.nominalMp);
    $('reached').textContent = fill(r.base === 'film' ? t.resolution.reachedFilm : t.resolution.reached, {
      pct: Math.round(r.reached * 100),
      ceiling: formatMp(r.ceilingMp),
    });
    $('file').textContent = d.sensor.isFilm
      ? fill(t.resolution.fileFilm, { nominal })
      : d.zoom.factor > 1
        ? fill(t.resolution.fileZoom, { nominal, factor: formatMp(d.zoom.factor) })
        : fill(t.resolution.file, { nominal });
    $('because').textContent = because(d);
    const list = losses(d);
    $('losses').innerHTML = list;
    $('losses-block').hidden = !list;
    $('summary').textContent = summary(d);
    $('rows').innerHTML = rows(d);
  });
}

/** One sentence on the largest loss and what would help. */
function because(d: Derived): string {
  const r = d.resolution;
  const tr = t.resolution;
  const text =
    r.mainLoss === 'diffraction' && d.sensor.phoneCameras
      ? tr.becauseDiffractionPhone
      : r.mainLoss === 'lens' && d.lensCause
        ? d.lensCause === 'design'
          ? tr.becauseLens.design[d.settings.lensId]
          : tr.becauseLens[d.lensCause]
        : tr.because[r.mainLoss ?? r.base];
  return fill(text, { aperture: formatAperture(d.settings.aperture), medium: tr.medium[r.base] });
}

/** What each factor costs, as a share of the ceiling (they add up with the share reached, see model/resolution.ts). */
function losses(d: Derived): string {
  return d.resolution.losses
    .filter(({ share }) => share >= 0.02)
    .map(
      ({ factor, share }) =>
        `<li><span>${t.resolution.factors[factor]}</span><span class="share-bar" style="--share:${(share * 100).toFixed(1)}%"></span><span>${Math.round(share * 100)} %</span></li>`,
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

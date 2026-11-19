// Heading of the foldable camera-image group. Folded, it gives the verdict in words –
// exposure and noise – so nothing is lost when the image is hidden.

import { de as t } from '../data/texts.de';
import type { Store } from '../state/store';

export function mountPreviewSummary(group: HTMLDetailsElement, store: Store): void {
  const summary = group.querySelector('summary')!;

  function render(): void {
    if (group.open) {
      summary.textContent = t.sim.group;
      return;
    }
    const d = store.derived();
    const [before, between, after] = t.sim.groupFolded.split(/\{exposure\}|\{noise\}/);
    summary.innerHTML = '';
    summary.append(
      before,
      verdict(t.sim.exposureVerdict[d.exposureClass], `exp-${d.exposureClass}`),
      between,
      verdict(t.sim.noiseVerdict[d.noise.cls], `noise-${d.noise.cls}`),
      after ?? '',
    );
  }

  group.addEventListener('toggle', render);
  store.subscribe(render);
}

function verdict(text: string, cls: string): HTMLElement {
  const span = document.createElement('span');
  span.className = `verdict ${cls}`;
  span.textContent = text;
  return span;
}

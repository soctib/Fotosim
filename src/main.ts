import './style.css';
import { de as t } from './data/texts.de';
import { applySimple, setSimple } from './state/actions';
import { createStore, initialState } from './state/store';
import { mountBars } from './ui/bars/bars';
import { mountControls } from './ui/controls/controls';
import { mountElements } from './ui/elements/elements';
import { mountGear } from './ui/gear/gear';
import { mountGraph } from './ui/graph/graph';
import { mountInfobox } from './ui/infobox/infobox';
import { mountPreviewSummary } from './ui/previewSummary';
import { mountSim } from './ui/sim/sim';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header>
    <div>
      <h1>${t.appTitle}</h1>
      <p>${t.appSubtitle}</p>
    </div>
    <label class="toggle all-settings"><input type="checkbox" id="c-all-settings"> ${t.allSettings}</label>
  </header>
  <main class="layout">
    <div class="stage">
      <section id="graph"></section>
      <details class="preview" open>
        <summary>${t.sim.group}</summary>
        <div class="preview-body">
          <section id="sim"></section>
          <section id="bars"></section>
        </div>
      </details>
      <section id="elements"></section>
    </div>
    <aside id="controls"></aside>
    <div class="col-info">
      <section id="infobox"></section>
      <details id="gear"></details>
    </div>
  </main>`;

const $ = <T extends HTMLElement>(sel: string) => app.querySelector<T>(sel)!;
// Opens in simplified mode: beginners see the reduced UI first.
const store = createStore(applySimple(initialState));
mountSim($('#sim'), store);
mountBars($('#bars'), store);
mountGraph($('#graph'), store);
mountPreviewSummary($<HTMLDetailsElement>('.preview'), store);
mountElements($('#elements'), store);
mountControls($('#controls'), store);
mountInfobox($('#infobox'), store);
mountGear($<HTMLDetailsElement>('#gear'), store);

// Wide layout: while the lens/phone list is folded, the third column has room – move the
// lens panel there (under the infobox). Otherwise it stays under the camera panel.
const wide = window.matchMedia('(min-width: 1400px)');
const gear = $<HTMLDetailsElement>('#gear');
const lensPanel = $<HTMLElement>('#lens-panel');
function placeLensPanel(): void {
  // Simplified mode hides the third column's content, so the lens panel stays with the controls.
  if (wide.matches && !gear.open && !store.get().ui.simple) gear.before(lensPanel);
  else $('#controls').append(lensPanel);
}
gear.addEventListener('toggle', placeLensPanel);
wide.addEventListener('change', placeLensPanel);

// Simplified mode: CSS hides everything but the graph, the camera image and three sliders.
const allSettings = $<HTMLInputElement>('#c-all-settings');
const preview = $<HTMLDetailsElement>('.preview');
allSettings.addEventListener('change', () => setSimple(store, !allSettings.checked));
let wasSimple: boolean | null = null;
store.subscribe((s) => {
  if (s.ui.simple === wasSimple) return;
  wasSimple = s.ui.simple;
  allSettings.checked = !s.ui.simple;
  document.body.classList.toggle('simple', s.ui.simple);
  // Its fold heading is hidden in simplified mode, so the camera image must not stay folded.
  if (s.ui.simple) preview.open = true;
  placeLensPanel();
});

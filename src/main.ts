import './style.css';
import { de as t } from './data/texts.de';
import { createStore } from './state/store';
import { mountBars } from './ui/bars/bars';
import { mountControls } from './ui/controls/controls';
import { mountElements } from './ui/elements/elements';
import { mountGear } from './ui/gear/gear';
import { mountGraph } from './ui/graph/graph';
import { mountInfobox } from './ui/infobox/infobox';
import { mountSim } from './ui/sim/sim';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header>
    <h1>${t.appTitle}</h1>
    <p>${t.appSubtitle}</p>
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
    <section id="infobox"></section>
    <details id="gear"></details>
  </main>`;

const $ = <T extends HTMLElement>(sel: string) => app.querySelector<T>(sel)!;
const store = createStore();
mountSim($('#sim'), store);
mountBars($('#bars'), store);
mountGraph($('#graph'), store);
mountElements($('#elements'), store);
mountControls($('#controls'), store);
mountInfobox($('#infobox'), store);
mountGear($<HTMLDetailsElement>('#gear'), store);

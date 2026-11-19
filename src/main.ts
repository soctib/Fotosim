import './style.css';
import { de as t } from './data/texts.de';
import { createStore } from './state/store';
import { mountControls } from './ui/controls/controls';
import { mountGraph } from './ui/graph/graph';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header>
    <h1>${t.appTitle}</h1>
    <p>${t.appSubtitle}</p>
  </header>
  <main class="layout">
    <section id="graph"></section>
    <aside id="controls"></aside>
  </main>`;

const store = createStore();
mountGraph(app.querySelector('#graph')!, store);
mountControls(app.querySelector('#controls')!, store);

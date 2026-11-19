// Placeholder entry point: renders a debug readout of the derived model
// until the real UI modules (ui/*) exist.

import './style.css';
import { de as t } from './data/texts.de';
import { formatFocal } from './model/focal';
import { formatAperture, formatShutter } from './model/stops';
import { createStore } from './state/store';

const app = document.querySelector<HTMLDivElement>('#app')!;
const store = createStore();

store.subscribe((state, d) => {
  const m = (x: number) => (Number.isFinite(x) ? `${x.toFixed(2)} m` : '∞');
  app.innerHTML = `
    <h1>${t.appTitle}</h1>
    <p>${t.appSubtitle}</p>
    <p><em>${t.scaffoldNote}</em></p>
    <dl>
      <dt>${t.controls.sensor}</dt><dd>${t.sensors[state.camera.sensorId]} (Crop ${d.crop.toFixed(2)})</dd>
      <dt>${t.controls.mode}</dt><dd>${t.modes[d.settings.mode].name}</dd>
      <dt>${t.controls.focalLength}</dt><dd>${formatFocal(d.settings.focalLengthMm, d.sensor, t.kb)}</dd>
      <dt>${t.controls.aperture}</dt><dd>${formatAperture(d.settings.aperture)}</dd>
      <dt>${t.controls.shutter}</dt><dd>${formatShutter(d.settings.shutterS)} – ${t.shake[d.shake.cls]}</dd>
      <dt>${t.controls.iso}</dt><dd>${d.settings.iso}</dd>
      <dt>${t.graph.dof}</dt><dd>${m(d.dof.nearM)} – ${m(d.dof.farM)}</dd>
      <dt>${t.exposure.title}</dt><dd>${d.exposureOffsetStops.toFixed(1)} EV (${t.exposure[d.exposureClass]})</dd>
      <dt>${t.noise.title}</dt><dd>${t.noise[d.noise.cls]}</dd>
    </dl>`;
});

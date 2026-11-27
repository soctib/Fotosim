// The camera seen from above – a second view of the controls ("Kamera | Regler"). It edits the
// same store as the sliders through the same actions and draws only from derive()'s result.
// Dials and rings are dragged sideways (Pointer Events, mouse and touch alike), tapped, or
// focused and turned with the arrow keys.

import { BODY_SHAPES, type BodyShape } from '../../data/cameraBodies';
import { CAMERA_LENSES } from '../../data/cameraLenses';
import { LENS_SHAPES } from '../../data/lensShapes';
import { SENSORS } from '../../data/sensors';
import { de as t, fill } from '../../data/texts.de';
import {
  compactZoomAfterDrag,
  dialIndex,
  dialRole,
  DRAG_STEP_MM,
  dragClicks,
  entrancePupilMm,
  filmSpeeds,
  filmApertureStops,
  filmDialsAuto,
  filmMode,
  drawingMaxHeight,
  focalAfterZoomTurn,
  focusFromRingAngle,
  focusMarks,
  focusRingAngle,
  focusScaleMinM,
  LENS_ROOM_FACTOR,
  lensParts,
  MODE_DIAL,
  panelLayout,
  stepInList,
  stepIso,
  stepMode,
  systemLensScale,
  zoomFraction,
  zoomMarks,
  zoomRingAngle,
  ZOOM_RING_SPAN_DEG,
  type Dial,
  type LensPart,
} from '../../model/cameraPanel';
import type { Derived } from '../../model/derive';
import { equivalentToZoomPosition, focalOptions, formatFocal, snapFocal } from '../../model/focal';
import { APERTURES, formatAperture, formatShutter, ISOS, SHUTTER_SPEEDS_S } from '../../model/stops';
import { EQUIVALENT_FOCAL_STEPS_MM } from '../../data/sensors';
import type { Mode } from '../../model/types';
import { MAX_DISTANCE_M, setCamera, setControlView, setFocus, setInfo, setMode } from '../../state/actions';
import type { AppState, InfoKey, Store } from '../../state/store';
import { formatMeters, formatNumber } from '../distance';
import { drawRig, type CtlId, type RigView } from './body';
import type { LcdField } from './lcd';
import type { LensView, RingMarkView, RingView } from './lens';
import { r2 } from './svg';

/**
 * Open question settled for now: the panel is part of the full view only. Simplified mode keeps its
 * three sliders; set to true to offer the camera there too (CSS for simple mode would need a look).
 */
export const CAMERA_PANEL_IN_SIMPLE_MODE = false;
/**
 * Open question settled for now: every body gets a top display, even where the real representative
 * has none (BODY_SHAPES[…].realTopDisplay) – it is where the values are read and set. false: those
 * bodies show the values on a folded-out rear screen card instead (the dials still work).
 */
export const DRAW_TOP_DISPLAY_ALWAYS = true;

/** Fields the drawing can set; their sliders are hidden while the camera view shows. */
type Field = 'mode' | 'aperture' | 'shutter' | 'iso' | 'autoiso' | 'flash' | 'focal' | 'focus';
const FIELDS: Field[] = ['mode', 'aperture', 'shutter', 'iso', 'autoiso', 'flash', 'focal', 'focus'];

/** Degrees per position on a film lens's aperture ring and the 6×6 lens's speed ring. */
const APERTURE_RING_STEP_DEG = 24;
const SPEED_RING_STEP_DEG = 22;
/** One arrow key turns a ring this far. */
const RING_KEY_DEG = 8;
/** Command dial ribs turn this much per mm dragged (just for the look). */
const DIAL_RIB_DEG_PER_MM = 9;
/** Messages stay this long (ms). */
const MESSAGE_MS = 3200;

type Attrs = Record<string, string | number | boolean | undefined>;

interface Drag {
  ctl: CtlId;
  x: number;
  x0: number;
  accMm: number;
  pxPerMm: number;
  ringR: number;
  moved: boolean;
}

const isFilmBody = (b: BodyShape) => b.type === 'slr' || b.type === 'box';
const hasLens = (b: BodyShape) => b.type === 'ml' || b.type === 'slr' || b.type === 'box';
const modeShort = (m: Mode) => t.modes[m].short;

/** "0,5×", "1×", "5×". */
const moduleFactor = (f: number) => fill(t.camera.phoneZoom, { factor: formatNumber(f, f < 1 ? 1 : 0) });

/** Focus ring numbers: "0,3", "1,5", "10", "∞". */
const focusLabel = (m: number) => (Number.isFinite(m) ? formatNumber(m, m < 10 && Math.abs(m - Math.round(m)) > 0.01 ? 1 : 0) : t.graph.infinity);

/** Speed dial labels: "1", "2", … "1000" (fractions of a second, as engraved). */
const speedLabel = (s: number) => String(s >= 1 ? Math.round(s) : Math.round(1 / s));

export function mountCamera(root: HTMLElement, store: Store): void {
  const switchEl = document.createElement('div');
  switchEl.className = 'segmented view-switch';
  switchEl.setAttribute('role', 'radiogroup');
  switchEl.setAttribute('aria-label', t.camera.viewSwitch);
  switchEl.innerHTML = (['camera', 'sliders'] as const)
    .map((v) => `<button type="button" role="radio" data-view="${v}">${v === 'camera' ? t.camera.viewCamera : t.camera.viewSliders}</button>`)
    .join('');
  const panel = document.createElement('section');
  panel.className = 'panel cam';
  panel.id = 'cam-view';
  panel.setAttribute('aria-label', t.camera.viewCamera);
  panel.dataset.info = 'cameraPanel';
  panel.innerHTML = `
    <div class="cam-stage"></div>
    <p class="cam-msg" aria-live="polite"></p>
    <p class="cam-hint"></p>
    <div class="cam-front"></div>`;
  root.append(switchEl, panel);
  const stage = panel.querySelector<HTMLElement>('.cam-stage')!;
  const msgEl = panel.querySelector<HTMLElement>('.cam-msg')!;
  const hintEl = panel.querySelector<HTMLElement>('.cam-hint')!;
  const frontEl = panel.querySelector<HTMLElement>('.cam-front')!;

  switchEl.addEventListener('click', (e) => {
    const v = (e.target as HTMLElement).closest<HTMLElement>('[data-view]')?.dataset.view;
    if (v === 'camera' || v === 'sliders') setControlView(store, v);
  });

  // UI-only state.
  let isoEdit = false;
  let held: CtlId | null = null;
  let drag: Drag | null = null;
  const dialDeg: Record<Dial, number> = { front: 0, rear: 0 };
  let msgTimer: ReturnType<typeof setTimeout> | undefined;
  let visible = false;
  let frame = 0;
  let lastBody: BodyShape | null = null;

  const say = (text: string) => {
    msgEl.textContent = text;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => (msgEl.textContent = ''), MESSAGE_MS);
  };

  const st = () => store.get();
  const d = () => store.derived();
  const body = () => BODY_SHAPES[st().camera.sensorId];

  // ---------- what the controls do ----------

  const film = () => !!d().sensor.isFilm;

  /** Fields the mode leaves to the camera. */
  function locked(id: CtlId): boolean {
    const dv = d();
    const s = dv.settings;
    const auto = dv.autoFields;
    switch (id) {
      case 'lcd-t':
        return auto.has('shutterS');
      case 'lcd-n':
        return auto.has('aperture') || dv.sensor.fixedAperture !== undefined;
      case 'lcd-iso':
      case 'iso':
        // DX film bodies read the film's speed from the cartridge.
        return s.mode === 'auto' || !!dv.film?.dx;
      case 'front':
      case 'rear':
        return dialRole(s.mode, id, isoEdit) === null;
      case 'flash':
        return auto.has('flashOn');
      case 'focus':
        return s.afTarget !== null;
      default:
        return false;
    }
  }

  function warnLocked(id: CtlId): void {
    const s = d().settings;
    const mode = modeShort(s.mode);
    if (id === 'lcd-t') say(fill(t.camera.msg.cameraSetsShutter, { mode }));
    else if (id === 'lcd-n') say(d().sensor.fixedAperture !== undefined ? t.camera.msg.fixedAperture : fill(t.camera.msg.cameraSetsAperture, { mode }));
    else if ((id === 'lcd-iso' || id === 'iso') && d().film?.dx) say(fill(t.camera.msg.dxIso, { iso: String(s.iso) }));
    else if (id === 'lcd-iso' || id === 'iso') say(fill(t.camera.msg.cameraSetsIso, { mode }));
    else if (id === 'flash') say(t.camera.msg.cameraSetsFlash);
    else if (id === 'focus' && s.afTarget) say(fill(t.camera.msg.tracking, { target: t.elements[s.afTarget] }));
    else if (id === 'front' || id === 'rear') say(s.mode === 'auto' ? t.camera.msg.cameraSetsAll : t.camera.msg.frontInP);
  }

  const stepAperture = (dir: number) => {
    const dv = d();
    const next = stepInList(APERTURES, dv.settings.aperture, dir, (n) => n >= dv.maxAperture * 0.98);
    setCamera(store, { aperture: next });
  };
  const stepShutter = (dir: number) => {
    const dv = d();
    const next = stepInList(SHUTTER_SPEEDS_S, dv.settings.shutterS, dir, (x) => x >= dv.fastestShutterS * 0.999);
    setCamera(store, { shutterS: next });
  };
  /** The classic film body's ISO (ASA) dial: the meter goes by it, the film stays what it is. */
  const stepFilmDial = (dir: number) => {
    const dv = d();
    setCamera(store, { filmDialIso: stepInList(ISOS, dv.film?.dialIso ?? dv.settings.iso, dir) });
  };
  const stepIsoBy = (dir: number) => {
    const s = d().settings;
    setCamera(store, stepIso(s.mode, film(), s.autoIso, s.iso, dir));
  };
  /** Program shift: keep the click only if it moved anything (the lists have ends). */
  const shiftProgram = (dir: number) => {
    const before = d().settings;
    const old = st().camera.programShift;
    setCamera(store, { programShift: old + dir });
    if (d().settings.aperture === before.aperture) setCamera(store, { programShift: old });
    else say(t.camera.msg.shift);
  };

  function changeMode(mode: Mode, patch: Parameters<typeof setMode>[2] = {}): void {
    if (mode === d().settings.mode) {
      if (Object.keys(patch).length) setCamera(store, patch);
      return;
    }
    isoEdit = false;
    setMode(store, mode, patch);
  }

  function filmSpeedStep(dir: number): void {
    const dv = d();
    const s = dv.settings;
    const speeds = filmSpeeds(dv.fastestShutterS);
    const auto = filmDialsAuto(s.mode);
    const idx = dialIndex(speeds, s.shutterS, auto.speed, true);
    const ni = Math.min(speeds.length, Math.max(0, idx + dir));
    if (ni === idx) return;
    const mode = filmMode(ni === 0, auto.aperture);
    changeMode(mode, ni === 0 ? {} : { shutterS: speeds[ni - 1] });
    if (mode !== s.mode) say(fill(t.camera.msg.filmMode, { mode: t.modes[mode].name }));
  }

  function filmApertureStep(dir: number): void {
    const dv = d();
    const s = dv.settings;
    const auto = filmDialsAuto(s.mode);
    const stops = filmApertureStops(dv.maxAperture);
    const idx = dialIndex(stops, s.aperture, auto.aperture, false);
    const ni = Math.min(stops.length, Math.max(0, idx + dir));
    if (ni === idx) return;
    const mode = filmMode(auto.speed, ni === stops.length);
    changeMode(mode, ni === stops.length ? {} : { aperture: stops[ni] });
    if (mode !== s.mode) say(fill(t.camera.msg.filmMode, { mode: t.modes[mode].name }));
  }

  /** One click of a stepped control in direction dir (+1 = dragged right / arrow up). */
  function click(id: CtlId, dir: number): void {
    const s = d().settings;
    if (id === 'mode') {
      isoEdit = false;
      setMode(store, stepMode(s.mode, dir));
      return;
    }
    if (id === 'speed') return filmSpeedStep(dir);
    if (id === 'aperture') return filmApertureStep(dir);
    if (id === 'film-iso') return stepFilmDial(dir);
    if (locked(id)) return warnLocked(id);
    if (id === 'front' || id === 'rear') {
      const role = dialRole(s.mode, id, isoEdit);
      if (role === 'aperture') stepAperture(dir);
      else if (role === 'shutter') stepShutter(dir);
      else if (role === 'iso') stepIsoBy(dir);
      else if (role === 'shift') shiftProgram(dir);
      return;
    }
    if (id === 'lcd-t') return stepShutter(dir);
    if (id === 'lcd-n') return stepAperture(dir);
    if (id === 'lcd-iso') return stepIsoBy(dir);
  }

  /** Tap (or Enter/Space) on a control. */
  function tap(id: CtlId): void {
    const s = d().settings;
    if (id === 'mode') return click('mode', 1);
    if (id === 'iso' || id === 'lcd-iso') {
      if (locked(id)) return warnLocked(id);
      // Phones have no dials to turn: the value itself is dragged.
      if (body().type === 'phone') return say(t.camera.msg.phoneDrag);
      isoEdit = !isoEdit;
      say(isoEdit ? t.camera.msg.isoEdit : t.camera.msg.isoDone);
      return render();
    }
    if (id === 'flash') {
      if (locked(id)) return warnLocked(id);
      setCamera(store, { flashOn: !s.flashOn });
      if (body().type !== 'phone' && body().type !== 'compact') say(s.flashOn ? t.camera.msg.flashOff : t.camera.msg.flashOn);
      return;
    }
    if (id.startsWith('module-')) {
      const opts = focalOptions(SENSORS[st().camera.sensorId]);
      const o = opts[Number(id.slice(7))];
      if (o) setCamera(store, { focalLengthMm: o.realMm });
      return;
    }
    if (id === 'film-iso') return say(fill(t.camera.msg.filmIso, { film: String(s.iso) }));
    if (locked(id)) warnLocked(id);
  }

  // ---------- rings ----------

  /** Lens kind, its zoom range in real mm, and the system's crop (lens side). */
  function lensInfo(dv: Derived) {
    const kind = dv.costs.lens?.kind ?? null;
    const shape = kind ? LENS_SHAPES[kind] : null;
    const crop = dv.crop;
    const [loEq, hiEq] = shape?.focalMm ?? [0, 0];
    return { kind, shape, crop, loEq, hiEq, zoom: !!shape && hiEq > loEq };
  }

  /** Turn the zoom ring by `deg` (+ = towards the long end). Crossing the lens's end swaps the lens. */
  function turnZoom(deg: number): void {
    const dv = d();
    const li = lensInfo(dv);
    const sensor = SENSORS[st().camera.sensorId];
    const lens = CAMERA_LENSES[dv.settings.lensId];
    if (body().type === 'compact') return;
    if (!li.zoom) return;
    const eq = focalAfterZoomTurn(dv.equivalentFocalMm, li.loEq, li.hiEq, deg);
    setCamera(store, { focalLengthMm: snapFocal(sensor, lens, eq) });
    const kind = d().costs.lens?.kind;
    if (kind && kind !== li.kind) say(fill(t.camera.msg.lensChange, { lens: t.costs.lenses[kind] }));
  }

  function zoomCompact(dMm: number): void {
    const dv = d();
    const sensor = SENSORS[st().camera.sensorId];
    const lo = EQUIVALENT_FOCAL_STEPS_MM[0];
    const hi = EQUIVALENT_FOCAL_STEPS_MM[EQUIVALENT_FOCAL_STEPS_MM.length - 1];
    const eq = compactZoomAfterDrag(dv.equivalentFocalMm, dMm, lo, hi);
    setCamera(store, { focalLengthMm: snapFocal(sensor, CAMERA_LENSES[dv.settings.lensId], eq) });
  }

  /** Turn the focus ring by `deg` (+ = towards the near limit). */
  function turnFocus(deg: number): void {
    const dv = d();
    if (locked('focus')) return warnLocked('focus');
    const minM = focusScaleMinM(dv.minDistanceM);
    const a = focusRingAngle(dv.settings.focusDistanceM, minM) + deg;
    setFocus(store, focusFromRingAngle(a, minM, MAX_DISTANCE_M));
  }

  // ---------- view model ----------

  function infoKeyFor(id: CtlId): InfoKey {
    if (id === 'front' || id === 'rear') {
      const role = dialRole(d().settings.mode, id, isoEdit);
      return role === 'aperture' ? 'aperture' : role === 'shutter' ? 'shutter' : role === 'iso' ? 'iso' : 'mode';
    }
    const map: Partial<Record<CtlId, InfoKey>> = {
      mode: 'mode', iso: 'iso', flash: 'flash', zoom: 'focalLength', focus: 'focus', 'lcd-t': 'shutter', 'lcd-n': 'aperture',
      'lcd-iso': 'iso', speed: 'shutter', aperture: 'aperture', 'film-iso': 'iso',
    };
    return map[id] ?? (id.startsWith('module-') ? 'focalLength' : 'cameraPanel');
  }

  function valueText(id: CtlId, dv: Derived): string {
    const s = dv.settings;
    const fa = formatAperture(s.aperture);
    const fs = formatShutter(s.shutterS, t.locale);
    const iso = s.autoIso && s.mode !== 'M' && s.mode !== 'auto' && !dv.sensor.isFilm ? `${t.camera.lcdAuto} (${s.iso})` : String(s.iso);
    switch (id) {
      case 'mode':
        return t.modes[s.mode].name;
      case 'front':
      case 'rear': {
        const role = dialRole(s.mode, id, isoEdit);
        return role === 'aperture' ? fa : role === 'shutter' ? fs : role === 'iso' ? iso : role === 'shift' ? `${fa} · ${fs}` : t.camera.valueNone;
      }
      case 'lcd-t':
        return fs;
      case 'lcd-n':
        return fa;
      case 'lcd-iso':
      case 'iso':
      case 'film-iso':
        return iso;
      case 'zoom':
        return formatFocal(s.focalLengthMm, dv.sensor, t.kb, t.locale);
      case 'focus':
        return formatMeters(s.focusDistanceM);
      case 'speed':
        return filmDialsAuto(s.mode).speed ? `${t.camera.valueAuto} (${fs})` : fs;
      case 'aperture':
        return filmDialsAuto(s.mode).aperture ? `${t.camera.valueAuto} (${fa})` : fa;
      case 'flash':
        return s.flashOn ? t.camera.valueOn : t.camera.valueOff;
      default:
        return '';
    }
  }

  const LABELS: Partial<Record<CtlId, string>> = {
    mode: t.camera.labels.mode, front: t.camera.labels.front, rear: t.camera.labels.rear, iso: t.camera.labels.iso,
    flash: t.camera.labels.flash, zoom: t.camera.labels.zoom, focus: t.camera.labels.focus, 'lcd-t': t.camera.labels.lcdShutter,
    'lcd-n': t.camera.labels.lcdAperture, 'lcd-iso': t.camera.labels.lcdIso, speed: t.camera.labels.speed,
    aperture: t.camera.labels.aperture, 'film-iso': t.camera.labels.filmIso,
  };

  function ctlAttrs(id: CtlId, dv: Derived, label?: string): Attrs {
    const button = id === 'iso' || id === 'flash' || id.startsWith('module-');
    return {
      'data-ctl': id,
      tabindex: 0,
      role: button ? 'button' : 'slider',
      'aria-label': label ?? LABELS[id],
      'aria-valuetext': button ? undefined : valueText(id, dv),
      'aria-pressed': id === 'iso' ? String(isoEdit) : id === 'flash' ? String(dv.settings.flashOn) : undefined,
      'aria-disabled': locked(id) ? 'true' : undefined,
    };
  }

  /** Everything the drawing needs, for the current lens position `zoom` (null: as set) and flash. */
  function rigView(dv: Derived, b: BodyShape, live: boolean, o: { zoom?: number; flash?: boolean } = {}): { view: RigView; covered: Set<Field>; parts: LensPart[] } {
    const s = dv.settings;
    const li = lensInfo(dv);
    const filmBody = isFilmBody(b);
    const covered = new Set<Field>();
    const ctl = (id: CtlId, label?: string): Attrs | null => (live ? ctlAttrs(id, dv, label) : null);

    // Lens.
    let lens: LensView | null = null;
    let parts: LensPart[] = [];
    if (li.shape && hasLens(b)) {
      const zoom = o.zoom ?? zoomFraction(dv.equivalentFocalMm, li.loEq, li.hiEq);
      const pupilMm = entrancePupilMm(s.focalLengthMm, dv.maxAperture);
      parts = lensParts(li.shape, { scale: systemLensScale(li.crop), zoom, pupilMm, apertureRing: filmBody, speedRing: b.type === 'box' });
      const rings: LensView['rings'] = {};
      if (li.zoom) {
        const lo = li.loEq / li.crop;
        const hi = li.hiEq / li.crop;
        rings.zoom = {
          marks: zoomMarks(lo, hi).map((m) => ({ deg: m.deg, label: String(m.value) })),
          cur: Math.min(ZOOM_RING_SPAN_DEG, Math.max(0, zoomRingAngle(s.focalLengthMm, lo, hi))),
          attrs: ctl('zoom'),
        };
        // The focal slider stays visible anyway: past the ring's end it's what changes the lens.
      }
      const minM = focusScaleMinM(dv.minDistanceM);
      rings.focus = {
        marks: focusMarks(minM).map((m) => ({ deg: m.deg, label: focusLabel(m.value) })),
        cur: focusRingAngle(s.focusDistanceM, minM),
        attrs: ctl('focus'),
        locked: locked('focus'),
      };
      covered.add('focus');
      if (filmBody) {
        const auto = filmDialsAuto(s.mode);
        const stops = filmApertureStops(dv.maxAperture);
        const marks: RingMarkView[] = stops.map((n, i) => ({ deg: i * APERTURE_RING_STEP_DEG, label: formatNumber(n, n < 10 && n % 1 ? 1 : 0).replace(',', '.') }));
        marks.push({ deg: stops.length * APERTURE_RING_STEP_DEG, label: t.camera.dialAuto, alt: true });
        rings.aperture = { marks, cur: dialIndex(stops, s.aperture, auto.aperture, false) * APERTURE_RING_STEP_DEG, attrs: ctl('aperture'), ribFrac: 0.3 };
        covered.add('aperture');
        if (b.type === 'box') {
          const sm: RingMarkView[] = [{ deg: 0, label: t.camera.dialAuto, alt: true }, ...filmSpeeds(dv.fastestShutterS).map((x, i) => ({ deg: (i + 1) * SPEED_RING_STEP_DEG, label: speedLabel(x) }))];
          rings.speed = { marks: sm, cur: dialIndex(filmSpeeds(dv.fastestShutterS), s.shutterS, auto.speed, true) * SPEED_RING_STEP_DEG, attrs: ctl('speed'), ribFrac: 0.3 } satisfies RingView;
          covered.add('shutter');
        }
      }
      lens = {
        parts,
        rings,
        pupilMm,
        bulgeMm: li.shape.bulgeMm ?? 1.4,
        engraving: fill(t.camera.engraving, { f: Math.round(s.focalLengthMm), n: formatNumber(dv.maxAperture, dv.maxAperture % 1 ? 1 : 0).replace(',', '.') }),
      };
    }

    const flash = o.flash ?? s.flashOn;
    const lcdField = (id: LcdField) => ctl(id);
    if (b.type === 'ml' || b.type === 'compact') ['mode', 'aperture', 'shutter', 'iso', 'autoiso', 'flash'].forEach((f) => covered.add(f as Field));
    if (b.type === 'compact') covered.add('focal');
    if (b.type === 'slr') ['mode', 'shutter', 'iso', 'flash'].forEach((f) => covered.add(f as Field));
    if (b.type === 'box') ['mode', 'iso'].forEach((f) => covered.add(f as Field));
    if (b.type === 'phone') ['focal', 'flash', 'shutter', 'iso', 'autoiso'].forEach((f) => covered.add(f as Field));

    // Phone screen: the built-in cameras as zoom buttons, relative to the main one.
    const sensor = SENSORS[s.sensorId];
    const cams = sensor.phoneCameras ?? [];
    const main = cams.find((c) => c.widthMm === sensor.widthMm && c.aperture === sensor.fixedAperture) ?? cams[0];
    const opts = cams.length ? focalOptions(sensor) : [];
    const active = opts.reduce((bi, op, i) => (Math.abs(Math.log(op.realMm / s.focalLengthMm)) < Math.abs(Math.log(opts[bi].realMm / s.focalLengthMm)) ? i : bi), 0);
    const phoneModules = cams.map((c, i) => ({ label: moduleFactor(c.equivalentMm / main.equivalentMm), active: i === active }));

    const filmAuto = filmDialsAuto(s.mode);
    const view: RigView = {
      ctl: (id) => {
        if (id.startsWith('module-')) return ctl(id, fill(t.camera.labels.phoneModule, { factor: phoneModules[Number(id.slice(7))]?.label ?? '' }));
        if (id === 'flash' && b.type === 'phone') return ctl(id, t.camera.labels.phoneFlash);
        if (id === 'flash' && b.type === 'compact') return ctl(id, t.camera.labels.popup);
        if (id === 'front' && b.type === 'compact') return ctl(id, t.camera.labels.controlRing);
        if (id === 'zoom' && b.type === 'compact') return ctl(id, t.camera.labels.compactZoom);
        return ctl(id);
      },
      locked,
      held,
      topDisplay: DRAW_TOP_DISPLAY_ALWAYS || b.realTopDisplay,
      lcd: {
        shutterS: s.shutterS,
        aperture: s.aperture,
        iso: s.iso,
        isoLabel: dv.film?.dx ? t.camera.lcdDx : t.camera.lcdIso,
        autoIso: dv.autoFields.has('iso'),
        flash,
        meter: s.mode === 'M' ? dv.meterOffsetStops : null,
        isoEdit,
        field: lcdField,
        locked: (id) => locked(id),
        held,
      },
      modeDial: MODE_DIAL.map((m) => ({ deg: 0, label: modeShort(m), alt: m === 'auto' })),
      modeIndex: MODE_DIAL.indexOf(s.mode),
      frontDeg: dialDeg.front,
      rearDeg: dialDeg.rear,
      isoEdit,
      flash,
      lens,
      compactZoom: equivalentToZoomPosition(o.zoom !== undefined ? (o.zoom ? 400 : 14) : dv.equivalentFocalMm),
      speedDial:
        b.type === 'slr'
          ? { labels: [{ deg: 0, label: t.camera.dialAuto, alt: true }, ...filmSpeeds(dv.fastestShutterS).map((x) => ({ deg: 0, label: speedLabel(x) }))], index: dialIndex(filmSpeeds(dv.fastestShutterS), s.shutterS, filmAuto.speed, true) }
          : null,
      filmIso: dv.film?.dialIso ?? s.iso,
      readout:
        b.type === 'phone'
          ? { line1: '', line2: '', meter: s.mode === 'M' ? dv.meterOffsetStops : null }
          : {
              line1: `${formatShutter(s.shutterS, t.locale)} · ${formatAperture(s.aperture)}`,
              line2: '',
              // Film finders show the meter all the time (it reads "correct" in the automatic modes).
              meter: isFilmBody(b) || s.mode === 'M' ? dv.meterOffsetStops : null,
            },
      phoneModules,
      phoneFields:
        b.type === 'phone'
          ? {
              shutter: formatShutter(s.shutterS, t.locale).replace(' s', ''),
              aperture: `f/${formatNumber(s.aperture, 1).replace(',', '.')}`,
              iso: String(s.iso),
              isoLabel: s.autoIso ? t.camera.phoneLabels.isoAuto : t.camera.phoneLabels.iso,
            }
          : null,
    };
    return { view, covered, parts };
  }

  // ---------- render ----------

  function render(): void {
    cancelAnimationFrame(frame);
    frame = 0;
    if (!visible) return;
    const availW = stage.clientWidth;
    if (availW <= 0) return;
    const dv = d();
    const b = body();
    const li = lensInfo(dv);

    // The body alone (flash on; a compact at both zoom ends) fixes scale and panel height, so the camera
    // stays put while zooming or changing lenses. The lens grows upwards; a long one scrolls.
    const bare = [0, 1].map((zoom) => drawRig(b, { ...rigView(dv, b, false, { zoom, flash: true }).view, lens: null }).p.b);
    const fb = {
      x0: Math.min(...bare.map((e) => e.x0)),
      x1: Math.max(...bare.map((e) => e.x1)),
      y0: Math.min(...bare.map((e) => e.y0)),
      y1: Math.max(...bare.map((e) => e.y1)),
    };
    const PAD = 4;
    const layout = panelLayout({
      bodyWidthMm: b.widthMm,
      bodyDepthMm: fb.y1,
      frameWidthMm: fb.x1 - fb.x0 + 2 * PAD,
      frameHeightMm: fb.y1 - fb.y0 + 2 * PAD,
      lensRoomMm: hasLens(b) ? LENS_ROOM_FACTOR * b.widthMm : 0,
      availWidthPx: availW,
      maxHeightPx: drawingMaxHeight(availW, window.innerHeight),
    });
    const k = layout.pxPerMm;
    const final = rigView(dv, b, true);
    const rig = drawRig(b, final.view);
    const frameW = availW / k;
    const vx = (fb.x0 + fb.x1) / 2 - frameW / 2;
    const bottom = fb.y1 + PAD;
    const vy = Math.min(rig.p.b.y0 - PAD, bottom - layout.heightPx / k);
    const vh = bottom - vy;
    stage.style.height = `${layout.heightPx}px`;
    // A new camera starts with the body in view (scrollTop 0 is the bottom: the stage is column-reverse).
    if (b !== lastBody) {
      stage.scrollTop = 0;
      // A message about the previous camera's controls doesn't apply to this one.
      if (lastBody) msgEl.textContent = '';
    }
    lastBody = b;
    queueMicrotask(markMoreAbove);

    // Keep keyboard focus on the same control across the redraw.
    const focused = stage.contains(document.activeElement) ? (document.activeElement as Element).getAttribute('data-ctl') : null;
    stage.innerHTML =
      `<svg viewBox="${r2(vx)} ${r2(vy)} ${r2(frameW)} ${r2(vh)}" width="${r2(availW)}" height="${r2(vh * k)}" role="group" aria-label="${t.camera.drawing}">` +
      '<defs><linearGradient id="cam-cyl" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".38"/><stop offset=".22" stop-color="#fff" stop-opacity=".05"/><stop offset=".4" stop-color="#fff" stop-opacity=".16"/><stop offset=".62" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".42"/></linearGradient>' +
      '<radialGradient id="cam-dome" cx=".4" cy=".38" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></radialGradient></defs>' +
      rig.svg +
      '</svg>';
    if (focused) stage.querySelector<SVGElement>(`[data-ctl="${focused}"]`)?.focus({ preventScroll: true });

    const s = dv.settings;
    const modeHint = b.type === 'phone' ? t.camera.hints.phone : isFilmBody(b) ? t.camera.hints.film : t.camera.hints[s.mode];
    hintEl.textContent = hasLens(b) && !li.zoom ? `${modeHint} ${t.camera.hints.prime}` : modeHint;

    // Front view: the entrance pupil as an iris, to the same scale as the front element.
    if (li.shape && hasLens(b)) {
      const front = final.parts[final.parts.length - 1].dMm;
      const pupil = entrancePupilMm(s.focalLengthMm, s.aperture);
      const R = front / 2;
      let poly = '';
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * 2 * Math.PI + 0.2;
        poly += `${r2((pupil / 2) * Math.cos(a))},${r2((pupil / 2) * Math.sin(a))} `;
      }
      frontEl.innerHTML =
        `<svg viewBox="${r2(-R - 2)} ${r2(-R - 2)} ${r2(front + 4)} ${r2(front + 4)}" width="64" height="64" aria-hidden="true">` +
        `<circle r="${r2(R)}" class="ln"/><circle r="${r2(R * 0.92)}" class="rg"/><circle r="${r2(R * 0.84)}" class="gl gl-front"/>` +
        `<polygon points="${poly}" class="iris" stroke-width="${r2(front / 50)}"/></svg>` +
        `<span>${fill(t.camera.frontView, {
          pupil: formatNumber(pupil, pupil < 10 ? 1 : 0),
          focal: Math.round(s.focalLengthMm),
          aperture: formatNumber(s.aperture, s.aperture % 1 ? 1 : 0),
          front: Math.round(front),
        })}</span>`;
      frontEl.hidden = false;
    } else {
      frontEl.hidden = true;
      frontEl.innerHTML = '';
    }
  }

  /** Fade the top edge while part of the lens is scrolled out of view above. */
  function markMoreAbove(): void {
    // column-reverse: scrollTop runs from −(scrollHeight − clientHeight) at the top to 0 at the bottom.
    const hidden = stage.scrollHeight - stage.clientHeight + stage.scrollTop;
    stage.classList.toggle('more-above', hidden > 1);
  }
  stage.addEventListener('scroll', markMoreAbove, { passive: true });

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  function applyView(state: AppState, dv: Derived): void {
    const show = state.ui.controlView === 'camera' && (!state.ui.simple || CAMERA_PANEL_IN_SIMPLE_MODE);
    switchEl.hidden = state.ui.simple && !CAMERA_PANEL_IN_SIMPLE_MODE;
    for (const btn of switchEl.querySelectorAll<HTMLButtonElement>('[data-view]')) {
      const on = btn.dataset.view === state.ui.controlView;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-checked', String(on));
    }
    panel.hidden = !show;
    if (!show) isoEdit = false;
    const covered = show ? rigView(dv, BODY_SHAPES[state.camera.sensorId], false).covered : new Set<Field>();
    document.body.classList.toggle('cam-view', show);
    for (const f of FIELDS) document.body.classList.toggle(`cam-covers-${f}`, covered.has(f));
    visible = show;
    if (show) schedule();
  }

  store.subscribe(applyView);
  new ResizeObserver(() => visible && schedule()).observe(stage);

  // ---------- pointer ----------

  stage.addEventListener('pointerdown', (e) => {
    const target = (e.target as Element).closest<SVGGraphicsElement>('[data-ctl]');
    if (!target) {
      setInfo(store, 'cameraPanel');
      return;
    }
    const svg = stage.querySelector('svg');
    const ctm = svg?.getScreenCTM();
    if (!ctm) return;
    const id = target.getAttribute('data-ctl') as CtlId;
    drag = { ctl: id, x: e.clientX, x0: e.clientX, accMm: 0, pxPerMm: ctm.a, ringR: target.getBBox().width / 2, moved: false };
    stage.setPointerCapture(e.pointerId);
    stage.style.cursor = getComputedStyle(target).cursor;
    stage.classList.add('dragging');
    held = id;
    setInfo(store, infoKeyFor(id));
    schedule();
    e.preventDefault();
  });

  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dMm = (e.clientX - drag.x) / drag.pxPerMm;
    drag.x = e.clientX;
    if (Math.abs(e.clientX - drag.x0) > 4) drag.moved = true;
    if (!drag.moved || dMm === 0) return;
    const id = drag.ctl;
    if (id === 'zoom' || id === 'focus') {
      if (id === 'zoom' && body().type === 'compact') return zoomCompact(dMm);
      // The ring turns with the finger: marks under it move by dMm, i.e. dθ = dMm / R.
      const deg = (dMm / drag.ringR) * (180 / Math.PI);
      if (id === 'zoom') turnZoom(-deg);
      else turnFocus(-deg);
      return;
    }
    if (id === 'iso' || id === 'flash' || id.startsWith('module-')) return;
    if (id === 'front' || id === 'rear') {
      dialDeg[id] -= dMm * DIAL_RIB_DEG_PER_MM;
      schedule();
    }
    const step = id === 'mode' ? DRAG_STEP_MM.modeDial : id.startsWith('lcd') ? DRAG_STEP_MM.display : id === 'front' || id === 'rear' ? DRAG_STEP_MM.dial : DRAG_STEP_MM.filmDial;
    const r = dragClicks(drag.accMm + dMm, step);
    drag.accMm = r.restMm;
    for (let i = 0; i < Math.abs(r.clicks); i++) click(id, Math.sign(r.clicks));
  });

  const end = (e: PointerEvent) => {
    if (!drag) return;
    const { ctl, moved } = drag;
    drag = null;
    held = null;
    stage.classList.remove('dragging');
    stage.style.cursor = '';
    // A cancelled pointer (the page scrolled instead) is no tap.
    if (!moved && e.type === 'pointerup') tap(ctl);
    schedule();
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  // ---------- keyboard ----------

  stage.addEventListener('keydown', (e) => {
    const target = (e.target as Element).closest?.('[data-ctl]');
    if (e.key === 'Escape' && isoEdit) {
      isoEdit = false;
      render();
      return;
    }
    if (!target) return;
    const id = target.getAttribute('data-ctl') as CtlId;
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
    if (dir) {
      if (id === 'zoom') {
        if (body().type === 'compact') zoomCompact(dir * 4);
        else turnZoom(dir * RING_KEY_DEG);
      } else if (id === 'focus') turnFocus(-dir * RING_KEY_DEG);
      else if (id === 'iso' || id === 'flash' || id.startsWith('module-')) return;
      else click(id, dir);
      if (id === 'front' || id === 'rear') dialDeg[id] -= dir * 20;
      setInfo(store, infoKeyFor(id));
      e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
      tap(id);
      setInfo(store, infoKeyFor(id));
      e.preventDefault();
    }
  });
}

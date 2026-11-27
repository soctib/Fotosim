import { describe, expect, it } from 'vitest';
import { BODY_SHAPES } from '../src/data/cameraBodies';
import { LENS_SHAPES } from '../src/data/lensShapes';
import { LENS_KINDS_BY_TYPE } from '../src/data/prices';
import { SENSOR_ORDER } from '../src/data/sensors';
import {
  compactZoomAfterDrag,
  COMPACT_ZOOM_DRAG_MM,
  dialIndex,
  dialRole,
  dragClicks,
  entrancePupilMm,
  filmApertureStops,
  filmDialsAuto,
  filmMode,
  drawingMaxHeight,
  MAX_DRAWING_HEIGHT_PX,
  MAX_DRAWING_HEIGHT_WIDE_PX,
  panelLayout,
  focalAfterZoomTurn,
  focusFromRingAngle,
  focusMarks,
  focusRingAngle,
  FOCUS_RING_SPAN_DEG,
  FRONT_MARGIN_MM,
  isoChoices,
  lensLengthMm,
  lensParts,
  stepInList,
  stepIso,
  stepMode,
  systemLensScale,
  zoomFraction,
  zoomMarks,
  zoomRingAngle,
  ZOOM_RING_SPAN_DEG,
} from '../src/model/cameraPanel';
import { APERTURES, ISOS, SHUTTER_SPEEDS_S } from '../src/model/stops';
import type { Mode } from '../src/model/types';

const parts = (kind: keyof typeof LENS_SHAPES, zoom = 0, pupilMm = 10, scale = 1) =>
  lensParts(LENS_SHAPES[kind], { scale, zoom, pupilMm });

describe('data', () => {
  it('has a body for every camera type and a shape for every lens kind', () => {
    for (const id of SENSOR_ORDER) expect(BODY_SHAPES[id]).toBeDefined();
    for (const kinds of Object.values(LENS_KINDS_BY_TYPE)) for (const k of kinds) expect(LENS_SHAPES[k.kind]).toBeDefined();
  });

  it('every lens starts with its mount and ends with its front', () => {
    for (const shape of Object.values(LENS_SHAPES)) {
      expect(shape.sections[0].kind).toBe('mount');
      expect(shape.sections[shape.sections.length - 1].kind).toBe('front');
    }
  });
});

describe('lens outline', () => {
  it('a 400 mm f/2.8 is about three times as long as a 50 mm', () => {
    const ratio = lensLengthMm(parts('fastTele')) / lensLengthMm(parts('prime50'));
    expect(ratio).toBeGreaterThan(3.3);
    expect(ratio).toBeLessThan(4.3);
  });

  it('zooms with an inner tube get longer at the long end, internal zooms do not', () => {
    expect(lensLengthMm(parts('kitZoom', 1)) - lensLengthMm(parts('kitZoom', 0))).toBeCloseTo(LENS_SHAPES.kitZoom.extensionMm, 6);
    expect(lensLengthMm(parts('teleZoom28', 1))).toBeCloseTo(lensLengthMm(parts('teleZoom28', 0)), 6);
  });

  it('the front is at least as wide as the entrance pupil plus a margin', () => {
    // 400 / 2.8 ≈ 143 mm: the real lens's 158 mm front is enough.
    const fast = parts('fastTele', 0, 400 / 2.8);
    expect(fast[fast.length - 1].dMm).toBe(158);
    // A 300 mm at f/1.4 (what the prime type simulates out there) needs a 214 mm pupil.
    const huge = parts('tele300', 0, 300 / 1.4);
    expect(huge[huge.length - 1].dMm).toBeCloseTo(300 / 1.4 + FRONT_MARGIN_MM, 6);
  });

  it('film bodies get an aperture ring (6×6: also the leaf-shutter speed ring) behind the mount', () => {
    const p = lensParts(LENS_SHAPES.prime50, { scale: 1, zoom: 0, pupilMm: 30, apertureRing: true, speedRing: true });
    expect(p.map((x) => x.kind).slice(0, 3)).toEqual(['mount', 'speed', 'aperture']);
  });

  it('scales with the system: smaller formats, smaller lenses', () => {
    expect(systemLensScale(1)).toBe(1);
    expect(systemLensScale(2)).toBeCloseTo(0.71, 2);
    expect(systemLensScale(1.53)).toBeCloseTo(0.81, 2);
    expect(systemLensScale(0.5)).toBeCloseTo(1.41, 2);
    const apsc = lensParts(LENS_SHAPES.kitZoom, { scale: systemLensScale(1.53), zoom: 0, pupilMm: 5 });
    expect(lensLengthMm(apsc)).toBeLessThan(lensLengthMm(parts('kitZoom')));
  });

});

describe('rings', () => {
  it('zoom ring: short end 0°, long end at the span, log-spaced', () => {
    expect(zoomRingAngle(24, 24, 70)).toBe(0);
    expect(zoomRingAngle(70, 24, 70)).toBeCloseTo(ZOOM_RING_SPAN_DEG, 9);
    expect(zoomRingAngle(Math.sqrt(24 * 70), 24, 70)).toBeCloseTo(ZOOM_RING_SPAN_DEG / 2, 9);
    expect(focalAfterZoomTurn(24, 24, 70, ZOOM_RING_SPAN_DEG)).toBeCloseTo(70, 9);
    expect(focalAfterZoomTurn(50, 50, 50, 30)).toBe(50);
    expect(zoomFraction(200, 24, 70)).toBe(1);
  });

  it('zoom marks: both ends and round numbers between, not crowded', () => {
    const m = zoomMarks(24, 70).map((x) => x.value);
    expect(m[0]).toBe(24);
    expect(m[m.length - 1]).toBe(70);
    expect(m).toContain(35);
    const d = zoomMarks(150, 600).map((x) => x.deg);
    for (let i = 1; i < d.length; i++) expect(d[i] - d[i - 1]).toBeGreaterThanOrEqual(18 - 1e-9);
    expect(zoomMarks(50, 50)).toEqual([]);
  });

  it('focus ring: ∞ at 0°, the near limit at the span, round trip', () => {
    expect(focusRingAngle(Infinity, 0.3)).toBe(0);
    expect(focusRingAngle(0.3, 0.3)).toBe(FOCUS_RING_SPAN_DEG);
    expect(focusRingAngle(0.1, 0.3)).toBe(FOCUS_RING_SPAN_DEG);
    for (const d of [0.5, 2, 10]) expect(focusFromRingAngle(focusRingAngle(d, 0.3), 0.3, 1000)).toBeCloseTo(d, 9);
    expect(focusFromRingAngle(0, 0.3, 1000)).toBe(1000);
    expect(focusFromRingAngle(-5, 0.3, 1000)).toBe(1000);
  });

  it('focus marks start at the lens near limit and end at ∞, spaced apart', () => {
    const m = focusMarks(3.2);
    expect(m[0].value).toBe(3.2);
    expect(m[m.length - 1].value).toBe(Infinity);
    expect(m.every((x) => x.value >= 3.2)).toBe(true);
    const short = focusMarks(0.3);
    for (let i = 1; i < short.length; i++) expect(short[i - 1].deg - short[i].deg).toBeGreaterThanOrEqual(15 - 1e-9);
  });

  it('entrance pupil: focal length ÷ f-number', () => {
    expect(entrancePupilMm(400, 2.8)).toBeCloseTo(142.9, 1);
  });
});

describe('dials', () => {
  it('which dial does what in which mode', () => {
    const roles = (m: Mode) => [dialRole(m, 'front', false), dialRole(m, 'rear', false)];
    expect(roles('auto')).toEqual([null, null]);
    expect(roles('P')).toEqual([null, 'shift']);
    expect(roles('Av')).toEqual(['aperture', 'aperture']);
    expect(roles('Tv')).toEqual(['shutter', 'shutter']);
    expect(roles('M')).toEqual(['aperture', 'shutter']);
    expect(dialRole('M', 'front', true)).toBe('iso');
    expect(dialRole('auto', 'rear', true)).toBeNull();
  });

  it('the mode dial turns all the way round', () => {
    expect(stepMode('Av', 1)).toBe('Tv');
    expect(stepMode('M', 1)).toBe('auto');
    expect(stepMode('auto', -1)).toBe('M');
  });

  it('steps through lists either way, from off-list values and within limits', () => {
    expect(stepInList(APERTURES, 2.8, 1)).toBe(3.2);
    expect(stepInList(APERTURES, 2.8, -1, (n) => n >= 2.8)).toBe(2.8);
    expect(stepInList(SHUTTER_SPEEDS_S, 1 / 125, 1)).toBeCloseTo(1 / 160, 9);
    expect(stepInList([1, 1 / 2, 1 / 4], 0.3, 1)).toBe(1 / 4);
    expect(stepInList([1.4, 2, 2.8], 2.2, -1)).toBe(2);
    expect(stepInList([1.4, 2, 2.8], 2.8, 1)).toBe(2.8);
  });

  it('ISO: AUTO below the lowest value where the mode has auto ISO', () => {
    expect(isoChoices('Av', false)[0]).toBe('auto');
    expect(isoChoices('M', false)[0]).toBe(100);
    expect(isoChoices('Av', true)[0]).toBe(100);
    expect(stepIso('Av', false, true, 800, 1)).toEqual({ autoIso: false, iso: ISOS[0] });
    expect(stepIso('Av', false, false, 100, -1)).toEqual({ autoIso: true, iso: 100 });
    expect(stepIso('M', false, false, 100, -1)).toEqual({ autoIso: false, iso: 100 });
    expect(stepIso('M', false, false, 400, 1)).toEqual({ autoIso: false, iso: 500 });
  });

  it('drag clicks carry the rest over', () => {
    expect(dragClicks(9, 4)).toEqual({ clicks: 2, restMm: 1 });
    expect(dragClicks(-9, 4)).toEqual({ clicks: -2, restMm: -1 });
  });
});

describe('film bodies', () => {
  it('"A" on speed dial and aperture ring stand for the modes', () => {
    expect(filmMode(true, true)).toBe('P');
    expect(filmMode(true, false)).toBe('Av');
    expect(filmMode(false, true)).toBe('Tv');
    expect(filmMode(false, false)).toBe('M');
    for (const m of ['P', 'Av', 'Tv', 'M'] as Mode[]) {
      const a = filmDialsAuto(m);
      expect(filmMode(a.speed, a.aperture)).toBe(m);
    }
    expect(filmDialsAuto('auto')).toEqual({ speed: true, aperture: true });
  });

  it('the aperture ring starts at the lens limit and then goes in whole stops', () => {
    expect(filmApertureStops(1.4)).toEqual([1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22]);
    expect(filmApertureStops(3.5)).toEqual([3.5, 4, 5.6, 8, 11, 16, 22]);
  });

  it('dial positions with an "A" end', () => {
    expect(dialIndex([1, 1 / 2, 1 / 4], 1 / 4, false, true)).toBe(3);
    expect(dialIndex([1, 1 / 2, 1 / 4], 1 / 4, true, true)).toBe(0);
    expect(dialIndex([2, 2.8, 4], 3.2, false, false)).toBe(1);
    expect(dialIndex([2, 2.8, 4], 3.2, true, false)).toBe(3);
  });
});

describe('compact zoom', () => {
  it('a full drag runs the whole range and stops at its ends', () => {
    expect(compactZoomAfterDrag(14, COMPACT_ZOOM_DRAG_MM, 14, 400)).toBeCloseTo(400, 6);
    expect(compactZoomAfterDrag(50, -1000, 14, 400)).toBe(14);
  });
});

describe('drawingMaxHeight', () => {
  it('keeps the narrow-column cap in a 300 px column', () => {
    expect(drawingMaxHeight(280, 1000)).toBe(MAX_DRAWING_HEIGHT_PX);
  });
  it('grows with a wider panel', () => {
    expect(drawingMaxHeight(600, 1000)).toBe(660);
  });
  it('stays within 75 % of the viewport and the wide cap', () => {
    expect(drawingMaxHeight(700, 800)).toBe(600);
    expect(drawingMaxHeight(1200, 2000)).toBe(MAX_DRAWING_HEIGHT_WIDE_PX);
  });
  it('never drops below the narrow cap on short viewports', () => {
    expect(drawingMaxHeight(600, 400)).toBe(MAX_DRAWING_HEIGHT_PX);
  });
});

describe('panelLayout', () => {
  const body = { bodyWidthMm: 134, bodyDepthMm: 60, frameWidthMm: 150, frameHeightMm: 100, lensRoomMm: 120, availWidthPx: 330, maxHeightPx: 460 };

  it('draws every body at the same on-screen width', () => {
    const a = panelLayout(body);
    const b = panelLayout({ ...body, bodyWidthMm: 76, bodyDepthMm: 40, frameWidthMm: 80, frameHeightMm: 60 });
    expect(a.pxPerMm * 134).toBeCloseTo(330 * 0.74, 6);
    expect(b.pxPerMm * 76).toBeCloseTo(330 * 0.74, 6);
  });

  it('the panel height leaves room for the lens, up to the cap', () => {
    const a = panelLayout(body);
    expect(a.heightPx).toBe(Math.round((100 + 120) * a.pxPerMm));
    expect(panelLayout({ ...body, lensRoomMm: 1000 }).heightPx).toBe(460);
    expect(panelLayout({ ...body, lensRoomMm: 0 }).heightPx).toBe(Math.round(100 * a.pxPerMm));
  });

  it('a body much deeper than wide is sized by its depth', () => {
    const box = panelLayout({ ...body, bodyWidthMm: 98, bodyDepthMm: 170, frameWidthMm: 120, frameHeightMm: 180 });
    expect(box.pxPerMm * 170 * 0.9).toBeCloseTo(330 * 0.74, 6);
  });

  it('shrinks only if the body alone would not fit the panel', () => {
    expect(panelLayout({ ...body, frameWidthMm: 300 }).pxPerMm * 300).toBeCloseTo(330, 6);
    expect(panelLayout({ ...body, frameHeightMm: 400 }).pxPerMm * 400).toBeCloseTo(460, 6);
  });
});

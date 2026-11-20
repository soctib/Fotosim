import { describe, expect, it } from 'vitest';
import { SENSORS } from '../src/data/sensors';
import { derive } from '../src/model/derive';
import { focusedElement } from '../src/model/autofocus';
import {
  classifyMovement,
  movementBlurMm,
  relativeMovementBlur,
  relativeSpeedMs,
  STILL_SWAY_MS,
} from '../src/model/motion';
import { classifyShake, handheldLimitS, motionHandheldLimitS, shakeBlurFactor } from '../src/model/shake';
import type { Motion } from '../src/model/types';
import { initialState } from '../src/state/store';

describe('relative speed', () => {
  it('is zero when photographer and person move alike (same direction)', () => {
    expect(relativeSpeedMs('walk', 'walk')).toBe(0);
    expect(relativeSpeedMs('drive', 'drive')).toBe(0);
    expect(relativeSpeedMs('frozen', 'frozen')).toBe(0);
  });

  it('is the difference of the speeds otherwise', () => {
    expect(relativeSpeedMs('run', 'walk')).toBeCloseTo(4 - 1.4);
    expect(relativeSpeedMs('frozen', 'drive')).toBe(14);
  });

  it('adds the sway of a standing person, which no movement of the photographer cancels', () => {
    expect(relativeSpeedMs('still', 'still')).toBe(STILL_SWAY_MS);
    expect(relativeSpeedMs('still', 'frozen')).toBe(STILL_SWAY_MS);
    expect(relativeSpeedMs('still', 'walk')).toBeCloseTo(1.4 + STILL_SWAY_MS);
  });
});

describe('movement blur', () => {
  it('is distance travelled times magnification', () => {
    // 1.4 m/s for 1/100 s = 14 mm; at 5 m with 50 mm: magnification 50/4950.
    expect(movementBlurMm(1.4, 1 / 100, 50, 5)).toBeCloseTo((14 * 50) / 4950);
  });

  it('halves with twice the distance or half the time, doubles with twice the focal length', () => {
    const base = movementBlurMm(4, 1 / 250, 50, 10);
    expect(movementBlurMm(4, 1 / 500, 50, 10)).toBeCloseTo(base / 2);
    expect(movementBlurMm(4, 1 / 250, 50, 20)).toBeCloseTo(base / 2, 3);
    expect(movementBlurMm(4, 1 / 250, 100, 10)).toBeCloseTo(base * 2, 2);
  });

  it('makes a walker at 5 m blurry at 1/60 s but sharp at 1/1000 s on full frame', () => {
    const ff = SENSORS.fullFrame;
    expect(relativeMovementBlur(1.4, 1 / 60, 50, 5, ff)).toBeGreaterThan(1);
    expect(relativeMovementBlur(1.4, 1 / 1000, 50, 5, ff)).toBeLessThan(1);
  });

  it('leaves a standing person sharp at usual handheld times', () => {
    expect(relativeMovementBlur(STILL_SWAY_MS, 1 / 125, 50, 3, SENSORS.fullFrame)).toBeLessThan(1);
  });
});

describe('photographer shake', () => {
  const limit = handheldLimitS(50, 1);

  it('needs faster shutters while moving', () => {
    expect(motionHandheldLimitS(limit, 'still')).toBe(limit);
    expect(motionHandheldLimitS(limit, 'walk')).toBe(limit / 4);
    expect(motionHandheldLimitS(limit, 'run')).toBe(limit / 16);
  });

  it('has no limit on a tripod', () => {
    expect(motionHandheldLimitS(limit, 'frozen')).toBe(Infinity);
    expect(classifyShake(30, 400, 1, false, 'frozen')).toBe('safe');
    expect(shakeBlurFactor(30, 400, 1, false, 'frozen')).toBe(0);
  });

  it('classifies the same time differently by movement', () => {
    expect(classifyShake(1 / 125, 50, 1, false, 'still')).toBe('safe');
    expect(classifyShake(1 / 125, 50, 1, true, 'walk')).toBe('needsIS');
    expect(classifyShake(1 / 125, 50, 1, true, 'run')).toBe('needsTripod');
  });
});

describe('derive with movement', () => {
  const at = (camera: Motion, person1: Motion, shutterS = 1 / 30) =>
    derive(
      { ...initialState.camera, mode: 'M', shutterS, motion: camera },
      {
        ...initialState.scene,
        elements: initialState.scene.elements.map((e) => (e.id === 'person1' ? { ...e, motion: person1 } : e)),
      },
    );

  it('keeps a person walking alongside sharp but smears the background', () => {
    const d = at('walk', 'walk');
    const el = (id: string) => d.elements.find((e) => e.id === id)!;
    expect(el('person1').movementBlur).toBe(0);
    expect(el('background').relativeSpeedMs).toBe(1.4);
    expect(el('background').movementBlur).toBeGreaterThan(0);
    expect(d.movementBlurred).not.toContain('person1');
  });

  it('lists visibly smeared persons, nearest first', () => {
    const d = at('frozen', 'run');
    expect(d.movementBlurred[0]).toBe('person1');
    expect(d.elements.find((e) => e.id === 'background')!.movementBlur).toBe(0);
  });

  it('does not change what the modes pick', () => {
    const p = (motion: Motion) =>
      derive({ ...initialState.camera, mode: 'P', motion }, initialState.scene).settings.shutterS;
    expect(p('run')).toBe(p('still'));
    expect(p('frozen')).toBe(p('still'));
  });
});

describe('movement class', () => {
  it('grades the smear in multiples of the sharpness limit', () => {
    expect(classifyMovement(0.5)).toBe('sharp');
    expect(classifyMovement(1)).toBe('sharp');
    expect(classifyMovement(1.5)).toBe('slight');
    expect(classifyMovement(3)).toBe('visible');
    expect(classifyMovement(10)).toBe('strong');
  });
});

describe('focused element', () => {
  const els = [
    { id: 'person1' as const, distanceM: 3, visible: true },
    { id: 'person2' as const, distanceM: 6, visible: true },
    { id: 'background' as const, distanceM: 50, visible: true },
  ];

  it('is the tracked target when visible', () => {
    expect(focusedElement(els, 3, 'background')!.id).toBe('background');
  });

  it('is otherwise the visible element nearest the focus on a log scale', () => {
    expect(focusedElement(els, 4, null)!.id).toBe('person1'); // 4/3 < 6/4
    expect(focusedElement(els, 5, null)!.id).toBe('person2');
    expect(focusedElement(els, 20, null)!.id).toBe('background');
  });

  it('skips hidden elements and is null if nothing is visible', () => {
    const hidden = els.map((e) => (e.id === 'person1' ? { ...e, visible: false } : e));
    expect(focusedElement(hidden, 3, 'person1')!.id).toBe('person2');
    expect(focusedElement(els.map((e) => ({ ...e, visible: false })), 3, null)).toBeNull();
  });

  it('feeds the subject in derive()', () => {
    const d = derive(
      { ...initialState.camera, mode: 'M', shutterS: 1 / 30, motion: 'frozen', focusDistanceM: 3 },
      {
        ...initialState.scene,
        elements: initialState.scene.elements.map((e) => (e.id === 'person1' ? { ...e, motion: 'run' as const } : e)),
      },
    );
    expect(d.subject!.id).toBe('person1');
    expect(d.subject!.relativeSpeedMs).toBe(4);
    expect(d.subject!.movementCls).toBe('strong');
  });
});

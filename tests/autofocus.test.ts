import { describe, expect, it } from 'vitest';
import { applyAutofocus } from '../src/model/autofocus';
import { derive } from '../src/model/derive';
import { initialState } from '../src/state/store';

const { camera, scene } = initialState;

describe('autofocus', () => {
  it('leaves manual focus alone when off', () => {
    expect(applyAutofocus({ ...camera, afTarget: null, focusDistanceM: 7 }, scene).focusDistanceM).toBe(7);
  });

  it('focuses exactly on the target and follows it', () => {
    const moved = { ...scene, elements: scene.elements.map((e) => (e.id === 'person2' ? { ...e, distanceM: 11 } : e)) };
    const d = derive({ ...camera, afTarget: 'person2', focusDistanceM: 3 }, moved);
    expect(d.settings.focusDistanceM).toBe(11);
    expect(d.elements.find((e) => e.id === 'person2')!.relativeBlur).toBeCloseTo(0, 10);
    expect(d.settings.afTarget).toBe('person2');
  });

  it('falls back to manual focus if the target is hidden', () => {
    const hidden = { ...scene, elements: scene.elements.map((e) => (e.id === 'person2' ? { ...e, visible: false } : e)) };
    expect(applyAutofocus({ ...camera, afTarget: 'person2', focusDistanceM: 4 }, hidden).focusDistanceM).toBe(4);
  });
});

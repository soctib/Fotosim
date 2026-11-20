import { describe, expect, it } from 'vitest';
import { applySimple } from '../src/state/actions';
import { parseState } from '../src/state/persist';
import { initialState } from '../src/state/store';

const changed = {
  ...initialState,
  camera: { ...initialState.camera, sensorId: 'fullFrame' as const, aperture: 2.8, mode: 'M' as const, afTarget: 'person2' as const },
  scene: { ...initialState.scene, lightPresetId: 'dusk' },
  ui: { ...initialState.ui, simple: false, showDetails: true, infoKey: 'graph' as const },
};

describe('parseState', () => {
  it('round-trips a saved state', () => {
    expect(parseState(JSON.stringify(changed), initialState)).toEqual(changed);
  });

  it('returns null for missing or broken data', () => {
    expect(parseState(null, initialState)).toBeNull();
    expect(parseState('{nope', initialState)).toBeNull();
    expect(parseState('[]', initialState)).toBeNull();
    expect(parseState('{}', initialState)).toBeNull();
  });

  it('drops unknown fields', () => {
    const extra = { ...changed, camera: { ...changed.camera, old: 1 }, junk: true };
    expect(parseState(JSON.stringify(extra), initialState)).toEqual(changed);
  });

  it('falls back to defaults for camera and scene together when one is invalid', () => {
    const removedSensor = { ...changed, camera: { ...changed.camera, sensorId: 'genericPhone' } };
    const s = parseState(JSON.stringify(removedSensor), initialState)!;
    expect(s.camera).toEqual(initialState.camera);
    expect(s.scene).toEqual(initialState.scene);
    expect(s.ui).toEqual(changed.ui);
  });

  it('rejects scenes whose elements differ from the defaults', () => {
    const fewer = { ...changed, scene: { ...changed.scene, elements: changed.scene.elements.slice(1) } };
    expect(parseState(JSON.stringify(fewer), initialState)!.scene).toEqual(initialState.scene);
    const badLight = { ...changed, scene: { ...changed.scene, lightPresetId: 'moon' } };
    expect(parseState(JSON.stringify(badLight), initialState)!.scene).toEqual(initialState.scene);
  });

  it('keeps the simplified setup as saved', () => {
    const simple = applySimple(initialState);
    expect(parseState(JSON.stringify(simple), initialState)).toEqual(simple);
  });
});

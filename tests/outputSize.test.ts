import { describe, expect, it } from 'vitest';
import { derive } from '../src/model/derive';
import { diagonalPixels, eyeLimitPixels, outputSize, type OutputTargetId, type OutputView } from '../src/model/outputSize';
import type { CameraSettings } from '../src/model/types';
import { initialState } from '../src/state/store';

const pick = (o: ReturnType<typeof outputSize>, id: OutputTargetId, view: OutputView) =>
  o.results.find((r) => r.id === id && r.view === view)!;

describe('eye model', () => {
  it('normal distance needs ≈ 3400 px along the diagonal, whatever the size', () => {
    expect(eyeLimitPixels(364, 364)).toBeCloseTo(3438, 0);
    expect(eyeLimitPixels(1800, 1800)).toBeCloseTo(eyeLimitPixels(364, 364), 6);
  });
  it('up close a bigger print needs more', () => {
    expect(eyeLimitPixels(364, 300)).toBeGreaterThan(4000);
    expect(eyeLimitPixels(1800, 300)).toBeGreaterThan(20000);
  });
  it('diagonal pixels of a 24 MP 3:2 photo ≈ 7200', () => {
    expect(diagonalPixels(24, 1.5)).toBeCloseTo(Math.hypot(6000, 4000), -1);
  });
});

describe('outputSize()', () => {
  it('says how many MP each size needs to look sharp', () => {
    const o = outputSize(1, 1.5, 0);
    expect(pick(o, 'a4', 'close').sharpMp).toBeCloseTo(8, 0);
    expect(pick(o, 'p100x150', 'close').sharpMp).toBeGreaterThan(150);
    // At normal distance every print needs the same ≈ 5.5 MP; a 4K screen its own pixels (3:2 fitted: 3240 × 2160).
    expect(pick(o, 'a4', 'normal').sharpMp).toBeCloseTo(pick(o, 'p100x150', 'normal').sharpMp, 6);
    expect(pick(o, 'a4', 'normal').sharpMp).toBeCloseTo(5.5, 0);
    expect(pick(o, 'uhd', 'normal').sharpMp).toBeCloseTo(3.240 * 2.160, 1);
    // The threshold really is where "sharp" starts.
    const a4 = pick(o, 'a4', 'close').sharpMp;
    expect(pick(outputSize(a4 * 1.01, 1.5, 0), 'a4', 'close').verdict).toBe('sharp');
    expect(pick(outputSize(a4 * 0.99, 1.5, 0), 'a4', 'close').verdict).toBe('ok');
  });

  it('a sharp 14 MP photo: A4 sharp up close, A3 ok, a poster from across the room sharp', () => {
    const o = outputSize(14, 1.5, 0);
    expect(pick(o, 'a4', 'close').verdict).toBe('sharp');
    expect(pick(o, 'a3', 'close').verdict).toBe('ok');
    expect(pick(o, 'p100x150', 'close').verdict).toBe('soft');
    expect(pick(o, 'p100x150', 'normal').verdict).toBe('sharp');
    expect(pick(o, 'uhd', 'normal').verdict).toBe('sharp');
    expect(o.close).toEqual({ id: 'a4', verdict: 'sharp' });
  });

  it('at normal distance every print size gets the same verdict', () => {
    for (const mp of [0.5, 2, 5, 30]) {
      const normals = outputSize(mp, 1.5, 0).results.filter((r) => r.view === 'normal' && !['phone', 'fullHd', 'uhd'].includes(r.id));
      expect(new Set(normals.map((r) => r.verdict)).size, String(mp)).toBe(1);
    }
  });

  it('screens never ask for more than their own pixels', () => {
    const o = outputSize(2.5, 1.5, 0); // ≈ 2850 px diagonal
    expect(pick(o, 'fullHd', 'normal').verdict).toBe('sharp');
    expect(pick(o, 'uhd', 'normal').verdict).toBe('ok');
  });

  it('a blur of one CoC (1500 px diagonal) is "ok" at normal distance, like "sharp" in the graph', () => {
    const mp = 1500 ** 2 / (1.5 + 1 / 1.5) / 1e6;
    expect(pick(outputSize(mp * 1.01, 1.5, 0), 'a4', 'normal').verdict).toBe('ok');
    expect(pick(outputSize(mp * 0.99, 1.5, 0), 'a4', 'normal').verdict).toBe('soft');
  });

  it('enlarging shows the grain: noise drops close-up prints a level', () => {
    const o = outputSize(40, 1.5, 4.5); // "medium" at normal size
    expect(pick(o, 'p10x15', 'close').verdict).toBe('sharp');
    const big = pick(o, 'a3', 'close');
    expect(big.verdict).toBe('ok');
    expect(big.reason).toBe('noise');
    expect(pick(o, 'a3', 'normal').verdict).toBe('sharp');
  });

  it('derive() reports it for the current photo; digital zoom shrinks it', () => {
    const cam: CameraSettings = { ...initialState.camera, sensorId: 'fullFrame', lensId: 'prime', focalLengthMm: 50, aperture: 5.6, mode: 'M', autoIso: false, iso: 100, shutterS: 1 / 250, motion: 'frozen', afTarget: 'person1' };
    const scene = { ...initialState.scene, lightPresetId: 'sun' };
    const whole = derive(cam, scene).outputSize;
    const crop = derive({ ...cam, digitalZoom: 4 }, scene).outputSize;
    expect(whole.close?.id).toBe('a4');
    expect(crop.close === null || ['p10x15', 'p13x18'].includes(crop.close.id)).toBe(true);
    expect(crop.normal.verdict).not.toBe('sharp');
  });
});

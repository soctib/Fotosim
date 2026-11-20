import { describe, expect, it } from 'vitest';
import {
  IS_STOPS,
  classifyShake,
  handheldLimitS,
  handheldLimitWithIsS,
  shakeBlurFactor,
} from '../src/model/shake';

describe('shake', () => {
  it('handheld limit follows 1/(2·f·crop), IS adds stops', () => {
    expect(handheldLimitS(50, 1.5)).toBeCloseTo(1 / 150, 6);
    expect(handheldLimitWithIsS(50, 1, 3)).toBeCloseTo(8 / 100, 6);
    expect(handheldLimitWithIsS(50, 1)).toBeCloseTo((2 ** IS_STOPS) / 100, 6);
  });

  it('classifies safe / needs IS / needs tripod', () => {
    expect(classifyShake(1 / 30, 50, 1, false)).toBe('needsTripod');
    expect(classifyShake(1 / 30, 50, 1, true)).toBe('needsIS');
    expect(classifyShake(1 / 15, 50, 1, true)).toBe('needsTripod');
    expect(classifyShake(1 / 125, 50, 1, false)).toBe('safe');
    expect(classifyShake(1 / 60, 50, 1, false)).toBe('needsTripod'); // old 1/f rule would call this safe
    // Exactly at the limit still counts as safe.
    expect(classifyShake(1 / 100, 50, 1, false)).toBe('safe');
  });

  it('blur factor is ≤ 1 up to the limit and grows linearly with time', () => {
    expect(shakeBlurFactor(1 / 100, 50, 1, false)).toBeLessThanOrEqual(1);
    expect(shakeBlurFactor(1 / 50, 50, 1, false)).toBeCloseTo(2, 6);
    expect(shakeBlurFactor(1 / 30, 50, 1, true)).toBeLessThan(1); // IS covers 2 stops
  });
});

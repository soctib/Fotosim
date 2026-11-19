import { describe, expect, it } from 'vitest';
import { zoomLinear } from '../src/ui/graph/scale';

describe('zoomLinear', () => {
  it('keeps the anchor in view when zooming in past the minimum span', () => {
    let view = { log: false, min: 3, max: 6 };
    for (let i = 0; i < 50; i++) view = zoomLinear(view, 0.8, 4);
    expect(view.max - view.min).toBeCloseTo(0.5);
    expect(view.min).toBeLessThan(4);
    expect(view.max).toBeGreaterThan(4);
    // Further zoom steps at the limit are no-ops instead of sliding the view.
    const again = zoomLinear(view, 0.8, 4.2);
    expect(again.min).toBeCloseTo(view.min);
    expect(again.max).toBeCloseTo(view.max);
  });

  it('keeps the anchor at the same relative position when the span is limited', () => {
    const view = zoomLinear({ log: false, min: 5.5, max: 6.5 }, 0.1, 6);
    expect(view.min).toBeCloseTo(5.75);
    expect(view.max).toBeCloseTo(6.25);
  });

  it('caps zooming out at the maximum distance', () => {
    const view = zoomLinear({ log: false, min: 0, max: 800 }, 10, 400);
    expect(view.min).toBe(0);
    expect(view.max).toBe(1000);
  });
});

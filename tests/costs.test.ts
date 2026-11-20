import { describe, expect, it } from 'vitest';
import { BODY_PRICES, LENS_PRICES, TRIPOD_PRICES } from '../src/data/prices';
import { SENSOR_ORDER, SENSORS } from '../src/data/sensors';
import { costs, lensKind, roundPrice } from '../src/model/costs';

describe('roundPrice', () => {
  it('rounds to two significant digits, at least to 5 €', () => {
    expect(roundPrice(0)).toBe(0);
    expect(roundPrice(32)).toBe(30);
    expect(roundPrice(33)).toBe(35);
    expect(roundPrice(450)).toBe(450);
    expect(roundPrice(1234)).toBe(1200);
    expect(roundPrice(37500)).toBe(38000);
  });
});

describe('lensKind', () => {
  it('maps lens type and equivalent focal length to a concrete lens', () => {
    expect(lensKind('kit', 14)).toBe('wideZoomBudget');
    expect(lensKind('kit', 50)).toBe('kitZoom');
    expect(lensKind('kit', 85)).toBe('kitZoom');
    expect(lensKind('kit', 200)).toBe('teleZoomBudget');
    expect(lensKind('kit', 400)).toBe('superTele');
    expect(lensKind('fastZoom', 24)).toBe('standardZoom28');
    expect(lensKind('fastZoom', 70)).toBe('standardZoom28');
    expect(lensKind('fastZoom', 135)).toBe('teleZoom28');
    expect(lensKind('fastZoom', 300)).toBe('tele300');
    expect(lensKind('fastZoom', 400)).toBe('fastTele');
    expect(lensKind('prime', 35)).toBe('prime35');
    expect(lensKind('prime', 85)).toBe('prime85');
    expect(lensKind('prime', 200)).toBe('tele300');
    expect(lensKind('prime', 400)).toBe('fastTele');
  });
});

describe('costs', () => {
  it('sums camera, lens and tripod', () => {
    const c = costs('fullFrame', 'fastZoom', 50, 'frozen', false);
    expect(c.camera).toEqual(BODY_PRICES.fullFrame.priceEur);
    expect(c.lens).toEqual({ kind: 'standardZoom28', priceEur: LENS_PRICES.standardZoom28 });
    expect(c.tripod).toEqual(TRIPOD_PRICES.camera);
    const parts = [c.camera, c.lens!.priceEur, c.tripod!];
    expect(c.totalEur).toEqual([0, 1].map((i) => roundPrice(parts.reduce((a, p) => a + p[i], 0))));
  });

  it('high-end full frame costs more than mid-range, with the same lens', () => {
    const mid = costs('fullFrame', 'kit', 50, 'still', false);
    const pro = costs('fullFramePro', 'kit', 50, 'still', false);
    expect(pro.camera[0]).toBeGreaterThan(mid.camera[1]);
    expect(pro.lens).toEqual(mid.lens);
    expect(SENSORS.fullFramePro.widthMm).toBe(SENSORS.fullFrame.widthMm);
  });

  it('scales lens prices per system: cheaper for APS-C, dearer for digital medium format', () => {
    const ff = costs('fullFrame', 'prime', 85, 'still', false).lens!.priceEur;
    expect(costs('apsc', 'prime', 85, 'still', false).lens!.priceEur[1]).toBeLessThan(ff[1]);
    const mf = costs('mf4433', 'prime', 85, 'still', false).lens!.priceEur;
    expect(mf[0]).toBeGreaterThan(ff[0]);
    expect(mf[1]).toBeGreaterThan(ff[1]);
  });

  it('phones and compacts have their lens built in; old phones and film are used', () => {
    const phone = costs('iphoneXR', 'kit', 26, 'frozen', true);
    expect(phone.lens).toBeNull();
    expect(phone.used).toBe(true);
    expect(phone.tripod).toEqual(TRIPOD_PRICES.phone);
    expect(phone.totalEur).toEqual([0, 1].map((i) => roundPrice(BODY_PRICES.iphoneXR.priceEur[i] + TRIPOD_PRICES.phone[i])));
    expect(costs('oneInch', 'prime', 50, 'still', false).lens).toBeNull();
    expect(costs('film35', 'kit', 50, 'still', false).used).toBe(true);
  });

  it('adds film running costs per roll and frame, only for film', () => {
    expect(costs('fullFrame', 'kit', 50, 'still', false).film).toBeNull();
    expect(costs('film35', 'kit', 50, 'still', false).film?.perFrameEur).toBeCloseTo(0.9, 6);
    expect(costs('mf66', 'kit', 50, 'still', false).film?.perFrameEur).toBeCloseTo(3.1, 6);
    for (const id of SENSOR_ORDER) expect(!!costs(id, 'kit', 50, 'still', false).film, id).toBe(!!SENSORS[id].isFilm);
  });

  it('has a price for every camera type, with lenses unless built in', () => {
    for (const id of SENSOR_ORDER) {
      const b = BODY_PRICES[id];
      expect(b.priceEur[0], id).toBeLessThanOrEqual(b.priceEur[1]);
      expect(b.fixedLens || b.lensFactor > 0, id).toBe(true);
      expect(!!b.fixedLens, id).toBe(!!SENSORS[id].phoneCameras || id === 'oneInch');
    }
  });
});

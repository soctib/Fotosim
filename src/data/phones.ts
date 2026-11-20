import type { SensorId } from '../model/types';

// Typical phone classes. Lenses as approximate full-frame-equivalent focal lengths,
// one per physical camera (sensor-crop modes like "2×" on the main camera don't count).
// Display names/examples live in data/texts.*.ts (texts.phones[id]).

export interface PhoneClass {
  id: string;
  /** Camera type (a concrete phone) this class is highlighted for. */
  sensorId: SensorId;
  lensesEqMm: number[];
}

export const PHONE_CLASSES: PhoneClass[] = [
  { id: 'y2019basic', sensorId: 'iphoneXR', lensesEqMm: [13, 26] },
  { id: 'y2019tele', sensorId: 'iphoneXR', lensesEqMm: [13, 26, 52] },
  { id: 'currentBasic', sensorId: 'iphone15ProMax', lensesEqMm: [13, 26] },
  { id: 'currentPro', sensorId: 'iphone15ProMax', lensesEqMm: [13, 24, 77] },
  { id: 'currentZoom', sensorId: 'iphone15ProMax', lensesEqMm: [13, 24, 70, 115] },
];

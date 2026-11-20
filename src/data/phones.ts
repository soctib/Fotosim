import type { SensorId } from '../model/types';

// Typical phone classes. Lenses as approximate full-frame-equivalent focal lengths,
// one per physical camera (sensor-crop modes like "2×" on the main camera don't count).
// Display names/examples live in data/texts.*.ts (texts.phones[id]).

export interface PhoneClass {
  id: string;
  /** Camera types (concrete phones of that era) this class is highlighted for. */
  sensorIds: SensorId[];
  lensesEqMm: number[];
}

const CURRENT: SensorId[] = ['iphone15ProMax', 'fairphone5'];

export const PHONE_CLASSES: PhoneClass[] = [
  { id: 'y2019basic', sensorIds: ['iphoneXR'], lensesEqMm: [13, 26] },
  { id: 'y2019tele', sensorIds: ['iphoneXR'], lensesEqMm: [13, 26, 52] },
  { id: 'currentBasic', sensorIds: CURRENT, lensesEqMm: [13, 26] },
  { id: 'currentPro', sensorIds: CURRENT, lensesEqMm: [13, 24, 77] },
  { id: 'currentZoom', sensorIds: CURRENT, lensesEqMm: [13, 24, 70, 115] },
];

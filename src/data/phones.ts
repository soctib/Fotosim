import type { SensorId } from '../model/types';

// Typical phone classes. Lenses as approximate full-frame-equivalent focal lengths.
// Display names/examples live in data/texts.*.ts (texts.phones[id]).

export interface PhoneClass {
  id: string;
  /** Closest sensor preset for the main camera. */
  sensorId: SensorId;
  lensesEqMm: number[];
}

export const PHONE_CLASSES: PhoneClass[] = [
  { id: 'y2019basic', sensorId: 'phone2019', lensesEqMm: [13, 26] },
  { id: 'y2019tele', sensorId: 'phone2019', lensesEqMm: [13, 26, 52] },
  { id: 'currentBasic', sensorId: 'phoneModern', lensesEqMm: [13, 26] },
  { id: 'currentPro', sensorId: 'phoneModern', lensesEqMm: [13, 24, 48, 77] },
  { id: 'currentZoom', sensorId: 'phoneModern', lensesEqMm: [13, 24, 70, 115] },
];

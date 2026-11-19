import type { Sensor, SensorId } from '../model/types';

// Approximate dimensions. Display names live in data/texts.*.ts.
export const SENSORS: Record<SensorId, Sensor> = {
  // ~1/2.55" class, e.g. iPhone 11 / Galaxy S10 main camera
  phone2019: { id: 'phone2019', widthMm: 5.6, heightMm: 4.2, fixedAperture: 1.8, flashGuideNumber: 2 },
  // ~1/1.28" class, e.g. iPhone 15 Pro main camera
  phoneModern: { id: 'phoneModern', widthMm: 9.8, heightMm: 7.3, fixedAperture: 1.8, flashGuideNumber: 2 },
  oneInch: { id: 'oneInch', widthMm: 13.2, heightMm: 8.8, flashGuideNumber: 6 },
  mft: { id: 'mft', widthMm: 17.3, heightMm: 13, flashGuideNumber: 10 },
  apsc: { id: 'apsc', widthMm: 23.5, heightMm: 15.6, flashGuideNumber: 12 },
  fullFrame: { id: 'fullFrame', widthMm: 36, heightMm: 24, flashGuideNumber: 12 },
  // Same format on 35 mm film
  film35: { id: 'film35', widthMm: 36, heightMm: 24, flashGuideNumber: 12, isFilm: true },
  mf4433: { id: 'mf4433', widthMm: 43.8, heightMm: 32.9, flashGuideNumber: 12 },
  mf645: { id: 'mf645', widthMm: 56, heightMm: 41.5, flashGuideNumber: 12, isFilm: true },
  mf66: { id: 'mf66', widthMm: 56, heightMm: 56, flashGuideNumber: 12, isFilm: true },
  mf67: { id: 'mf67', widthMm: 69.5, heightMm: 56, flashGuideNumber: 12, isFilm: true },
};

export const SENSOR_ORDER: SensorId[] = [
  'phone2019',
  'phoneModern',
  'oneInch',
  'mft',
  'apsc',
  'fullFrame',
  'film35',
  'mf4433',
  'mf645',
  'mf66',
  'mf67',
];

/** Common full-frame-equivalent focal lengths offered on the slider. */
export const EQUIVALENT_FOCAL_STEPS_MM = [14, 18, 24, 28, 35, 50, 70, 85, 105, 135, 200, 300, 400];

/** Phones only have a few fixed lenses (equivalent mm); everything else is digital crop. */
export const PHONE_LENSES_EQ_MM: Partial<Record<SensorId, number[]>> = {
  phone2019: [13, 26, 52],
  phoneModern: [13, 24, 48, 77], // 15 Pro; the Pro Max has 120 instead of 77
};

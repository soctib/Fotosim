import type { Sensor, SensorId } from '../model/types';

import type { PhoneCamera } from '../model/types';

// Approximate dimensions. Display names live in data/texts.*.ts.
// Phones have a fixed aperture per camera, so bright light needs their electronic shutter.
// Phone sensor sizes from pixel count × pixel pitch.

/** iPhone XR: a single back camera, 12 MP at 1.4 µm (≈ 1/2.55"), 26 mm f/1.8. */
const XR_CAMERAS: PhoneCamera[] = [{ equivalentMm: 26, widthMm: 5.6, heightMm: 4.2, aperture: 1.8 }];

/**
 * iPhone 15 Pro Max: ultra wide 13 mm f/2.2 (12 MP, 1.4 µm), main 24 mm f/1.78 (48 MP, 1.22 µm,
 * ≈ 1/1.28"), 5× tele 120 mm f/2.8 (12 MP, 1.12 µm). The 28/35/48 mm settings are crops of the
 * main sensor – digital zoom – and deliberately left out.
 */
const IPHONE_15_PRO_MAX_CAMERAS: PhoneCamera[] = [
  { equivalentMm: 13, widthMm: 5.6, heightMm: 4.2, aperture: 2.2 },
  { equivalentMm: 24, widthMm: 9.8, heightMm: 7.4, aperture: 1.8 },
  { equivalentMm: 120, widthMm: 4.5, heightMm: 3.4, aperture: 2.8 },
];

const phone = (id: SensorId, cameras: PhoneCamera[], main: number): Sensor => ({
  id,
  widthMm: cameras[main].widthMm,
  heightMm: cameras[main].heightMm,
  fixedAperture: cameras[main].aperture,
  fastestShutterS: 1 / 16000,
  flashGuideNumber: 2,
  ledFlash: true,
  phoneCameras: cameras,
});

export const SENSORS: Record<SensorId, Sensor> = {
  iphoneXR: phone('iphoneXR', XR_CAMERAS, 0),
  iphone15ProMax: phone('iphone15ProMax', IPHONE_15_PRO_MAX_CAMERAS, 1),
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
  'iphoneXR',
  'iphone15ProMax',
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


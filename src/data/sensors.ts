import type { PhoneCamera, Sensor, SensorId } from '../model/types';

// Approximate dimensions. Display names live in data/texts.*.ts.
// Phones have a fixed aperture per camera, so bright light needs their electronic shutter.
// Phone sensor sizes from pixel count × pixel pitch.

/** iPhone XR: a single back camera, 12 MP at 1.4 µm (≈ 1/2.55"), 26 mm f/1.8. */
const XR_CAMERAS: PhoneCamera[] = [
  { equivalentMm: 26, widthMm: 5.6, heightMm: 4.2, aperture: 1.8, outputMegapixels: 12, lensBlurUm: 0.8, dynamicRangeStops: 10 },
];

/**
 * iPhone 15 Pro Max: ultra wide 13 mm f/2.2 (12 MP, 1.4 µm), main 24 mm f/1.78 (48 MP, 1.22 µm,
 * ≈ 1/1.28"), 5× tele 120 mm f/2.8 (12 MP, 1.12 µm). The 28/35/48 mm settings are crops of the
 * main sensor – digital zoom (the zoom slider) rather than modules of their own. The main camera
 * saves 24 MP by default (binned from 48). Ultra-wide lenses are the softest modules.
 */
const IPHONE_15_PRO_MAX_CAMERAS: PhoneCamera[] = [
  { equivalentMm: 13, widthMm: 5.6, heightMm: 4.2, aperture: 2.2, outputMegapixels: 12, lensBlurUm: 1.2, dynamicRangeStops: 10 },
  { equivalentMm: 24, widthMm: 9.8, heightMm: 7.4, aperture: 1.8, outputMegapixels: 24, lensBlurUm: 0.9, dynamicRangeStops: 11 },
  { equivalentMm: 120, widthMm: 4.5, heightMm: 3.4, aperture: 2.8, outputMegapixels: 12, lensBlurUm: 0.7, dynamicRangeStops: 9.5 },
];

/**
 * Fairphone 5: ultra wide 13 mm f/2.2 (Sony IMX858, 50 MP at 0.7 µm, 1/2.51"), main 25 mm f/1.9
 * (Sony IMX800, 50 MP at 1.0 µm, 1/1.49"). Sources give 25 or 26 mm for the main camera.
 * Both save 12.5 MP by default (4 pixels binned into one).
 */
const FAIRPHONE_5_CAMERAS: PhoneCamera[] = [
  { equivalentMm: 13, widthMm: 5.7, heightMm: 4.3, aperture: 2.2, outputMegapixels: 12.5, lensBlurUm: 1.2, dynamicRangeStops: 9.5 },
  { equivalentMm: 25, widthMm: 8.2, heightMm: 6.1, aperture: 1.9, outputMegapixels: 12.5, lensBlurUm: 0.9, dynamicRangeStops: 10.5 },
];

/*
 * Dynamic range (stops, base ISO, single frame), rough figures in line with published sensor
 * measurements: a phone frame ≈ 10 (bigger main sensors a bit more, tiny ultra-wide pixels and
 * tele sensors less), 1" and MFT ≈ 12, APS-C ≈ 13.5, full frame ≈ 14, medium format ≈ 15.
 *
 * Multi-frame noise gain (stops), estimated from what each phone's pipeline merges:
 * - iPhone XR: first-generation Smart HDR, merges frames mainly for highlights, no Deep Fusion.
 * - iPhone 15 Pro Max: Photonic Engine / Deep Fusion merges up to ~9 frames (≈ 3 stops),
 *   less after rejecting frames that don't line up.
 * - Fairphone 5: multi-frame HDR on a Qualcomm ISP; reviewers rate its processing as basic.
 */
const phone = (id: SensorId, cameras: PhoneCamera[], main: number, multiFrameStops: number): Sensor => ({
  id,
  widthMm: cameras[main].widthMm,
  heightMm: cameras[main].heightMm,
  fixedAperture: cameras[main].aperture,
  fastestShutterS: 1 / 16000,
  flashGuideNumber: 2,
  ledFlash: true,
  phoneCameras: cameras,
  multiFrameStops,
  dynamicRangeStops: cameras[main].dynamicRangeStops,
});

export const SENSORS: Record<SensorId, Sensor> = {
  iphoneXR: phone('iphoneXR', XR_CAMERAS, 0, 1.5),
  iphone15ProMax: phone('iphone15ProMax', IPHONE_15_PRO_MAX_CAMERAS, 1, 2.5),
  fairphone5: phone('fairphone5', FAIRPHONE_5_CAMERAS, 1, 1.5),
  // Pixel counts: one representative body per type (see texts.costs.examples).
  oneInch: { id: 'oneInch', widthMm: 13.2, heightMm: 8.8, flashGuideNumber: 6, megapixels: 20, dynamicRangeStops: 12 },
  mft: { id: 'mft', widthMm: 17.3, heightMm: 13, flashGuideNumber: 10, megapixels: 20, dynamicRangeStops: 12 },
  apsc: { id: 'apsc', widthMm: 23.5, heightMm: 15.6, flashGuideNumber: 12, megapixels: 24, dynamicRangeStops: 13.5 },
  // Mid-range full frame (Nikon Z5, Canon R6 II: 24 MP; Sony A7 IV: 33 MP).
  fullFrame: { id: 'fullFrame', widthMm: 36, heightMm: 24, flashGuideNumber: 12, megapixels: 24, dynamicRangeStops: 14 },
  // High-end full frame (Nikon Z8/Z9, Canon R5 II, Sony A1 II): same sensor size, so the same depth
  // of field and noise; a faster mechanical shutter and about twice the pixels.
  fullFramePro: { id: 'fullFramePro', widthMm: 36, heightMm: 24, flashGuideNumber: 12, fastestShutterS: 1 / 8000, megapixels: 45, dynamicRangeStops: 14 },
  // Same format on 35 mm film. Classic SLR (Canon AE-1 Program, Minolta X-700): ISO dial set by hand.
  film35: { id: 'film35', widthMm: 36, heightMm: 24, flashGuideNumber: 12, fastestShutterS: 1 / 1000, isFilm: true },
  // Late autofocus film SLR (Nikon F100, Canon EOS 3): reads the film speed from the DX code.
  film35Dx: { id: 'film35Dx', widthMm: 36, heightMm: 24, flashGuideNumber: 12, fastestShutterS: 1 / 8000, isFilm: true, dxCoding: true },
  // Fujifilm GFX 100 series, Hasselblad X2D: 100 MP.
  mf4433: { id: 'mf4433', widthMm: 43.8, heightMm: 32.9, flashGuideNumber: 12, megapixels: 100, dynamicRangeStops: 15 },
  // Mamiya 645, Pentax 645: focal-plane shutter to 1/1000 s.
  mf645: { id: 'mf645', widthMm: 56, heightMm: 41.5, flashGuideNumber: 12, fastestShutterS: 1 / 1000, isFilm: true },
  // Hasselblad 500 C/M: leaf shutter in the lens, 1/500 s, flash at every speed.
  mf66: { id: 'mf66', widthMm: 56, heightMm: 56, flashGuideNumber: 12, fastestShutterS: 1 / 500, leafShutter: true, isFilm: true },
  // Pentax 67: focal-plane shutter to 1/1000 s.
  mf67: { id: 'mf67', widthMm: 69.5, heightMm: 56, flashGuideNumber: 12, fastestShutterS: 1 / 1000, isFilm: true },
};

export const SENSOR_ORDER: SensorId[] = [
  'iphoneXR',
  'iphone15ProMax',
  'fairphone5',
  'oneInch',
  'mft',
  'apsc',
  'fullFrame',
  'fullFramePro',
  'film35',
  'film35Dx',
  'mf4433',
  'mf645',
  'mf66',
  'mf67',
];

/** Common full-frame-equivalent focal lengths offered on the slider. */
export const EQUIVALENT_FOCAL_STEPS_MM = [14, 18, 24, 28, 35, 50, 70, 85, 105, 135, 200, 300, 400];


import type { CameraLens, LensId } from '../model/types';

// Lens choices for interchangeable-lens cameras. Display names live in data/texts.*.ts.
export const CAMERA_LENSES: Record<LensId, CameraLens> = {
  // e.g. 18–55 mm f/3.5–5.6 on APS-C ≈ 28–85 mm equivalent
  kit: { id: 'kit', zoom: true, maxApertureWide: 3.5, maxApertureTele: 5.6, wideEqMm: 28, teleEqMm: 85 },
  // e.g. 24–70 / 70–200 mm f/2.8
  fastZoom: { id: 'fastZoom', zoom: true, maxApertureWide: 2.8, maxApertureTele: 2.8, wideEqMm: 24, teleEqMm: 200 },
  // fast primes, f/1.4 (simplified: available at every focal length)
  prime: { id: 'prime', zoom: false, maxApertureWide: 1.4, maxApertureTele: 1.4, wideEqMm: 24, teleEqMm: 135 },
};

export const LENS_ORDER: LensId[] = ['kit', 'fastZoom', 'prime'];

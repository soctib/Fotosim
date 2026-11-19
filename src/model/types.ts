// Units: focal lengths and sensor dimensions in mm, distances in m, shutter in s.

export type SensorId =
  | 'phone2019'
  | 'phoneModern'
  | 'oneInch'
  | 'mft'
  | 'apsc'
  | 'fullFrame'
  | 'film35'
  | 'mf4433'
  | 'mf645'
  | 'mf66'
  | 'mf67';

export interface Sensor {
  id: SensorId;
  widthMm: number;
  heightMm: number;
  /** Phones have a fixed aperture; the aperture control is locked. */
  fixedAperture?: number;
  /** Fastest shutter speed; default is a mechanical 1/4000 s. Phones use an electronic shutter. */
  fastestShutterS?: number;
  /** Typical flash guide number at ISO 100 in metres (pop-up ≈ 12, phone LED ≈ 2). */
  flashGuideNumber: number;
  /** Film: the ISO is the loaded film's speed – no camera mode can change it. */
  isFilm?: boolean;
}

export type LensId = 'kit' | 'fastZoom' | 'prime';

/** Interchangeable lens class; limits the widest aperture. Focal range is given as full-frame equivalent. */
export interface CameraLens {
  id: LensId;
  /** Widest aperture at the wide end (≤ wideEqMm) and at the long end (≥ teleEqMm); log-interpolated between. */
  maxApertureWide: number;
  maxApertureTele: number;
  wideEqMm: number;
  teleEqMm: number;
}

export type Mode = 'auto' | 'P' | 'Av' | 'Tv' | 'M';

export type ElementId = 'person1' | 'person2' | 'background';

export interface SceneElement {
  id: ElementId;
  distanceM: number;
  visible: boolean;
}

export interface CameraSettings {
  sensorId: SensorId;
  /** Ignored for phones (fixed aperture). */
  lensId: LensId;
  /** Real (not equivalent) focal length. */
  focalLengthMm: number;
  aperture: number;
  shutterS: number;
  iso: number;
  autoIso: boolean;
  mode: Mode;
  /** Manual flash switch (ignored in 'auto', where the camera decides). */
  flashOn: boolean;
  stabilized: boolean;
  /** Manual focus distance; overridden while autofocus tracks an element. */
  focusDistanceM: number;
  /** Continuous autofocus target, or null for manual focus. */
  afTarget: ElementId | null;
}

export interface Scene {
  lightPresetId: string;
  elements: SceneElement[];
}

/** Settings the camera chose itself in the current mode. */
export type AutoField = 'aperture' | 'shutterS' | 'iso' | 'flashOn';

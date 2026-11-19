// Units: focal lengths and sensor dimensions in mm, distances in m, shutter in s.

export type SensorId =
  | 'phone2019'
  | 'phoneModern'
  | 'oneInch'
  | 'mft'
  | 'apsc'
  | 'fullFrame'
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
  /** Typical flash guide number at ISO 100 in metres (pop-up ≈ 12, phone LED ≈ 2). */
  flashGuideNumber: number;
  isFilm?: boolean;
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
  focusDistanceM: number;
}

export interface Scene {
  lightPresetId: string;
  elements: SceneElement[];
}

/** Settings the camera chose itself in the current mode. */
export type AutoField = 'aperture' | 'shutterS' | 'iso' | 'flashOn';

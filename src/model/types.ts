// Units: focal lengths and sensor dimensions in mm, distances in m, shutter in s.

export type SensorId =
  | 'iphoneXR'
  | 'iphone15ProMax'
  | 'fairphone5'
  | 'oneInch'
  | 'mft'
  | 'apsc'
  | 'fullFrame'
  | 'fullFramePro'
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
  /** The "flash" is a continuous LED: no sync speed, works with any shutter time. */
  ledFlash?: boolean;
  /** Film: the ISO is the loaded film's speed – no camera mode can change it. */
  isFilm?: boolean;
  /**
   * Phones merge a burst of frames into one photo (Smart HDR, Deep Fusion, …): N usable frames
   * average out noise by log2(N) stops. Rough estimate per phone generation; 0 for cameras.
   */
  multiFrameStops?: number;
  /**
   * Phones: the built-in back cameras, each with its own sensor and fixed aperture. The focal
   * length picks one (see activeSensor()); widthMm/heightMm/fixedAperture above are the main camera's.
   */
  phoneCameras?: PhoneCamera[];
}

/** One built-in phone camera module. */
export interface PhoneCamera {
  /** Full-frame-equivalent focal length as the maker states it. */
  equivalentMm: number;
  widthMm: number;
  heightMm: number;
  aperture: number;
}

export type LensId = 'kit' | 'fastZoom' | 'prime';

/** Interchangeable lens class; limits the widest aperture. Focal range is given as full-frame equivalent. */
export interface CameraLens {
  id: LensId;
  /** Zooms move continuously across the focal range; primes only offer the common steps. */
  zoom: boolean;
  /** Widest aperture at the wide end (≤ wideEqMm) and at the long end (≥ teleEqMm); log-interpolated between. */
  maxApertureWide: number;
  maxApertureTele: number;
  wideEqMm: number;
  teleEqMm: number;
}

export type Mode = 'auto' | 'P' | 'Av' | 'Tv' | 'M';

export type ElementId = 'person1' | 'person2' | 'background';

/** How a person (or the photographer) moves: tripod/motionless, standing, walking, running, driving. */
export type Motion = 'frozen' | 'still' | 'walk' | 'run' | 'drive';

export interface SceneElement {
  id: ElementId;
  distanceM: number;
  visible: boolean;
  /** Persons only; the background is always 'frozen'. */
  motion: Motion;
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
  /** How the photographer holds the camera: 'frozen' = tripod or leaning against something. */
  motion: Motion;
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

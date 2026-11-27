// Dynamic range: how much contrast a photo holds between blown highlights and crushed shadows.
// Every layer of the image (sky, background scenery, persons) has a brightness in stops relative
// to a correctly exposed mid-tone. Above the highlight clip it turns white, below the shadow
// floor black – detail gone, not just bright or dark.

import type { Sensor } from './types';

/**
 * Highlight headroom above correct exposure (stops). Digital sensors clip about three stops over
 * a mid-tone; colour negative film takes about five (its famous latitude – the ISO stands for the
 * film, assumed to be colour negative).
 */
export const DIGITAL_HEADROOM_STOPS = 3;
export const FILM_HEADROOM_STOPS = 5;

/**
 * Colour negative film from its highlight limit down to where the negative is too thin (≈ 4
 * stops under). Film speed doesn't change it here: the ISO is the film, not a gain.
 */
export const FILM_DYNAMIC_RANGE_STOPS = 9;

/** Digital sensors without a value of their own (shouldn't happen; see data/sensors.ts). */
const DEFAULT_DYNAMIC_RANGE_STOPS = 12;
/** Even at the highest ISO a sensor keeps a few stops. */
const MIN_DYNAMIC_RANGE_STOPS = 4;

/**
 * A layer's detail fades over this many stops before the clip (its brighter parts clip first)
 * and before the floor (its darker parts drown first). At the limit itself the layer is flat.
 */
export const TONE_RAMP_STOPS = 1;

/**
 * Backlight ("Gegenlicht"): the light comes from behind, the subject stands in its own shadow –
 * this much darker than in front light. What's behind keeps its light, so it is brighter by the
 * same amount relative to the subject.
 */
export const BACKLIGHT_STOPS = 3;

export interface DynamicRange {
  /** Usable range between clip and floor (stops). */
  rangeStops: number;
  /** Highlight clip above correct exposure (stops). */
  clipStops: number;
  /** Shadow floor relative to correct exposure (stops, negative). */
  floorStops: number;
}

/**
 * Clip and floor for a sensor (phones: the active module) at an ISO. Digital range falls about a
 * stop per ISO stop above base (100) – the same cause as the noise index. Phones merge a burst
 * (`multiFrameStops`): the frames are exposed shorter to protect the highlights and merged to
 * bring the shadows back, so the clip moves up by the merge gain while the floor stays where a
 * single frame would have it (the merge's lower noise is counted in the noise index).
 */
export function dynamicRange(sensor: Sensor, iso: number): DynamicRange {
  if (sensor.isFilm) {
    return {
      rangeStops: FILM_DYNAMIC_RANGE_STOPS,
      clipStops: FILM_HEADROOM_STOPS,
      floorStops: FILM_HEADROOM_STOPS - FILM_DYNAMIC_RANGE_STOPS,
    };
  }
  const base = sensor.dynamicRangeStops ?? DEFAULT_DYNAMIC_RANGE_STOPS;
  const single = Math.max(MIN_DYNAMIC_RANGE_STOPS, base - Math.max(0, Math.log2(iso / 100)));
  const merge = sensor.multiFrameStops ?? 0;
  const clipStops = DIGITAL_HEADROOM_STOPS + merge;
  return { rangeStops: single + merge, clipStops, floorStops: DIGITAL_HEADROOM_STOPS - single };
}

/**
 * Brightness as the finished photo shows it. A camera's JPEG puts its clip (+3) at white; media
 * with more headroom squeeze theirs into the same white – the lab prints an overexposed negative
 * darker, an HDR phone tone-maps the bright sky down – so stops above correct exposure shrink by
 * 3/clip. Below correct exposure nothing changes.
 */
export function displayStops(brightnessStops: number, dr: DynamicRange): number {
  return brightnessStops > 0 ? (brightnessStops * DIGITAL_HEADROOM_STOPS) / dr.clipStops : brightnessStops;
}

export type ToneState = 'ok' | 'clipped' | 'crushed';

export interface LayerTone {
  /** Brightness of the layer's mid-tone relative to correct exposure (stops). */
  brightnessStops: number;
  state: ToneState;
  /** 0…1: how far the layer has faded to flat white (1 = at or above the clip). */
  highlight: number;
  /** 0…1: how far the layer has sunk to flat black (1 = at or below the floor). */
  shadow: number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function layerTone(brightnessStops: number, dr: DynamicRange): LayerTone {
  const { clipStops: clip, floorStops: floor } = dr;
  return {
    brightnessStops,
    state: brightnessStops >= clip ? 'clipped' : brightnessStops <= floor ? 'crushed' : 'ok',
    highlight: clamp01((brightnessStops - (clip - TONE_RAMP_STOPS)) / TONE_RAMP_STOPS),
    shadow: clamp01((floor + TONE_RAMP_STOPS - brightnessStops) / TONE_RAMP_STOPS),
  };
}

export interface SceneContrast {
  /** Light on the subject (EV100) – what the camera exposes for. */
  subjectEv100: number;
  /** Backdrop (sky or walls) and scenery brightness relative to the subject (stops). */
  skyStops: number;
  sceneryStops: number;
}

/** A light preset's contrast; backlight darkens the subject while the background keeps its light. */
export function sceneContrast(
  preset: { ev100: number; skyStops: number; sceneryStops: number },
  backlight: boolean,
): SceneContrast {
  const b = backlight ? BACKLIGHT_STOPS : 0;
  return { subjectEv100: preset.ev100 - b, skyStops: preset.skyStops + b, sceneryStops: preset.sceneryStops + b };
}

/**
 * What the camera's metering knows about bright backgrounds: the brightest background layer
 * relative to the subject and where this sensor clips. Without flash the camera still exposes for
 * the subject; with flash it can expose for the background and let the flash light the subject
 * (balanced fill flash).
 */
export interface Highlights {
  brightestStops: number;
  clipStops: number;
}

/** Ambient offsets (stops) above this put the brightest background layer into its fade towards white. */
export function highlightLimitStops(h: Highlights): number {
  return h.clipStops - TONE_RAMP_STOPS - h.brightestStops;
}

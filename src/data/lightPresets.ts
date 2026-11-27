export interface LightPreset {
  id: string;
  /** Light on the subject as exposure value at ISO 100 (front light). */
  ev100: number;
  /**
   * Scene contrast in front light, stops relative to the subject: the backdrop (sky, or the walls
   * indoors) and the scenery at the background distance. The drawn scenery already shows this
   * contrast; it decides what clips or drowns (model/dynamicRange.ts).
   */
  skyStops: number;
  sceneryStops: number;
}

// Rough textbook values. Display names live in data/texts.*.ts.
// Contrast: a blue sky is a bit brighter than a sunlit face, an overcast sky clearly so; at dusk
// the glowing sky outshines the darkening garden; at night the lamps light the subject and the
// street, the sky and unlit walls stay far below.
export const LIGHT_PRESETS: LightPreset[] = [
  { id: 'sun', ev100: 15, skyStops: 1, sceneryStops: 0 },
  { id: 'cloudy', ev100: 13, skyStops: 1.5, sceneryStops: 0 },
  { id: 'shade', ev100: 12, skyStops: 2, sceneryStops: 0 },
  { id: 'dusk', ev100: 9, skyStops: 1.5, sceneryStops: -1 },
  { id: 'office', ev100: 8, skyStops: 0, sceneryStops: 0 },
  { id: 'livingRoom', ev100: 6, skyStops: -1, sceneryStops: 0 },
  { id: 'nightStreet', ev100: 4, skyStops: -4, sceneryStops: 0 },
  { id: 'candle', ev100: 3, skyStops: -3, sceneryStops: 0 },
];

export function lightPreset(id: string): LightPreset {
  return LIGHT_PRESETS.find((p) => p.id === id) ?? LIGHT_PRESETS[0];
}

export interface LightPreset {
  id: string;
  /** Scene brightness as exposure value at ISO 100. */
  ev100: number;
}

// Rough textbook values. Display names live in data/texts.*.ts.
export const LIGHT_PRESETS: LightPreset[] = [
  { id: 'sun', ev100: 15 },
  { id: 'cloudy', ev100: 13 },
  { id: 'shade', ev100: 12 },
  { id: 'dusk', ev100: 9 },
  { id: 'office', ev100: 8 },
  { id: 'livingRoom', ev100: 6 },
  { id: 'nightStreet', ev100: 4 },
  { id: 'candle', ev100: 3 },
];

export function lightPreset(id: string): LightPreset {
  return LIGHT_PRESETS.find((p) => p.id === id) ?? LIGHT_PRESETS[0];
}

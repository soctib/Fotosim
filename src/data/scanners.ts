import type { ScannerId } from '../model/types';

// How film negatives become files. Display names live in data/texts.*.ts.
// A scanner either samples at a fixed density (dpi → pitch on the film), so a bigger negative gives
// more pixels, or – the camera scan – takes one photo of the whole negative with a fixed pixel count.

export interface Scanner {
  id: ScannerId;
  /** Sampling pitch on the film (µm); 25 400 / dpi. */
  pitchUm?: number;
  /** Camera scan: pixels across the whole negative (MP), Bayer sensor. */
  outputMegapixels?: number;
  /** Optical blur of the scanner itself (µm on the film). */
  blurUm: number;
}

export const SCANNERS: Record<ScannerId, Scanner> = {
  // Minilab (Noritsu/Frontier) standard scan: ≈ 3000 × 2000 px from 35 mm.
  lab: { id: 'lab', pitchUm: 11.7, blurUm: 3 },
  // Flatbed with film holder (Epson V600/V850): rated 6400 dpi, really resolves ≈ 2000.
  flatbed: { id: 'flatbed', pitchUm: 10.6, blurUm: 8 },
  // Dedicated film scanner (Plustek, Nikon Coolscan): 4000 dpi that it really resolves.
  filmScanner: { id: 'filmScanner', pitchUm: 6.35, blurUm: 2 },
  // Digital camera with a macro lens over a light table: one 24 MP shot of the negative.
  cameraScan: { id: 'cameraScan', outputMegapixels: 24, blurUm: 2 },
  // Drum scanner (service bureau): 8000 dpi.
  drum: { id: 'drum', pitchUm: 3.2, blurUm: 1.5 },
};

export const SCANNER_ORDER: ScannerId[] = ['lab', 'flatbed', 'filmScanner', 'cameraScan', 'drum'];

import { de as t, fill } from '../data/texts.de';
import type { Derived } from '../model/derive';

/** "Bewegung verwischt Person 1 und Person 2", or '' when nobody is smeared. */
export function movementBlurredText(d: Derived): string {
  if (!d.movementBlurred.length) return '';
  return fill(t.motion.blurred, { names: d.movementBlurred.map((id) => t.elements[id]).join(t.motion.and) });
}

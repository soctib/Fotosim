// Perspective layout shared by the camera-image layers: where an element's feet land and how
// many pixels one metre covers at its distance.

import type { DerivedElement } from '../../model/derive';
import type { ElementId } from '../../model/types';

/** Camera held at eye height (eyes are drawn at 165 cm), so it points straight at the faces. */
export const CAMERA_HEIGHT_M = 1.65;
const LATERAL_M: Record<ElementId, number> = { person1: -0.35, person2: 0.55, background: 0 };
/** Closer than this, the photographer aims at the person: the sideways offset shrinks (quadratically). */
const AIM_DISTANCE_M = 3;

/** Pixels per metre at an element's distance, plus the y of its ground contact and its centre x. */
export function projection(el: DerivedElement, W: number, H: number) {
  const perM = el.heightFractionPerM * H;
  const aim = Math.min(1, (el.distanceM / AIM_DISTANCE_M) ** 2);
  return { perM, groundY: H / 2 + CAMERA_HEIGHT_M * perM, cx: W / 2 + LATERAL_M[el.id] * aim * perM };
}

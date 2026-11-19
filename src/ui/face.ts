// Head geometry shared by the graph and the camera image. A person's distance is the
// distance of the eyes ("focus on the eyes"); other features sit in front of or behind them.

/** Depth offsets in metres relative to the eye plane (negative = towards the camera). */
export const FACE_DEPTH_M = {
  noseTip: -0.03,
  ears: 0.09,
  backOfHead: 0.17,
} as const;

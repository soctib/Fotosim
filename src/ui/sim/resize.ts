// Corner grip that lets the user resize the camera image. Only the layout width changes:
// the image keeps the sensor's aspect ratio and sim.ts redraws on its own (ResizeObserver).
// The width lives in the CSS variable --sim-width on the preview panel.

import { de as t } from '../../data/texts.de';
import { loadSimWidth, saveSimWidth } from '../../state/persist';

const MIN_PX = 240;
const KEY_STEP_PX = 20;

export function mountSimResize(preview: HTMLElement): void {
  const body = preview.querySelector<HTMLElement>('.preview-body')!;
  const frame = preview.querySelector<HTMLElement>('.sim-frame')!;
  const bars = preview.querySelector<HTMLElement>('#bars')!;

  const grip = document.createElement('div');
  grip.className = 'sim-resize';
  grip.tabIndex = 0;
  grip.setAttribute('role', 'slider');
  grip.setAttribute('aria-label', t.sim.resize);
  grip.title = t.sim.resize;
  frame.append(grip);

  /** The bars' content width; their grid cell stretches over any free space, so measure the bars themselves. */
  const barsWidth = () => {
    const kids = [...bars.querySelectorAll<HTMLElement>('.bar')].filter((el) => el.offsetWidth);
    if (!kids.length) return 0;
    return Math.ceil(Math.max(...kids.map((el) => el.getBoundingClientRect().right)) - bars.getBoundingClientRect().left);
  };
  /** Widest the image can get: the panel minus the bars beside it (hidden in simplified mode). */
  const maxWidth = () => {
    const barsW = barsWidth();
    const gap = barsW ? parseFloat(getComputedStyle(body).columnGap) || 0 : 0;
    return Math.max(MIN_PX, body.clientWidth - barsW - gap);
  };
  const clamp = (px: number) => Math.round(Math.min(maxWidth(), Math.max(MIN_PX, px)));
  const apply = (px: number | null) => {
    if (px === null) preview.style.removeProperty('--sim-width');
    else preview.style.setProperty('--sim-width', `${px}px`);
    grip.setAttribute('aria-valuenow', String(Math.round(frame.offsetWidth)));
  };

  const saved = loadSimWidth();
  apply(saved);

  let drag: { id: number; x: number; y: number; w: number; h: number } | null = null;
  grip.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    grip.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, w: frame.offsetWidth, h: frame.offsetHeight };
  });
  grip.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    // Project the pointer's movement onto the frame's diagonal so the corner stays under it.
    const { w, h } = drag;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    apply(clamp(w + ((dx * w + dy * h) * w) / (w * w + h * h)));
  });
  const end = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    saveSimWidth(frame.offsetWidth);
  };
  grip.addEventListener('pointerup', end);
  grip.addEventListener('pointercancel', end);

  grip.addEventListener('keydown', (e) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const px = clamp(frame.offsetWidth + step * KEY_STEP_PX);
    apply(px);
    saveSimWidth(px);
  });

  grip.addEventListener('dblclick', () => {
    apply(null);
    saveSimWidth(null);
  });
  // The frame explains itself on click; a click on the grip is about resizing, not the image.
  grip.addEventListener('click', (e) => e.stopPropagation());
}

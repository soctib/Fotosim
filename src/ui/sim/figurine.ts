// The persons in the camera image: a figurine facing the camera, drawn in centimetres with the
// origin at the feet (175 cm tall, eyes at −165 cm). Head, neck, ear outline and hair are based on
// Personas by Draftbit (CC BY 4.0), modified; eyes, nose, mouth and body are our own.
//
// The figure comes in three depth groups – ears, face/body, nose – that the camera image blurs
// separately. Colours are inline and pre-mixed: blend modes do nothing inside a blurred group.

import type { ElementId } from '../../model/types';

type PersonId = Exclude<ElementId, 'background'>;

/** The parts of one figure, in cm. `defs` holds its gradients and clip path (ids prefixed per person). */
export interface FigureParts {
  defs: string;
  ears: string;
  body: string;
  nose: string;
}

/** Fine detail (iris texture, nostrils, freckles) only once a centimetre covers this many display pixels. */
const DETAIL_MIN_PX_PER_CM = 3;

// ---------- colours ----------

type Rgb = [number, number, number];
const rgb = (h: string): Rgb => [0, 2, 4].map((i) => parseInt(h.slice(1 + i, 3 + i), 16) / 255) as Rgb;
const hex = (c: number[]) =>
  '#' + c.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');
/** What `mix-blend-mode: overlay` with white (top 1) or black (top 0) at opacity `a` gives on `base`. */
const overlay = (base: string, top: 0 | 1, a: number) =>
  hex(rgb(base).map((b) => b + ((b < 0.5 ? 2 * b * top : 1 - 2 * (1 - b) * (1 - top)) - b) * a));
const shade = (h: string, k: number) => hex(rgb(h).map((v) => v * k));

interface Person {
  skin: string;
  hair: string;
  style: keyof typeof HAIR;
  shirt: string;
  jeans: string;
  shoes: string;
}

/** Skin and hair from the Personas palette; shirts as before (they match the persons' colours in the graph). */
const PEOPLE: Record<PersonId, Person> = {
  person1: { skin: '#e5a07e', hair: '#6c4545', style: 'shortCombover', shirt: '#c2255c', jeans: '#4a6fa5', shoes: '#3a3340' },
  person2: { skin: '#b16a5b', hair: '#362c47', style: 'bobCut', shirt: '#7048e8', jeans: '#5b7fb8', shoes: '#5a3a2e' },
};

function tones(p: Person) {
  return {
    face: overlay(p.skin, 1, 0.36),
    earFold: shade(p.skin, 0.8),
    nose: shade(p.skin, 0.94),
    noseShade: shade(p.skin, 0.8),
    nostril: shade(p.skin, 0.55),
    freckle: shade(p.skin, 0.72),
    noseHighlight: overlay(p.skin, 1, 0.75),
    hairHighlight: overlay(p.hair, 1, 0.26),
    mouth: shade(p.skin, 0.5),
    sleeve: shade(p.shirt, 0.86),
    cuff: shade(p.jeans, 1.18),
  };
}
type Tones = ReturnType<typeof tones>;
const TONES: Record<PersonId, Tones> = { person1: tones(PEOPLE.person1), person2: tones(PEOPLE.person2) };

// ---------- head (Personas 64-unit grid) ----------

/** Head 28 units wide → 23 cm; the Personas eye line (y 28.5) sits at our −165 cm. */
const HEAD_SCALE = 23 / 28;
const HEAD_TRANSFORM = `translate(${(-32 * HEAD_SCALE).toFixed(3)} ${(-165 - 28.5 * HEAD_SCALE).toFixed(3)}) scale(${HEAD_SCALE.toFixed(4)})`;
/**
 * The Personas head outline (head, neck and ear bumps in one shape), split into parts so the ears
 * can blur on their own without clip paths (those cost noticeably at high zoom in WebKit): the ear
 * bumps up to x 18.3 / 45.7, and the face circle plus the neck, which cover the rest of the outline.
 */
const EARS =
  'M18.3 37H18.5a4.5 4.5 0 0 1-.5-8.97V27H18.3Z M45.7 37H45.5a4.5 4.5 0 0 0 .5-8.97V27H45.7Z';
const NECK = 'M37 40V52a5 5 0 0 1-10 0V40Z';
/** The face, a lighter tone than neck and ears. */
const FACE = 'M32 13a14 14 0 0 1 14 14v6a14 14 0 1 1-28 0v-6a14 14 0 0 1 14-14Z';
const EAR_FOLD = 'M17.6 30.2q-1.9 2.3.1 4.9M46.4 30.2q1.9 2.3-.1 4.9';

/** Personas hair shapes (60-unit grid, offset by 2 onto the head); `hi` is the highlight colour. */
const HAIR = {
  shortCombover: (hair: string, hi: string) =>
    `<path d="M40.26 12.63a7.93 7.93 0 0 1 4.6 8.35L44 27c-2.83-1.7-4.7-5.55-5.6-11.56a9.24 9.24 0 0 1-5.7 2.77c-1.82.2-3.39.29-4.7.29-3 0-5.67-.5-8-1.5 0 3.67-1.33 7.17-4 10.5l-.92-8.53A9 9 0 0 1 24.03 9H41c0 1.28-.26 2.51-.74 3.63Z" fill="${hair}"/><path d="M40.26 12.63c.48-1.12.74-2.35.74-3.63H24.03a9 9 0 0 0-8.95 9.97L16 27.5c2.67-3.33 4-6.83 4-10.5 2.33 1 5 1.5 8 1.5 1.31 0 2.88-.1 4.7-.29a9.24 9.24 0 0 0 7.56-5.58ZM44.88 20.84a7.91 7.91 0 0 0-2.42-6.73 9.29 9.29 0 0 1-3.45 4.5c1.04 4.22 2.7 7.01 5 8.39l.85-6.02.02-.14Z" fill="${hi}"/>`,
  bobCut: (hair: string, hi: string) =>
    `<path fill-rule="evenodd" d="M44 26a17.63 17.63 0 0 1-3.35-5.6A32.92 32.92 0 0 1 30 22.04c-4.85 0-9.14-.83-12.9-2.5A13.95 13.95 0 0 0 16 25v1.03c-.73.08-1.42.34-2 .73v-1.38C14 16.33 21.16 9 30 9s16 7.33 16 16.38v1.38a4.47 4.47 0 0 0-2-.73V26Zm-9 20.06v-1.98A14.04 14.04 0 0 0 43.42 35h.08c.93 0 1.78-.28 2.5-.76v6.38c0 .47-.02.95-.06 1.41A34.63 34.63 0 0 1 35 46.06Zm-20.94-4.03A34.63 34.63 0 0 0 25 46.06v-1.98A14.04 14.04 0 0 1 16.58 35h-.08c-.93 0-1.79-.28-2.5-.76v6.38c0 .47.02.95.06 1.41Z" fill="${hair}"/><path d="M30 9c-8.84 0-16 7.33-16 16.38v1.38c.58-.4 1.27-.65 2-.73V25c0-1.94.4-3.8 1.1-5.47a31.35 31.35 0 0 0 12.9 2.5c3.9 0 7.46-.54 10.65-1.62A17.63 17.63 0 0 0 44 26v.03c.73.08 1.42.34 2 .73v-1.38C46 16.33 38.84 9 30 9Z" fill="${hi}"/>`,
};

// ---------- eyes, nose, mouth (cm) ----------

/**
 * One eye at (x, −165 cm). Close up: white, textured iris, pupil, catchlight and lid line – fine
 * detail to judge sharpness by (the catchlight especially). Far away: just white and iris, the
 * same size, so nothing jumps at the threshold. Colours come from CSS (iris per person).
 */
function drawEye(x: number, pxPerCm: number): string {
  const y = -165;
  const irisR = 1.0;
  const white = `<ellipse class="sclera" cx="${x}" cy="${y}" rx="2.3" ry="1.45"/>`;
  if (irisR * pxPerCm < DETAIL_MIN_PX_PER_CM) return `${white}<circle class="iris eye-simple" cx="${x}" cy="${y}" r="${irisR}"/>`;
  const rays = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    return `M${(x + c * 0.5).toFixed(3)},${(y + s * 0.5).toFixed(3)} L${(x + c * 0.92).toFixed(3)},${(y + s * 0.92).toFixed(3)}`;
  }).join(' ');
  return `<g class="eye-detail">
    ${white}
    <circle class="iris" cx="${x}" cy="${y}" r="${irisR}"/>
    <path class="iris-rays" d="${rays}"/>
    <circle class="limbus" cx="${x}" cy="${y}" r="${irisR - 0.04}"/>
    <circle class="pupil" cx="${x}" cy="${y}" r="0.42"/>
    <circle class="catchlight" cx="${x + 0.32}" cy="${y - 0.34}" r="0.19"/>
    <path class="lid" d="M${x - 2.4},${y + 0.15} Q${x},${y - 2.1} ${x + 2.4},${y + 0.15}"/>
  </g>`;
}

const NOSE = 'M0,-165 L-2.4,-158.6 Q0,-157.2 2.4,-158.6 Z';
const FRECKLES: [number, number][] = [[-1.1, -160.4], [-0.5, -161.6], [0.6, -160.9], [1.2, -159.9], [0.1, -162.6], [-1.5, -159.3]];

/** Nose halves meeting on the centre line; the left one lies in shadow. */
const NOSE_LEFT = 'M0,-165 L-2.4,-158.6 Q-1.3,-157.95 0,-157.9 Z';
const NOSE_RIGHT = 'M0,-165 L2.4,-158.6 Q1.3,-157.95 0,-157.9 Z';

/**
 * Gradients and clip the nose needs (cm), ids prefixed with `id`. The fade sits in each half's
 * fill (stop opacity) rather than in a mask over the nose – same look, cheaper inside a blurred group.
 */
function noseDefs(id: string, t: Tones): string {
  const fade = (name: string, color: string) =>
    `<linearGradient id="${id}-nose-${name}" gradientUnits="userSpaceOnUse" x1="0" y1="-157.4" x2="0" y2="-165">
      <stop offset="0.3" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>`;
  return `${fade('lit', t.nose)}${fade('shade', t.noseShade)}
    <clipPath id="${id}-nose-clip"><path d="${NOSE}" transform="translate(0 -0.08)"/></clipPath>`;
}

/**
 * Nose (front view): our triangle with a flat shadow on its left half, the whole nose fading out
 * from the tip up to the bridge so it blends into the face. Close up the tip gets fine detail –
 * highlight, nostrils, freckles – so you can tell whether the tip itself is sharp.
 */
function drawNose(id: string, t: Tones, pxPerCm: number): string {
  const body = `<path d="${NOSE_RIGHT}" fill="url(#${id}-nose-lit)"/><path d="${NOSE_LEFT}" fill="url(#${id}-nose-shade)"/>`;
  if (pxPerCm < DETAIL_MIN_PX_PER_CM) return body;
  // Nostrils: flat, tilted outward, kept inside the nose outline so they never poke out below.
  const nostril = (x: number, a: number) =>
    `<ellipse cx="${x}" cy="-158.32" rx="0.52" ry="0.2" transform="rotate(${a} ${x} -158.32)" fill="${t.nostril}"/>`;
  return `${body}<g clip-path="url(#${id}-nose-clip)">${nostril(-0.95, 16)}${nostril(0.95, -16)}</g>
    ${FRECKLES.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.13" fill="${t.freckle}" opacity="0.8"/>`).join('')}
    <ellipse cx="0.6" cy="-159.1" rx="0.42" ry="0.3" fill="${t.noseHighlight}" opacity="0.8"/>`;
}

// ---------- body (cm) ----------

const stroke = (d: string, color: string, width: number) =>
  `<path d="${d}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" fill="none"/>`;
/** The left half drawn again, mirrored to the right. */
const mirrored = (left: string) => `${left}<g transform="scale(-1 1)">${left}</g>`;

/** T-shirt with rounded shoulders (±19.6 cm) and a neckline that shows the neck. */
const SHIRT =
  'M-4.6,-147 Q0,-140 4.6,-147 C10,-146.6 16.2,-145.4 18.4,-139.5 Q19.6,-136 19.6,-130 L18.8,-90 Q18.8,-85 14.6,-85 L-14.6,-85 Q-18.8,-85 -18.8,-90 L-19.6,-130 Q-19.6,-136 -18.4,-139.5 C-16.2,-145.4 -10,-146.6 -4.6,-147 Z';

/** Jeans with cuffs, sneakers with white soles, bare forearms and hands, short sleeves – all behind the shirt. */
function underShirt(p: Person, t: Tones): string {
  return `<path d="M-15.5,-90 L-14.8,-6 L-3.6,-6 L-0.7,-68 L0.7,-68 L3.6,-6 L14.8,-6 L15.5,-90 Z" fill="${p.jeans}"/>
    ${mirrored(
      `<rect x="-15.2" y="-10.5" width="11.8" height="3.4" rx="0.8" fill="${t.cuff}"/>
      <path d="M-15,-7.5 H-4 Q-2.2,-7.5 -2.2,-5.2 V-2.4 H-18.4 V-3.6 Q-18.4,-7.5 -15,-7.5 Z" fill="${p.shoes}"/>
      <rect x="-18.6" y="-2.6" width="16.6" height="2.6" rx="1" fill="#f4f1ea"/>
      ${stroke('M-20.3,-124 Q-23.3,-108 -22.2,-95', p.skin, 6.2)}
      <circle cx="-22.1" cy="-91" r="3.6" fill="${p.skin}"/>
      ${stroke('M-17,-138.4 Q-20.4,-130 -21,-121.5', t.sleeve, 9.4)}`,
    )}`;
}

// ---------- the whole figure ----------

/**
 * Person `id` facing the camera, split into its depth groups. `pxPerCm` is the display scale
 * (after digital zoom), which decides how much fine detail is worth drawing.
 */
export function figure(id: PersonId, pxPerCm: number): FigureParts {
  const p = PEOPLE[id];
  const t = TONES[id];
  const head = (svg: string) => `<g transform="${HEAD_TRANSFORM}">${svg}</g>`;
  return {
    defs: noseDefs(id, t),
    ears: head(
      `<path d="${EARS}" fill="${p.skin}"/>${stroke(EAR_FOLD, t.earFold, 0.7)}`,
    ),
    body: `${underShirt(p, t)}
      ${head(`<path d="${NECK}" fill="${p.skin}"/><path d="${FACE}" fill="${t.face}"/>`)}
      <path d="${SHIRT}" fill="${p.shirt}"/>
      ${head(`<g transform="translate(2 2)">${HAIR[p.style](p.hair, t.hairHighlight)}</g>`)}
      ${drawEye(-4.8, pxPerCm)}${drawEye(4.8, pxPerCm)}
      ${stroke('M-3.8,-155.8 Q0,-153 3.8,-155.8', t.mouth, 1.3)}`,
    nose: drawNose(id, t, pxPerCm),
  };
}

/** A person's colours for drawings outside the camera image (the graph's profile heads). */
export function personColors(id: PersonId) {
  const { skin, hair, style } = PEOPLE[id];
  const t = TONES[id];
  return { skin, hair, longHair: style === 'bobCut', face: t.face, earFold: t.earFold, nose: t.nose, mouth: t.mouth };
}

// Plush kit — data types and drawing helpers shared by every plush pack.
// Pure data, no React, safe to import on the server. Characters live in a
// 100×100 box. Heads sit low (centre ≈ 50, 60) so hair and hats fit on top.

import { r2, rounded, roundedEach, type Pt } from "../motion/geometry.ts";

export const plushStates = ["idle", "listening", "thinking", "working", "speaking", "celebrating", "sleeping"] as const;
export type PlushState = (typeof plushStates)[number];

export const textures = ["felt", "plastic", "plain"] as const;
export type Texture = (typeof textures)[number];

/** [tag, attrs, children]. Attr keys use React naming. "$body" / "$eye" resolve to the character's colors. */
export type Node = [tag: string, attrs: Record<string, string | number>, children?: Node[]];

/** dot: button eyes · googly: whites + pupils · shades: covered by a `data-k="shades"` piece of face wear */
export type EyeKind = "dot" | "googly" | "shades";

export type PlushCharacter = {
  id: string;
  name: string;
  line: string;
  color: string;
  eyeColor: string;
  /** Silhouette path. */
  d: string;
  face: {
    x: number; y: number; gap: number; tilt: number; w: number; h: number; look?: number;
    /** Mirror the tilt on the right eye (inward-leaning, sharper look). */
    mirror?: boolean;
    /** Catchlights on the eyes. Off for solid, Superquill-style eyes. */
    glint?: boolean;
    /** A second pair of eyes below the first that opens with the state. */
    extra?: {dy: number; s: number};
  };
  eyes: EyeKind;
  /** Behind the silhouette, same material (ears, braids, gourds). */
  back?: Node[];
  /** On top of the silhouette, same material (hair, hats, masks, collars). */
  wear?: Node[];
  /** On the face with parallax, no material (glasses, blindfolds, marks). */
  faceWear?: Node[];
};

export type PlushPack = {
  id: string;
  name: string;
  /** One-line hook for banners. */
  tagline: string;
  description: string;
  /** Component name in the download. */
  component: string;
  texture: Texture;
  particleColor: string;
  /** Banner and stage glow. */
  accent: string;
  characters: readonly PlushCharacter[];
  /** Offer the felt / plastic / plain picker. Off for flat-only packs. */
  materials?: boolean;
};

// ---------- drawing helpers ----------

const ink = "#18181b";
const deg = (d: number) => (d * Math.PI) / 180;
const at = (cx: number, cy: number, r: number, a: number): Pt => [cx + Math.cos(deg(a)) * r, cy + Math.sin(deg(a)) * r];
const pts = (p: Pt[]) => p.map(([x, y], i) => `${i ? "L" : "M"}${r2(x)} ${r2(y)}`).join("") + "Z";

/** Round head silhouette. */
export const head = (r = 30, cx = 50, cy = 60, squash = 1) =>
  `M${cx - r} ${cy}a${r} ${r * squash} 0 1 0 ${r * 2} 0a${r} ${r * squash} 0 1 0 ${-r * 2} 0Z`;

/** Half-width of a circle at height y. */
const span = (r: number, cy: number, y: number) => Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));

/**
 * Spiky hair: tips fan around the top of the head between two angles (0° = right, 270° = up),
 * closing along an inner arc that covers the forehead.
 */
export function spikes({cx = 50, cy = 60, r = 31, from = 195, to = 345, n = 7, len = 11, lean = 0, inner = 0.6, vary = [] as number[], soft = 1.6} = {}) {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const a = from + ((to - from) * i) / n;
    out.push(at(cx, cy, r + 1.5, a));
    if (i < n) out.push(at(cx, cy, r + len * (vary[i] ?? 1), a + (to - from) / n / 2 + lean));
  }
  for (let i = 12; i >= 0; i--) out.push(at(cx, cy, r * inner, from + ((to - from) * i) / 12));
  return rounded(out, soft);
}

/**
 * Hair with round tips and round valleys. Tufts fan around the head between two angles
 * (0° = right, 270° = up). `spread` leans side tufts outward, `lean` tilts every tuft,
 * `fringe` adds strands hanging over the forehead. Every corner is rounded.
 */
export function hair({cx = 50, cy = 61, r = 31, from = 192, to = 348, len = [10] as number[], spread = 0, lean = 0, tip = 2.2, valley = 2.6, base = 1.5,
  inner = 0.62, fringe = null as null | {y: number; n: number; len: number; lean?: number; tip?: number}} = {}) {
  const v: [number, number, number][] = [];
  const n = len.length, step = (to - from) / n;
  for (let i = 0; i <= n; i++) {
    const a = from + step * i; const [x, y] = at(cx, cy, r + base, a);
    v.push([x, y, i === 0 || i === n ? 1.5 : valley]);
    if (i < n) {
      const off = (i + 0.5 - n / 2) / (n / 2); // -1 … 1 across the head
      const [tx, ty] = at(cx, cy, r + (len[i] ?? len[len.length - 1]), a + step / 2 + lean + off * spread);
      v.push([tx, ty, tip]);
    }
  }
  if (fringe) {
    // forehead line from right to left with strands hanging down
    const w = span(r * 0.97, cy, fringe.y); const xs = Array.from({length: fringe.n * 2 + 1}, (_, i) => cx + w - (2 * w * i) / (fringe.n * 2));
    xs.forEach((x, i) => v.push(i % 2
      ? [x + (fringe.lean ?? 0), fringe.y + fringe.len * (i === 1 || i === xs.length - 2 ? 0.8 : 1), fringe.tip ?? 3]
      : [x, fringe.y + (i === 0 || i === xs.length - 1 ? 4 : 0), 2.6]));
  } else {
    for (let i = 10; i >= 0; i--) { const [x, y] = at(cx, cy, r * inner, from + ((to - from) * i) / 10); v.push([x, y, 6]); }
  }
  return roundedEach(v);
}

/** Hair plus the shadow it casts on the forehead (clipped to the head). Lags on a spring. */
export const hairTuft = (d: string, color: string, extra: Node[] = []): Node =>
  ["g", {"data-k": "hair"}, [
    ["path", {d, fill: "$shade", transform: "translate(0.4 2.6)", clipPath: "$clip"}],
    ["path", {d, fill: color}],
    ...extra,
  ]];

/** Smooth cap of hair with a straight fringe at `bang` and sides down to `side`. */
export function cap({cx = 50, cy = 60, r = 32, bang = 44, side = 58, inset = 5} = {}) {
  const w = span(r, cy, side);
  // sides below the centre need the long way round, over the top
  return `M${r2(cx - w)} ${side}A${r} ${r} 0 ${side > cy ? 1 : 0} 1 ${r2(cx + w)} ${side}L${r2(cx + w - inset)} ${side}L${r2(cx + w - inset)} ${bang}L${r2(cx - w + inset)} ${bang}L${r2(cx - w + inset)} ${side}Z`;
}

/** The part of a round head below height y (masks, collars). */
export function lower({cx = 50, cy = 60, r = 30.5, y = 68} = {}) {
  const w = span(r, cy, y);
  return `M${r2(cx - w)} ${y}A${r} ${r} 0 0 0 ${r2(cx + w)} ${y}Z`;
}

/** A band wrapped across a round head between heights y and y + h (headbands, blindfolds). */
export function band({cx = 50, cy = 60, r = 31, y = 40, h = 7} = {}) {
  const w1 = span(r, cy, y), w2 = span(r, cy, y + h);
  return roundedEach([[cx - w1, y, 1.6], [cx + w1, y, 1.6], [cx + w2, y + h, 1.6], [cx - w2, y + h, 1.6]]);
}

/** Ninja forehead protector: band plus a metal plate with a leaf-ish swirl. */
export function protector({y = 40, color = "#2b3a67", slant = 0}: {y?: number; color?: string; slant?: number} = {}): Node {
  return ["g", {transform: `rotate(${slant} 50 ${y + 4})`}, [
    ["path", {d: band({y, h: 7.5}), fill: color}],
    ["rect", {x: 39, y: y - 1, width: 22, height: 9.5, rx: 2, fill: "#c3cad6"}],
    ["path", {d: `M45 ${y + 4}a5 3.6 0 1 1 5 3.2q4-.4 4.4-3.6`, fill: "none", stroke: "#5b6474", strokeWidth: 1.1, strokeLinecap: "round"}],
  ]];
}

/** Chainsaw blade sticking out of a forehead. */
export function chainsaw({x = 50, y = 34, h = 26, w = 11} = {}): Node {
  const teeth: Node[] = Array.from({length: Math.floor(h / 4)}, (_, i) => {
    const ty = y - 3 - i * 4;
    return ["path", {d: `M${x - w / 2} ${ty}l-2.2 -1.6 2.2 -1.6ZM${x + w / 2} ${ty}l2.2 -1.6 -2.2 -1.6Z`, fill: "#5b6270"}] as Node;
  });
  return ["g", {}, [
    ["rect", {x: x - w / 2, y: y - h, width: w, height: h, rx: w / 2, fill: "#d3d8e0"}],
    ["rect", {x: x - w / 2 + 2.5, y: y - h + 4, width: w - 5, height: h - 6, rx: 2, fill: "#aab1bd"}],
    ...teeth,
    ["rect", {x: x - 6.5, y: y - 3, width: 13, height: 6, rx: 2, fill: "#e8792d"}],
  ]];
}

/** Two pointy horns. */
export function horns(color = "#d6332f"): Node {
  return ["g", {fill: color}, [
    ["path", {d: "M31 33Q27 18 33 10Q36 22 40 29Z"}],
    ["path", {d: "M69 33Q73 18 67 10Q64 22 60 29Z"}],
  ]];
}

/** Lines on the cheeks (whiskers, marks). */
export function cheeks({x = 50, y = 69, gap = 30, color = ink, n = 3, len = 7}: {x?: number; y?: number; gap?: number; color?: string; n?: number; len?: number} = {}): Node {
  const lines = Array.from({length: n}, (_, i) => {
    const yy = y + (i - (n - 1) / 2) * 3;
    return `M${x - gap / 2 - len / 2} ${yy}h${len}M${x + gap / 2 - len / 2} ${yy}h${len}`;
  }).join("");
  return ["path", {d: lines, stroke: color, strokeWidth: 1.4, strokeLinecap: "round", fill: "none", opacity: 0.75}];
}

/** Simple rounded-corner polygon as a node. */
export const poly = (verts: Pt[], r: number, fill: string): Node => ["path", {d: rounded(verts, r), fill}];
export const raw = pts;
export { ink };

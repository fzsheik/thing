// Space Collection — character geometry.
// Pure data + helpers, no React. Every silhouette is generated from a polar
// function or a rounded polygon inside a 100×100 box centred on (50, 50).

export const spaceStates = ["idle", "listening", "thinking", "working", "speaking", "celebrating", "sleeping"] as const;
export type SpaceState = (typeof spaceStates)[number];

export type SpaceCharacter = {
  id: string;
  name: string;
  line: string;
  /** Silhouette path in a 100×100 box. */
  d: string;
  /** Eye pair centre, spacing, and pill tilt in degrees. */
  eyes: {x: number; y: number; gap: number; tilt: number};
};

import { angDiff, polar, r2, rad, regular, rotate, rounded } from "../motion/geometry.ts";

const eyes = (x = 55, y = 44, gap = 10, tilt = -18) => ({x, y, gap, tilt});

// ---------- the crew ----------

export const spaceCharacters = [
  {id: "luna", name: "Luna", line: "The original moon. Calm, round, always listening.",
    d: polar(() => 33), eyes: eyes()},
  {id: "nebula", name: "Nebula", line: "A soft cloud of half-formed ideas.",
    d: polar(a => 27 + 7 * Math.pow(Math.abs(Math.sin(2.5 * a + 0.4)), 0.55), {n: 90}), eyes: eyes(54, 46)},
  {id: "quasar", name: "Quasar", line: "Square-jawed, bright, and very on-task.",
    d: rounded(rotate([[22, 22], [78, 22], [78, 78], [22, 78]], -14), 15), eyes: eyes(53, 47, 10, -26)},
  {id: "pulsar", name: "Pulsar", line: "Four points of pure signal.",
    d: polar(a => 19 + 17 * Math.pow(Math.abs(Math.cos(2 * a)), 2.4), {n: 120}), eyes: eyes(54, 47, 9.5)},
  {id: "cosmo", name: "Cosmo", line: "A lucky clover that drifted into orbit.",
    d: polar(a => 28 + 6 * Math.pow(Math.abs(Math.cos(2 * a)), 0.8), {n: 96, rot: 25}), eyes: eyes(54, 46)},
  {id: "meteor", name: "Meteor", line: "Leaning in, always mid-sprint.",
    d: rounded([[15, 60], [60, 18], [86, 40], [70, 80]], 22), eyes: eyes(60, 44, 9.5, -24)},
  {id: "corona", name: "Corona", line: "Petals of plasma around a gentle core.",
    d: polar(a => 26 + 8 * Math.pow(Math.abs(Math.cos(3.5 * a)), 0.7), {n: 126, rot: 8}), eyes: eyes(54, 47, 9.5)},
  {id: "comet", name: "Comet", line: "A droplet with somewhere to be.",
    d: polar(a => 27 + 13 * Math.exp(-Math.pow(angDiff(a, rad(-118)), 2) / 0.16), {n: 96, cy: 54}), eyes: eyes(55, 51, 10, -14)},
  {id: "orbit", name: "Orbit", line: "Long, low, and easygoing.",
    d: rounded(rotate([[15, 30], [85, 30], [85, 72], [15, 72]], -7), 21), eyes: eyes(56, 46, 11, -14)},
  {id: "vega", name: "Vega", line: "The sharpest star in the system.",
    d: rounded(rotate(regular(3, 41, -90, 50, 55), -16), 16), eyes: eyes(52, 54, 10, -24)},
  {id: "rover", name: "Rover", line: "A tiny lander with a pointed hat.",
    d: rounded(rotate(regular(5, 37, -90, 50, 52), -14), 11), eyes: eyes(52, 54, 10, -16)},
  {id: "flare", name: "Flare", line: "Bursts with energy, settles with style.",
    d: polar(a => 25 + 11 * Math.pow((1 + Math.cos(7 * a)) / 2, 1.6), {n: 140, rot: -12}), eyes: eyes(53, 48, 9.5)},
  {id: "atlas", name: "Atlas", line: "Steady, six-sided, carries the whole crew.",
    d: rounded(regular(6, 37, 20), 11), eyes: eyes(53, 49, 10, -20)},
] as const satisfies readonly SpaceCharacter[];

export type SpaceCharacterId = (typeof spaceCharacters)[number]["id"];

export function getSpaceCharacter(id: string): SpaceCharacter {
  return spaceCharacters.find(c => c.id === id) ?? spaceCharacters[0];
}

/** Eye pill size in the 100×100 box. */
export const EYE = {w: 5.4, h: 11.5};

/** Static SVG still (neutral pose) for docs, favicons, or <img> use. */
export function spaceStill(id: string, color = "#f5f5f4", eyeColor = "#0b0b0f") {
  const c = getSpaceCharacter(id); const {x, y, gap, tilt} = c.eyes;
  const pill = (cx: number) => `<rect x="${r2(cx - EYE.w / 2)}" y="${r2(y - EYE.h / 2)}" width="${EYE.w}" height="${EYE.h}" rx="${EYE.w / 2}" transform="rotate(${tilt} ${r2(cx)} ${y})"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${c.d}" fill="${color}"/><g fill="${eyeColor}">${pill(x - gap / 2)}${pill(x + gap / 2)}</g></svg>`;
}

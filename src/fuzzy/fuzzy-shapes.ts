// Fuzz Club — character data. Pure data, no React, safe to import on the server.
// Silhouettes live in a 100×100 box centred on (50, 50). The component extrudes each one
// into a puffy 3D plush made of stacked slices, so shapes should be soft and closed.

import { angDiff, polar, roundedEach } from "../motion/geometry.ts";

export const fuzzyStates = ["idle", "listening", "thinking", "working", "speaking", "celebrating", "sleeping"] as const;
export type FuzzyState = (typeof fuzzyStates)[number];

export type FuzzyCharacter = {
  id: string;
  name: string;
  line: string;
  /** Fur color. */
  color: string;
  eyeColor: string;
  d: string;
  /** Eye pair centre and spacing in the 100×100 box; eyes are tall solid ovals. */
  eyes: {x: number; y: number; gap: number; rx: number; ry: number};
};

export const fuzzyCharacters = [
  {id: "clover", name: "Clover", line: "Four leaves of pure luck, zero leaves of chill.", color: "#4aa8ea", eyeColor: "#1f1d3a",
    d: polar(a => 28 + 7.5 * Math.pow(Math.abs(Math.cos(2 * a)), 0.9), {n: 120, rot: 20}), eyes: {x: 45, y: 55, gap: 20.0, rx: 5.2, ry: 8.4}},
  {id: "flower", name: "Flower", line: "Blooms when you ship. Wilts on merge conflicts.", color: "#4fd06a", eyeColor: "#1f1d3a",
    d: polar(a => 26 + 9 * Math.pow(Math.abs(Math.cos(2.5 * a)), 0.65), {n: 150, rot: -12}), eyes: {x: 51, y: 48, gap: 21.0, rx: 5.2, ry: 8.4}},
  {id: "ghost", name: "Ghost", line: "Haunts your inbox. Politely.", color: "#e9e7ef", eyeColor: "#1f1d3a",
    d: "M19 49A31 31 0 0 1 81 49V79Q81 87.5 74.6 84.6Q69.4 81.8 64.2 87Q58.4 92.4 52.8 87.4Q50 85 47.2 87.4Q41.6 92.4 35.8 87Q30.6 81.8 25.4 84.6Q19 87.5 19 79Z",
    eyes: {x: 42, y: 53, gap: 21.0, rx: 5.2, ry: 8.4}},
  {id: "square", name: "Square", line: "Fits in every grid. Refuses to be a button.", color: "#d86bc8", eyeColor: "#1f1d3a",
    d: roundedEach([[19, 19, 17], [81, 19, 17], [81, 81, 17], [19, 81, 17]]), eyes: {x: 52, y: 50, gap: 22.5, rx: 5.2, ry: 8.4}},
  {id: "puff", name: "Puff", line: "A small cloud with big opinions.", color: "#ff9a62", eyeColor: "#2a1608",
    d: polar(a => 31 + 2.2 * Math.cos(3 * a + 0.5), {n: 100}), eyes: {x: 50, y: 50, gap: 22.0, rx: 5.2, ry: 8.4}},
  {id: "drop", name: "Drop", line: "One drip of motivation, refilled hourly.", color: "#ffd25a", eyeColor: "#2a2008",
    d: polar(a => 27 + 12 * Math.exp(-Math.pow(angDiff(a, -Math.PI / 2), 2) / 0.22), {n: 110, cy: 54}), eyes: {x: 50, y: 58, gap: 21.0, rx: 5.2, ry: 8.4}},
] as const satisfies readonly FuzzyCharacter[];

export type FuzzyCharacterId = (typeof fuzzyCharacters)[number]["id"];

export function getFuzzyCharacter(id: string): FuzzyCharacter {
  return fuzzyCharacters.find(c => c.id === id) ?? fuzzyCharacters[0];
}

// Sorcerers in Therapy — overpowered, underslept, each with exactly one Problem.
// Flat style: every tip, valley, and corner is rounded. Depth comes from the cel-shaded
// head and the soft shadow each hairline casts onto the forehead.

import { hair, hairTuft as tuft, head, type PlushCharacter, type PlushPack } from "../plush-kit.ts";

const skull = head(30.5, 50, 62, 0.97);

const gojoHair = hair({cy: 62, r: 30.5, from: 186, to: 354, len: [9, 14, 18, 20.5, 18.5, 14, 9], spread: 13, tip: 3, valley: 2.2,
  fringe: {y: 43.5, n: 3, len: 12.5, lean: -2, tip: 2.6}});
const sukunaHair = hair({cy: 62, r: 30.5, from: 188, to: 352, len: [6.5, 10.5, 13, 14, 13, 11, 7], spread: 6, lean: 7, tip: 2.8, valley: 2.2,
  fringe: {y: 45.5, n: 3, len: 5.5, lean: 1.5, tip: 2.2}});
const tojiHair = hair({cy: 62, r: 30.5, from: 190, to: 350, len: [6.5, 9.5, 8.5, 11, 9.5, 10, 7], spread: 7, lean: -6, tip: 3, valley: 2.4,
  fringe: {y: 44.5, n: 3, len: 10.5, lean: -3.5, tip: 2.4}});

const characters = [
  {id: "infinite", name: "Mr. Infinite", line: "Problem: has never once been inconvenienced.", color: "#f7e4d6", eyeColor: "#2fa8f5",
    d: skull, face: {x: 50, y: 57, gap: 17, tilt: -14, w: 5.4, h: 8.4, glint: false}, eyes: "dot",
    wear: [tuft(gojoHair, "#f6f8fc")],
    // solid round shades (same build as Madame Rose's): worn over the eyes but sitting a touch low,
    // so the tops of his eyes show over the frames; every few seconds he slides them down for a proper look
    faceWear: [["g", {"data-k": "shades", "data-dir": 1, "data-peek": 5, "data-on": "happy"}, [
      ["path", {d: "M34.4 63.4L22.4 60.4M65.6 63.4L77.6 60.4", fill: "none", stroke: "#0e0e11", strokeWidth: 1.3, strokeLinecap: "round"}],
      ["path", {d: "M48 63.2Q50 61.4 52 63.2", fill: "none", stroke: "#0e0e11", strokeWidth: 1.8, strokeLinecap: "round"}],
      ["circle", {cx: 41.5, cy: 64.4, r: 7, fill: "#0e0e11"}],
      ["circle", {cx: 58.5, cy: 64.4, r: 7, fill: "#0e0e11"}],
      ["ellipse", {cx: 38.7, cy: 61.4, rx: 2.2, ry: 1.05, transform: "rotate(-30 38.7 61.4)", fill: "#fff", opacity: 0.45}],
      ["ellipse", {cx: 55.7, cy: 61.4, rx: 2.2, ry: 1.05, transform: "rotate(-30 55.7 61.4)", fill: "#fff", opacity: 0.45}],
    ]]]},
  {id: "sukuna", name: "Finger Food", line: "Problem: twenty fingers, zero chill.", color: "#f6d6c6", eyeColor: "#b3122e",
    d: skull, face: {x: 50, y: 63, gap: 18, tilt: 13, w: 5.2, h: 7.4, mirror: true, glint: false}, eyes: "dot",
    wear: [tuft(sukunaHair, "#f39ab4")],
    faceWear: [["g", {fill: "none", stroke: "#2a1418", strokeLinecap: "round"}, [
      ["path", {d: "M33.6 72.4L27.8 74M34.4 76L28.8 77.8M66.4 72.4L72.2 74M65.6 76L71.2 77.8", strokeWidth: 1.9}],
    ]]]},
  {id: "toji", name: "Zero Energy", line: "Problem: no cursed energy. Plenty of gambling debt.", color: "#ecc8a6", eyeColor: "#1f4a3f",
    d: skull, face: {x: 50, y: 64, gap: 17.5, tilt: 8, w: 5.8, h: 4.8, mirror: true, glint: false}, eyes: "dot",
    wear: [
      tuft(tojiHair, "#262932"),
      ["g", {"data-k": "sway", "data-ox": 50, "data-oy": 92, "data-amp": 3, "data-rate": 1.6}, [
        ["path", {d: "M44 94.5Q71 100 82.5 74", fill: "none", stroke: "#8f7cc9", strokeWidth: 7, strokeLinecap: "round"}],
        ["path", {d: "M44 94.5Q71 100 82.5 74", fill: "none", stroke: "#7462ad", strokeWidth: 7, strokeDasharray: "1.3 4", strokeDashoffset: -3}],
        ["circle", {cx: 42.6, cy: 93.2, r: 0.95, fill: "#1b1530"}],
        ["circle", {cx: 45.6, cy: 92.6, r: 0.95, fill: "#1b1530"}],
      ]],
    ],
    faceWear: [["path", {d: "M58.6 76.6L60.2 79.8", fill: "none", stroke: "#c99577", strokeWidth: 1.1, strokeLinecap: "round"}]]},
] as const satisfies readonly PlushCharacter[];

export const sorcerers: PlushPack = {
  id: "sorcerers",
  name: "Sorcerers in Therapy",
  tagline: "The strongest, the worst, and the guy with no cursed energy. All in therapy.",
  description: "Three cursed-energy problems in plush form: a show-off who peers at your cursor over his shades, a scowling menace, and a man who brought a worm to a sorcery fight.",
  component: "SorcererMascot",
  texture: "plain",
  materials: false,
  particleColor: "#7cc4ff",
  accent: "#38b6ff",
  characters,
};

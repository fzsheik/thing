// Distinguished Individuals — plush personalities with impeccable taste.

import { angDiff, blob, polar, rounded } from "../../motion/geometry.ts";
import { ink, type PlushCharacter, type PlushPack } from "../plush-kit.ts";

const ribbon = "#c2413b";
const brass = "#d9a94e";

const ellipse = (rx: number, ry: number, cx: number, cy: number) =>
  polar(a => (rx * ry) / Math.hypot(ry * Math.cos(a), rx * Math.sin(a)), {cx, cy, n: 72});

const characters = [
  {id: "bleu", name: "Monsieur Bleu", line: "Has opinions about your font pairing.", color: "#3f7bf2", eyeColor: "#0d0f1a",
    d: blob([[31, 64, 16], [47, 50, 19], [65, 55, 17], [40, 73, 14], [61, 72, 15], [74, 67, 11]], 51, 62),
    face: {x: 51, y: 62, gap: 15, tilt: 0, w: 6, h: 8.5}, eyes: "dot",
    wear: [["g", {fill: ink, transform: "rotate(-14 44 34)"}, [
      ["ellipse", {cx: 44, cy: 35, rx: 19, ry: 5.5}],
      ["ellipse", {cx: 45, cy: 31, rx: 15, ry: 7}],
      ["circle", {cx: 45, cy: 23.5, r: 2.4}],
    ]]]},
  {id: "butter", name: "Professor Butter", line: "Tenured. Unbothered. Reading your PR.", color: "#ffc93d", eyeColor: "#1a1405",
    d: polar(a => 31 + 10 * Math.exp(-Math.pow(angDiff(a, -Math.PI / 2), 2) / 0.32), {n: 96, cy: 58}),
    face: {x: 50, y: 56, gap: 17, tilt: 0, w: 4.6, h: 6.4}, eyes: "dot",
    faceWear: [["g", {fill: "#ffffff", fillOpacity: 0.14, stroke: ink, strokeWidth: 1.8}, [
      ["circle", {cx: 41.5, cy: 56, r: 8.2}],
      ["circle", {cx: 58.5, cy: 56, r: 8.2}],
      ["path", {d: "M49.7 55Q50 52.5 50.3 55", fill: "none"}],
    ]]]},
  {id: "rose", name: "Madame Rose", line: "Too cool to blink. Deploys on Fridays.", color: "#f0479c", eyeColor: "#1a0510",
    d: "M50 88C27 74 13 59 14 41C15 26 27 18 38 21C44 23 48 27 50 31C52 27 56 23 62 21C73 18 85 26 86 41C87 59 73 74 50 88Z",
    face: {x: 50, y: 46, gap: 22, tilt: 0, w: 5, h: 6.5}, eyes: "shades",
    faceWear: [["g", {"data-k": "shades"}, [
      ["path", {d: "M48 45Q50 42 52 45", fill: "none", stroke: ink, strokeWidth: 2.2}],
      ["circle", {cx: 39, cy: 46, r: 10.5, fill: "#0e0e11"}],
      ["circle", {cx: 61, cy: 46, r: 10.5, fill: "#0e0e11"}],
      ["ellipse", {cx: 35, cy: 41.5, rx: 3.2, ry: 1.5, transform: "rotate(-30 35 41.5)", fill: "#fff", opacity: 0.45}],
      ["ellipse", {cx: 57, cy: 41.5, rx: 3.2, ry: 1.5, transform: "rotate(-30 57 41.5)", fill: "#fff", opacity: 0.45}],
    ]]]},
  {id: "plum", name: "Baron Plum", line: "Old money. New frameworks.", color: "#8a5cf0", eyeColor: "#120a22",
    d: polar(a => 32 + 1.2 * Math.cos(2 * a), {n: 90, cy: 56}),
    face: {x: 50, y: 50, gap: 16, tilt: 0, w: 5.2, h: 7.2}, eyes: "dot",
    faceWear: [
      ["circle", {cx: 58, cy: 50, r: 7.6, fill: "#ffffff", fillOpacity: 0.12, stroke: brass, strokeWidth: 1.6}],
      ["path", {d: "M64 54.5Q70 66 66 76", fill: "none", stroke: brass, strokeWidth: 0.9}],
      ["path", {d: "M50 61C46.5 58 41 58 38 60.5C35 63 31.5 62.5 30 59.5C30.5 65.5 37 68 42 65.5C45 64 48 63.5 50 62.5C52 63.5 55 64 58 65.5C63 68 69.5 65.5 70 59.5C68.5 62.5 65 63 62 60.5C59 58 53.5 58 50 61Z", fill: ink}],
    ]},
  {id: "mint", name: "Lord Mint", line: "Dresses for the launch he wants.", color: "#4fd1b0", eyeColor: "#06140f",
    d: rounded([[21, 32], [79, 32], [79, 88], [21, 88]], 20),
    face: {x: 50, y: 58, gap: 18, tilt: 0, w: 5.6, h: 8}, eyes: "dot",
    wear: [
      ["g", {transform: "rotate(-8 50 30)"}, [
        ["rect", {x: 35, y: 5, width: 30, height: 25, rx: 3, fill: ink}],
        ["rect", {x: 35, y: 22, width: 30, height: 5, fill: ribbon}],
        ["ellipse", {cx: 50, cy: 31, rx: 24, ry: 4.5, fill: ink}],
      ]],
      ["path", {d: "M50 82L39 76.5V87.5ZM50 82L61 76.5V87.5Z", fill: ribbon, stroke: ribbon, strokeWidth: 2, strokeLinejoin: "round"}],
      ["circle", {cx: 50, cy: 82, r: 3, fill: ribbon}],
    ]},
] as const satisfies readonly PlushCharacter[];

export const distinguished: PlushPack = {
  id: "distinguished",
  name: "Distinguished Individuals",
  tagline: "Five plush personalities with berets, specs, and top hats.",
  description: "Five plush personalities with hats, specs, and impeccable taste. Pick felt, plastic, or plain. They still watch your cursor.",
  component: "DistinguishedMascot",
  texture: "felt",
  particleColor: "#f5f5f4",
  accent: "#f0479c",
  characters,
};

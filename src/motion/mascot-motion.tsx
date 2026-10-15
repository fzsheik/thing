"use client";

// Shared motion engine for agentmascots collections.
// One requestAnimationFrame loop per mascot. Every pose value is driven by a
// critically damped spring, so state changes ease in and out instead of snapping.
// Mascots opt into behaviour by tagging SVG elements with data-k attributes:
//   body (required)  whole figure; receives float, squash, lean, hop, spin
//   shape            silhouette path; used to seat the thought dots on its edge
//   face             accessories that sit on the face (glasses); slower parallax
//   eyes             pupils group; follows the cursor
//   pill             one per eye; resized for blink, squint, perspective
//   sclera           googly-eye whites (data-cx/data-cy); close for blink/happy/sleep
//   pill extras      data-side (-1|1), data-dy, data-s (size), data-extra (opens with the "extra" pose)
//   shades           sunglasses / blindfolds; slide (data-dir 1 down, -1 up) to reveal happy or sleepy eyes;
//                    data-on="happy" lifts only for celebrations; data-peek lifts them now and then so the eyes can sneak a look at the cursor
//   glint            catchlight (data-side) that rides the top of its eye and hides on blinks
//   hair             lags behind the head on a loose spring, so it settles after hops and nods
//   sway             idle swing: data-ox/data-oy pivot, data-amp degrees, data-rate, data-phase
//   happy / sleepy   eye arcs, cross-faded in by state
//   thought + dot, spark, z   particles

import { useEffect, useRef, type RefObject } from "react";

export const motionStates = ["idle", "listening", "thinking", "working", "speaking", "celebrating", "sleeping"] as const;
export type MotionState = (typeof motionStates)[number];

/** Eye anchor in the 100×100 box. `look` scales how far pupils travel. */
export type FaceSpec = {x: number; y: number; gap: number; tilt: number; w: number; h: number; look?: number};

export type MotionInput = {character: string; state: MotionState; track: boolean; speed: number; face: FaceSpec};

// ---------- shared pointer (one listener for every instance) ----------

export const pointer = {x: 0, y: 0, at: -Infinity, inside: false};
let subscribers = 0;
const onMove = (e: PointerEvent) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.at = performance.now(); pointer.inside = true; };
const onLeave = () => { pointer.inside = false; };

export function subscribePointer() {
  if (subscribers++ === 0) {
    window.addEventListener("pointermove", onMove, {passive: true});
    window.addEventListener("pointerdown", onMove, {passive: true});
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
  }
  return () => {
    if (--subscribers > 0) return;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerdown", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("blur", onLeave);
  };
}

// ---------- springs ----------

export type Spring = {x: number; v: number};

/** Critically damped spring toward target (ease-in-out, no overshoot). */
export function damp(s: Spring, target: number, smoothTime: number, dt: number) {
  const omega = 2 / smoothTime; const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = s.x - target; const temp = (s.v + omega * change) * dt;
  s.v = (s.v - omega * temp) * exp; s.x = target + (change + temp) * exp;
  return s.x;
}

export const clamp = (n: number, lo = -1, hi = 1) => Math.min(hi, Math.max(lo, n));
export const smoothstep = (a: number, b: number, n: number) => { const t = clamp((n - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
// 4 decimals: at 2, scale moved in 1% steps (≈2.4px on a 240px stage) and slow squash looked steppy
const f = (n: number) => n.toFixed(4);

// ---------- poses ----------

const keys = ["float", "breathe", "eyeOpen", "eyeScale", "lookX", "lookY", "track", "hop", "talk", "ear", "scan", "squint", "spark", "sleep", "happy", "tilt", "sink", "extra", "read"] as const;
type Pose = Record<(typeof keys)[number], number>;

const rest: Pose = {float: 1, breathe: 0.6, eyeOpen: 1, eyeScale: 1, lookX: 0, lookY: 0, track: 1, hop: 0, talk: 0, ear: 0, scan: 0, squint: 0, spark: 0, sleep: 0, happy: 0, tilt: 0, sink: 0, extra: 0.85, read: 0};

const poses: Record<MotionState, Pose> = {
  idle: rest,
  // Lending an ear: face turns aside so the ear points at the cursor, with "uh-huh" nods.
  listening: {...rest, float: 0.35, breathe: 0.3, eyeScale: 1.05, lookY: 0.2, track: 0.1, ear: 1, extra: 0.85},
  // Pondering: skeptical squint, eyes darting up toward a row of thought dots, slow sway.
  thinking: {...rest, float: 0.5, eyeOpen: 0.9, eyeScale: 0.95, lookX: 0.6, lookY: -0.85, track: 0.08, scan: 1, squint: 1, tilt: -10, extra: 1},
  // Heads down on a task: eyes drop and read along lines, head dips forward, cursor mostly ignored.
  working: {...rest, float: 0.25, breathe: 0.5, eyeOpen: 0.42, eyeScale: 1, lookY: 1, track: 0.03, read: 1, sink: 3, tilt: 3},
  speaking: {...rest, float: 0.55, talk: 1, track: 0.85, extra: 0.9},
  celebrating: {...rest, float: 0, hop: 1, spark: 1, happy: 1, track: 0.35, extra: 1},
  sleeping: {...rest, float: 0.25, breathe: 2.2, eyeOpen: 0.3, sleep: 1, track: 0, tilt: 10, sink: 4.5, extra: 0},
};

/** Where the eyes dart while thinking, relative to the thinking gaze. */
const scanPath = [[0, 0], [-0.75, 0.05], [0.2, 0.3], [-0.4, -0.15]] as const;

/** Reading: hop word by word along a line, snap back, drop a line; three lines then repeat. */
function readingGaze(t: number) {
  const line = 2.6, p = (t % line) / line, row = Math.floor(t / line) % 3;
  // hold on a word, then glide quickly to the next (eased, never a hard jump)
  const words = 6, w = (p / 0.84) * words, i = Math.floor(w), hop = smoothstep(0.62, 1, w - i);
  const sweep = p < 0.84 ? -0.55 + 1.1 * Math.min(1, (i + hop) / words) : 0.55 - 1.1 * smoothstep(0.84, 1, p);
  return [sweep, -0.08 + row * 0.1] as const;
}

/** Thought dots: a compact "•••" row sitting on the silhouette's top-right edge. */
const thought = {angle: -0.9, gap: 1, dot: 2.3, spacing: 6.2};
const sparkles = [[8, 20], [92, 14], [96, 76], [4, 82]] as const;
const sparklePath = "M0-6Q.9-.9 6 0Q.9.9 0 6Q-.9.9-6 0Q-.9-.9 0-6Z";

// ---------- shared markup ----------

/** Thought dots. Place inside the body group, after the silhouette. */
export function ThoughtDots({color}: {color: string}) {
  return (
    <g data-k="thought" opacity={0}>
      <g fill={color}>{[-1, 0, 1].map(i => <circle key={i} data-k="dot" cx={i * thought.spacing} cy={0} r={thought.dot} />)}</g>
    </g>
  );
}

/** Happy (∩) and sleepy (∪) eye arcs. Place inside the eyes group. */
export function EyeArcs({face, color}: {face: FaceSpec; color: string}) {
  const xs = [face.x - face.gap / 2, face.x + face.gap / 2]; const y = face.y; const s = Math.max(1, face.w / 5.4);
  return (
    <>
      <g data-k="happy" fill="none" stroke={color} strokeWidth={2.6 * Math.min(s, 1.3)} strokeLinecap="round" opacity={0}>
        {xs.map((cx, i) => <path key={i} d={`M${cx - 2.8 * s} ${y + 1.6 * s}Q${cx} ${y - 3.8 * s} ${cx + 2.8 * s} ${y + 1.6 * s}`} />)}
      </g>
      <g data-k="sleepy" fill="none" stroke={color} strokeWidth={2.4 * Math.min(s, 1.3)} strokeLinecap="round" opacity={0}>
        {xs.map((cx, i) => <path key={i} d={`M${cx - 3 * s} ${y - 0.4 * s}Q${cx} ${y + 3.2 * s} ${cx + 3 * s} ${y - 0.4 * s}`} />)}
      </g>
    </>
  );
}

/** Celebration sparkles and sleep z's. Place after the body group. */
export function Particles({color}: {color: string}) {
  return (
    <>
      <g fill={color}>{sparkles.map((_, i) => <path key={i} data-k="spark" d={sparklePath} transform="scale(0)" />)}</g>
      <g fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        {[0, 1].map(i => <path key={i} data-k="z" d="M-3-3h6l-6 6h6" opacity={0} />)}
      </g>
    </>
  );
}

// ---------- shared frame loop ----------
// One requestAnimationFrame for every mascot on the page: all measure first, then all write,
// so reading one mascot's position never forces layout after another has just been moved.

export type Job = {measure: () => void; update: (now: number) => void};
const jobs = new Set<Job>(); let loop = 0;
function frameLoop(now: number) {
  loop = requestAnimationFrame(frameLoop);
  for (const j of jobs) j.measure();
  for (const j of jobs) j.update(now);
}
export function addJob(j: Job) { jobs.add(j); if (!loop) loop = requestAnimationFrame(frameLoop); }
export function removeJob(j: Job) { jobs.delete(j); if (!jobs.size && loop) { cancelAnimationFrame(loop); loop = 0; } }

// ---------- engine ----------

/** Drives a tagged mascot SVG. Returns a pointer-down handler for the poke squish. */
export function useMascotMotion(svg: RefObject<SVGSVGElement | null>, input: MotionInput) {
  const live = useRef(input);
  const poke = useRef<Spring>({x: 0, v: 0});
  useEffect(() => { live.current = input; });

  useEffect(() => {
    const root = svg.current; if (!root) return;
    const q = (k: string) => Array.from(root.querySelectorAll<SVGElement>(`[data-k="${k}"]`));
    // Re-collected when the character changes, since accessories and eye parts mount and unmount.
    let body: SVGElement, eyes: SVGElement | undefined, faceG: SVGElement | undefined, happy: SVGElement | undefined, sleepy: SVGElement | undefined, shape: SVGPathElement | undefined, dotRow: SVGElement | undefined;
    let pills: SVGElement[], scleras: SVGElement[], shades: SVGElement[], dots: SVGElement[], sparks: SVGElement[], zs: SVGElement[], hairs: SVGElement[], sways: SVGElement[], glints: SVGElement[];
    const collect = () => {
      [body] = q("body"); [eyes] = q("eyes"); [faceG] = q("face"); [happy] = q("happy"); [sleepy] = q("sleepy");
      [shape] = q("shape") as SVGPathElement[]; [dotRow] = q("thought");
      pills = q("pill"); scleras = q("sclera"); shades = q("shades"); dots = q("dot"); sparks = q("spark"); zs = q("z");
      hairs = q("hair"); sways = q("sway"); glints = q("glint");
    };
    collect();
    let edgeFor = "", edge = {x: 50, y: 50};
    /** Walk out from the centre until we leave the silhouette, so every shape gets the same overlap. */
    const findEdge = () => {
      const dx = Math.cos(thought.angle), dy = Math.sin(thought.angle); let r = 10;
      try { while (r < 60 && shape?.isPointInFill(new DOMPoint(50 + dx * r, 50 + dy * r))) r += 0.5; } catch { r = 33; }
      edge = {x: 50 + dx * (r + thought.gap), y: 50 + dy * (r + thought.gap)};
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cur = Object.fromEntries(keys.map(k => [k, {x: poses[live.current.state][k], v: 0}])) as Record<keyof Pose, Spring>;
    const look = {x: {x: 0, v: 0}, y: {x: 0, v: 0}}; const prox = {x: 0, v: 0}; const spin = {x: 0, v: 0};
    const jig = poke.current;
    let spinTarget = 0, prevState = live.current.state, prevChar = live.current.character;
    let t = Math.random() * 10, last = performance.now(), running = false, visible = true;
    let r = root.getBoundingClientRect();
    let nextBlink = last + 1200 + Math.random() * 2500, blinkAt = -Infinity;
    let wander = {x: 0, y: 0}, nextWander = 0;
    const earSide = {x: -1, v: 0}; let side = -1, nodAt = -Infinity, nodCount = 0, nextNod = 0;
    const hairRot = {x: 0, v: 0}, hairY = {x: 0, v: 0}; let hairReady = false;
    let peekAt = -Infinity, nextPeek = last + 2500 + Math.random() * 3000;

    function tick(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const {state: s, track: tracking, speed: sp, character: ch, face} = live.current;
      const m = reduce.matches ? 0 : 1; t += dt * sp * m;

      if (s !== prevState) { if (s === "celebrating" && m) spinTarget += 1; if (s === "listening") nextNod = now + 700; jig.v -= 2.6; prevState = s; }
      if (ch !== prevChar) { jig.v -= 2.6; prevChar = ch; collect(); }

      const pose = poses[s];
      for (const k of keys) damp(cur[k], pose[k], 0.42 / sp, dt);
      const c = Object.fromEntries(keys.map(k => [k, cur[k].x])) as Pose;

      // cursor → look direction in [-1, 1], saturating with distance
      const fresh = tracking && pointer.inside && now - pointer.at < 6000;
      let tx: number, ty: number, near = 0;
      if (fresh) {
        const dx = pointer.x - (r.left + r.width / 2), dy = pointer.y - (r.top + r.height / 2), dist = Math.hypot(dx, dy), k = 1 / (dist + r.width * 0.9);
        tx = clamp(dx * k); ty = clamp(dy * k * 1.15); near = 1 - smoothstep(r.width * 0.4, r.width * 2.2, dist);
        if (Math.abs(dx) > r.width * 0.3) side = dx > 0 ? -1 : 1; // face turns away so the ear points at the cursor
      } else {
        if (now > nextWander) { const centre = Math.random() < 0.35; wander = centre ? {x: 0, y: 0} : {x: (Math.random() * 2 - 1) * 0.55, y: (Math.random() * 2 - 1) * 0.35}; nextWander = now + 1400 + Math.random() * 2600; }
        tx = wander.x * m; ty = wander.y * m;
      }
      const w = c.track; const [scx, scy] = scanPath[Math.floor(t / 1.1) % scanPath.length];
      const es = damp(earSide, side, 0.35, dt);
      const [rx, ry] = readingGaze(t);
      const gazeX = c.lookX + c.scan * scx * m + c.ear * es * 0.85 + c.read * rx * m, gazeY = c.lookY + c.scan * scy * m + c.read * ry * m;
      const lookTime = c.read > 0.5 ? 0.07 : fresh ? 0.11 : c.scan > 0.5 ? 0.13 : 0.3;
      const lx = damp(look.x, gazeX * (1 - w) + tx * w, lookTime, dt);
      const ly = damp(look.y, gazeY * (1 - w) + ty * w, lookTime, dt);
      const p = damp(prox, near * w, 0.25, dt);
      const turn = damp(spin, spinTarget, 0.6 / sp, dt);

      // blink (single or double), skipped while asleep
      if (m && c.sleep < 0.5 && now > nextBlink) { blinkAt = now; nextBlink = now + (Math.random() < 0.2 ? 280 : 2400 + Math.random() * 3600); }
      const blinkAt2 = (delay: number) => { const bp = (now - blinkAt - delay) / 170; return bp >= 0 && bp < 1 ? 1 - Math.sin(bp * Math.PI) : 1; };
      const blink = blinkAt2(0), blinkExtra = blinkAt2(90); // extra eyes blink a beat late

      // poke: underdamped spring for squishy reactions
      jig.v += (-260 * jig.x - 10 * jig.v) * dt; jig.x += jig.v * dt;

      const T = t;
      const floatY = -Math.sin(T * 1.25) * 3.4 * c.float;
      const floatStretch = Math.cos(T * 1.25) * 0.028 * c.float * m; // stretch rising, squash settling
      const breath = Math.sin(T * (1.7 - 0.8 * c.sleep)) * 0.032 * c.breathe * m;
      const talk = c.talk * m * Math.abs(Math.sin(T * 9.4) * Math.sin(T * 2.3 + 0.7));
      const ph = (T * 1.45) % 1; const air = Math.sin(ph * Math.PI); const land = Math.pow(Math.cos(ph * Math.PI), 10) * c.hop * m;
      const hopY = -Math.pow(air, 0.85) * 15 * c.hop * m;
      const swing = Math.sin(T * 1.45 * Math.PI * 2) * 5 * c.hop * m;
      // "uh-huh" / "ok, yeah": bursts of 1–3 nods at irregular intervals, each a bit smaller
      if (m && c.ear > 0.6 && now > nextNod) { nodAt = now; nodCount = 1 + Math.floor(Math.random() * 3); nextNod = now + (nodCount * 340 + 800 + Math.random() * 2400) / sp; }
      const ne = ((now - nodAt) * sp) / 340;
      const nod = ne >= 0 && ne < nodCount ? Math.pow(Math.sin((ne % 1) * Math.PI), 2) * (1 - 0.3 * Math.floor(ne)) * c.ear * m : 0;
      const sway = Math.sin(T * 0.9) * 4 * c.scan * m;
      // reading: a little "carriage return" duck at the end of every line
      const rp = (t % 2.6) / 2.6; const dip = c.read * m * smoothstep(0.82, 0.88, rp) * (1 - smoothstep(0.9, 1, rp));

      const bx = lx * 2.4 - es * 3 * c.ear, by = ly * 1.8 + floatY + hopY + c.sink + nod * 4.5 + dip * 2.4;
      const rot = lx * 6 + c.tilt + turn * 360 + swing + sway - es * 13 * c.ear + nod * 3.5;
      const sx = 1 + breath + land * 0.16 - talk * 0.05 - c.ear * 0.06 - floatStretch * 0.6 + nod * 0.04 + dip * 0.04 - jig.x * 0.8;
      const sy = 1 - breath - land * 0.18 + air * 0.08 * c.hop * m + talk * 0.11 - nod * 0.07 - dip * 0.06 + floatStretch + jig.x;
      body.setAttribute("transform", `translate(${f(50 + bx)} ${f(50 + by)}) rotate(${f(rot)}) translate(0 32) scale(${f(sx)} ${f(sy)}) translate(-50 -82)`);

      // hair follows the head on a loose underdamped spring: it lags, overshoots, settles
      if (hairs.length) {
        if (!hairReady) { hairRot.x = rot; hairY.x = by; hairReady = true; }
        hairRot.v += (150 * (rot - hairRot.x) - 11 * hairRot.v) * dt; hairRot.x += hairRot.v * dt;
        hairY.v += (170 * (by - hairY.x) - 12 * hairY.v) * dt; hairY.x += hairY.v * dt;
        const lagRot = clamp((hairRot.x - rot) * 0.9, -10, 10) + Math.sin(T * 2.2) * 0.5 * m;
        const lagY = clamp((hairY.x - by) * 0.45, -2.5, 2.5);
        hairs.forEach(el => el.setAttribute("transform", `rotate(${f(lagRot)} 50 66) translate(0 ${f(lagY)})`));
      }
      sways.forEach(el => {
        const d = el.dataset; const a = Math.sin(T * Number(d.rate ?? 2) + Number(d.phase ?? 0)) * Number(d.amp ?? 6) * m;
        el.setAttribute("transform", `rotate(${f(a)} ${d.ox ?? 50} ${d.oy ?? 50})`);
      });

      const lk = face.look ?? 1;
      const faceX = lx * 4 + es * 3 * c.ear, faceY = ly * 3 - talk * 0.9 + nod * 2.2 + c.read * 1.5;
      faceG?.setAttribute("transform", `translate(${f(faceX)} ${f(faceY)})`);
      eyes?.setAttribute("transform", `translate(${f(faceX + (lx * 2.5 + es * c.ear) * lk)} ${f(faceY + (ly * 2 - talk * 0.3 + nod * 0.6 + c.read * 4.5 + dip * 1.2) * lk)})`);

      const scale = c.eyeScale * (1 + p * 0.1);
      const ew = face.w * scale * (1 - Math.abs(lx) * 0.12); const eh0 = face.h * scale * c.eyeOpen * (1 - nod * 0.25);
      const closed = Math.max(c.happy, c.sleep);
      const pillOpacity = f(scleras.length ? 1 - smoothstep(0.3, 0.8, closed) : 1 - closed);
      pills.forEach((el, i) => {
        // thinking squint: near eye narrows and drops, far eye lifts like a raised brow
        // listening: head turned, so eyes bunch up and the leading eye foreshortens
        const d = el.dataset; const sd = Number(d.side ?? (i % 2 ? 1 : -1)), right = sd > 0, extra = d.extra !== undefined, k = Number(d.s ?? 1);
        const cx = face.x + sd * face.gap / 2 * (1 - 0.3 * c.ear);
        const turned = c.ear * Math.abs(es); const lead = sd === Math.sign(es);
        const persp = lead ? 1 - 0.32 * turned : 1 + 0.06 * turned; const squash = (extra ? 1 : 1 + (1 - blink) * 0.35) * (1 + 0.38 * c.read + dip * 0.15);
        const pw = ew * k * persp * squash * (lead ? 1 - 0.2 * turned : 1);
        const open = extra ? Math.max(0.08, c.extra) * blinkExtra : blink;
        const h = Math.max(1.2, eh0 * k * open * persp * (right ? 1 + 0.1 * c.squint : 1 - 0.45 * c.squint) * (1 - dip * 0.35));
        // reading: lids drop from the top, so the bottom edge of the eye stays put
        const lid = (eh0 * k * persp - h) / 2 * c.read;
        const cy = face.y + Number(d.dy ?? 0) + (right ? -2.4 : 1.3) * c.squint + lid;
        el.setAttribute("x", f(cx - pw / 2)); el.setAttribute("y", f(cy - h / 2));
        el.setAttribute("width", f(pw)); el.setAttribute("height", f(h)); el.setAttribute("rx", f(Math.min(pw, h) / 2));
        el.setAttribute("opacity", extra ? f(Number(pillOpacity) * smoothstep(0.04, 0.3, c.extra)) : pillOpacity);
        if (!extra) glints.filter(g => Number(g.dataset.side) === sd).forEach(g => {
          g.setAttribute("cx", f(cx + pw * 0.16)); g.setAttribute("cy", f(cy - h * 0.2)); g.setAttribute("r", f(Math.min(pw, h) * 0.2));
          g.setAttribute("opacity", f(Number(pillOpacity) * smoothstep(0.45, 0.85, h / Math.max(0.01, face.h * k)) * 0.9));
        });
      });
      // googly whites: blink and close to a slit when happy or asleep
      scleras.forEach((el, i) => {
        const cx = Number(el.dataset.cx), cy = Number(el.dataset.cy);
        const open = Math.max(0.12, blink * (1 - 0.88 * closed) * (i ? 1 + 0.04 * c.squint : 1 - 0.3 * c.squint));
        el.setAttribute("transform", `translate(${cx} ${cy}) scale(1 ${f(open)}) translate(${-cx} ${-cy})`);
      });
      // peek: every few seconds the blindfold lifts just enough for the eyes to check on you
      if (m && shades.some(el => el.dataset.peek !== undefined) && closed < 0.3 && now > nextPeek) { peekAt = now; nextPeek = now + (5200 + Math.random() * 4500) / sp; }
      const pk = ((now - peekAt) * sp) / 2300; const peek = pk >= 0 && pk < 1 ? smoothstep(0, 0.18, pk) * (1 - smoothstep(0.78, 1, pk)) * (1 - closed) : 0;
      shades.forEach(el => {
        // data-on="happy": only lift for celebrations (a blindfold stays on for a nap)
        const d = el.dataset; const dir = Number(d.dir ?? 1); const shut = d.on === "happy" ? c.happy : closed;
        const lift = shut * 14 + (d.peek !== undefined ? peek * Number(d.peek || 9) : 0);
        el.setAttribute("transform", `translate(0 ${f(lift * dir)}) rotate(${f((shut * -5 + peek * 3) * dir)} 50 50)`);
      });
      happy?.setAttribute("opacity", f(c.happy)); sleepy?.setAttribute("opacity", f(c.sleep));

      if (dotRow) {
        if (edgeFor !== ch) { findEdge(); edgeFor = ch; }
        const pop = c.scan; // grows out of the body as thinking eases in
        dotRow.setAttribute("transform", `translate(${f(edge.x)} ${f(edge.y)}) scale(${f(0.4 + 0.6 * pop)})`);
        dotRow.setAttribute("opacity", f(smoothstep(0.05, 0.6, pop)));
        dots.forEach((el, i) => {
          const wave = m ? Math.pow(Math.sin((((T * 1.3 - i * 0.22) % 1) + 1) % 1 * Math.PI), 2) : 0.5;
          el.setAttribute("cy", f(-wave * 1.1)); el.setAttribute("opacity", f(0.35 + 0.65 * wave));
        });
      }
      sparks.forEach((el, i) => {
        const sp2 = m ? (T * 1.1 + i * 0.27) % 1 : 0.5; const k = c.spark * Math.sin(sp2 * Math.PI);
        el.setAttribute("transform", `translate(${sparkles[i][0]} ${sparkles[i][1]}) rotate(${f(sp2 * 90)}) scale(${f(k)})`);
      });
      zs.forEach((el, i) => {
        const zp = m ? (T * 0.45 + i * 0.5) % 1 : 0.4 + i * 0.3;
        el.setAttribute("transform", `translate(${f(80 + zp * 10 + bx)} ${f(24 - zp * 18 + by)}) scale(${f(0.7 + zp * 0.5)})`);
        el.setAttribute("opacity", f(c.sleep * Math.sin(zp * Math.PI)));
      });
    }

    const job: Job = {measure: () => { r = root.getBoundingClientRect(); }, update: tick};
    const start = () => { if (!running && visible && !document.hidden) { last = performance.now(); running = true; addJob(job); } };
    const stop = () => { running = false; removeJob(job); };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) start(); else stop(); });
    io.observe(root);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    const unsubscribe = subscribePointer();
    start();
    return () => { stop(); io.disconnect(); document.removeEventListener("visibilitychange", onVis); unsubscribe(); };
  }, [svg]);

  return (e: {button: number}) => { if (e.button === 0) poke.current.v -= 3.2; };
}

"use client";

// FuzzyMascot — Fuzz Club by agentmascots. Zero dependencies beyond React 19, no WebGL.
//
// Real 3D with CSS: each silhouette is extruded into a stack of slices along Z
// (transform-style: preserve-3d), slightly smaller toward the front and back so the
// plush reads as a puffy pillow from any angle. Every slice is the same static fur
// image (displaced fuzzy edge + fibre lighting, baked once), so per frame only the rig,
// the eyes, and the ground shadow move — the GPU just re-composites.

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { addJob, clamp, damp, pointer, removeJob, smoothstep, subscribePointer, type Job, type Spring } from "../motion/mascot-motion.tsx";
import { getFuzzyCharacter, type FuzzyCharacterId, type FuzzyState } from "./fuzzy-shapes.ts";


export type FuzzyMascotProps = {
  /** Which plush to render. */
  character?: FuzzyCharacterId;
  /** Current state. Map this to your agent's lifecycle. */
  state?: FuzzyState;
  /** Rendered width and height (px number or any CSS length). */
  size?: number | string;
  /** Override the fur color. */
  color?: string;
  /** Turn the whole plush toward the cursor. */
  track?: boolean;
  /** Animation speed multiplier (1 = default). */
  speed?: number;
  /** Accessible label. Omit or pass an empty string to mark as decorative. */
  title?: string;
  className?: string;
  style?: CSSProperties;
};

// ---------- the plush body ----------

const SLICES = 36;
const VARIANTS = 4; // fur noise variants, alternated so slice edges never line up into "paper stack" lines
const DEPTH = 0.3; // thickness, as a fraction of the width (em)
const FRONT = 0.74; // face slices shrink to this, so the edges read as rounded

function tone(hex: string, t: number) {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const ch = (v: number) => Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t)).toString(16).padStart(2, "0");
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}

/** One fur slice as an SVG data URL: soft dome gradient, fine hairy edge, soft fibre grain. */
function furImage(d: string, color: string, seed: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -12 124 124" width="512" height="512">
<defs><radialGradient id="g" cx="0.4" cy="0.34" r="0.74"><stop offset="0" stop-color="${tone(color, 0.28)}"/><stop offset="0.58" stop-color="${color}"/><stop offset="1" stop-color="${tone(color, -0.22)}"/></radialGradient>
<filter id="f" x="-12%" y="-12%" width="124%" height="124%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="1.7" numOctaves="2" seed="${seed}" result="n"/>
<feDisplacementMap in="SourceGraphic" in2="n" scale="6.5" xChannelSelector="R" yChannelSelector="G" result="d"/>
<feTurbulence type="fractalNoise" baseFrequency="4.2" numOctaves="1" seed="${seed + 20}" result="h"/>
<feDiffuseLighting in="h" surfaceScale="0.55" lighting-color="#fff" result="l"><feDistantLight azimuth="235" elevation="68"/></feDiffuseLighting>
<feComposite in="d" in2="l" operator="arithmetic" k1="1.04" result="t"/><feComposite in="t" in2="d" operator="in"/>
</filter></defs><path d="${d}" fill="url(#g)" filter="url(#f)"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const slices = Array.from({length: SLICES}, (_, i) => {
  const u = (i / (SLICES - 1)) * 2 - 1; // -1 back … 1 front
  // gentle brightness ramp so the face never reads as a separate pasted disc
  return {z: (u * DEPTH) / 2, s: FRONT + (1 - FRONT) * Math.sqrt(1 - u * u), b: 0.66 + 0.36 * Math.pow((u + 1) / 2, 0.75), v: i % VARIANTS};
});

// ---------- poses ----------

const keys = ["float", "breathe", "yaw", "pitch", "roll", "track", "eyeOpen", "squint", "read", "happy", "sleep", "talk", "hop", "sink", "lookX", "lookY", "ear", "wobble"] as const;
type Pose = Record<(typeof keys)[number], number>;
const rest: Pose = {float: 1, breathe: 0.6, yaw: 0, pitch: 0, roll: 0, track: 1, eyeOpen: 1, squint: 0, read: 0, happy: 0, sleep: 0, talk: 0, hop: 0, sink: 0, lookX: 0, lookY: 0, ear: 0, wobble: 0};
const poses: Record<FuzzyState, Pose> = {
  idle: rest,
  // turns side-on so its "ear" faces the cursor (shows off the 3D depth), glances back, nods along
  listening: {...rest, float: 0.4, breathe: 0.3, ear: 1, track: 0.1},
  // looks up and away, squinting, slowly wobbling
  thinking: {...rest, float: 0.5, yaw: -24, pitch: -18, roll: -7, track: 0.12, squint: 1, lookX: 0.6, lookY: -0.8, wobble: 1},
  // heads down, reading line by line
  working: {...rest, float: 0.25, pitch: 26, track: 0.05, read: 1, eyeOpen: 0.45, sink: 0.03, lookY: 0.9},
  speaking: {...rest, float: 0.5, talk: 1, track: 0.8},
  // hop, twirl, land, repeat
  celebrating: {...rest, float: 0, hop: 1, happy: 1, track: 0.3},
  sleeping: {...rest, float: 0.2, breathe: 2, pitch: 16, roll: 11, sleep: 1, track: 0, sink: 0.05, eyeOpen: 0.3},
};

const HOP = 1.15; // seconds per hop

/** Thinking: where the eyes dart (relative to the up-and-away gaze); one spot every ~1s. */
const ponder = [[0.2, -0.1], [-1.3, 0.2], [0.5, 0.6], [-0.8, -0.35], [1, 0], [-0.3, 0.7]] as const;

/** Crouch → stretch up → hang → stretch down → squash on landing. */
function hopCurve(ph: number) {
  const crouch = ph < 0.18 ? Math.sin((ph / 0.18) * Math.PI) : 0;
  const land = ph > 0.82 ? Math.sin(((ph - 0.82) / 0.18) * Math.PI) : 0;
  const u = clamp((ph - 0.18) / 0.64, 0, 1); const air = ph > 0.18 && ph < 0.82 ? 1 : 0;
  const height = air * Math.sin(u * Math.PI);
  const stretch = air * Math.abs(Math.cos(u * Math.PI));
  return {height, sx: crouch * 0.13 + land * 0.15 - stretch * 0.06, sy: -crouch * 0.16 - land * 0.2 + stretch * 0.1, swing: air * Math.sin(u * Math.PI * 2)};
}

const f = (n: number) => n.toFixed(4);

// ---------- component ----------

export function FuzzyMascot({character = "clover", state = "idle", size = 96, color, track = true, speed = 1, title, className, style}: FuzzyMascotProps) {
  const rootRef = useRef<HTMLDivElement>(null), rigRef = useRef<HTMLDivElement>(null), shadowRef = useRef<HTMLDivElement>(null), faceRef = useRef<SVGSVGElement>(null);
  const c = getFuzzyCharacter(character); const fur = color ?? c.color;
  const imgs = useMemo(() => Array.from({length: VARIANTS}, (_, i) => furImage(c.d, fur, 3 + i * 7)), [c.d, fur]);
  const live = useRef({state, track, speed, eyes: c.eyes});
  const jumpRef = useRef<(twirl: boolean) => void>(() => {});
  useEffect(() => { live.current = {state, track, speed, eyes: c.eyes}; });

  useEffect(() => {
    const root = rootRef.current!, rig = rigRef.current!, shadow = shadowRef.current!, face = faceRef.current!;
    const eyes = Array.from(face.querySelectorAll<SVGEllipseElement>("[data-k=eye]"));
    const happyG = face.querySelector<SVGGElement>("[data-k=happy]")!, sleepyG = face.querySelector<SVGGElement>("[data-k=sleepy]")!;
    const zs = Array.from(root.querySelectorAll<SVGPathElement>("[data-k=z]"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const cur = Object.fromEntries(keys.map(k => [k, {x: poses[live.current.state][k], v: 0}])) as Record<keyof Pose, Spring>;
    const yawS = {x: 0, v: 0}, pitchS = {x: 0, v: 0}, lookX = {x: 0, v: 0}, lookY = {x: 0, v: 0}, spin = {x: 0, v: 0}, earSide = {x: 1, v: 0}, jig = {x: 0, v: 0};
    let r = root.getBoundingClientRect(), running = false, visible = true, last = performance.now(), t = Math.random() * 10;
    let prev = live.current.state, spinTarget = 0, cycle = -1, side = 1, jumpAt = -Infinity, nextFidget = last + 6000 + Math.random() * 5000;
    let nextBlink = last + 1500 + Math.random() * 2500, blinkAt = -Infinity, wander = {x: 0, y: 0}, nextWander = 0;
    let nodAt = -Infinity, nodCount = 0, nextNod = 0;

    jumpRef.current = (twirl: boolean) => { jumpAt = performance.now(); if (twirl) spinTarget += 1; };

    function update(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const {state: s, track: tracking, speed: sp, eyes: e} = live.current;
      const m = reduce.matches ? 0 : 1; t += dt * sp * m; const T = t;
      if (s !== prev) { jig.v -= 2.4; if (s === "listening") nextNod = now + 700; prev = s; }

      for (const k of keys) damp(cur[k], poses[s][k], 0.4 / sp, dt);
      const c = Object.fromEntries(keys.map(k => [k, cur[k].x])) as Pose;

      // cursor → direction in [-1, 1], saturating with distance; wander when it's away
      const fresh = tracking && pointer.inside && now - pointer.at < 6000;
      let tx = 0, ty = 0;
      if (fresh) {
        const dx = pointer.x - (r.left + r.width / 2), dy = pointer.y - (r.top + r.height / 2), k = 1 / (Math.hypot(dx, dy) + r.width * 0.9);
        tx = clamp(dx * k); ty = clamp(dy * k * 1.15); if (Math.abs(dx) > r.width * 0.3) side = dx > 0 ? 1 : -1;
      } else {
        if (now > nextWander) { wander = Math.random() < 0.35 ? {x: 0, y: 0} : {x: (Math.random() * 2 - 1) * 0.6, y: (Math.random() * 2 - 1) * 0.35}; nextWander = now + 1600 + Math.random() * 2600; }
        tx = wander.x * m; ty = wander.y * m;
      }
      const w = c.track;

      // reading: eyes and head hop word by word, snap back, duck at each line end
      const rp = (T % 2.6) / 2.6, words = 6, wpos = (rp / 0.84) * words, wi = Math.floor(wpos);
      const sweep = rp < 0.84 ? -0.55 + 1.1 * Math.min(1, (wi + smoothstep(0.62, 1, wpos - wi)) / words) : 0.55 - 1.1 * smoothstep(0.84, 1, rp);
      const dip = c.read * m * smoothstep(0.82, 0.88, rp) * (1 - smoothstep(0.9, 1, rp));

      // listening: "uh-huh" nod bursts
      if (m && c.ear > 0.6 && now > nextNod) { nodAt = now; nodCount = 1 + Math.floor(Math.random() * 3); nextNod = now + (nodCount * 360 + 800 + Math.random() * 2400) / sp; }
      const ne = ((now - nodAt) * sp) / 360; const nod = ne >= 0 && ne < nodCount ? Math.pow(Math.sin((ne % 1) * Math.PI), 2) * (1 - 0.3 * Math.floor(ne)) * c.ear * m : 0;
      const es = damp(earSide, side, 0.4, dt);

      // thinking: eyes dart between spots; the head follows each dart a beat later
      const [px, py] = ponder[Math.floor(T / 1.05) % ponder.length];
      const dart = c.wobble * m;

      // facing: blend the pose with the cursor, then ease the head toward it
      const yawT = c.yaw * (1 - w) + tx * 42 * w - c.ear * es * 58 + c.read * sweep * 14 * m + Math.sin(T * 0.9) * 5 * c.wobble * m + px * 10 * dart + Math.sin(T * 0.45) * 5 * c.float * m;
      const pitchT = c.pitch * (1 - w) + ty * 28 * w + nod * 16 + dip * 8 + py * 7 * dart;
      const yaw = damp(yawS, yawT, fresh ? 0.16 : 0.3, dt), pitch = damp(pitchS, pitchT, fresh ? 0.16 : 0.3, dt);
      const lx = damp(lookX, c.lookX * (1 - w) + tx * w + c.read * sweep * m + c.ear * es * 0.85 + px * dart, dart > 0.5 ? 0.09 : 0.12, dt);
      const ly = damp(lookY, c.lookY * (1 - w) + ty * w + py * dart, dart > 0.5 ? 0.09 : 0.12, dt);
      const travel = 1 + c.wobble * 1.3; // eyes roam much further while thinking

      // hops: continuous while celebrating (twirl each time), one-shots from clicks and idle fidgets
      const cyc = Math.floor(T / HOP);
      if (cyc !== cycle) { cycle = cyc; if (c.hop > 0.5 && m) spinTarget += 1; }
      const loop = hopCurve((T / HOP) % 1), shot = (now - jumpAt) / 1000 * sp / HOP, one = shot >= 0 && shot < 1 ? hopCurve(shot) : hopCurve(0);
      const ha = c.hop * m, hb = shot >= 0 && shot < 1 ? m : 0;
      if (m && s === "idle" && c.float > 0.8 && now > nextFidget) { jumpRef.current(Math.random() < 0.7); nextFidget = now + (7000 + Math.random() * 6000) / sp; }
      const turn = damp(spin, spinTarget, 0.24 / sp, dt);
      const height = loop.height * ha + one.height * hb;

      jig.v += (-260 * jig.x - 10 * jig.v) * dt; jig.x += jig.v * dt;
      const floatY = -Math.sin(T * 1.3) * 0.028 * c.float, stretch = Math.cos(T * 1.3) * 0.025 * c.float * m;
      const breath = Math.sin(T * (1.7 - 0.8 * c.sleep)) * 0.03 * c.breathe * m;
      const talk = c.talk * m * Math.abs(Math.sin(T * 9.4) * Math.sin(T * 2.3 + 0.7));

      const x = tx * 0.035 * w;
      const y = floatY - height * 0.26 + c.sink + nod * 0.012 + dip * 0.02;
      const sx = 1 + breath + loop.sx * ha + one.sx * hb - talk * 0.05 - stretch * 0.6 + dip * 0.04 - jig.x * 0.8;
      const sy = 1 - breath + loop.sy * ha + one.sy * hb + talk * 0.1 + stretch - dip * 0.06 + jig.x;
      const roll = c.roll + c.ear * es * 7 + Math.sin(T * 0.7) * 2 * c.float * m + Math.sin(T * 1.3) * 3 * c.wobble * m + (loop.swing * ha + one.swing * hb) * 6;
      rig.style.transform = `translate3d(${f(x)}em, ${f(y)}em, 0) scale3d(${f(sx)}, ${f(sy)}, ${f(sx)}) rotateZ(${f(roll)}deg) rotateY(${f(yaw + turn * 360)}deg) rotateX(${f(-pitch)}deg)`;

      const lift = Math.max(0, height * 0.26 - floatY);
      shadow.style.transform = `translateX(${f(x)}em) scale(${f(clamp(1 - lift * 2.4, 0.45, 1.1))}, ${f(clamp(1 - lift * 2.4, 0.45, 1.1))})`;
      shadow.style.opacity = f(clamp(0.9 - lift * 2.6, 0.25, 0.9));

      // eyes: blink (squeeze wide), squint, heavy lids when reading, happy / sleepy arcs
      if (m && c.sleep < 0.5 && now > nextBlink) { blinkAt = now; nextBlink = now + (Math.random() < 0.2 ? 300 : 2400 + Math.random() * 3600); }
      const bp = (now - blinkAt) / 170, blink = bp >= 0 && bp < 1 ? 1 - Math.sin(bp * Math.PI) : 1;
      const closed = Math.max(c.happy, c.sleep);
      eyes.forEach((el, i) => {
        const right = i === 1, cx0 = e.x + (right ? 1 : -1) * e.gap / 2;
        const full = e.ry * c.eyeOpen * (1 - nod * 0.2);
        const ry = Math.max(0.5, full * blink * (right ? 1 + 0.08 * c.squint : 1 - 0.45 * c.squint) * (1 - dip * 0.3));
        const rx = e.rx * (1 + (1 - blink) * 0.3 + c.read * 0.35);
        const cy = e.y + ly * 2.6 * travel + c.read * 3.5 + dip * 1.2 + (right ? -2 : 1.2) * c.squint + (e.ry - ry) * 0.6 * c.read;
        el.setAttribute("cx", f(cx0 + lx * 3 * travel)); el.setAttribute("cy", f(cy));
        el.setAttribute("rx", f(rx)); el.setAttribute("ry", f(ry)); el.setAttribute("opacity", f(1 - closed));
      });
      // sleep: z's drift up and away from the head, fading in and out
      zs.forEach((el, i) => {
        const zp = m ? (T * 0.42 + i * 0.5) % 1 : 0.35 + i * 0.3;
        el.setAttribute("transform", `translate(${f(78 + zp * 12 + x * 100)} ${f(20 - zp * 22 + y * 100)}) scale(${f(0.75 + zp * 0.6)})`);
        el.setAttribute("opacity", f(c.sleep * Math.sin(zp * Math.PI)));
      });
      happyG.setAttribute("opacity", f(c.happy)); sleepyG.setAttribute("opacity", f(c.sleep));
      happyG.setAttribute("transform", `translate(${f(lx * 3)} ${f(ly * 2.6)})`);
    }

    const job: Job = {measure: () => { r = root.getBoundingClientRect(); }, update};
    const start = () => { if (!running && visible && !document.hidden) { last = performance.now(); running = true; addJob(job); } };
    const stop = () => { running = false; removeJob(job); };
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); else stop(); });
    io.observe(root);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    const unsubscribe = subscribePointer();
    start();
    return () => { stop(); io.disconnect(); document.removeEventListener("visibilitychange", onVis); unsubscribe(); };
  }, []);

  const e = c.eyes; const xs = [e.x - e.gap / 2, e.x + e.gap / 2]; const label = title || undefined;
  // arcs scale with the eye size
  const k = e.rx / 3.4;
  const arc = (cx: number, up: boolean) => up
    ? `M${cx - 3.4 * k} ${e.y + 1.8 * k}Q${cx} ${e.y - 3.6 * k} ${cx + 3.4 * k} ${e.y + 1.8 * k}`
    : `M${cx - 3.4 * k} ${e.y - 0.6 * k}Q${cx} ${e.y + 3.2 * k} ${cx + 3.4 * k} ${e.y - 0.6 * k}`;

  return (
    <div ref={rootRef} className={className} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      onPointerDown={ev => { if (ev.button === 0) jumpRef.current(true); }}
      style={{position: "relative", width: size, height: size, fontSize: size, perspective: "4.2em", touchAction: "manipulation", WebkitTapHighlightColor: "transparent", ...style}}>
      <div ref={shadowRef} style={{position: "absolute", left: "50%", top: "89%", width: "0.64em", height: "0.12em", margin: "-0.06em 0 0 -0.32em", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(0,0,0,0.5), rgba(0,0,0,0))", opacity: 0.9}} />
      <svg viewBox="0 0 100 100" aria-hidden style={{position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none", zIndex: 1}}>
        <g fill="none" stroke="#e9e7f2" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          {[0, 1].map(i => <path key={i} data-k="z" d="M-3.4-3.4h6.8l-6.8 6.8h6.8" opacity={0} />)}
        </g>
      </svg>
      <div ref={rigRef} style={{position: "absolute", inset: 0, transformStyle: "preserve-3d", transformOrigin: "50% 58%", willChange: "transform"}}>
        {slices.map(({z, s, b, v}, i) => (
          <div key={i} style={{position: "absolute", inset: "-12%", backgroundImage: imgs[v], backgroundSize: "100% 100%", transform: `translateZ(${f(z)}em) scale(${f(s)})`, filter: `brightness(${b.toFixed(3)})`}} />
        ))}
        <svg ref={faceRef} viewBox="0 0 100 100" style={{position: "absolute", inset: 0, overflow: "visible", backfaceVisibility: "hidden", transform: `translateZ(${f(DEPTH / 2 + 0.004)}em) scale(${FRONT + 0.08})`}}>
          <g fill={c.eyeColor}>{xs.map((cx, i) => <ellipse key={i} data-k="eye" cx={cx} cy={e.y} rx={e.rx} ry={e.ry} />)}</g>
          <g data-k="happy" fill="none" stroke={c.eyeColor} strokeWidth={2.6 * k} strokeLinecap="round" opacity={0}>{xs.map((cx, i) => <path key={i} d={arc(cx, true)} />)}</g>
          <g data-k="sleepy" fill="none" stroke={c.eyeColor} strokeWidth={2.4 * k} strokeLinecap="round" opacity={0}>{xs.map((cx, i) => <path key={i} d={arc(cx, false)} />)}</g>
        </svg>
      </div>
    </div>
  );
}

export default FuzzyMascot;

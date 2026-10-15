"use client";

// PlushMascot — renders any plush-pack character from data (see plush-kit.ts).
// Zero dependencies beyond React 19. Materials are SVG lighting filters:
//   felt     fractal-noise fibres, fuzzy displaced edges, soft top-left key light
//   plastic  rounded shading plus a soft specular highlight
//   plain    flat color
// Motion comes from the shared spring engine in mascot-motion.tsx.

import { createElement, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { EyeArcs, Particles, useMascotMotion } from "../motion/mascot-motion.tsx";
import type { Node, PlushCharacter, PlushState, Texture } from "./plush-kit.ts";

export type PlushMascotProps = {
  character: PlushCharacter;
  /** Current state. Map this to your agent's lifecycle. */
  state?: PlushState;
  /** Material: felt, plastic, or plain. */
  texture?: Texture;
  /** Rendered width and height (px number or any CSS length). */
  size?: number | string;
  /** Override the character's body color. */
  color?: string;
  /** Color of particles: sparkles and sleep z's. */
  particleColor?: string;
  /** Follow the cursor with eyes and a slight lean. */
  track?: boolean;
  /** Animation speed multiplier (1 = default). */
  speed?: number;
  /** Accessible label. Omit or pass an empty string to mark as decorative. */
  title?: string;
  className?: string;
  style?: CSSProperties;
};

function Material({id, texture}: {id: string; texture: Texture}) {
  if (texture === "felt") return (
    <filter id={id} x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="1.8" numOctaves={1} seed={7} result="fiber" />
      <feDisplacementMap in="SourceGraphic" in2="fiber" scale={1.8} xChannelSelector="R" yChannelSelector="G" result="fuzz" />
      <feGaussianBlur in="SourceAlpha" stdDeviation={3.5} result="bump" />
      <feDiffuseLighting in="bump" surfaceScale={5} diffuseConstant={1.15} lightingColor="#fff" result="shade"><feDistantLight azimuth={235} elevation={55} /></feDiffuseLighting>
      <feGaussianBlur in="fiber" stdDeviation={0.28} result="soft" />
      <feDiffuseLighting in="soft" surfaceScale={1.1} diffuseConstant={1} lightingColor="#fff" result="grain"><feDistantLight azimuth={235} elevation={60} /></feDiffuseLighting>
      <feComposite in="fuzz" in2="shade" operator="arithmetic" k1={1.15} result="lit" />
      <feComposite in="lit" in2="grain" operator="arithmetic" k1={1.1} result="tex" />
      <feComposite in="tex" in2="fuzz" operator="in" />
    </filter>
  );
  if (texture === "plastic") return (
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation={5} result="bump" />
      <feDiffuseLighting in="bump" surfaceScale={4} diffuseConstant={1.15} lightingColor="#fff" result="shade"><feDistantLight azimuth={235} elevation={60} /></feDiffuseLighting>
      <feComposite in="SourceGraphic" in2="shade" operator="arithmetic" k1={1.08} result="lit" />
      <feGaussianBlur in="bump" stdDeviation={1.2} result="smooth" />
      <feSpecularLighting in="smooth" surfaceScale={4.5} specularConstant={0.95} specularExponent={22} lightingColor="#fff" result="spec"><fePointLight x={30} y={18} z={70} /></feSpecularLighting>
      <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
      <feComposite in="lit" in2="specIn" operator="arithmetic" k2={1} k3={0.85} result="glossy" />
      <feComposite in="glossy" in2="SourceAlpha" operator="in" />
    </filter>
  );
  return null;
}

/** Darken a hex color toward black by t (0–1). */
function shade(hex: string, t: number) {
  const h = hex.replace("#", ""); const full = h.length === 3 ? h.split("").map(x => x + x).join("") : h.slice(0, 6);
  const n = parseInt(full, 16); const c = (v: number) => Math.round(v * (1 - t)).toString(16).padStart(2, "0");
  return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`;
}

type Tokens = {body: string; eye: string; uid: string};

/** "$body", "$eye", "$shade" (body in shadow), "$clip" (clip to the silhouette). */
function token(v: string | number, t: Tokens) {
  if (v === "$body") return t.body;
  if (v === "$eye") return t.eye;
  if (v === "$shade") return shade(t.body, 0.16);
  if (v === "$clip") return `url(#${t.uid}-clip)`;
  return v;
}

function draw(nodes: Node[] | undefined, colors: Tokens, key = ""): ReactNode[] {
  return (nodes ?? []).map(([tag, attrs, children], i) => {
    const props: Record<string, unknown> = {key: key + i};
    for (const [k, v] of Object.entries(attrs)) props[k] = token(v, colors);
    return createElement(tag, props, children?.length ? draw(children, colors, `${key}${i}-`) : undefined);
  });
}

export function PlushMascot({character: c, state = "idle", texture = "felt", size = 96, color, particleColor = "#f5f5f4", track = true, speed = 1, title, className, style}: PlushMascotProps) {
  const svg = useRef<SVGSVGElement>(null);
  const face = c.face; const uid = "pm" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const colors = {body: color ?? c.color, eye: c.eyeColor, uid};
  const poke = useMascotMotion(svg, {character: c.id, state, track, speed, face});
  const xs = [face.x - face.gap / 2, face.x + face.gap / 2];
  const material = texture === "plain" ? undefined : `url(#${uid}-${texture})`;
  const label = title || undefined;
  const flat = texture === "plain";
  const pill = (cx: number, side: number, extra?: {dy: number; s: number}) => {
    const w = face.w * (extra?.s ?? 1), h = face.h * (extra?.s ?? 1), cy = face.y + (extra?.dy ?? 0);
    const tilt = face.mirror && side > 0 ? -face.tilt : face.tilt;
    return <rect key={`${side}${extra ? "x" : ""}`} data-k="pill" data-side={side} data-dy={extra?.dy} data-s={extra?.s} data-extra={extra ? "" : undefined}
      x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={w / 2} opacity={extra ? 0 : undefined} transform={tilt ? `rotate(${tilt} ${cx} ${cy})` : undefined} />;
  };

  return (
    <svg ref={svg} viewBox="0 0 100 100" width={size} height={size} className={className}
      style={{overflow: "visible", touchAction: "manipulation", WebkitTapHighlightColor: "transparent", ...style}}
      role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      onPointerDown={poke}>
      <defs>
        <Material id={`${uid}-${texture}`} texture={texture} />
        <clipPath id={`${uid}-clip`}><path d={c.d} /></clipPath>
      </defs>
      <g data-k="body" transform="translate(50 50) translate(0 32) translate(-50 -82)">
        <g filter={material}>
          {draw(c.back, colors, "b")}
          <path data-k="shape" d={c.d} fill={flat ? shade(colors.body, 0.1) : colors.body} />
          {/* flat cel shading: the lit face sits up-left, leaving a soft crescent of shadow */}
          {flat && <g clipPath={`url(#${uid}-clip)`}><path d={c.d} fill={colors.body} transform="translate(-2 -2.6)" /></g>}
          {draw(c.wear, colors, "w")}
        </g>
        {c.eyes === "googly" && xs.map((cx, i) => (
          <ellipse key={i} data-k="sclera" data-cx={cx} data-cy={face.y} cx={cx} cy={face.y} rx={10} ry={10} fill="#fbfbf7" stroke={c.eyeColor} strokeOpacity={0.12} strokeWidth={0.8} />
        ))}
        <g data-k="eyes">
          <g fill={c.eyeColor}>
            {xs.map((cx, i) => pill(cx, i ? 1 : -1))}
            {face.extra && xs.map((cx, i) => pill(cx, i ? 1 : -1, face.extra))}
          </g>
          {face.glint !== false && <g fill="#ffffff">{xs.map((cx, i) => <circle key={i} data-k="glint" data-side={i ? 1 : -1} cx={cx + face.w * 0.16} cy={face.y - face.h * 0.2} r={face.w * 0.2} opacity={0.9} />)}</g>}
          <EyeArcs face={face} color={c.eyeColor} />
        </g>
        <g data-k="face">{draw(c.faceWear, colors, "f")}</g>
      </g>
      <Particles color={particleColor} />
    </svg>
  );
}

export default PlushMascot;

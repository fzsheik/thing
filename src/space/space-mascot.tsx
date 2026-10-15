"use client";

// SpaceMascot — the Space Collection by agentmascots.
// Zero dependencies beyond React 19. Motion comes from the shared spring engine
// in mascot-motion.tsx; eyes follow the cursor.

import { useRef, type CSSProperties } from "react";
import { EyeArcs, Particles, ThoughtDots, useMascotMotion } from "../motion/mascot-motion.tsx";
import { EYE, getSpaceCharacter, type SpaceCharacterId, type SpaceState } from "./space-shapes.ts";


export type SpaceMascotProps = {
  /** Which crew member to render. */
  character?: SpaceCharacterId;
  /** Current state. Map this to your agent's lifecycle. */
  state?: SpaceState;
  /** Rendered width and height (px number or any CSS length). */
  size?: number | string;
  /** Body color. */
  color?: string;
  /** Eye color. */
  eyeColor?: string;
  /** Color of particles: thought dots, sparkles, and sleep z's. */
  particleColor?: string;
  /** Show the "•••" thought dots while thinking. */
  thoughtDots?: boolean;
  /** Follow the cursor with eyes and a slight lean. */
  track?: boolean;
  /** Animation speed multiplier (1 = default). */
  speed?: number;
  /** Accessible label. Omit or pass an empty string to mark as decorative. */
  title?: string;
  className?: string;
  style?: CSSProperties;
};

// ---------- component ----------

export function SpaceMascot({character = "luna", state = "idle", size = 96, color = "#f5f5f4", eyeColor = "#0b0b0f", particleColor = "#ff7a45", thoughtDots = true, track = true, speed = 1, title, className, style}: SpaceMascotProps) {
  const svg = useRef<SVGSVGElement>(null);
  const c = getSpaceCharacter(character); const face = {...c.eyes, w: EYE.w, h: EYE.h};
  const poke = useMascotMotion(svg, {character, state, track, speed, face});
  const {x, y, gap, tilt} = c.eyes;
  const eyeXs = [x - gap / 2, x + gap / 2];
  const label = title || undefined;

  return (
    <svg ref={svg} viewBox="0 0 100 100" width={size} height={size} className={className}
      style={{overflow: "visible", touchAction: "manipulation", WebkitTapHighlightColor: "transparent", ...style}}
      role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      onPointerDown={poke}>
      <g data-k="body" transform="translate(50 50) translate(0 32) translate(-50 -82)">
        <path data-k="shape" d={c.d} fill={color} style={{transition: "fill .4s ease"}} />
        {thoughtDots && <ThoughtDots color={particleColor} />}
        <g data-k="eyes">
          <g fill={eyeColor}>
            {eyeXs.map((cx, i) => (
              <rect key={i} data-k="pill" x={cx - EYE.w / 2} y={y - EYE.h / 2} width={EYE.w} height={EYE.h} rx={EYE.w / 2} transform={`rotate(${tilt} ${cx} ${y})`} />
            ))}
          </g>
          <EyeArcs face={face} color={eyeColor} />
        </g>
      </g>
      <Particles color={particleColor} />
    </svg>
  );
}

export default SpaceMascot;

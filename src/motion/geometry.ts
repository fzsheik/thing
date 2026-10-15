// Shared silhouette helpers. Everything works in a 100×100 box centred on (50, 50).

export type Pt = [number, number];

export const r2 = (n: number) => Math.round(n * 100) / 100;

export const rad = (deg: number) => (deg * Math.PI) / 180;

/** Closed Catmull-Rom spline through points, as cubic Béziers. */
export function smooth(pts: Pt[]) {
  const n = pts.length; const at = (i: number) => pts[(i + n) % n];
  let d = `M${r2(pts[0][0])} ${r2(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    d += `C${r2(p1[0] + (p2[0] - p0[0]) / 6)} ${r2(p1[1] + (p2[1] - p0[1]) / 6)} ${r2(p2[0] - (p3[0] - p1[0]) / 6)} ${r2(p2[1] - (p3[1] - p1[1]) / 6)} ${r2(p2[0])} ${r2(p2[1])}`;
  }
  return d + "Z";
}

/** Sample a polar radius function around a centre. Angle 0 points right, y down. */
export function polar(fn: (a: number) => number, {n = 72, rot = 0, cx = 50, cy = 50} = {}) {
  return smooth(Array.from({length: n}, (_, i) => {
    const a = (i / n) * Math.PI * 2; const r = fn(a);
    return [cx + Math.cos(a + rad(rot)) * r, cy + Math.sin(a + rad(rot)) * r] as Pt;
  }));
}

/** Polygon with circular-ish (quadratic) corners of radius r. */
export function rounded(verts: Pt[], r: number) {
  const n = verts.length; let d = "";
  for (let i = 0; i < n; i++) {
    const v = verts[i]; const p = verts[(i + n - 1) % n]; const q = verts[(i + 1) % n];
    const toward = (o: Pt): Pt => { const dx = o[0] - v[0], dy = o[1] - v[1], len = Math.hypot(dx, dy), k = Math.min(r, len / 2) / len; return [v[0] + dx * k, v[1] + dy * k]; };
    const a = toward(p), b = toward(q);
    d += `${i ? "L" : "M"}${r2(a[0])} ${r2(a[1])}Q${r2(v[0])} ${r2(v[1])} ${r2(b[0])} ${r2(b[1])}`;
  }
  return d + "Z";
}

export function regular(sides: number, radius: number, rot: number, cx = 50, cy = 50): Pt[] {
  return Array.from({length: sides}, (_, i) => { const a = rad(rot) + (i / sides) * Math.PI * 2; return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius]; });
}

export function rotate(pts: Pt[], deg: number, cx = 50, cy = 50): Pt[] {
  const c = Math.cos(rad(deg)), s = Math.sin(rad(deg));
  return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
}

export const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** Outline of a union of circles [cx, cy, r], traced as rays from (ox, oy). Good for clouds. */
export function blob(circles: [number, number, number][], ox = 50, oy = 50, n = 120) {
  return smooth(Array.from({length: n}, (_, i) => {
    const a = (i / n) * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a);
    let far = 0;
    for (const [cx, cy, r] of circles) {
      const dx = cx - ox, dy = cy - oy, along = dx * ux + dy * uy, off = r * r - (dx * dx + dy * dy - along * along);
      if (off >= 0) far = Math.max(far, along + Math.sqrt(off));
    }
    return [ox + ux * far, oy + uy * far] as Pt;
  }));
}

/**
 * Polygon where every corner is a true circular fillet of its own radius: [x, y, r].
 * Sharp corners get the same visible roundness as wide ones (tangent distance = r / tan(θ/2)).
 */
export function roundedEach(verts: [number, number, number][]) {
  const n = verts.length; let d = "";
  for (let i = 0; i < n; i++) {
    const [vx, vy, r] = verts[i]; const [px, py] = verts[(i + n - 1) % n]; const [qx, qy] = verts[(i + 1) % n];
    const l1 = Math.hypot(px - vx, py - vy) || 1, l2 = Math.hypot(qx - vx, qy - vy) || 1;
    const u1 = [(px - vx) / l1, (py - vy) / l1], u2 = [(qx - vx) / l2, (qy - vy) / l2];
    const theta = Math.acos(Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1])));
    const half = Math.tan(theta / 2) || 1e-6;
    const dist = Math.min(r / half, l1 / 2, l2 / 2); const rr = dist * half;
    const a: Pt = [vx + u1[0] * dist, vy + u1[1] * dist], b: Pt = [vx + u2[0] * dist, vy + u2[1] * dist];
    const sweep = u1[0] * u2[1] - u1[1] * u2[0] < 0 ? 1 : 0;
    d += `${i ? "L" : "M"}${r2(a[0])} ${r2(a[1])}A${r2(rr)} ${r2(rr)} 0 0 ${sweep} ${r2(b[0])} ${r2(b[1])}`;
  }
  return d + "Z";
}

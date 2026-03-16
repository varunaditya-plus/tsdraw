export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function boundsOf(points: { x: number; y: number }[]): Bounds {
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = points[0]!.x;
  let minY = points[0]!.y;
  let maxX = minX;
  let maxY = minY;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function padBounds(b: Bounds, amount: number): Bounds {
  return {
    minX: b.minX - amount,
    minY: b.minY - amount,
    maxX: b.maxX + amount,
    maxY: b.maxY + amount,
  };
}

export function sqDistance(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt(sqDistance(ax, ay, bx, by));
}

// Closest point on segment A-B to point P
export function closestOnSegment(
  ax: number, ay: number,
  bx: number, by: number,
  px: number, py: number
): { x: number; y: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: ax, y: ay };
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return { x: ax + t * dx, y: ay + t * dy };
}

// Hit-test (does line segment (ax,ay) - (bx,by) come within margin of the polyline?)
export function segmentTouchesPolyline(
  polyline: { x: number; y: number }[],
  ax: number, ay: number,
  bx: number, by: number,
  margin: number
): boolean {
  for (let i = 0; i < polyline.length - 1; i++) {
    const p = polyline[i]!;
    const q = polyline[i + 1]!;
    const n1 = closestOnSegment(p.x, p.y, q.x, q.y, ax, ay);
    if (distance(n1.x, n1.y, ax, ay) <= margin) return true;
    const n2 = closestOnSegment(p.x, p.y, q.x, q.y, bx, by);
    if (distance(n2.x, n2.y, bx, by) <= margin) return true;
    const n3 = closestOnSegment(ax, ay, bx, by, p.x, p.y);
    if (distance(n3.x, n3.y, p.x, p.y) <= margin) return true;
  }
  if (polyline.length === 1) {
    const p = polyline[0]!;
    return distance(p.x, p.y, ax, ay) <= margin || distance(p.x, p.y, bx, by) <= margin;
  }
  return false;
}

// Minimum distance from point to polyline
export function minDistanceToPolyline(
  px: number, py: number,
  polyline: { x: number; y: number }[]
): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) return distance(px, py, polyline[0]!.x, polyline[0]!.y);
  let best = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i]!;
    const b = polyline[i + 1]!;
    const n = closestOnSegment(a.x, a.y, b.x, b.y, px, py);
    const d = distance(n.x, n.y, px, py);
    if (d < best) best = d;
  }
  return best;
}

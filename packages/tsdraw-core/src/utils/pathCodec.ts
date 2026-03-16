import type { Vec3 } from '../types.js';

// Encode points to base64 path (x,y,z alternating)
export function encodePoints(points: Vec3[]): string {
  const arr: number[] = [];
  for (const p of points) {
    arr.push(p.x, p.y, p.z ?? 0.5);
  }
  return btoa(JSON.stringify(arr));
}

// Decode path string to points in local shape space
export function decodePoints(path: string): Vec3[] {
  try {
    const arr = JSON.parse(atob(path)) as number[];
    const out: Vec3[] = [];
    for (let i = 0; i < arr.length; i += 3) {
      out.push({
        x: arr[i] ?? 0,
        y: arr[i + 1] ?? 0,
        z: arr[i + 2],
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function decodeFirstPoint(path: string): Vec3 | null {
  const pts = decodePoints(path);
  return pts.length > 0 ? pts[0]! : null;
}

export function decodeLastPoint(path: string): Vec3 | null {
  const pts = decodePoints(path);
  return pts.length > 0 ? pts[pts.length - 1]! : null;
}

// Decode segments to flat list of page-space points to render
export function decodePathToPoints(
  segments: { path: string }[],
  ox: number,
  oy: number
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (const seg of segments) {
    const pts = decodePoints(seg.path);
    for (const p of pts) {
      out.push({ x: ox + p.x, y: oy + p.y });
    }
  }
  return out;
}


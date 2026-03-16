import type { DrawShape } from '../../types.js';
import { STROKE_WIDTHS } from '../../types.js';
import { decodePathToPoints } from '../../utils/pathCodec.js';
import { minDistanceToPolyline, segmentTouchesPolyline, boundsOf, padBounds } from '../../utils/geometry.js';

export const ERASER_MARGIN = 4;

export function shapePagePoints(shape: DrawShape): { x: number; y: number }[] {
  return decodePathToPoints(shape.props.segments, shape.x, shape.y);
}

export function pointHitsShape(
  shape: DrawShape,
  pageX: number,
  pageY: number,
  margin: number
): boolean {
  const pts = shapePagePoints(shape);
  if (pts.length === 0) return false;
  const strokeMargin = margin + (STROKE_WIDTHS[shape.props.size] ?? 3.5) * shape.props.scale;
  return minDistanceToPolyline(pageX, pageY, pts) <= strokeMargin;
}

export function segmentHitsShape(
  shape: DrawShape,
  ax: number, ay: number,
  bx: number, by: number,
  margin: number
): boolean {
  const pts = shapePagePoints(shape);
  if (pts.length === 0) return false;
  const strokeMargin = margin + (STROKE_WIDTHS[shape.props.size] ?? 3.5) * shape.props.scale;
  return segmentTouchesPolyline(pts, ax, ay, bx, by, strokeMargin);
}

export { boundsOf, padBounds };

// Unique id assigned for each shape
export type ShapeId = string;

// Point with optional pressure (z) for styluses
export interface Vec3 {
  x: number;
  y: number;
  z?: number;
}

// Segment of draw strokes can be free (curved) or straight
export type SegmentType = 'free' | 'straight';

export interface DrawSegment {
  type: SegmentType;
  path: string; // base64-encoded points for storage
}

// Available sizes for strokes
export type SizeStyle = 's' | 'm' | 'l' | 'xl';

// Color styles (css-compatible or by palette key)
export type ColorStyle = string;

// A single draw shape (stroke)
export interface DrawShape {
  id: ShapeId;
  type: 'draw';
  x: number;
  y: number;
  props: {
    color: ColorStyle;
    size: SizeStyle;
    scale: number;
    isPen: boolean;
    isComplete: boolean;
    segments: DrawSegment[];
    isClosed?: boolean;
  };
}

export type Shape = DrawShape;

// Page holds shapes and camera state
export interface PageState {
  id: string;
  shapes: Record<ShapeId, Shape>;
  erasingShapeIds: ShapeId[];
}

// Stroke sizes in px
export const STROKE_WIDTHS: Record<SizeStyle, number> = {
  s: 2,
  m: 3.5,
  l: 5,
  xl: 10,
};

// Default drag distance squared for segment-mode transitions
export const DRAG_DISTANCE_SQUARED = 36;

// Max points per single stroke before starting a new shape
export const MAX_POINTS_PER_SHAPE = 200;

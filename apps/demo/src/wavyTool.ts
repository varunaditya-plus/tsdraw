import {
  type ToolDefinition,
  type ToolPointerDownInfo,
  StateNode,
  type DrawShape,
  type ShapeId,
  type Vec3,
} from '@tsdraw/core';
import { encodePoints, decodePoints } from '@tsdraw/core';

// This is an example showing how to build a custom tool using the tool state machine
// It's super customizable and you can basically build any tool you might need

// Convert a point from page space to shape space
function toLocalPoint(shape: DrawShape, pagePoint: Vec3): Vec3 {
  return {
    x: pagePoint.x - shape.x,
    y: pagePoint.y - shape.y,
    z: pagePoint.z,
  };
}

// Wavy tool state nodes
export class WavyIdleState extends StateNode {
  static override id = 'wavy_idle';

  override onPointerDown(info?: ToolPointerDownInfo): void {
    this.ctx.transition(WavyDrawingState.id, info);
  }
}

export class WavyDrawingState extends StateNode {
  static override id = 'wavy_drawing';

  private targetShapeId: ShapeId | null = null;
  private traveledDistance = 0;

  // Create a new wavy shape when the tool entered
  override onEnter(_info?: ToolPointerDownInfo): void {
    const origin = this.editor.input.getOriginPagePoint();
    const drawStyle = this.editor.getCurrentDrawStyle();
    const newShapeId = this.editor.createShapeId();
    this.editor.createShape({
      id: newShapeId,
      type: 'draw',
      x: origin.x,
      y: origin.y,
      props: {
        color: drawStyle.color,
        dash: drawStyle.dash,
        size: drawStyle.size,
        scale: 1,
        isPen: false,
        isComplete: false,
        segments: [{ type: 'free', path: encodePoints([{ x: 0, y: 0, z: 0.5 }]) }],
      },
    });
    this.targetShapeId = newShapeId;
    this.traveledDistance = 0;
  }

  // Update wavy shape when the pointer moves
  override onPointerMove(): void {
    if (!this.targetShapeId) return;
    const shape = this.editor.getShape(this.targetShapeId);
    if (!shape || shape.type !== 'draw') return;

    const current = this.editor.input.getCurrentPagePoint();
    const previous = this.editor.input.getPreviousPagePoint();
    const dx = current.x - previous.x;
    const dy = current.y - previous.y;
    const segmentLength = Math.hypot(dx, dy);
    if (segmentLength < 0.25) return;

    this.traveledDistance += segmentLength;
    const theta = Math.atan2(dy, dx);
    const normalX = -Math.sin(theta);
    const normalY = Math.cos(theta);
    const waveAmplitude = 6 / Math.max(this.editor.getZoomLevel(), 0.2);
    const waveOffset = Math.sin(this.traveledDistance * 0.24) * waveAmplitude;
    const wavePoint: Vec3 = {
      x: current.x + normalX * waveOffset,
      y: current.y + normalY * waveOffset,
      z: current.z ?? 0.5,
    };

    const nextSegments = [...shape.props.segments];
    const lastSegment = nextSegments[nextSegments.length - 1];
    if (!lastSegment) return;
    const points = decodePoints(lastSegment.path);
    points.push(toLocalPoint(shape, wavePoint));
    nextSegments[nextSegments.length - 1] = {
      ...lastSegment,
      path: encodePoints(points),
    };

    this.editor.updateShapes([
      {
        id: shape.id,
        type: 'draw',
        props: { segments: nextSegments },
      },
    ]);
  }

  // Point released/cancelled, finish the wavy shape
  override onPointerUp(): void {
    this.finish();
  }

  override onCancel(): void {
    this.finish();
  }

  private finish(): void {
    if (this.targetShapeId) {
      this.editor.updateShapes([
        {
          id: this.targetShapeId,
          type: 'draw',
          props: { isComplete: true },
        },
      ]);
    }
    this.targetShapeId = null;
    this.ctx.transition(WavyIdleState.id);
  }
}

// Tool definition for the wavy tool
export const wavyToolDefinition: ToolDefinition = {
  id: 'wavy',
  initialStateId: WavyIdleState.id,
  stateConstructors: [WavyIdleState, WavyDrawingState],
};
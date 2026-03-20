import { GeometricDrawingState } from '../../geometric/states/GeometricDrawingState.js';
import {
  buildCircleBounds,
  buildDefaultCenteredEllipseBounds,
  buildEllipseBounds,
  buildEllipseSegments,
} from '../../geometric/geometricShapeHelpers.js';

// Circle drawing: shift constrains to a perfect circle, otherwise creates an ellipse
// Click without drag places a default ellipse
export class CircleDrawingState extends GeometricDrawingState {
  static override id = 'circle_drawing';

  protected override getConfig() {
    return {
      idleStateId: 'circle_idle',
      buildConstrainedBounds: buildCircleBounds,
      buildUnconstrainedBounds: buildEllipseBounds,
      buildDefaultBounds: buildDefaultCenteredEllipseBounds,
      buildSegments: buildEllipseSegments,
    };
  }
}

import { GeometricDrawingState } from '../../geometric/states/GeometricDrawingState.js';
import {
  buildDefaultCenteredRectangleBounds,
  buildRectangleBounds,
  buildRectangleSegments,
  buildSquareBounds,
} from '../../geometric/geometricShapeHelpers.js';

// Square drawing: shift constrains to a perfect square, otherwise creates a rectangle
// Click without drag places a default sized rectangle
export class SquareDrawingState extends GeometricDrawingState {
  static override id = 'square_drawing';

  protected override getConfig() {
    return {
      idleStateId: 'square_idle',
      buildConstrainedBounds: buildSquareBounds,
      buildUnconstrainedBounds: buildRectangleBounds,
      buildDefaultBounds: buildDefaultCenteredRectangleBounds,
      buildSegments: buildRectangleSegments,
    };
  }
}

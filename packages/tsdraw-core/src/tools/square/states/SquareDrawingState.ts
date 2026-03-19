import { GeometricDrawingState } from '../../geometric/states/GeometricDrawingState.js';
import {
  buildDefaultCenteredRectangleBounds,
  buildRectangleBounds,
  buildRectangleSegments,
  buildSquareBounds,
} from '../../geometric/geometricShapeHelpers.js';

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

import { StateNode, type ToolPointerDownInfo } from '../../../store/stateNode.js';

export class SquareIdleState extends StateNode {
  static override id = 'square_idle';

  override onPointerDown(info?: ToolPointerDownInfo): void {
    this.ctx.transition('square_drawing', info);
  }
}
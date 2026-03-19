import { StateNode, type ToolPointerDownInfo } from '../../../store/stateNode.js';

export class CircleIdleState extends StateNode {
  static override id = 'circle_idle';

  override onPointerDown(info?: ToolPointerDownInfo): void {
    this.ctx.transition('circle_drawing', info);
  }
}
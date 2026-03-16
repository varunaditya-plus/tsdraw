import { StateNode } from '../../../store/stateNode.js';

export class PenIdleState extends StateNode {
  static override id = 'pen_idle';

  override onPointerDown(info: unknown): void {
    this.ctx.transition('pen_drawing', info);
  }
}
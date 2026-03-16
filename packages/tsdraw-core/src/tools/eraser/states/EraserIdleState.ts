import { StateNode } from '../../../store/stateNode.js';

export class EraserIdleState extends StateNode {
  static override id = 'eraser_idle';

  override onPointerDown(info: unknown): void {
    this.ctx.transition('eraser_pointing', info);
  }
}
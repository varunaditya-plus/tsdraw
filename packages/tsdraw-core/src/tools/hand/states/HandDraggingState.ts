import { StateNode, type ToolPointerMoveInfo } from '../../../store/stateNode.js';

// Pans viewport by screen-space delta each pointer move
// Screen delta (not page delta) to get 1:1 tracking with finger
export class HandDraggingState extends StateNode {
  static override id = 'hand_dragging';

  override onPointerMove(info?: ToolPointerMoveInfo): void {
    const move = info ?? {};
    const dx = move.screenDeltaX ?? 0;
    const dy = move.screenDeltaY ?? 0;
    if (dx === 0 && dy === 0) return;
    this.editor.panBy(dx, dy);
  }

  override onPointerUp(): void {
    this.ctx.transition('hand_idle');
  }

  override onCancel(): void {
    this.ctx.transition('hand_idle');
  }

  override onInterrupt(): void {
    this.ctx.transition('hand_idle');
  }
}
import { StateNode, type ToolPointerDownInfo, type ToolPointerMoveInfo, type ToolStateTransitionInfo } from '../../../store/stateNode.js';
import { beginCameraPan, moveCameraPan, type CameraPanSession } from '../../../canvas/cameraPan.js';

// Pans viewport by screen-space delta each pointer move
// Screen delta (not page delta) to get 1:1 tracking with finger
export class HandDraggingState extends StateNode {
  static override id = 'hand_dragging';

  private panSession: CameraPanSession | null = null;

  override onEnter(info?: ToolStateTransitionInfo): void {
    const downInfo = info as ToolPointerDownInfo | undefined;
    const screenX = downInfo?.screenX ?? 0;
    const screenY = downInfo?.screenY ?? 0;
    this.panSession = beginCameraPan(this.editor.viewport, screenX, screenY);
  }

  override onPointerMove(info?: ToolPointerMoveInfo): void {
    if (!this.panSession) return;
    const screenX = info?.screenX ?? 0;
    const screenY = info?.screenY ?? 0;
    const target = moveCameraPan(this.panSession, screenX, screenY);
    this.editor.setViewport({ x: target.x, y: target.y });
  }

  getPanSession(): CameraPanSession | null {
    return this.panSession;
  }

  override onPointerUp(): void {
    this.ctx.transition('hand_idle');
  }

  override onExit(): void {
    this.panSession = null;
  }

  override onCancel(): void {
    this.ctx.transition('hand_idle');
  }

  override onInterrupt(): void {
    this.ctx.transition('hand_idle');
  }
}
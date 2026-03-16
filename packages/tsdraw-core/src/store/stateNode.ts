import type { IEditor } from '../editor/editorTypes.js';

// Base type for tool state (what tool is currently being used)
export interface ToolStateContext {
  transition(stateId: string, info?: unknown): void;
}

// State node in the tool state machine
export abstract class StateNode {
  static id: string = 'base';

  constructor(
    protected ctx: ToolStateContext,
    protected editor: IEditor
  ) {}

  onEnter(_info?: unknown): void {}
  onExit(_info?: unknown, _to?: string): void {}
  onPointerDown(_info?: unknown): void {}
  onPointerMove(_info?: unknown): void {}
  onPointerUp(_info?: unknown): void {}
  onKeyDown(_info?: unknown): void {}
  onKeyUp(_info?: unknown): void {}
  onCancel(): void {}
  onInterrupt(): void {}
}

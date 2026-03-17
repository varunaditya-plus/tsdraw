import type {
  StateNode,
  StateNodeConstructor,
  ToolKeyInfo,
  ToolPointerDownInfo,
  ToolPointerMoveInfo,
  ToolStateTransitionInfo,
} from '../store/stateNode.js';

export type DefaultToolId = 'pen' | 'eraser' | 'select' | 'hand';
export type ToolId = DefaultToolId | (string & {});

export interface ToolDefinition {
  id: ToolId;
  initialStateId: string;
  stateConstructors: StateNodeConstructor[];
}

// Manages current tool and passes pointer/key events to state nodes
export class ToolManager {
  private currentToolId: ToolId = 'pen';
  private currentState: StateNode | null = null;
  private states: Map<string, StateNode> = new Map();
  private toolInitialStateIds: Map<ToolId, string> = new Map();

  registerState(state: StateNode): void {
    const ctor = state.constructor as StateNodeConstructor;
    if (this.states.has(ctor.id)) {
      throw new Error(`Tool state '${ctor.id}' is already registered.`);
    }
    this.states.set(ctor.id, state);
  }

  registerTool(id: ToolId, initialStateId: string): void {
    if (this.toolInitialStateIds.has(id)) {
      throw new Error(`Tool '${id}' is already registered.`);
    }
    this.toolInitialStateIds.set(id, initialStateId);
  }

  hasTool(id: ToolId): boolean {
    return this.toolInitialStateIds.has(id);
  }

  setCurrentTool(id: ToolId): void {
    const initialStateId = this.toolInitialStateIds.get(id);
    if (!initialStateId) return;
    const nextState = this.states.get(initialStateId);
    if (!nextState) return;

    this.currentState?.onExit?.(undefined, initialStateId);
    this.currentToolId = id;
    this.currentState = nextState;
    this.currentState.onEnter?.();
  }

  getCurrentToolId(): ToolId {
    return this.currentToolId;
  }

  getCurrentState(): StateNode | null {
    return this.currentState;
  }

  transition(stateId: string, info?: ToolStateTransitionInfo): void {
    const next = this.states.get(stateId);
    if (!next) return;
    this.currentState?.onExit?.(undefined, stateId);
    this.currentState = next;
    this.currentState.onEnter?.(info);
  }

  pointerDown(info: ToolPointerDownInfo): void { this.currentState?.onPointerDown?.(info); }
  pointerMove(info: ToolPointerMoveInfo): void { this.currentState?.onPointerMove?.(info); }
  pointerUp(): void { this.currentState?.onPointerUp?.(); }

  keyDown(info: ToolKeyInfo): void { this.currentState?.onKeyDown?.(info); }
  keyUp(info: ToolKeyInfo): void { this.currentState?.onKeyUp?.(info); }

  cancel(): void { this.currentState?.onCancel?.(); }
  interrupt(): void { this.currentState?.onInterrupt?.(); }
}

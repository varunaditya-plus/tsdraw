import type { ToolId } from '@tsdraw/core';
import type { TsdrawKeyboardShortcutOptions } from './canvasOptions.js';

const DEFAULT_TOOL_SHORTCUTS: Partial<Record<string, ToolId>> = {
  v: 'select',
  h: 'hand',
  e: 'eraser',
  p: 'pen',
  b: 'pen',
  d: 'pen',
  x: 'pen',
  r: 'square',
  o: 'circle',
  c: 'circle',
};

export function resolveToolShortcuts(shortcutOptions?: TsdrawKeyboardShortcutOptions): Partial<Record<string, ToolId>> {
  if (!shortcutOptions?.toolShortcuts) return DEFAULT_TOOL_SHORTCUTS;
  if (shortcutOptions.overrideDefaults) return { ...shortcutOptions.toolShortcuts };
  return { ...DEFAULT_TOOL_SHORTCUTS, ...shortcutOptions.toolShortcuts };
}

export interface KeyboardShortcutHandlers {
  isToolAvailable: (tool: ToolId) => boolean;
  setToolFromShortcut: (tool: ToolId) => void;
  runHistoryShortcut: (shouldRedo: boolean) => boolean;
  deleteSelection: () => boolean;
  dispatchKeyDown: (event: KeyboardEvent) => void;
  dispatchKeyUp: (event: KeyboardEvent) => void;
}

export function isEditableTarget(eventTarget: EventTarget | null): boolean {
  const element = eventTarget as HTMLElement | null;
  if (!element) return false;
  if (element.isContentEditable) return true;
  const tagName = element.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

export function handleKeyboardShortcutKeyDown(
  event: KeyboardEvent,
  handlers: KeyboardShortcutHandlers,
  toolShortcutMap: Partial<Record<string, ToolId>> = DEFAULT_TOOL_SHORTCUTS
): void {
  if (isEditableTarget(event.target)) return;

  const loweredKey = event.key.toLowerCase();
  const isMetaPressed = event.metaKey || event.ctrlKey;

  if (isMetaPressed && (loweredKey === 'z' || loweredKey === 'y')) {
    const shouldRedo = loweredKey === 'y' || (loweredKey === 'z' && event.shiftKey);
    if (handlers.runHistoryShortcut(shouldRedo)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }

  if (!isMetaPressed && !event.altKey) {
    const nextToolId = toolShortcutMap[loweredKey];
    if (nextToolId && handlers.isToolAvailable(nextToolId)) {
      handlers.setToolFromShortcut(nextToolId);
      event.preventDefault();
      return;
    }
  }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (handlers.deleteSelection()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
  }

  handlers.dispatchKeyDown(event);
}

export function handleKeyboardShortcutKeyUp(event: KeyboardEvent, handlers: KeyboardShortcutHandlers): void {
  if (isEditableTarget(event.target)) return;
  handlers.dispatchKeyUp(event);
}
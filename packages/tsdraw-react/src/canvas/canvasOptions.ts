import type { ToolId, ZoomRange } from '@tsdraw/core';

export interface TsdrawCameraOptions {
  panSpeed?: number;
  zoomSpeed?: number;
  zoomRange?: ZoomRange;
  wheelBehavior?: 'pan' | 'zoom' | 'none';
  slideEnabled?: boolean;
  slideFriction?: number;
  locked?: boolean;
}

export interface TsdrawTouchOptions {
  pinchToZoom?: boolean;
  fingerPanInPenMode?: boolean;
  tapUndoRedo?: boolean;
  trackpadGestures?: boolean;
}

export interface TsdrawKeyboardShortcutOptions {
  enabled?: boolean;
  toolShortcuts?: Record<string, ToolId>;
  overrideDefaults?: boolean;
}

export interface TsdrawPenOptions {
  pressureSensitivity?: number;
  autoDetect?: boolean;
}
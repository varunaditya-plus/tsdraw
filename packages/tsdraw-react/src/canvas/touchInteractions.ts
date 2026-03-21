import {
  type Editor,
  type CameraPanSession,
  type CameraSlideAnimation,
  type CameraSlideOptions,
  beginCameraPan,
  moveCameraPan,
  startCameraSlide,
} from '@tsdraw/core';
import type { TsdrawTouchOptions } from './canvasOptions.js';

const TAP_MAX_DURATION_MS = 100; // the max time of a tap gesture
const DOUBLE_TAP_INTERVAL_MS = 100; // the min time between double taps
const TAP_MOVE_TOLERANCE = 14; // the min distance user can move their finger to register as a tap
const PINCH_MODE_ZOOM_DISTANCE = 24; // the min distance user can pinch to zoom the camera
const PINCH_MODE_PAN_DISTANCE = 16; // the min distance user can pinch to pan the camera
const PINCH_MODE_SWITCH_TO_ZOOM_DISTANCE = 64; // the min distance user can pinch to switch from panning to zooming

type TouchCameraMode = 'not-sure' | 'zooming' | 'panning';

interface TouchTapState {
  active: boolean;
  startTime: number;
  maxTouchCount: number;
  moved: boolean;
  startPoints: Map<number, { x: number; y: number }>;
  lastTapAtByCount: Partial<Record<2 | 3, number>>;
}

interface TouchCameraState {
  active: boolean;
  mode: TouchCameraMode;
  previousCenter: { x: number; y: number };
  initialCenter: { x: number; y: number };
  initialDistance: number;
  initialZoom: number;
}

export interface TouchInteractionHandlers {
  cancelActivePointerInteraction: () => void;
  refreshView: () => void;
  runUndo: () => boolean;
  runRedo: () => boolean;
  isPenModeActive: () => boolean;
  getSlideOptions: () => { enabled: boolean; slideOptions?: CameraSlideOptions };
}

export interface TouchInteractionController {
  handlePointerDown: (event: PointerEvent) => boolean;
  handlePointerMove: (event: PointerEvent) => boolean;
  handlePointerUpOrCancel: (event: PointerEvent) => boolean;
  handleGestureEvent: (event: Event, container: HTMLElement) => void;
  reset: () => void;
  isCameraGestureActive: () => boolean;
  isFingerPanActive: () => boolean;
  isTrackpadZoomActive: () => boolean;
}

export function createTouchInteractionController(
  editor: Editor,
  canvas: HTMLCanvasElement,
  handlers: TouchInteractionHandlers,
  touchOptions?: TsdrawTouchOptions
): TouchInteractionController {
  const allowPinchZoom = touchOptions?.pinchToZoom !== false;
  const allowFingerPan = touchOptions?.fingerPanInPenMode !== false;
  const allowTapUndoRedo = touchOptions?.tapUndoRedo !== false;
  const allowTrackpadGestures = touchOptions?.trackpadGestures !== false;
  const activeTouchPoints = new Map<number, { x: number; y: number }>();
  const touchTapState: TouchTapState = {
    active: false,
    startTime: 0,
    maxTouchCount: 0,
    moved: false,
    startPoints: new Map(),
    lastTapAtByCount: {},
  };
  const touchCameraState: TouchCameraState = {
    active: false,
    mode: 'not-sure',
    previousCenter: { x: 0, y: 0 },
    initialCenter: { x: 0, y: 0 },
    initialDistance: 1,
    initialZoom: 1,
  };

  let fingerPanPointerId: number | null = null;
  let fingerPanSession: CameraPanSession | null = null;
  let fingerPanSlide: CameraSlideAnimation | null = null;

  const isTouchPointer = (event: PointerEvent) => event.pointerType === 'touch';

  const stopFingerPanSlide = () => {
    if (fingerPanSlide) {
      fingerPanSlide.stop();
      fingerPanSlide = null;
    }
  };

  const endFingerPan = () => {
    fingerPanPointerId = null;
    fingerPanSession = null;
  };

  const endTouchCameraGesture = () => {
    touchCameraState.active = false;
    touchCameraState.mode = 'not-sure';
    touchCameraState.initialDistance = 1;
    touchCameraState.initialZoom = 1;
  };

  const maybeHandleTouchTapGesture = () => {
    if (activeTouchPoints.size > 0) return;
    if (!touchTapState.active) return;

    const elapsed = performance.now() - touchTapState.startTime;
    if (allowTapUndoRedo && !touchTapState.moved && elapsed <= TAP_MAX_DURATION_MS && (touchTapState.maxTouchCount === 2 || touchTapState.maxTouchCount === 3)) {
      const fingerCount = touchTapState.maxTouchCount as 2 | 3;
      const now = performance.now();
      const previousTapTime = touchTapState.lastTapAtByCount[fingerCount] ?? 0;
      const isDoubleTap = previousTapTime > 0 && now - previousTapTime <= DOUBLE_TAP_INTERVAL_MS;
            if (isDoubleTap) {
              touchTapState.lastTapAtByCount[fingerCount] = 0;
              if (fingerCount === 2) {
                if (handlers.runUndo()) handlers.refreshView();
              } else if (handlers.runRedo()) handlers.refreshView();
          } else touchTapState.lastTapAtByCount[fingerCount] = now;
    }

    touchTapState.active = false;
    touchTapState.startPoints.clear();
    touchTapState.maxTouchCount = 0;
    touchTapState.moved = false;
  };

  const beginTouchCameraGesture = () => {
    const points = [...activeTouchPoints.values()];
    if (points.length !== 2) return;

    handlers.cancelActivePointerInteraction();
    const first = points[0]!;
    const second = points[1]!;
    const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    const distance = Math.hypot(second.x - first.x, second.y - first.y);

    touchCameraState.active = true;
    touchCameraState.mode = 'not-sure';
    touchCameraState.previousCenter = center;
    touchCameraState.initialCenter = center;
    touchCameraState.initialDistance = Math.max(1, distance);
    touchCameraState.initialZoom = editor.getZoomLevel();
  };

  const updateTouchCameraGesture = () => {
    if (!touchCameraState.active) return false;
    const points = [...activeTouchPoints.values()];
    if (points.length !== 2) {
      endTouchCameraGesture();
      return false;
    }

    const first = points[0]!;
    const second = points[1]!;
    const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
    const centerDx = center.x - touchCameraState.previousCenter.x;
    const centerDy = center.y - touchCameraState.previousCenter.y;
    const touchDistance = Math.abs(distance - touchCameraState.initialDistance);
    const originDistance = Math.hypot(center.x - touchCameraState.initialCenter.x, center.y - touchCameraState.initialCenter.y);

    if (touchCameraState.mode === 'not-sure') {
      if (allowPinchZoom && touchDistance > PINCH_MODE_ZOOM_DISTANCE) touchCameraState.mode = 'zooming';
      else if (originDistance > PINCH_MODE_PAN_DISTANCE) touchCameraState.mode = 'panning';
    } else if (allowPinchZoom && touchCameraState.mode === 'panning' && touchDistance > PINCH_MODE_SWITCH_TO_ZOOM_DISTANCE) touchCameraState.mode = 'zooming';

    const canvasRect = canvas.getBoundingClientRect();
    const centerOnCanvasX = center.x - canvasRect.left;
    const centerOnCanvasY = center.y - canvasRect.top;

    if (touchCameraState.mode === 'zooming') {
      const targetZoom = Math.max(0.1, Math.min(4, touchCameraState.initialZoom * (distance / touchCameraState.initialDistance)));
      const pannedX = editor.viewport.x + centerDx;
      const pannedY = editor.viewport.y + centerDy;
      const pageAtCenterX = (centerOnCanvasX - pannedX) / editor.viewport.zoom;
      const pageAtCenterY = (centerOnCanvasY - pannedY) / editor.viewport.zoom;
      editor.setViewport({
        x: centerOnCanvasX - pageAtCenterX * targetZoom,
        y: centerOnCanvasY - pageAtCenterY * targetZoom,
        zoom: targetZoom,
      });
    } else {
      editor.panBy(centerDx, centerDy);
    }

    touchCameraState.previousCenter = center;
    handlers.refreshView();
    return true;
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (!isTouchPointer(event)) return false;

    stopFingerPanSlide();
    activeTouchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!touchTapState.active) {
      touchTapState.active = true;
      touchTapState.startTime = performance.now();
      touchTapState.maxTouchCount = activeTouchPoints.size;
      touchTapState.moved = false;
      touchTapState.startPoints.clear();
    } else {
      touchTapState.maxTouchCount = Math.max(touchTapState.maxTouchCount, activeTouchPoints.size);
    }
    touchTapState.startPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (activeTouchPoints.size === 2) {
      endFingerPan();
      beginTouchCameraGesture();
      return true;
    }

    if (allowFingerPan && handlers.isPenModeActive() && activeTouchPoints.size === 1) {
      handlers.cancelActivePointerInteraction();
      fingerPanPointerId = event.pointerId;
      fingerPanSession = beginCameraPan(editor.viewport, event.clientX, event.clientY);
      return true;
    }

    return false;
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!isTouchPointer(event)) return false;
    if (activeTouchPoints.has(event.pointerId)) activeTouchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
    
    const tapStart = touchTapState.startPoints.get(event.pointerId);
    if (tapStart) {
      const moved = Math.hypot(event.clientX - tapStart.x, event.clientY - tapStart.y);
      if (moved > TAP_MOVE_TOLERANCE) touchTapState.moved = true;
    }

    if (fingerPanPointerId === event.pointerId && fingerPanSession) {
      const target = moveCameraPan(fingerPanSession, event.clientX, event.clientY);
      editor.setViewport({ x: target.x, y: target.y });
      handlers.refreshView();
      return true;
    }

    return updateTouchCameraGesture();
  };

  const handlePointerUpOrCancel = (event: PointerEvent) => {
    if (!isTouchPointer(event)) return false;
    const wasCameraGestureActive = touchCameraState.active;
    const wasFingerPan = fingerPanPointerId === event.pointerId;
    const releasedPanSession = wasFingerPan ? fingerPanSession : null;
    activeTouchPoints.delete(event.pointerId);
    touchTapState.startPoints.delete(event.pointerId);
    if (activeTouchPoints.size < 2) endTouchCameraGesture();
    if (wasFingerPan) {
      endFingerPan();
      if (releasedPanSession) {
        const slideConfig = handlers.getSlideOptions();
        if (slideConfig.enabled) {
          fingerPanSlide = startCameraSlide(
            releasedPanSession,
            (dx, dy) => editor.panBy(dx, dy),
            () => handlers.refreshView(),
            slideConfig.slideOptions
          );
        }
      }
    }
    maybeHandleTouchTapGesture();
    return wasCameraGestureActive || wasFingerPan;
  };

  let gestureLastScale = 1;
  let gestureActive = false;

  const handleGestureEvent = (event: Event, container: HTMLElement) => {
    if (!container.contains(event.target as Node)) return;
    event.preventDefault();
    if (!allowTrackpadGestures) return;

    const gestureEvent = event as Event & { scale?: number; clientX?: number; clientY?: number };
    if (gestureEvent.scale == null) return;

    if (event.type === 'gesturestart') {
      gestureLastScale = gestureEvent.scale;
      gestureActive = true;
      return;
    }

    if (event.type === 'gestureend') {
      gestureActive = false;
      gestureLastScale = 1;
      return;
    }

    if (event.type === 'gesturechange' && gestureActive) {
      const zoomFactor = gestureEvent.scale / gestureLastScale;
      gestureLastScale = gestureEvent.scale;
      const canvasRect = canvas.getBoundingClientRect();
      const cx = (gestureEvent.clientX ?? canvasRect.left + canvasRect.width / 2) - canvasRect.left;
      const cy = (gestureEvent.clientY ?? canvasRect.top + canvasRect.height / 2) - canvasRect.top;
      editor.zoomAt(zoomFactor, cx, cy);
      handlers.refreshView();
    }
  };

  const reset = () => {
    activeTouchPoints.clear();
    touchTapState.active = false;
    touchTapState.startPoints.clear();
    endTouchCameraGesture();
    endFingerPan();
    stopFingerPanSlide();
  };

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUpOrCancel,
    handleGestureEvent,
    reset,
    isCameraGestureActive: () => touchCameraState.active,
    isFingerPanActive: () => fingerPanPointerId !== null,
    isTrackpadZoomActive: () => gestureActive,
  };
}
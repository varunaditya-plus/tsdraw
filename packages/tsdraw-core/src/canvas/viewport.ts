// Viewport: pan (x,y) and zoom
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export function createViewport(): Viewport {
  return { x: 0, y: 0, zoom: 1 };
}

// Screen point to page point
export function screenToPage(viewport: Viewport, screenX: number, screenY: number): { x: number; y: number } {
  return {
    x: (screenX - viewport.x) / viewport.zoom,
    y: (screenY - viewport.y) / viewport.zoom,
  };
}

// Page point to screen point
export function pageToScreen(viewport: Viewport, pageX: number, pageY: number): { x: number; y: number } {
  return {
    x: pageX * viewport.zoom + viewport.x,
    y: pageY * viewport.zoom + viewport.y,
  };
}

export function setViewport(
  viewport: Viewport,
  updater: { x?: number; y?: number; zoom?: number }
): Viewport {
  return {
    x: updater.x ?? viewport.x,
    y: updater.y ?? viewport.y,
    zoom: updater.zoom ?? viewport.zoom,
  };
}

export function panViewport(viewport: Viewport, dx: number, dy: number): Viewport {
  return { ...viewport, x: viewport.x + dx, y: viewport.y + dy };
}

export interface ZoomRange {
  min: number;
  max: number;
}

export const DEFAULT_ZOOM_RANGE: ZoomRange = { min: 0.1, max: 4 };

export function clampZoom(zoom: number, range?: ZoomRange): number {
  const { min, max } = range ?? DEFAULT_ZOOM_RANGE;
  return Math.max(min, Math.min(max, zoom));
}

export function zoomViewport(viewport: Viewport, factor: number, centerX?: number, centerY?: number, zoomRange?: ZoomRange): Viewport {
  const zoom = clampZoom(viewport.zoom * factor, zoomRange);
  if (centerX == null || centerY == null) {
    return { ...viewport, zoom };
  }
  const pageBefore = screenToPage(viewport, centerX, centerY);
  const x = centerX - pageBefore.x * zoom;
  const y = centerY - pageBefore.y * zoom;
  return { x, y, zoom };
}

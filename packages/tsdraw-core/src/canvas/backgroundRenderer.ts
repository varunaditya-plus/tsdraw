import type { Viewport } from './viewport.js';
import type { TsdrawRenderTheme } from '../utils/colors.js';

export type TsdrawBackgroundType = 'blank' | 'lines' | 'grid' | 'dots';

export interface TsdrawBackgroundPreset {
  type: TsdrawBackgroundType;
  color?: string; // color of dot/line/etc in light mode
  colorDark?: string; // color of dot/line/etc in dark mode
  spacing?: number; // gap between lines/dots in px
  size?: number; // line width/dot radius in px
  opacity?: number; // opacity (0-1)
}

export interface TsdrawBackgroundCustom {
  type: 'custom';
  render: (
    ctx: CanvasRenderingContext2D,
    viewport: Viewport,
    canvasWidth: number,
    canvasHeight: number,
  ) => void;
}

export type TsdrawBackgroundOptions = TsdrawBackgroundPreset | TsdrawBackgroundCustom;

const DEFAULT_SPACING = 20;
const DEFAULT_LINE_WIDTH = 0.5;
const DEFAULT_DOT_RADIUS = 1;
const DEFAULT_OPACITY = 0.25;

function resolvePresetPatternColor(colorLight: string | undefined, colorDark: string | undefined, theme: TsdrawRenderTheme): string {
  if (theme === 'dark') return colorDark ?? colorLight ?? '#888888';
  return colorLight ?? '#c0c0c0';
}

interface PageRect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function visiblePageRect(viewport: Viewport, canvasWidth: number, canvasHeight: number): PageRect {
  return {
    minX: (0 - viewport.x) / viewport.zoom,
    minY: (0 - viewport.y) / viewport.zoom,
    maxX: (canvasWidth - viewport.x) / viewport.zoom,
    maxY: (canvasHeight - viewport.y) / viewport.zoom,
  };
}

function drawHorizontalLines(
  ctx: CanvasRenderingContext2D,
  visible: PageRect,
  spacing: number,
  lineWidth: number,
  color: string,
  opacity: number,
): void {
  const startY = Math.floor(visible.minY / spacing) * spacing;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth / ctx.getTransform().a; // For zoom changes, compensate so visual stays constant
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  for (let y = startY; y <= visible.maxY; y += spacing) {
    ctx.moveTo(visible.minX, y);
    ctx.lineTo(visible.maxX, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawGridLines(
  ctx: CanvasRenderingContext2D,
  visible: PageRect,
  spacing: number,
  lineWidth: number,
  color: string,
  opacity: number,
): void {
  const startX = Math.floor(visible.minX / spacing) * spacing;
  const startY = Math.floor(visible.minY / spacing) * spacing;
  const compensatedWidth = lineWidth / ctx.getTransform().a;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = compensatedWidth;
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  for (let x = startX; x <= visible.maxX; x += spacing) {
    ctx.moveTo(x, visible.minY);
    ctx.lineTo(x, visible.maxY);
  }
  for (let y = startY; y <= visible.maxY; y += spacing) {
    ctx.moveTo(visible.minX, y);
    ctx.lineTo(visible.maxX, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawDotPattern(
  ctx: CanvasRenderingContext2D,
  visible: PageRect,
  spacing: number,
  dotRadius: number,
  color: string,
  opacity: number,
): void {
  const startX = Math.floor(visible.minX / spacing) * spacing;
  const startY = Math.floor(visible.minY / spacing) * spacing;
  const compensatedRadius = dotRadius / ctx.getTransform().a;

  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;
  ctx.beginPath();
  for (let x = startX; x <= visible.maxX; x += spacing) {
    for (let y = startY; y <= visible.maxY; y += spacing) {
      ctx.moveTo(x + compensatedRadius, y);
      ctx.arc(x, y, compensatedRadius, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.restore();
}

export function renderCanvasBackground(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number,
  options: TsdrawBackgroundOptions | undefined,
  theme: TsdrawRenderTheme,
): void {
  if (!options || options.type === 'blank') return;

  if (options.type === 'custom') {
    options.render(ctx, viewport, canvasWidth, canvasHeight);
    return;
  }

  const spacing = options.spacing ?? DEFAULT_SPACING;
  if (spacing <= 0) return;

  const color = resolvePresetPatternColor(options.color, options.colorDark, theme);
  const opacity = options.opacity ?? DEFAULT_OPACITY;
  const visible = visiblePageRect(viewport, canvasWidth, canvasHeight);

  ctx.save();
  ctx.translate(viewport.x, viewport.y);
  ctx.scale(viewport.zoom, viewport.zoom);

  switch (options.type) {
    case 'lines':
      drawHorizontalLines(ctx, visible, spacing, options.size ?? DEFAULT_LINE_WIDTH, color, opacity);
      break;
    case 'grid':
      drawGridLines(ctx, visible, spacing, options.size ?? DEFAULT_LINE_WIDTH, color, opacity);
      break;
    case 'dots':
      drawDotPattern(ctx, visible, spacing, options.size ?? DEFAULT_DOT_RADIUS, color, opacity);
      break;
  }

  ctx.restore();
}
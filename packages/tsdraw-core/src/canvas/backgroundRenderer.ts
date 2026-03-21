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
const DEFAULT_OPACITY = 1;

// Lines/grid use a tight range because the 1D skip is less noticeable
const LINE_GAP_FADE_IN = 3;
const LINE_GAP_FADE_FULL = 8;

// Dots need a much wider range because doubling spacing removes 3/4 of dots at once so structure needs to change gradually
const DOT_GAP_FADE_IN = 2;
const DOT_GAP_FADE_FULL = 16;

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

function isOnGrid(value: number, gridSpacing: number): boolean {
  const remainder = ((value % gridSpacing) + gridSpacing) % gridSpacing;
  return remainder < 0.5 || remainder > gridSpacing - 0.5;
}

function fadeForScreenGap(screenGap: number, fadeIn: number, fadeFull: number): number {
  return Math.min(1, Math.max(0, (screenGap - fadeIn) / (fadeFull - fadeIn)));
}

interface PatternLevel {
  spacing: number;
  fade: number; // 0-1 opacity multiplier for this level
}

// Build set of spacing levels to draw, from coarsest (full opacity) to finest (fading). Each level is 2x finer than the previous.
function buildLevels(baseSpacing: number, zoom: number, fadeIn: number, fadeFull: number): PatternLevel[] {
  let topSpacing = baseSpacing;
  while (topSpacing * zoom < fadeFull) {
    topSpacing *= 2;
  }

  const levels: PatternLevel[] = [];
  for (let s = topSpacing; s >= baseSpacing; s /= 2) {
    const fade = fadeForScreenGap(s * zoom, fadeIn, fadeFull);
    if (fade < 0.01) break;
    levels.push({ spacing: s, fade });
  }
  return levels;
}

// Dots (with GPU tiling)
function drawDotTile(
  ctx: CanvasRenderingContext2D,
  physicalWidth: number,
  physicalHeight: number,
  panXPx: number,
  panYPx: number,
  exactTileSize: number,
  radiusPx: number,
  color: string,
  alpha: number,
): void {
  if (alpha < 0.005 || exactTileSize < 2) return;

  const tilePixels = Math.ceil(exactTileSize);
  const tileScale = exactTileSize / tilePixels;
  const center = tilePixels / 2;

  const tile = new OffscreenCanvas(tilePixels, tilePixels);
  const tctx = tile.getContext('2d')!;
  tctx.fillStyle = color;
  tctx.beginPath();
  tctx.arc(center, center, radiusPx / tileScale, 0, Math.PI * 2);
  tctx.fill();

  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern) return;

  pattern.setTransform(
    new DOMMatrix()
      .translateSelf(panXPx - exactTileSize / 2, panYPx - exactTileSize / 2)
      .scaleSelf(tileScale, tileScale),
  );

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, physicalWidth, physicalHeight);
  ctx.restore();
}

// Dot renderer with multiple levels for seamless zoom transitions using GPU
// Each level draws dots independently so dots fade in and out while zooming
// Grid dots get a composited opacity from every level they appear so they show as finer dots disappear
function drawMergingDots(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  canvasWidth: number,
  canvasHeight: number,
  baseSpacing: number,
  dotRadius: number,
  color: string,
  opacity: number,
): void {
  const dpr = ctx.getTransform().a;
  const levels = buildLevels(baseSpacing, viewport.zoom, DOT_GAP_FADE_IN, DOT_GAP_FADE_FULL);
  if (levels.length === 0) return;

  const physicalWidth = canvasWidth * dpr;
  const physicalHeight = canvasHeight * dpr;
  const panXPx = viewport.x * dpr;
  const panYPx = viewport.y * dpr;
  const radiusPx = dotRadius * dpr;

  for (const level of levels) {
    const tileSize = level.spacing * viewport.zoom * dpr;
    drawDotTile(ctx, physicalWidth, physicalHeight, panXPx, panYPx, tileSize, radiusPx, color, opacity * level.fade);
  }
}

// Lines
function drawHorizontalLinesForLevel(
  ctx: CanvasRenderingContext2D,
  visible: PageRect,
  spacing: number,
  skipSpacing: number,
  lineWidth: number,
  color: string,
  alpha: number,
): void {
  const startY = Math.floor(visible.minY / spacing) * spacing;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  for (let y = startY; y <= visible.maxY; y += spacing) {
    if (skipSpacing > 0 && isOnGrid(y, skipSpacing)) continue;
    ctx.moveTo(visible.minX, y);
    ctx.lineTo(visible.maxX, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawMergingLines(
  ctx: CanvasRenderingContext2D,
  visible: PageRect,
  baseSpacing: number,
  lineWidth: number,
  color: string,
  opacity: number,
  zoom: number,
): void {
  const compensatedWidth = lineWidth / ctx.getTransform().a;
  const levels = buildLevels(baseSpacing, zoom, LINE_GAP_FADE_IN, LINE_GAP_FADE_FULL);

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i]!;
    const coarserSpacing = i > 0 ? levels[i - 1]!.spacing : 0;
    drawHorizontalLinesForLevel(ctx, visible, level.spacing, coarserSpacing, compensatedWidth, color, opacity * level.fade);
  }
}

// Grid
function drawGridForLevel(
  ctx: CanvasRenderingContext2D,
  visible: PageRect,
  spacing: number,
  skipSpacing: number,
  lineWidth: number,
  color: string,
  alpha: number,
): void {
  const startX = Math.floor(visible.minX / spacing) * spacing;
  const startY = Math.floor(visible.minY / spacing) * spacing;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  for (let x = startX; x <= visible.maxX; x += spacing) {
    if (skipSpacing > 0 && isOnGrid(x, skipSpacing)) continue;
    ctx.moveTo(x, visible.minY);
    ctx.lineTo(x, visible.maxY);
  }
  for (let y = startY; y <= visible.maxY; y += spacing) {
    if (skipSpacing > 0 && isOnGrid(y, skipSpacing)) continue;
    ctx.moveTo(visible.minX, y);
    ctx.lineTo(visible.maxX, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawMergingGrid(
  ctx: CanvasRenderingContext2D,
  visible: PageRect,
  baseSpacing: number,
  lineWidth: number,
  color: string,
  opacity: number,
  zoom: number,
): void {
  const compensatedWidth = lineWidth / ctx.getTransform().a;
  const levels = buildLevels(baseSpacing, zoom, LINE_GAP_FADE_IN, LINE_GAP_FADE_FULL);

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i]!;
    const coarserSpacing = i > 0 ? levels[i - 1]!.spacing : 0;
    drawGridForLevel(ctx, visible, level.spacing, coarserSpacing, compensatedWidth, color, opacity * level.fade);
  }
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

  const baseSpacing = options.spacing ?? DEFAULT_SPACING;
  if (baseSpacing <= 0) return;

  const color = resolvePresetPatternColor(options.color, options.colorDark, theme);
  const opacity = options.opacity ?? DEFAULT_OPACITY;

  // Use GPU tiled patterns for dots that manage their alignment using pattern.setTransform() so they run before the viewport transform
  if (options.type === 'dots') {
    drawMergingDots(ctx, viewport, canvasWidth, canvasHeight, baseSpacing, options.size ?? DEFAULT_DOT_RADIUS, color, opacity);
    return;
  }

  // Use loops with viewport transform for lines/grid
  const visible = visiblePageRect(viewport, canvasWidth, canvasHeight);

  ctx.save();
  ctx.translate(viewport.x, viewport.y);
  ctx.scale(viewport.zoom, viewport.zoom);

  switch (options.type) {
    case 'lines':
      drawMergingLines(ctx, visible, baseSpacing, options.size ?? DEFAULT_LINE_WIDTH, color, opacity, viewport.zoom);
      break;
    case 'grid':
      drawMergingGrid(ctx, visible, baseSpacing, options.size ?? DEFAULT_LINE_WIDTH, color, opacity, viewport.zoom);
      break;
  }

  ctx.restore();
}
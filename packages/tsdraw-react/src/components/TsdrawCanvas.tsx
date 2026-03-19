import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { ColorStyle, DashStyle, DefaultToolId, SizeStyle, ToolDefinition, ToolId } from '@tsdraw/core';
import { SelectionOverlay } from './SelectionOverlay.js';
import { StylePanel } from './StylePanel.js';
import { ToolOverlay } from './ToolOverlay.js';
import { Toolbar, getDefaultToolbarIcon, type ToolbarPart } from './Toolbar.js';
import {
  useTsdrawCanvasController,
  type TsdrawCursorContext,
  type TsdrawMountApi,
  type TsdrawToolOverlayState,
} from '../canvas/useTsdrawCanvasController.js';

const DEFAULT_TOOLBAR_PARTS: ToolbarPartItem[][] = [['undo', 'redo'], ['select', 'hand', 'pen', 'eraser']];

const DEFAULT_TOOL_LABELS: Record<DefaultToolId, string> = {
  select: 'Select',
  pen: 'Pen',
  eraser: 'Eraser',
  hand: 'Hand',
};

type VerticalPart = 'top' | 'bottom' | 'center';
type HorizontalPart = 'left' | 'right' | 'center';
export type UiAnchor = | `${VerticalPart}-${HorizontalPart}` | `${HorizontalPart}-${VerticalPart}`;

function parseAnchor(anchor: UiAnchor): { vertical: VerticalPart; horizontal: HorizontalPart } {
  const parts = anchor.split('-') as string[];
  let vertical: VerticalPart = 'center';
  let horizontal: HorizontalPart = 'center';
  for (const part of parts) {
    if (part === 'top' || part === 'bottom') vertical = part;
    else if (part === 'left' || part === 'right') horizontal = part;
  }
  return { vertical, horizontal };
}

export interface TsdrawCustomTool {
  id: ToolId;
  label: string;
  icon: ReactNode;
  iconSelected?: ReactNode;
  definition: ToolDefinition;
  showStylePanel?: boolean;
}

export type TsdrawToolbarBuiltInAction = 'undo' | 'redo';
export type ToolbarPartItem = ToolId | TsdrawToolbarBuiltInAction;

export interface TsdrawUiPlacement {
  anchor?: UiAnchor;
  offsetX?: number;
  offsetY?: number;
  style?: CSSProperties;
}

export interface TsdrawUiOptions {
  toolbar?: {
    placement?: TsdrawUiPlacement;
    parts?: ToolbarPartItem[][];
  };
  stylePanel?: {
    placement?: TsdrawUiPlacement;
  };
  customElements?: TsdrawCustomElement[];
  cursor?: {
    getCursor?: (context: TsdrawCursorContext) => string;
  };
  overlays?: {
    renderToolOverlay?: (args: {
      defaultOverlay: ReactNode;
      overlayState: TsdrawToolOverlayState;
      currentTool: ToolId;
    }) => ReactNode;
  };
}

export interface TsdrawCustomElementRenderArgs {
  currentTool: ToolId;
  setTool: (tool: ToolId) => void;
  applyDrawStyle: (partial: Partial<{ color: ColorStyle; dash: DashStyle; size: SizeStyle }>) => void;
}

export interface TsdrawCustomElement {
  id: string;
  placement?: TsdrawUiPlacement;
  render: (args: TsdrawCustomElementRenderArgs) => ReactNode;
}

export interface TsdrawProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  theme?: 'light' | 'dark' | 'system';
  persistenceKey?: string;
  customTools?: TsdrawCustomTool[];
  initialToolId?: ToolId;
  uiOptions?: TsdrawUiOptions;
  onMount?: (api: TsdrawMountApi) => void | (() => void);
}

export type TsdrawCanvasProps = TsdrawProps;

function isToolbarAction(item: ToolbarPartItem): item is TsdrawToolbarBuiltInAction {
  return item === 'undo' || item === 'redo';
}

function resolvePlacementStyle(
  placement: TsdrawUiPlacement | undefined,
  fallbackAnchor: UiAnchor,
  fallbackOffsetX: number,
  fallbackOffsetY: number
): CSSProperties {
  const anchor = placement?.anchor ?? fallbackAnchor;
  const offsetX = placement?.offsetX ?? fallbackOffsetX;
  const offsetY = placement?.offsetY ?? fallbackOffsetY;
  const { vertical, horizontal } = parseAnchor(anchor);
  const result: CSSProperties = {};
  const transforms: string[] = [];

  if (horizontal === 'left') {
    result.left = offsetX;
  } else if (horizontal === 'right') {
    result.right = offsetX;
  } else {
    result.left = '50%';
    transforms.push('translateX(-50%)');
    if (offsetX) transforms.push(`translateX(${offsetX}px)`);
  }

  if (vertical === 'top') {
    result.top = offsetY;
  } else if (vertical === 'bottom') {
    result.bottom = offsetY;
  } else {
    result.top = '50%';
    transforms.push('translateY(-50%)');
    if (offsetY) transforms.push(`translateY(${offsetY}px)`);
  }

  if (transforms.length > 0) result.transform = transforms.join(' ');

  return { ...result, ...(placement?.style ?? {}) };
}

export function Tsdraw(props: TsdrawProps) {
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const customTools = props.customTools ?? [];
  const toolbarPartIds = props.uiOptions?.toolbar?.parts ?? DEFAULT_TOOLBAR_PARTS;
  const customToolMap = useMemo(
    () => new Map(customTools.map((customTool) => [customTool.id, customTool])),
    [customTools]
  );
  const toolbarToolIds = useMemo(() => {
    const ids = new Set<ToolId>();
    for (const toolbarPart of toolbarPartIds) {
      for (const item of toolbarPart) {
        if (isToolbarAction(item)) continue;
        if (item in DEFAULT_TOOL_LABELS || customToolMap.has(item)) {
          ids.add(item);
        }
      }
    }
    return ids;
  }, [customToolMap, toolbarPartIds]);
  const toolDefinitions = useMemo(
    () => customTools.filter((customTool) => toolbarToolIds.has(customTool.id)).map((customTool) => customTool.definition),
    [customTools, toolbarToolIds]
  );
  const stylePanelToolIds = useMemo<ToolId[]>(
    () => {
      const nextToolIds = new Set<ToolId>();
      if (toolbarToolIds.has('pen')) {
        nextToolIds.add('pen');
      }
      for (const customTool of customTools) {
        if ((customTool.showStylePanel ?? false) && toolbarToolIds.has(customTool.id)) {
          nextToolIds.add(customTool.id);
        }
      }
      return [...nextToolIds];
    },
    [customTools, toolbarToolIds]
  );
  const firstToolbarTool = useMemo(() => {
    for (const toolbarPart of toolbarPartIds) {
      for (const item of toolbarPart) {
        if (isToolbarAction(item)) continue;
        if (item in DEFAULT_TOOL_LABELS || customToolMap.has(item)) {
          return item;
        }
      }
    }
    return undefined;
  }, [customToolMap, toolbarPartIds]);
  const initialTool: ToolId = props.initialToolId ?? firstToolbarTool ?? 'pen';
  const requestedTheme = props.theme ?? 'light';

  // Themes and so that system theme works
  useEffect(() => {
    if (requestedTheme !== 'system' || typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = () => setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    syncSystemTheme();
    mediaQuery.addEventListener('change', syncSystemTheme);

    return () => mediaQuery.removeEventListener('change', syncSystemTheme);
  }, [requestedTheme]);

  const resolvedTheme = requestedTheme === 'system' ? systemTheme : requestedTheme;

  const {
    containerRef,
    canvasRef,
    currentTool,
    drawColor,
    drawDash,
    drawSize,
    selectedShapeIds,
    selectionBrush,
    selectionBounds,
    selectionRotationDeg,
    canvasCursor: defaultCanvasCursor,
    cursorContext,
    toolOverlay,
    isPersistenceReady,
    showStylePanel,
    canUndo,
    canRedo,
    undo,
    redo,
    setTool,
    applyDrawStyle,
    handleResizePointerDown,
    handleRotatePointerDown,
  } = useTsdrawCanvasController({
    toolDefinitions,
    initialTool,
    theme: resolvedTheme,
    persistenceKey: props.persistenceKey,
    stylePanelToolIds,
    onMount: props.onMount,
  });

  const toolbarPlacementStyle = resolvePlacementStyle(props.uiOptions?.toolbar?.placement, 'bottom-center', 0, 14);
  const stylePanelPlacementStyle = resolvePlacementStyle(props.uiOptions?.stylePanel?.placement, 'top-right', 8, 8);
  const canvasCursor = props.uiOptions?.cursor?.getCursor?.(cursorContext) ?? defaultCanvasCursor;
  const defaultToolOverlay = (
    <ToolOverlay
      visible={toolOverlay.visible}
      pointerX={toolOverlay.pointerX}
      pointerY={toolOverlay.pointerY}
      isPenPreview={toolOverlay.isPenPreview}
      penRadius={toolOverlay.penRadius}
      penColor={toolOverlay.penColor}
      eraserRadius={toolOverlay.eraserRadius}
    />
  );
  const overlayNode = props.uiOptions?.overlays?.renderToolOverlay?.({ defaultOverlay: defaultToolOverlay, overlayState: toolOverlay, currentTool }) ?? defaultToolOverlay;
  const customElements = props.uiOptions?.customElements ?? [];
  const toolbarParts = useMemo<ToolbarPart[]>(
    () =>
      toolbarPartIds
        .map((toolbarPart, partIndex) => {
          const items = toolbarPart
            .map((item) => {
              if (item === 'undo') {
                return {
                  type: 'action' as const,
                  id: 'undo' as const,
                  label: 'Undo',
                  disabled: !canUndo,
                  onSelect: undo,
                };
              }

              if (item === 'redo') {
                return {
                  type: 'action' as const,
                  id: 'redo' as const,
                  label: 'Redo',
                  disabled: !canRedo,
                  onSelect: redo,
                };
              }

              if (item in DEFAULT_TOOL_LABELS) {
                return {
                  type: 'tool' as const,
                  id: item,
                  label: DEFAULT_TOOL_LABELS[item as DefaultToolId],
                  icon: (isActive: boolean) => getDefaultToolbarIcon(item, isActive),
                };
              }

              const customTool = customToolMap.get(item);
              if (!customTool) return null;
              return {
                type: 'tool' as const,
                id: customTool.id,
                label: customTool.label,
                icon: (isActive: boolean) => (isActive && customTool.iconSelected ? customTool.iconSelected : customTool.icon),
              };
            })
            .filter((nextItem): nextItem is NonNullable<typeof nextItem> => nextItem != null);
          return {
            id: `toolbar-part-${partIndex.toString(36)}`,
            items,
          };
        })
        .filter((part) => part.items.length > 0),
    [canRedo, canUndo, customToolMap, redo, toolbarPartIds, undo]
  );

  return (
    <div
      ref={containerRef}
      className={`tsdraw tsdraw-${resolvedTheme}mode ${props.className ?? ''}`}
      style={{
        width: props.width ?? '100%',
        height: props.height ?? '100%',
        position: 'relative',
        overflow: 'hidden',
        ...props.style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          touchAction: 'none',
          cursor: canvasCursor,
        }}
        data-testid="tsdraw-canvas"
      />
      {overlayNode}
      <SelectionOverlay
        selectionBrush={selectionBrush}
        selectionBounds={selectionBounds}
        selectionRotationDeg={selectionRotationDeg}
        currentTool={currentTool}
        selectedCount={selectedShapeIds.length}
        onRotatePointerDown={handleRotatePointerDown}
        onResizePointerDown={handleResizePointerDown}
      />
      <StylePanel
        visible={isPersistenceReady && showStylePanel}
        style={stylePanelPlacementStyle}
        theme={resolvedTheme}
        drawColor={drawColor}
        drawDash={drawDash}
        drawSize={drawSize}
        onColorSelect={(color) => applyDrawStyle({ color })}
        onDashSelect={(dash) => applyDrawStyle({ dash })}
        onSizeSelect={(size) => applyDrawStyle({ size })}
      />
      {customElements.map((customElement) => (
        <div
          key={customElement.id}
          style={{
            position: 'absolute',
            zIndex: 130,
            pointerEvents: 'all',
            ...resolvePlacementStyle(customElement.placement, 'top-left', 8, 8),
          }}
        >
          {customElement.render({ currentTool, setTool, applyDrawStyle })}
        </div>
      ))}
      <Toolbar
        parts={toolbarParts}
        style={toolbarPlacementStyle}
        currentTool={isPersistenceReady ? currentTool : null}
        onToolChange={setTool}
        disabled={!isPersistenceReady}
      />
    </div>
  );
}

export function TsdrawCanvas(props: TsdrawCanvasProps) {
  return <Tsdraw {...props} />;
}
import { useRef, useEffect, useCallback, useState } from 'react';
import { IconEraser, IconPencil } from '@tabler/icons-react';
import { Editor } from 'tsdraw-core';

export interface TsdrawCanvasProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

// Main canvas component: drawing surface with toolbar
export function TsdrawCanvas(props: TsdrawCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const dprRef = useRef(1);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser'>('pen');

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const editor = editorRef.current;
    if (!canvas || !editor) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = dprRef.current || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    editor.render(ctx);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const editor = new Editor();
    editorRef.current = editor;

    const resize = () => {
      const dpr = window.devicePixelRatio ?? 1;
      dprRef.current = dpr;
      const rect = container.getBoundingClientRect();
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      editor.viewport.x = 0;
      editor.viewport.y = 0;
      editor.viewport.zoom = 1;
      render();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const getPagePoint = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      return editor.screenToPage(sx, sy);
    };

    const sampleEvents = (e: PointerEvent) => {
      const coalesced = e.getCoalescedEvents?.();
      return coalesced && coalesced.length > 0 ? coalesced : [e];
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (!canvas.contains(e.target as Node)) return;
      canvas.setPointerCapture(e.pointerId);
      const first = sampleEvents(e)[0]!;
      const { x, y } = getPagePoint(first);
      const pressure = first.pressure ?? 0.5;
      const isPen = first.pointerType === 'pen' || first.pointerType === 'touch';
      editor.input.pointerDown(x, y, pressure, isPen);
      editor.input.setModifiers(first.shiftKey, first.ctrlKey, first.metaKey);
      editor.tools.pointerDown({ point: { x, y, z: pressure } });
      render();
    };

    const handlePointerMove = (e: PointerEvent) => {
      const samples = sampleEvents(e);
      for (const sample of samples) {
        const { x, y } = getPagePoint(sample);
        const pressure = sample.pressure ?? 0.5;
        const isPen = sample.pointerType === 'pen' || sample.pointerType === 'touch';
        editor.input.pointerMove(x, y, pressure, isPen);
      }
      editor.input.setModifiers(e.shiftKey, e.ctrlKey, e.metaKey);
      editor.tools.pointerMove({});
      render();
    };

    const handlePointerUp = (e: PointerEvent) => {
      const { x, y } = getPagePoint(e);
      editor.input.pointerMove(x, y);
      editor.input.pointerUp();
      editor.tools.pointerUp({});
      render();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      editor.input.setModifiers(e.shiftKey, e.ctrlKey, e.metaKey);
      editor.tools.keyDown({ key: e.key });
      render();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      editor.input.setModifiers(e.shiftKey, e.ctrlKey, e.metaKey);
      editor.tools.keyUp({ key: e.key });
      render();
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      ro.disconnect();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      editorRef.current = null;
    };
  }, [render]);

  const setTool = useCallback((tool: 'pen' | 'eraser') => {
    const editor = editorRef.current;
    if (editor) {
      editor.setCurrentTool(tool);
      setCurrentTool(tool);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className={`tsdraw-container ${props.className ?? ''}`}
      style={{
        width: props.width ?? '100%',
        height: props.height ?? '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          touchAction: 'none',
          cursor: 'crosshair',
        }}
        data-testid="tsdraw-canvas"
      />
      <div className="tsdraw-toolbar">
        <button
          type="button"
          className="tsdraw-toolbar-btn"
          data-active={currentTool === 'pen' ? 'true' : undefined}
          onClick={() => setTool('pen')}
          title="Pen"
          aria-label="Pen"
        >
          <IconPencil size={18} stroke={1.8} />
        </button>
        <button
          type="button"
          className="tsdraw-toolbar-btn"
          data-active={currentTool === 'eraser' ? 'true' : undefined}
          onClick={() => setTool('eraser')}
          title="Eraser"
          aria-label="Eraser"
        >
          <IconEraser size={18} stroke={1.8} />
        </button>
      </div>
    </div>
  );
}

import { createRoot } from 'react-dom/client';
import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import { Tsdraw, type TsdrawCustomTool, type TsdrawCustomElement } from '@tsdraw/react';
import { DEFAULT_COLORS, type ColorStyle, type DashStyle, type SizeStyle } from '@tsdraw/core';
import Confetti from 'react-confetti-boom';
import { IconStar, IconStarFilled, IconMoodSmile } from '@tabler/icons-react';
import { wavyToolDefinition } from './wavyTool.js';
import { emojiToolDefinition } from './emojiTool.js';
import './App.css';

// This is a custom tool which we can easily add to the toolbar using the 'tools' prop
// Go to wavyTool.ts to see how its built using custom logic
const wavyTool: TsdrawCustomTool = {
  id: 'wavy',
  label: 'Wavy',
  icon: <IconStar size={16} />,
  iconSelected: <IconStarFilled size={16} />,
  definition: wavyToolDefinition,
  showStylePanel: true,
};

const emojiTool: TsdrawCustomTool = {
  id: 'emoji',
  label: 'Emoji',
  icon: <IconMoodSmile size={16} />,
  definition: emojiToolDefinition,
  showStylePanel: true,
};

// These constants and functions are needed for the custom elements
const drawColors: ColorStyle[] = Object.keys(DEFAULT_COLORS).filter((colorKey) => colorKey !== 'white');
const drawDashes: DashStyle[] = ['draw', 'solid', 'dashed', 'dotted'];
const drawSizes: SizeStyle[] = ['s', 'm', 'l', 'xl'];
const emojiOptions = ['🐝', '🐓', '🦍', '🦧', '😭', '💔', '🛂', '🎻'];
const defaultEmoji = emojiOptions[0]!;

function pickRandomStyle<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)]!;
}

function triggerConfetti() {
  const container = document.createElement('div');
  container.style.inset = '0';
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(<Confetti mode="boom" particleCount={100} shapeSize={15} spreadDeg={70} />);
}

function EmojiPickerPanel({
  currentTool,
  editorRef,
  selectedEmojiRef,
}: {
  currentTool: string;
  editorRef: MutableRefObject<any>;
  selectedEmojiRef: MutableRefObject<string>;
}) {
  const [selectedEmoji, setSelectedEmoji] = useState(selectedEmojiRef.current);

  const handleEmojiSelect = useCallback((nextEmoji: string) => {
    selectedEmojiRef.current = nextEmoji;
    if (editorRef.current) { editorRef.current.selectedEmoji = nextEmoji; }
    setSelectedEmoji(nextEmoji);
  }, [editorRef, selectedEmojiRef]);

  if (currentTool !== 'emoji') return null;

  return (
    // When possible, try using tsdraw-style-panel and the tsdraw css classes if you want your elements to match the tsdraw ui.
    // Eventually you will be able to add tsdraw ui elements as customizable components.
    <div className="tsdraw-style-panel" style={{ position: 'relative' }}>
      <div className="tsdraw-style-colors">
        {emojiOptions.map((emoji) => (
          <button
            key={emoji}
            className="tsdraw-style-color"
            data-active={selectedEmoji === emoji}
            onClick={() => handleEmojiSelect(emoji)}
            style={{ fontSize: '20px' }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export function App() {
  // Below are two custom elements that can be added to the Tsdraw ui using the 'customElements' prop
  // The second one shows that you can actually edit properties of the Tsdraw instance.
  // You can use applyDrawStyle and setTool (check packages/tsdraw-react/src/components/TsdrawCanvas.tsx)

  const editorRef = useRef<any>(null);
  const selectedEmojiRef = useRef(defaultEmoji);

  const confettiButton: TsdrawCustomElement = {
    id: 'confetti-btn',
    placement: { anchor: 'top-left', offsetX: 18, offsetY: 18 },
    render: () => <button className="custom-btn" onClick={triggerConfetti}>more confetti!</button>,
  };

  const randomStyleButton: TsdrawCustomElement = {
    id: 'higher-stroke-btn',
    placement: { anchor: 'bottom-right', offsetX: 18, offsetY: 18 },
    render: ({ applyDrawStyle }) => (
      <button
        className="custom-btn"
        onClick={() =>
          applyDrawStyle({
            color: pickRandomStyle(drawColors),
            dash: pickRandomStyle(drawDashes),
            size: pickRandomStyle(drawSizes),
          })}
      >
        randomize all draw styles!
      </button>
    ),
  };

  const emojiPicker: TsdrawCustomElement = {
    id: 'emoji-picker',
    placement: { anchor: 'top-right', offsetX: 179.5, offsetY: 18 },
    render: ({ currentTool }) => <EmojiPickerPanel currentTool={currentTool} editorRef={editorRef} selectedEmojiRef={selectedEmojiRef} />
  };

  const handleMount = useCallback((api: any) => {
    triggerConfetti();

    editorRef.current = api.editor;
    editorRef.current.selectedEmoji = selectedEmojiRef.current;

    const renderer = editorRef.current.renderer as any;
    if (renderer.__emojiBrushPatched) return;

    const originalPaintStroke = renderer.paintStroke.bind(renderer);
    renderer.__emojiBrushPatched = true;

    // Custom rendering to display emoji paint strokes
    renderer.paintStroke = (ctx: CanvasRenderingContext2D, shape: any) => {
      if (shape.props && shape.props.emoji) {
        const { emoji, emojiSize } = shape.props;
        ctx.save();
        ctx.font = `${emojiSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, shape.x, shape.y);
        ctx.restore();
        return;
      }

      originalPaintStroke(ctx, shape);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tsdraw
        width="100%"
        height="100%"
        theme="light"
        persistenceKey="ts-demo"
        tools={['select', 'hand', 'pen', 'eraser', wavyTool, emojiTool]}
        initialToolId="pen"
        uiOptions={{
          toolbar: { // top-left, bottom-center, center-right, left-center, ... (it can be any valid anchor)
            placement: { anchor: 'top-center', offsetX: 0, offsetY: 18 },
          },
          stylePanel: {
            placement: { anchor: 'top-right', offsetX: 18, offsetY: 18 },
          },
          customElements: [confettiButton, randomStyleButton, emojiPicker],
        }}
        onMount={handleMount}
      />
    </div>
  );
}
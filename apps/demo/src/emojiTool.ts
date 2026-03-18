import {
  type ToolDefinition,
  type ToolPointerDownInfo,
  StateNode,
  type Vec3,
  encodePoints,
} from '@tsdraw/core';

// This is a more complex tool to show that you can basically build any tool you might need
// Make sure when making a custom tool (which doesn't use the pen), you create a custom shape type which can be erased

// Depending on the size selected, the emoji's size changes
function getEmojiSize(sizeStyle: string): number {
  switch (sizeStyle) {
    case 's': return 12;
    case 'm': return 24;
    case 'l': return 48;
    case 'xl': return 80;
    default: return 24;
  }
}

// Same with emoji spacing
function getEmojiSpacing(sizeStyle: string, dashStyle: string): number {
  const baseSize = getEmojiSize(sizeStyle);
  switch (dashStyle) {
    case 'draw':
    case 'solid':
      return Math.max(2, baseSize * 0.22);
    case 'dashed':
      return Math.max(6, baseSize * 0.5);
    case 'dotted':
      return Math.max(10, baseSize * 0.8);
    default:
      return Math.max(2, baseSize * 0.22);
  }
}

// Build a hit path for emojis so they can be erased
function buildEmojiHitPath(emojiSize: number): string {
  const radius = emojiSize / 2;
  const rowCount = Math.max(4, Math.ceil(emojiSize / 10));
  const hitPoints: Vec3[] = [];

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const rowProgress = rowCount === 1 ? 0.5 : rowIndex / (rowCount - 1);
    const y = -radius + rowProgress * emojiSize;
    const startX = rowIndex % 2 === 0 ? -radius : radius;
    const endX = rowIndex % 2 === 0 ? radius : -radius;

    hitPoints.push({ x: startX, y, z: 0.5 });
    hitPoints.push({ x: endX, y, z: 0.5 });
  }

  return encodePoints(hitPoints);
}

export class EmojiIdleState extends StateNode {
  static override id = 'emoji_idle';

  override onPointerDown(info?: ToolPointerDownInfo): void {
    this.ctx.transition(EmojiDrawingState.id, info);
  }
}

export class EmojiDrawingState extends StateNode {
  static override id = 'emoji_drawing';

  private lastPosition: Vec3 | null = null;

  override onEnter(_info?: ToolPointerDownInfo): void {
    this.lastPosition = null;
    this.placeEmoji();
  }

  override onPointerMove(): void {
    this.placeEmoji();
  }

  private placeEmoji(): void {
    const current = this.editor.input.getCurrentPagePoint();
    const drawStyle = this.editor.getCurrentDrawStyle();
    const emojiSize = getEmojiSize(drawStyle.size);
    
    if (this.lastPosition) {
      const dx = current.x - this.lastPosition.x;
      const dy = current.y - this.lastPosition.y;
      const distance = Math.hypot(dx, dy);

      // Use dash/size styles to affect how emojis are drawn
      const spacingDistance = getEmojiSpacing(drawStyle.size, drawStyle.dash);
      if (distance < spacingDistance) return;
    }

    const emoji = (this.editor as any).selectedEmoji || '🐝';
    const hitPath = buildEmojiHitPath(emojiSize);

    this.editor.createShape({
      id: this.editor.createShapeId(),
      type: 'draw', // Draw type so the emojis are recognized by the store and renderer
      x: current.x,
      y: current.y,
      props: {
        // Custom prop overrides for renderer monkey-patching so eraser detects emojis
        emoji,
        emojiSize,
        color: drawStyle.color,
        dash: drawStyle.dash,
        size: drawStyle.size,
        scale: 1,
        isPen: false,
        isComplete: true,
        segments: [{ type: 'free', path: hitPath }],
      },
    } as any);

    this.lastPosition = current;
  }

  override onPointerUp(): void {
    this.ctx.transition(EmojiIdleState.id);
  }

  override onCancel(): void {
    this.ctx.transition(EmojiIdleState.id);
  }
}

export const emojiToolDefinition: ToolDefinition = {
  id: 'emoji',
  initialStateId: EmojiIdleState.id,
  stateConstructors: [EmojiIdleState, EmojiDrawingState],
};
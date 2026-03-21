import type { Viewport } from './viewport.js';

const VELOCITY_LERP_FACTOR = 0.5; // How much to blend new velocity into the current velocity (linear interpolation)
const VELOCITY_ZERO_THRESHOLD = 0.01; // The velocity is considered zero if it's less than this threshold

export interface CameraPanSession {
  initialViewportX: number;
  initialViewportY: number;
  originScreenX: number;
  originScreenY: number;
  velocityX: number;
  velocityY: number;
  previousScreenX: number;
  previousScreenY: number;
  lastMoveTime: number;
}

export function beginCameraPan(
  viewport: Viewport,
  screenX: number,
  screenY: number
): CameraPanSession {
  return {
    initialViewportX: viewport.x,
    initialViewportY: viewport.y,
    originScreenX: screenX,
    originScreenY: screenY,
    velocityX: 0,
    velocityY: 0,
    previousScreenX: screenX,
    previousScreenY: screenY,
    lastMoveTime: performance.now(),
  };
}

// Calculates target viewport position from session origin and updates session velocity
export function moveCameraPan(
  session: CameraPanSession,
  currentScreenX: number,
  currentScreenY: number
): { x: number; y: number } {
  const now = performance.now();
  const elapsed = now - session.lastMoveTime;

  if (elapsed > 0) {
    const moveDx = currentScreenX - session.previousScreenX;
    const moveDy = currentScreenY - session.previousScreenY;
    const moveLen = Math.hypot(moveDx, moveDy);

    if (moveLen > 0) {
      const dirX = moveDx / moveLen;
      const dirY = moveDy / moveLen;
      const speed = moveLen / elapsed;
      session.velocityX += (dirX * speed - session.velocityX) * VELOCITY_LERP_FACTOR;
      session.velocityY += (dirY * speed - session.velocityY) * VELOCITY_LERP_FACTOR;
    }

    if (Math.abs(session.velocityX) < VELOCITY_ZERO_THRESHOLD) session.velocityX = 0;
    if (Math.abs(session.velocityY) < VELOCITY_ZERO_THRESHOLD) session.velocityY = 0;
  }

  session.previousScreenX = currentScreenX;
  session.previousScreenY = currentScreenY;
  session.lastMoveTime = now;

  return {
    x: session.initialViewportX + (currentScreenX - session.originScreenX),
    y: session.initialViewportY + (currentScreenY - session.originScreenY),
  };
}

const SLIDE_FRICTION = 0.92;
const SLIDE_MIN_SPEED = 0.01;
const SLIDE_MAX_SPEED = 2;
const SLIDE_MIN_VELOCITY_TO_START = 0.1;

export interface CameraSlideAnimation {
  stop: () => void;
}

// Start a camera slide animation from the given session and apply the pan to the viewport
export function startCameraSlide(
  session: CameraPanSession,
  applyPan: (dx: number, dy: number) => void,
  onFrame: () => void
): CameraSlideAnimation | null {
  const timeSinceLastMove = performance.now() - session.lastMoveTime; // time since the last move
  const FRAME_DURATION = 16; // duration of an animation frame
  const decayFactor = Math.pow(1 - VELOCITY_LERP_FACTOR, timeSinceLastMove / FRAME_DURATION); // used to decay the velocity over time so slide is smoother at the end
  const effectiveVx = session.velocityX * decayFactor;
  const effectiveVy = session.velocityY * decayFactor;

  const speed = Math.hypot(effectiveVx, effectiveVy);
  const clampedSpeed = Math.min(speed, SLIDE_MAX_SPEED);
  if (clampedSpeed < SLIDE_MIN_VELOCITY_TO_START) return null;

  const dirX = effectiveVx / speed;
  const dirY = effectiveVy / speed;
  let currentSpeed = clampedSpeed;
  let lastTime = performance.now();
  let rafId = 0;

  const tick = () => {
    const now = performance.now();
    const elapsed = now - lastTime;
    lastTime = now;

    applyPan(dirX * currentSpeed * elapsed, dirY * currentSpeed * elapsed);
    onFrame();

    currentSpeed *= SLIDE_FRICTION;

    if (currentSpeed < SLIDE_MIN_SPEED) {
      rafId = 0;
      return;
    }

    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);

  return {
    stop() {
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    },
  };
}
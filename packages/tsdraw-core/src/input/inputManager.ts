import type { Vec3 } from '../types.js';

// Normalized pointer input (page space, with pressure)
export interface PointerInput {
  currentPagePoint: Vec3;
  originPagePoint: Vec3;
  previousPagePoint: Vec3;
  isPen: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
  isDragging: boolean;
}

// Input manager: captures pointer events and gives page-space coords + modifiers
export class InputManager {
  private _current: Vec3 = { x: 0, y: 0 };
  private _origin: Vec3 = { x: 0, y: 0 }; // Where pointer_down occured
  private _previous: Vec3 = { x: 0, y: 0 }; // Where pointer was before most recent update
  private _isPen = false; // Whether input is from a stylus
  private _shiftKey = false; // Whether shift is pressed
  private _ctrlKey = false; // Whether ctrl is pressed
  private _metaKey = false; // Whether meta is pressed
  private _isDragging = false; // Whether pointer is dragging

  getCurrentPagePoint(): Vec3 { return { ...this._current }; }
  getOriginPagePoint(): Vec3 { return { ...this._origin }; }
  getPreviousPagePoint(): Vec3 { return { ...this._previous }; }

  getIsPen(): boolean { return this._isPen; }

  getShiftKey(): boolean { return this._shiftKey; }
  getCtrlKey(): boolean { return this._ctrlKey; }
  getAccelKey(): boolean { return this._ctrlKey || this._metaKey; }

  getIsDragging(): boolean { return this._isDragging; }

  pointerDown(pageX: number, pageY: number, pressure?: number, isPen?: boolean): void {
    this._origin = { x: pageX, y: pageY, z: pressure ?? 0.5 };
    this._current = { ...this._origin };
    this._previous = { ...this._origin };
    this._isDragging = false;
    if (isPen !== undefined) this._isPen = isPen;
  }

  pointerMove(pageX: number, pageY: number, pressure?: number, isPen?: boolean): void {
    this._previous = { ...this._current };
    this._current = { x: pageX, y: pageY, z: pressure ?? this._current.z ?? 0.5 };
    this._isPen = isPen ?? this._isPen;
    if (this._origin.x !== this._current.x || this._origin.y !== this._current.y) {
      this._isDragging = true;
    }
  }

  pointerUp(): void {
    // Keep current. caller can reset if needed
  }

  setModifiers(shift: boolean, ctrl: boolean, meta?: boolean): void {
    this._shiftKey = shift;
    this._ctrlKey = ctrl;
    this._metaKey = meta ?? ctrl;
  }

  getInputs(): PointerInput {
    return {
      currentPagePoint: this.getCurrentPagePoint(),
      originPagePoint: this.getOriginPagePoint(),
      previousPagePoint: this.getPreviousPagePoint(),
      isPen: this._isPen,
      shiftKey: this._shiftKey,
      ctrlKey: this._ctrlKey,
      isDragging: this._isDragging,
    };
  }
}

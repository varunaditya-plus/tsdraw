import { describe, it, expect } from 'vitest';
import { encodePoints, decodePoints, decodeFirstPoint, decodeLastPoint, decodePathToPoints } from './pathCodec.js';

describe('pathCodec', () => {
  it('encodePoints and decodePoints roundtrip', () => {
    const points = [
      { x: 0, y: 0, z: 0.5 },
      { x: 10, y: 20, z: 0.8 },
    ];
    const path = encodePoints(points);
    expect(typeof path).toBe('string');
    const decoded = decodePoints(path);
    expect(decoded).toHaveLength(2);
    expect(decoded[0]?.x).toBe(0);
    expect(decoded[0]?.y).toBe(0);
    expect(decoded[1]?.x).toBe(10);
    expect(decoded[1]?.y).toBe(20);
  });
  it('decodeFirstPoint and decodeLastPoint', () => {
    const path = encodePoints([{ x: 1, y: 2 }, { x: 3, y: 4 }]);
    expect(decodeFirstPoint(path)?.x).toBe(1);
    expect(decodeLastPoint(path)?.x).toBe(3);
  });
  it('decodePathToPoints with offset', () => {
    const segments = [{ path: encodePoints([{ x: 1, y: 2 }]) }];
    const pts = decodePathToPoints(segments, 10, 20);
    expect(pts).toHaveLength(1);
    expect(pts[0]?.x).toBe(11);
    expect(pts[0]?.y).toBe(22);
  });
});

import { describe, expect, it } from 'vitest';
import {
  colliderFromCenter,
  isBlockedAt,
  pointInCollider,
} from './collision';

describe('collision', () => {
  const lowCover = colliderFromCenter(0, 0, 2, 2, 0.8);
  const highWall = colliderFromCenter(5, 0, 2, 2, 4);

  it('detects points inside and outside an obstacle', () => {
    expect(pointInCollider(lowCover, 0, 0)).toBe(true);
    expect(pointInCollider(lowCover, 1.4, 0)).toBe(false);
  });

  it('blocks walking through high obstacles', () => {
    expect(isBlockedAt([highWall], 5, 0, 0)).toBe(true);
    expect(isBlockedAt([highWall], 5, 0, 1.2)).toBe(true);
  });

  it('allows jumping over low cover when high enough', () => {
    expect(isBlockedAt([lowCover], 0, 0, 0)).toBe(true);
    expect(isBlockedAt([lowCover], 0, 0, 0.5)).toBe(true);
    expect(isBlockedAt([lowCover], 0, 0, 0.9)).toBe(false);
  });

  it('does not block open ground', () => {
    expect(isBlockedAt([lowCover, highWall], 20, 20, 0)).toBe(false);
  });
});

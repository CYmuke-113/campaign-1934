import { describe, expect, it } from 'vitest';
import { BattleStats } from './BattleStats';

describe('BattleStats', () => {
  it('tracks shots, hits, kills and deaths', () => {
    const stats = new BattleStats();
    stats.recordShot();
    stats.recordShot();
    stats.recordShot();
    stats.recordHit();
    stats.recordKill();
    stats.recordKill();
    stats.recordDeath();

    expect(stats.shots).toBe(3);
    expect(stats.hits).toBe(1);
    expect(stats.kills).toBe(2);
    expect(stats.deaths).toBe(1);
    expect(stats.accuracy).toBe(33);
  });

  it('returns zero accuracy when no shots were fired', () => {
    expect(new BattleStats().accuracy).toBe(0);
  });

  it('returns a serialisable data object', () => {
    const stats = new BattleStats();
    stats.recordShot();
    stats.recordHit();
    stats.finish();
    const data = stats.toData();
    expect(data.shots).toBe(1);
    expect(data.hits).toBe(1);
    expect(data.durationSec).toBeGreaterThanOrEqual(0);
  });
});

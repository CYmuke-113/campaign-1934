import type { BattleStatsData } from './types';

export class BattleStats {
  shots = 0;
  hits = 0;
  kills = 0;
  deaths = 0;
  private startedAt = Date.now();
  private endedAt: number | null = null;

  recordShot(): void {
    this.shots += 1;
  }

  recordHit(): void {
    this.hits += 1;
  }

  recordKill(): void {
    this.kills += 1;
  }

  recordDeath(): void {
    this.deaths += 1;
  }

  finish(): void {
    if (this.endedAt === null) {
      this.endedAt = Date.now();
    }
  }

  get accuracy(): number {
    if (this.shots === 0) return 0;
    return Math.round((this.hits / this.shots) * 100);
  }

  get durationSec(): number {
    const end = this.endedAt ?? Date.now();
    return Math.max(0, Math.round((end - this.startedAt) / 1000));
  }

  toData(): BattleStatsData {
    return {
      shots: this.shots,
      hits: this.hits,
      kills: this.kills,
      deaths: this.deaths,
      durationSec: this.durationSec,
    };
  }
}

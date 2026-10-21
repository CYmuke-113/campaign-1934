export type AppState =
  | 'intro'
  | 'overview'
  | 'battle-loading'
  | 'battle'
  | 'pause'
  | 'result'
  | 'error';

export interface BattleSummary {
  kills: number;
  deaths: number;
  accuracy: number;
  durationSec: number;
  shots: number;
  hits: number;
}

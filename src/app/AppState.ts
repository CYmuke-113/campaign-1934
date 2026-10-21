export type AppState =
  | 'intro'
  | 'overview'
  | 'battle-loading'
  | 'battle'
  | 'pause'
  | 'quiz'
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

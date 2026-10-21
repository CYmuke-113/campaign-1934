import type { PhaseConfig } from '../battle/core/types';

export const PHASES: PhaseConfig[] = [
  {
    id: 'phase_1',
    name: '奔袭桥头',
    durationSec: 45,
    narrationId: 'narration_phase_01',
    red: { initial: 20, reinforcements: 0, reinforcementIntervalSec: 0, maxAlive: 22 },
    kmt: { initial: 12, reinforcements: 0, accuracy: 0.1, fireRate: 0.6, retreatAtEnd: false },
    objectives: ['观察对岸', '等待进攻命令'],
    endCondition: 'timer',
  },
  {
    id: 'phase_2',
    name: '第一波突击受挫',
    durationSec: 100,
    narrationId: 'narration_phase_02',
    red: { initial: 22, reinforcements: 2, reinforcementIntervalSec: 30, maxAlive: 26 },
    kmt: { initial: 12, reinforcements: 1, accuracy: 0.28, fireRate: 1.0, retreatAtEnd: false },
    objectives: ['沿铁索推进', '压制对岸火力'],
    endCondition: 'timer',
  },
  {
    id: 'phase_3',
    name: '第二波突击',
    durationSec: 100,
    narrationId: 'narration_phase_03',
    red: { initial: 24, reinforcements: 4, reinforcementIntervalSec: 20, maxAlive: 26 },
    kmt: { initial: 10, reinforcements: 1, accuracy: 0.2, fireRate: 0.8, retreatAtEnd: false },
    objectives: ['推进到桥中段', '掩护后续铺板'],
    endCondition: 'timer',
  },
  {
    id: 'phase_4',
    name: '夺取桥头堡',
    durationSec: 70,
    narrationId: 'narration_phase_04',
    red: { initial: 26, reinforcements: 2, reinforcementIntervalSec: 15, maxAlive: 26 },
    kmt: { initial: 10, reinforcements: 0, accuracy: 0.12, fireRate: 0.5, retreatAtEnd: true },
    objectives: ['夺取桥头堡', '等待胜利结算'],
    endCondition: 'kmtRetreat',
  },
];

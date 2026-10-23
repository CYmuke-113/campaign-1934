export const MACHINE_GUN_COUNT = 3;
export const MACHINE_GUN_DAMAGE = 20;
export const MACHINE_GUN_FIRE_INTERVAL_SECONDS = 0.06;

export interface AutomaticFireStep {
  shots: number;
  timer: number;
}

export function advanceAutomaticFire(timer: number, dt: number): AutomaticFireStep {
  let nextTimer = Math.max(0, timer) - Math.max(0, dt);
  let shots = 0;
  while (nextTimer <= 0) {
    shots += 1;
    nextTimer += MACHINE_GUN_FIRE_INTERVAL_SECONDS;
  }
  return { shots, timer: nextTimer };
}

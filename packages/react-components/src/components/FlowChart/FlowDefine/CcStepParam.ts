import type { StepType } from './FlowStep';

export class CCStepParam {
  public readonly type: StepType = 'CC';
  public readonly read: boolean = false;
}

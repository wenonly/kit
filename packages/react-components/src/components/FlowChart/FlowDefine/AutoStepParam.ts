import type { StepType } from './FlowStep';

export type AutoActionTypes = 'ADD' | 'INVOKE' | 'UPDATE';
export type AutoActionTargetType = 'CONSTANT' | 'FIELD';

export class AutoStepParam {
  public readonly type: StepType = 'AUTO';
  public target: string | string[] = '';
  public targetType: AutoActionTargetType = 'FIELD';
  public autoType: AutoActionTypes = 'ADD';
  public updateParams?: string;
}

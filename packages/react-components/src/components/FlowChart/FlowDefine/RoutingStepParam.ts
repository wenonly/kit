import type { StepType } from './FlowStep';
import type { RoutingRule } from './RoutingRule';

export type RuleConditionOperationTypes =
  | 'NOTEQUAL'
  | 'EQUAL'
  | 'GT'
  | 'GTE'
  | 'LT'
  | 'LTE'
  | 'IN'
  | 'NOT_IN'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'NOT_EQUAL'
  | 'EXISTS'
  | 'NOT_EXISTS'
  | 'LIKE';

export class RoutingStepParam {
  public readonly type: StepType = 'ROUTING';
  public from: string = '';
  public to: string = '';
  public rules: {
    items: RoutingRule[];
  }[] = [];
}

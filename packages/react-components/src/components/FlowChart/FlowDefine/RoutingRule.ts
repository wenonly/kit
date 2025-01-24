import { v4 as uuidv4 } from 'uuid';
import type { RuleConditionOperationTypes } from './RoutingStepParam';

export class RoutingRule {
  public id = uuidv4();
  public fieldName: string = '';
  public operation?: RuleConditionOperationTypes;
  public value?: string = '';
  public dataType?: 'List';
  public sourceType?: 'BASE' | 'SCALE' | 'SCALE_RESULT' | 'QUESTIONNAIRE' | 'REPORT';
  public sourceProcessId?: string;
  public sourceStepCode?: string;
  public sourceBusinessId?: string;
  public sourceFolderCode?: string;
}

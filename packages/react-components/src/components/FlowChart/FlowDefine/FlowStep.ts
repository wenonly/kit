import { v4 as uuidv4 } from 'uuid';
import type { AutoStepParam, RoutingStepParam } from '.';
import type { AuditStepParam } from './AuditStepParam';
import type { CCStepParam } from './CcStepParam';
import type { FormPrivilege } from './FormPrivilege';
import type { StepExecutor } from './StepExecutor';
import type { StepTimeout } from './StepTimeout';

export type StepType =
  | 'SUBMIT'
  | 'AUDIT'
  | 'ACTION'
  | 'CC'
  | 'AUTO'
  | 'ROUTING'
  | 'FORK'
  | 'JOIN'
  | 'END';

export class FlowStep {
  public code: string = uuidv4();
  public executor?: StepExecutor[];
  public formPrivilege?: FormPrivilege;
  public id?: string;
  public name: string = '';
  public params?: RoutingStepParam | AuditStepParam | AutoStepParam | CCStepParam;
  public processId?: number;
  public site = '';
  public timeout?: StepTimeout;
  public type?: StepType;
  public shownOperationLog?: boolean;
  public enableRevocation?: boolean;
}

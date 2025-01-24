import type { StepType } from './FlowStep';

export type AuditTypes = 'AND' | 'OR';
export type RollbackType = 'LAST' | 'ALL' | 'CUSTOM';

export class AuditStepParam {
  public readonly type: StepType = 'AUDIT';
  public auditType: AuditTypes = 'AND';
  public auditCallback?: {
    rollbackType: RollbackType;
    customSteps?: string[];
  };
}

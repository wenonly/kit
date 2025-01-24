import type { MemberType } from './types';

export type PrivilegeType = MemberType | 'FIELD' | 'SUBMITTER' | 'ANONYMOUS' | 'PROCESS';

export class StepExecutor {
  public source: string = '';
  public type: PrivilegeType = 'USER';
  public name: string = '';
}

export type MemberType =
  | 'USER'
  | 'ROLE'
  | 'DEPT'
  | 'ALL'
  | 'FIELD'
  | 'SUBMITTER'
  | 'DEPT_MAG_FIELD'
  | 'DEPT_FIELD'
  | 'USER_FIELD'
  | 'ADV_DEPT';

export type PrivilegeType = MemberType | 'FIELD' | 'SUBMITTER' | 'ANONYMOUS' | 'PROCESS';

export class StepExecutor {
  public source: string = '';
  public type: PrivilegeType = 'USER';
  public name: string = '';
}

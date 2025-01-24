import type { FieldPrivilege } from './FieldPrivilege';

export type Privilege = 'EDIT' | 'VIEW' | 'HIDDEN';

export class FormPrivilege {
  public global?: Privilege;
  public form?: FieldPrivilege[] = [];
}

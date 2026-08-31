/** 后端角色编码（与 schema.sql 一致） */
export const HR_ROLE = {
  DEPT_MANAGER: 'DEPT_MANAGER',
  EMPLOYEE: 'EMPLOYEE',
  HR_ADMIN: 'HR_ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type HrRoleCode = (typeof HR_ROLE)[keyof typeof HR_ROLE];

/** 全部角色 */
export const ROLE_ALL: HrRoleCode[] = [
  HR_ROLE.SUPER_ADMIN,
  HR_ROLE.HR_ADMIN,
  HR_ROLE.DEPT_MANAGER,
  HR_ROLE.EMPLOYEE,
];

/** 仅超级管理员（系统字典等） */
export const ROLE_SUPER_ADMIN: HrRoleCode[] = [HR_ROLE.SUPER_ADMIN];

/** HR 管理员及以上（组织 + 薪资） */
export const ROLE_HR_STAFF: HrRoleCode[] = [
  HR_ROLE.SUPER_ADMIN,
  HR_ROLE.HR_ADMIN,
];

/** 经理及以上（员工管理） */
export const ROLE_MANAGER_UP: HrRoleCode[] = [
  HR_ROLE.SUPER_ADMIN,
  HR_ROLE.HR_ADMIN,
  HR_ROLE.DEPT_MANAGER,
];

/** 角色中文名 */
export const ROLE_NAME_MAP: Record<string, string> = {
  [HR_ROLE.SUPER_ADMIN]: '超级管理员',
  [HR_ROLE.HR_ADMIN]: 'HR管理员',
  [HR_ROLE.DEPT_MANAGER]: '部门经理',
  [HR_ROLE.EMPLOYEE]: '普通员工',
};

/** 判断当前用户是否拥有任一允许角色 */
export function hasAnyRole(
  userRoles: string[] | undefined,
  allowed: string[],
): boolean {
  if (allowed.length === 0) {
    return true;
  }
  if (!userRoles?.length) {
    return false;
  }
  return userRoles.some((role) => allowed.includes(role));
}

/** 判断是否拥有任一能力码（feat.* / page:*） */
export function hasAccessCode(
  codes: string[] | undefined,
  required: string | string[],
): boolean {
  if (!codes?.length) {
    return false;
  }
  const list = Array.isArray(required) ? required : [required];
  return list.some((code) => codes.includes(code));
}

/** 仅超级管理员（无 HR / 经理 / 员工等业务角色） */
export function isPureSuperAdmin(userRoles: string[] | undefined): boolean {
  if (!userRoles?.includes(HR_ROLE.SUPER_ADMIN)) {
    return false;
  }
  return !hasAnyRole(userRoles, [
    HR_ROLE.HR_ADMIN,
    HR_ROLE.DEPT_MANAGER,
    HR_ROLE.EMPLOYEE,
  ]);
}

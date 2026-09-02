import { computed } from 'vue';

import { useAccessStore, useUserStore } from '@vben/stores';

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

/** 无 page/feat 字典时的角色回退（与 V16 种子能力大致对齐） */
const FEAT_ROLE_FALLBACK: Record<string, HrRoleCode[]> = {
  'feat.attendance.approve': ROLE_HR_STAFF,
  'feat.attendance.self': ROLE_ALL,
  'feat.audit.view': ROLE_HR_STAFF,
  'feat.document.self': ROLE_ALL,
  'feat.employee.manage': ROLE_MANAGER_UP,
  'feat.leave.approve': ROLE_MANAGER_UP,
  'feat.leave.apply': ROLE_ALL,
  'feat.leave.balance.manage': ROLE_HR_STAFF,
  'feat.org.manage': ROLE_HR_STAFF,
  'feat.performance.score': ROLE_MANAGER_UP,
  'feat.performance.view': ROLE_ALL,
  'feat.personnel.approve': ROLE_MANAGER_UP,
  'feat.personnel.apply': ROLE_ALL,
  'feat.project.join': ROLE_ALL,
  'feat.project.manage': ROLE_MANAGER_UP,
  'feat.salary.manage': ROLE_HR_STAFF,
  'feat.salary.self': ROLE_ALL,
  'feat.stats.view': ROLE_HR_STAFF,
  'feat.task.create': ROLE_MANAGER_UP,
  'feat.task.execute': ROLE_ALL,
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

/** 统一 HR 权限：优先 feat/page 字典，无字典时回退角色 */
export function useHrAccess() {
  const accessStore = useAccessStore();
  const userStore = useUserStore();

  const accessCodes = computed(() => accessStore.accessCodes ?? []);
  const userRoles = computed(() => userStore.userInfo?.roles ?? []);

  function canFeat(required: string | string[]) {
    if (accessCodes.value.length > 0) {
      return hasAccessCode(accessCodes.value, required);
    }
    const codes = Array.isArray(required) ? required : [required];
    return codes.some((code) => {
      const fallback = FEAT_ROLE_FALLBACK[code];
      return fallback ? hasAnyRole(userRoles.value, fallback) : false;
    });
  }

  function canPage(path: string) {
    if (accessCodes.value.length > 0) {
      return accessCodes.value.includes(`page:${path}`);
    }
    return true;
  }

  return { accessCodes, canFeat, canPage, userRoles };
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

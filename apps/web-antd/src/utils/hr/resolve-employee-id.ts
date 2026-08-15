import type { EmployeeVO } from '#/api/hr';

import { useUserStore } from '@vben/stores';

import { fetchAllEmployees } from '#/api/hr';
import { hasAnyRole, ROLE_MANAGER_UP } from '#/views/hr/roles';

/** 解析当前用户关联的员工 ID（人脸录入 / 个人中心用） */
export async function resolveMyEmployeeId(): Promise<number | undefined> {
  const userStore = useUserStore();
  const roles = userStore.userInfo?.roles ?? [];
  const list = await fetchAllEmployees();

  if (list.length === 1) {
    return list[0].id;
  }

  const realName = userStore.userInfo?.realName;
  if (realName) {
    const matched = list.find((item) => item.name === realName);
    if (matched) {
      return matched.id;
    }
  }

  if (!hasAnyRole(roles, ROLE_MANAGER_UP) && list.length > 0) {
    return list[0].id;
  }

  return undefined;
}

export function findEmployeeOptionLabel(
  employees: EmployeeVO[],
  employeeId?: number,
) {
  if (!employeeId) {
    return '';
  }
  const target = employees.find((item) => item.id === employeeId);
  return target ? `${target.name}（${target.empNo}）` : String(employeeId);
}

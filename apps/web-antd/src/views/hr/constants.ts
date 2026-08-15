/** 通用启用/禁用 */
export const COMMON_STATUS: Record<number, string> = {
  0: '禁用',
  1: '启用',
};

/** 员工性别 */
export const GENDER_MAP: Record<number, string> = {
  1: '男',
  2: '女',
};

/** 用工类型 */
export const EMPLOYMENT_TYPE_MAP: Record<number, string> = {
  1: '全职',
  2: '兼职',
  3: '实习',
};

/** 员工状态 */
export const EMPLOYEE_STATUS_MAP: Record<number, string> = {
  1: '在职',
  2: '试用期',
  3: '离职',
};

/** 岗位职级 */
export const POSITION_LEVEL_MAP: Record<number, string> = {
  1: '普通',
  2: '主管',
  3: '经理',
  4: '总监',
};

/** 考勤状态 */
export const ATTENDANCE_STATUS_MAP: Record<number, string> = {
  1: '正常',
  2: '迟到',
  3: '早退',
  4: '缺勤',
  5: '请假',
};

/** 请假申请状态 */
export const LEAVE_REQUEST_STATUS_MAP: Record<number, string> = {
  0: '待审批',
  1: '已通过',
  2: '已拒绝',
  3: '已撤销',
};

/** 薪资状态 */
export const SALARY_STATUS_MAP: Record<number, string> = {
  0: '待发放',
  1: '已发放',
};

/** 任务整体状态 */
export const TASK_STATUS_MAP: Record<number, string> = {
  0: '待接收',
  1: '进行中',
  2: '已完成',
  3: '已关闭',
};

/** 任务执行人状态 */
export const TASK_ASSIGNEE_STATUS_MAP: Record<number, string> = {
  0: '待接收',
  1: '进行中',
  2: '已完成',
  3: '已驳回',
  4: '已关闭',
};

/** 任务优先级 */
export const TASK_PRIORITY_MAP: Record<number, string> = {
  1: '低',
  2: '中',
  3: '高',
};

export function flattenDepartments<T extends { children?: T[] }>(
  tree: T[],
): T[] {
  const result: T[] = [];
  const walk = (nodes: T[]) => {
    nodes.forEach((node) => {
      result.push(node);
      if (node.children?.length) {
        walk(node.children);
      }
    });
  };
  walk(tree);
  return result;
}

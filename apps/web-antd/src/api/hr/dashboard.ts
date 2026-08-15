import { requestClient } from '#/api/request';

export interface DashboardVO {
  /** 年份 */
  year: number;
  /** 月份 */
  month: number;
  /** 当月天数 */
  totalDays: number;
  /** 考勤日历 dayStatus */
  dayStatus: number[];
  /** 打卡天数 */
  punchDays: number;
  /** 正常天数 */
  normalCount: number;
  /** 迟到天数 */
  lateCount: number;
  /** 在职员工总数 */
  totalEmployees: number;
  /** 本月新入职员工数 */
  newHiresThisMonth: number;
  /** 待审批事项数 */
  pendingApprovals: number;
  /** 部门人数分布 */
  departmentDistribution: Record<string, number>;
  /** 当前用户所在部门人数（团队） */
  teamCount?: number;
  /** 项目数（预留） */
  projectCount?: number;
}

/** 考勤月历组件使用的类型别名 */
export type DashboardCalendar = DashboardVO;

export interface DashboardStats {
  departmentCount: number;
  employeeCount: number;
  onJobCount: number;
  pendingLeaveCount: number;
  pendingLeaves: Array<{
    days: number;
    employeeName?: string;
    endTime: string;
    id: number;
    leaveType?: string;
    reason: string;
    startTime: string;
  }>;
  pendingSalaryCount: number;
  todayAttendanceCount: number;
  todayLateCount: number;
  todayNormalCount: number;
  /** 本月新入职 */
  newHiresThisMonth: number;
  /** 部门分布 */
  departmentDistribution: Record<string, number>;
  /** 本部门在职人数 */
  teamCount: number;
  /** 项目数（预留） */
  projectCount: number;
}

const EMPTY_STATS: DashboardStats = {
  departmentCount: 0,
  employeeCount: 0,
  onJobCount: 0,
  pendingLeaveCount: 0,
  pendingLeaves: [],
  pendingSalaryCount: 0,
  todayAttendanceCount: 0,
  todayLateCount: 0,
  todayNormalCount: 0,
  newHiresThisMonth: 0,
  departmentDistribution: {},
  teamCount: 0,
  projectCount: 0,
};

/** 获取仪表盘完整数据（后端聚合） */
export async function getDashboardCalendar(yearMonth?: string) {
  return requestClient.get<DashboardVO>('/dashboard/calendar', {
    params: yearMonth ? { yearMonth } : undefined,
  });
}

export interface HrStatsVO {
  attendanceAbnormal: Record<string, number>;
  attendanceAbnormalCount: number;
  departmentDistribution: Record<string, number>;
  projectCompletionRate: number;
  projectDoneCount: number;
  projectTotalCount: number;
  salaryPaidCount: number;
  salaryPendingCount: number;
  salaryTotalAmount: number;
  taskCompletionRate: number;
  taskDoneCount: number;
  taskTotalCount: number;
  totalEmployees: number;
  yearMonth: string;
}

export async function getHrStats(yearMonth?: string) {
  return requestClient.get<HrStatsVO>('/dashboard/hr-stats', {
    params: yearMonth ? { yearMonth } : undefined,
  });
}

/**
 * 获取工作台统计（简化版，用于管理员）
 * 直接使用后端 /dashboard/calendar 返回的汇总数据
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const data = await getDashboardCalendar();
    return {
      employeeCount: data.totalEmployees,
      onJobCount: data.totalEmployees,
      departmentCount: Object.keys(data.departmentDistribution || {}).length,
      pendingLeaveCount: data.pendingApprovals,
      pendingLeaves: [],
      pendingSalaryCount: 0,
      todayAttendanceCount: data.punchDays,
      todayLateCount: data.lateCount,
      todayNormalCount: data.normalCount,
      newHiresThisMonth: data.newHiresThisMonth,
      departmentDistribution: data.departmentDistribution,
      teamCount: data.teamCount ?? 0,
      projectCount: data.projectCount ?? 0,
    };
  } catch {
    return { ...EMPTY_STATS };
  }
}

export { EMPTY_STATS };

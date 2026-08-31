/** 分页查询参数 */
export interface PageQuery {
  pageNum?: number;
  pageSize?: number;
}

/** 与后端 PageQuery @Max(100) 一致 */
export const MAX_PAGE_SIZE = 100;

/** 分页响应 */
export interface PageResult<T> {
  records: T[];
  total: number;
  pageNum: number;
  pageSize: number;
  pages: number;
}

export interface DepartmentVO {
  children?: DepartmentVO[];
  deptCode: string;
  deptName: string;
  id: number;
  parentId: number;
  sortOrder?: number;
  status: number;
}

export interface PositionVO {
  deptId: number;
  deptName?: string;
  id: number;
  level: number;
  positionCode: string;
  positionName: string;
  status: number;
}

export interface EmployeeCreateParams {
  deptId: number;
  email?: string;
  empNo: string;
  employmentType?: number;
  gender?: number;
  hireDate: string;
  name: string;
  password: string;
  phone?: string;
  positionId: number;
  roleCode?: string;
  status?: number;
  username?: string;
}

export interface EmployeeUpdateParams {
  deptId?: number;
  email?: string;
  employmentType?: number;
  gender?: number;
  name?: string;
  /** 仅超级管理员可传，用于重置登录密码 */
  password?: string;
  phone?: string;
  positionId?: number;
  status?: number;
}

export interface EmployeeVO {
  avatar?: string;
  deptId: number;
  deptName?: string;
  email?: string;
  empNo: string;
  employmentType?: number;
  gender?: number;
  hireDate: string;
  id: number;
  idCard?: string;
  name: string;
  phone?: string;
  positionId: number;
  positionName?: string;
  probationEnd?: string;
  remark?: string;
  status: number;
}

export interface AttendanceVO {
  attendDate: string;
  checkIn?: string;
  checkOut?: string;
  empNo?: string;
  employeeId: number;
  employeeName?: string;
  id: number;
  remark?: string;
  status: number;
  workHours?: number;
}

export interface LeaveTypeVO {
  id: number;
  maxDays?: null | number;
  status: number;
  typeCode: string;
  typeName: string;
}

export interface LeaveRequestVO {
  days: number;
  employeeName?: string;
  endTime: string;
  id: number;
  leaveType?: string;
  reason: string;
  startTime: string;
  status: number;
}

export interface LeaveBalanceVO {
  employeeId: number;
  employeeName?: string;
  id: number;
  leaveTypeCode?: string;
  leaveTypeId: number;
  leaveTypeName?: string;
  pendingDays: number;
  quotaDays: number;
  remainingDays: number;
  usedDays: number;
  year: number;
}

export interface SalaryVO {
  actualSalary: number;
  baseSalary: number;
  bonus?: number;
  deduction?: number;
  empNo?: string;
  employeeId: number;
  employeeName?: string;
  id: number;
  payDate?: string;
  positionId?: number;
  positionName?: string;
  remark?: string;
  salaryMonth: string;
  status: number;
  taskBonus?: number;
}

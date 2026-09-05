import type {
  EmployeeCreateParams,
  EmployeeUpdateParams,
  EmployeeVO,
  PageQuery,
  PageResult,
} from './types';

import { requestClient } from '#/api/request';

import { MAX_PAGE_SIZE } from './types';

export async function getEmployees(
  params?: PageQuery & {
    deptId?: number;
    keyword?: string;
    status?: number;
  },
) {
  return requestClient.get<PageResult<EmployeeVO>>('/employees', { params });
}

/** 分页拉取全部员工（每页不超过后端上限 100） */
export async function fetchAllEmployees(): Promise<EmployeeVO[]> {
  const all: EmployeeVO[] = [];
  let pageNum = 1;

  while (true) {
    const result = await getEmployees({ pageNum, pageSize: MAX_PAGE_SIZE });
    const records = result.records ?? [];
    all.push(...records);
    if (all.length >= result.total || records.length < MAX_PAGE_SIZE) {
      break;
    }
    pageNum++;
  }

  return all;
}

export async function getEmployeeById(id: number) {
  return requestClient.get<EmployeeVO>(`/employees/${id}`);
}

export async function createEmployee(data: EmployeeCreateParams) {
  return requestClient.post('/employees', data);
}

export async function updateEmployee(id: number, data: EmployeeUpdateParams) {
  return requestClient.put(`/employees/${id}`, data);
}

export async function deleteEmployee(id: number) {
  return requestClient.delete(`/employees/${id}`);
}

export async function uploadEmployeeAvatar(id: number, file: File) {
  return requestClient.upload<string>(`/employees/${id}/avatar`, { file });
}

/** 立即执行试用期到期提醒（HR/超管） */
export async function runProbationRemind() {
  return requestClient.post<{ sent: number }>(
    '/employees/probation-remind/run',
  );
}

export async function exportEmployeesExcel(params?: {
  deptId?: number;
  keyword?: string;
  status?: number;
}) {
  return requestClient.download<Blob>('/employees/export', { params });
}

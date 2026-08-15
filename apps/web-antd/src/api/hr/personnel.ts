import type { PageQuery, PageResult } from './types';

import { requestClient } from '#/api/request';

export interface PersonnelChangeVO {
  applicantId?: number;
  applicantName?: string;
  approveRemark?: string;
  approvedAt?: string;
  approverId?: number;
  approverName?: string;
  changeType: number;
  changeTypeLabel?: string;
  contractDocCount?: number;
  createdAt?: string;
  effectiveDate?: string;
  effectedAt?: string;
  empNo?: string;
  employeeId: number;
  employeeName?: string;
  fromDeptId?: number;
  fromDeptName?: string;
  fromPositionId?: number;
  fromPositionName?: string;
  id: number;
  newSalary?: number;
  oldSalary?: number;
  reason?: string;
  status: number;
  statusLabel?: string;
  toDeptId?: number;
  toDeptName?: string;
  toPositionId?: number;
  toPositionName?: string;
}

export async function getPersonnelChanges(
  params?: PageQuery & {
    changeType?: number;
    employeeId?: number;
    status?: number;
  },
) {
  return requestClient.get<PageResult<PersonnelChangeVO>>(
    '/personnel-changes',
    { params },
  );
}

export async function createPersonnelChange(data: {
  changeType: number;
  effectiveDate?: string;
  employeeId: number;
  newSalary?: number;
  reason?: string;
  toDeptId?: number;
  toPositionId?: number;
}) {
  return requestClient.post<number>('/personnel-changes', data);
}

export async function approvePersonnelChange(
  id: number,
  data: { approveRemark?: string; approved: boolean },
) {
  return requestClient.post(`/personnel-changes/${id}/approve`, data);
}

export async function cancelPersonnelChange(id: number) {
  return requestClient.post(`/personnel-changes/${id}/cancel`);
}

export async function effectPersonnelChange(id: number) {
  return requestClient.post(`/personnel-changes/${id}/effect`);
}

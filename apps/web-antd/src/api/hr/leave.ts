import type {
  LeaveBalanceVO,
  LeaveRequestVO,
  LeaveTypeVO,
  PageQuery,
  PageResult,
} from './types';

import { requestClient } from '#/api/request';

export async function getLeaveTypes() {
  return requestClient.get<LeaveTypeVO[]>('/leave/types');
}

export async function createLeaveType(data: {
  maxDays?: null | number;
  status?: number;
  typeCode: string;
  typeName: string;
}) {
  return requestClient.post('/leave/types', data);
}

export async function updateLeaveType(
  id: number,
  data: {
    maxDays?: null | number;
    status?: number;
    typeCode: string;
    typeName: string;
  },
) {
  return requestClient.put(`/leave/types/${id}`, data);
}

export async function deleteLeaveType(id: number) {
  return requestClient.delete(`/leave/types/${id}`);
}

export async function getLeaveRequests(params?: PageQuery) {
  return requestClient.get<PageResult<LeaveRequestVO>>('/leave/requests', {
    params,
  });
}

export async function getLeaveRequestById(id: number) {
  return requestClient.get<LeaveRequestVO>(`/leave/requests/${id}`);
}

export async function createLeaveRequest(data: {
  days: number;
  endTime: string;
  leaveTypeId: number;
  reason: string;
  startTime: string;
}) {
  return requestClient.post('/leave/requests', data);
}

export async function approveLeaveRequest(id: number, approveRemark?: string) {
  return requestClient.put(`/leave/requests/${id}/approve`, {
    approveRemark,
  });
}

export async function rejectLeaveRequest(id: number, approveRemark?: string) {
  return requestClient.put(`/leave/requests/${id}/reject`, {
    approveRemark,
  });
}

export async function cancelLeaveRequest(id: number, approveRemark?: string) {
  return requestClient.put(`/leave/requests/${id}/cancel`, {
    approveRemark,
  });
}

export async function getMyLeaveBalances(year?: number) {
  return requestClient.get<LeaveBalanceVO[]>('/leave/balances/mine', {
    params: year !== undefined && year !== null ? { year } : undefined,
  });
}

export async function getLeaveBalances(params?: {
  employeeId?: number;
  year?: number;
}) {
  return requestClient.get<LeaveBalanceVO[]>('/leave/balances', { params });
}

export async function initLeaveBalances(data: {
  overwriteQuota: boolean;
  year?: number;
}) {
  return requestClient.post('/leave/balances/init', data);
}

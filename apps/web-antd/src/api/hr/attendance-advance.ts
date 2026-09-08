import type { PageQuery, PageResult } from './types';

import { requestClient } from '#/api/request';

export interface OvertimeRequestVO {
  approveRemark?: string;
  approveTime?: string;
  employeeId: number;
  employeeName?: string;
  endTime: string;
  hours: number;
  id: number;
  reason: string;
  startTime: string;
  status: number;
  workDate: string;
}

export interface AttendanceAppealVO {
  approveRemark?: string;
  approveTime?: string;
  attendDate: string;
  attendanceId?: number;
  checkIn?: string;
  checkOut?: string;
  employeeId: number;
  employeeName?: string;
  fromStatus?: number;
  id: number;
  reason: string;
  status: number;
  toStatus: number;
}

export interface FieldWorkRequestVO {
  approveRemark?: string;
  approveTime?: string;
  employeeId: number;
  employeeName?: string;
  id: number;
  location: string;
  reason: string;
  status: number;
  workDate: string;
}

export async function getOvertimeRequests(
  params?: PageQuery & {
    dateFrom?: string;
    dateTo?: string;
    status?: number;
  },
) {
  return requestClient.get<PageResult<OvertimeRequestVO>>(
    '/attendance/overtime/requests',
    { params },
  );
}

export async function createOvertimeRequest(data: {
  endTime: string;
  hours: number;
  reason: string;
  startTime: string;
  workDate: string;
}) {
  return requestClient.post('/attendance/overtime/requests', data);
}

export async function approveOvertimeRequest(
  id: number,
  approveRemark?: string,
) {
  return requestClient.put(`/attendance/overtime/requests/${id}/approve`, {
    approveRemark,
  });
}

export async function rejectOvertimeRequest(
  id: number,
  approveRemark?: string,
) {
  return requestClient.put(`/attendance/overtime/requests/${id}/reject`, {
    approveRemark,
  });
}

export async function cancelOvertimeRequest(id: number) {
  return requestClient.put(`/attendance/overtime/requests/${id}/cancel`);
}

export async function getAppealRequests(
  params?: PageQuery & {
    dateFrom?: string;
    dateTo?: string;
    status?: number;
  },
) {
  return requestClient.get<PageResult<AttendanceAppealVO>>(
    '/attendance/appeals',
    { params },
  );
}

export async function createAppealRequest(data: {
  attendanceId?: number;
  attendDate: string;
  checkIn?: string;
  checkOut?: string;
  fromStatus?: number;
  reason: string;
  toStatus: number;
}) {
  return requestClient.post('/attendance/appeals', data);
}

export async function approveAppealRequest(id: number, approveRemark?: string) {
  return requestClient.put(`/attendance/appeals/${id}/approve`, {
    approveRemark,
  });
}

export async function rejectAppealRequest(id: number, approveRemark?: string) {
  return requestClient.put(`/attendance/appeals/${id}/reject`, {
    approveRemark,
  });
}

export async function cancelAppealRequest(id: number) {
  return requestClient.put(`/attendance/appeals/${id}/cancel`);
}

export async function getFieldWorkRequests(
  params?: PageQuery & {
    dateFrom?: string;
    dateTo?: string;
    status?: number;
  },
) {
  return requestClient.get<PageResult<FieldWorkRequestVO>>(
    '/attendance/field-work/requests',
    { params },
  );
}

export async function createFieldWorkRequest(data: {
  location: string;
  reason: string;
  workDate: string;
}) {
  return requestClient.post('/attendance/field-work/requests', data);
}

export async function approveFieldWorkRequest(
  id: number,
  approveRemark?: string,
) {
  return requestClient.put(`/attendance/field-work/requests/${id}/approve`, {
    approveRemark,
  });
}

export async function rejectFieldWorkRequest(
  id: number,
  approveRemark?: string,
) {
  return requestClient.put(`/attendance/field-work/requests/${id}/reject`, {
    approveRemark,
  });
}

export async function cancelFieldWorkRequest(id: number) {
  return requestClient.put(`/attendance/field-work/requests/${id}/cancel`);
}

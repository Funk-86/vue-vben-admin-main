import type { AttendanceVO, PageQuery, PageResult } from './types';

import { requestClient } from '#/api/request';

export async function checkIn(employeeId?: number) {
  return requestClient.post(
    '/attendance/check-in',
    employeeId === undefined ? {} : { employeeId },
  );
}

export async function checkOut(employeeId?: number) {
  return requestClient.post(
    '/attendance/check-out',
    employeeId === undefined ? {} : { employeeId },
  );
}

export async function getAttendanceList(params?: PageQuery) {
  return requestClient.get<PageResult<AttendanceVO>>('/attendance', { params });
}

export async function exportAttendanceExcel() {
  return requestClient.download<Blob>('/attendance/export');
}

export async function getAttendanceById(id: number) {
  return requestClient.get<AttendanceVO>(`/attendance/${id}`);
}

export async function createAttendance(data: Partial<AttendanceVO>) {
  return requestClient.post('/attendance', data);
}

export async function updateAttendance(id: number, data: Partial<AttendanceVO>) {
  return requestClient.put(`/attendance/${id}`, data);
}

export async function deleteAttendance(id: number) {
  return requestClient.delete(`/attendance/${id}`);
}

export async function checkInByFace(
  descriptor: number[],
  employeeId?: number,
) {
  return requestClient.post(
    '/attendance/check-in/face',
    employeeId === undefined ? { descriptor } : { descriptor, employeeId },
  );
}

export async function checkOutByFace(
  descriptor: number[],
  employeeId?: number,
) {
  return requestClient.post(
    '/attendance/check-out/face',
    employeeId === undefined ? { descriptor } : { descriptor, employeeId },
  );
}

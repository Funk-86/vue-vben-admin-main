import type { DepartmentVO } from './types';

import { requestClient } from '#/api/request';

export async function getDepartmentTree() {
  return requestClient.get<DepartmentVO[]>('/departments');
}

export async function getDepartmentById(id: number) {
  return requestClient.get<DepartmentVO>(`/departments/${id}`);
}

export async function createDepartment(data: {
  deptCode: string;
  deptName: string;
  leaderId?: number;
  parentId: number;
  sortOrder?: number;
  status?: number;
}) {
  return requestClient.post('/departments', data);
}

export async function updateDepartment(
  id: number,
  data: {
    deptName: string;
    leaderId?: number;
    sortOrder?: number;
    status?: number;
  },
) {
  return requestClient.put(`/departments/${id}`, data);
}

export async function deleteDepartment(id: number) {
  return requestClient.delete(`/departments/${id}`);
}

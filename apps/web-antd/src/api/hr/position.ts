import type { PositionVO } from './types';

import { requestClient } from '#/api/request';

export async function getPositionsByDept(deptId: number) {
  return requestClient.get<PositionVO[]>('/positions', {
    params: { deptId },
  });
}

export async function getPositionById(id: number) {
  return requestClient.get<PositionVO>(`/positions/${id}`);
}

export async function createPosition(data: {
  deptId: number;
  level?: number;
  positionCode: string;
  positionName: string;
  status?: number;
}) {
  return requestClient.post('/positions', data);
}

export async function updatePosition(
  id: number,
  data: {
    deptId: number;
    level?: number;
    positionName: string;
    status?: number;
  },
) {
  return requestClient.put(`/positions/${id}`, data);
}

export async function deletePosition(id: number) {
  return requestClient.delete(`/positions/${id}`);
}

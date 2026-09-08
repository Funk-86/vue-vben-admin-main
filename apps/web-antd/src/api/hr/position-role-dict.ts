import { requestClient } from '#/api/request';

export interface PositionRoleDictVO {
  id: number;
  positionId: number;
  positionName?: string;
  positionCode?: string;
  roleCode: string;
  status: number;
  remark?: string;
}

export async function getPositionRoleDictList() {
  return requestClient.get<PositionRoleDictVO[]>('/dict/position-role');
}

export async function createPositionRoleDict(data: {
  positionId: number;
  remark?: string;
  roleCode: string;
  status?: number;
}) {
  return requestClient.post('/dict/position-role', data);
}

export async function updatePositionRoleDict(
  id: number,
  data: {
    positionId: number;
    remark?: string;
    roleCode: string;
    status?: number;
  },
) {
  return requestClient.put(`/dict/position-role/${id}`, data);
}

export async function deletePositionRoleDict(id: number) {
  return requestClient.delete(`/dict/position-role/${id}`);
}

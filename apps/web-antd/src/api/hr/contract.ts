import type { PageResult } from '#/api/hr/types';

import { requestClient } from '#/api/request';

export interface HrContractVO {
  id: number;
  contractNo: string;
  employeeId: number;
  contractType: number;
  startDate: string;
  endDate?: string;
  signDate?: string;
  status: string;
  remark?: string;
}

export function pageContracts(params: any) {
  return requestClient.get<PageResult<HrContractVO>>('/contracts', { params });
}
export function createContract(data: any) {
  return requestClient.post<number>('/contracts', data);
}
export function renewContract(id: number, data: any) {
  return requestClient.post(`/contracts/${id}/renew`, data);
}

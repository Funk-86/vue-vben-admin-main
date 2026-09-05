import type { PageQuery, PageResult } from './types';

import { requestClient } from '#/api/request';

export interface OperationLogVO {
  createdAt?: string;
  duration?: number;
  errorMsg?: string;
  id: number;
  ip?: string;
  method?: string;
  module?: string;
  operation?: string;
  /** 短摘要；详情中 requestInfo 为空时可作为回退 */
  params?: string;
  requestInfo?: string;
  responseInfo?: string;
  status?: number;
  userId?: number;
  username?: string;
}

export async function getOperationLogs(
  params?: PageQuery & {
    endTime?: string;
    module?: string;
    startTime?: string;
    status?: number;
    userId?: number;
  },
) {
  return requestClient.get<PageResult<OperationLogVO>>('/operation-logs', {
    params,
  });
}

export async function getOperationLogDetail(id: number) {
  return requestClient.get<OperationLogVO>(`/operation-logs/${id}`);
}

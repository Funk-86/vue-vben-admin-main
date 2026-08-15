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
  params?: string;
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

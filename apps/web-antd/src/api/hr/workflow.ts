import type { PageResult } from '#/api/hr/types';

import { requestClient } from '#/api/request';

export interface WfTodoVO {
  taskId: number;
  bizType: string;
  bizId: number;
  nodeSeq: number;
  nodeCode: string;
  status: number;
  title: string;
  link: string;
  applicantName?: string;
  createdAt?: string;
  actedAt?: string;
  remark?: string;
}

export function getWorkflowTodos(params: {
  bizType?: string;
  pageNum?: number;
  pageSize?: number;
  scope?: string;
}) {
  return requestClient.get<PageResult<WfTodoVO>>('/workflow/todos', { params });
}

export function workflowAction(
  bizType: string,
  bizId: number,
  data: { approved: boolean; remark?: string },
) {
  return requestClient.post(`/workflow/${bizType}/${bizId}/action`, data);
}

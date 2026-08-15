import type { PageQuery, PageResult } from './types';

import { requestClient } from '#/api/request';

export interface PerformanceReviewVO {
  comment?: string;
  confirmedAt?: string;
  createdAt?: string;
  deptId?: number;
  deptName?: string;
  empNo?: string;
  employeeId: number;
  employeeName?: string;
  id: number;
  periodKey: string;
  periodType: number;
  reviewerId?: number;
  reviewerName?: string;
  scoreGrade?: number;
  scoreGradeLabel?: string;
  status?: number;
  statusLabel?: string;
  taskAvgGrade?: number;
  taskDoneCount?: number;
  taskTotalCount?: number;
  updatedAt?: string;
}

export interface PerformanceTaskHintVO {
  employeeId: number;
  periodKey: string;
  periodType: number;
  scoredCount?: number;
  taskAvgGrade?: number;
  taskDoneCount?: number;
  taskTotalCount?: number;
}

export async function getPerformanceReviews(
  params?: PageQuery & {
    deptId?: number;
    employeeId?: number;
    periodKey?: string;
    periodType?: number;
    status?: number;
  },
) {
  return requestClient.get<PageResult<PerformanceReviewVO>>('/performance', {
    params,
  });
}

export async function getPerformanceDetail(id: number) {
  return requestClient.get<PerformanceReviewVO>(`/performance/${id}`);
}

export async function getEmployeePerformance(
  employeeId: number,
  limit?: number,
) {
  return requestClient.get<PerformanceReviewVO[]>(
    `/performance/employee/${employeeId}`,
    { params: { limit } },
  );
}

export async function getPerformanceTaskHint(params: {
  employeeId: number;
  periodKey: string;
  periodType: number;
}) {
  return requestClient.get<PerformanceTaskHintVO>('/performance/task-hint', {
    params,
  });
}

export async function createPerformance(data: {
  comment?: string;
  employeeId: number;
  periodKey: string;
  periodType: number;
  scoreGrade: number;
  submit?: boolean;
}) {
  return requestClient.post<number>('/performance', data);
}

export async function updatePerformance(
  id: number,
  data: {
    comment?: string;
    employeeId: number;
    periodKey: string;
    periodType: number;
    scoreGrade: number;
    submit?: boolean;
  },
) {
  return requestClient.put(`/performance/${id}`, data);
}

export async function submitPerformance(id: number) {
  return requestClient.post(`/performance/${id}/submit`);
}

export async function confirmPerformance(id: number) {
  return requestClient.post(`/performance/${id}/confirm`);
}

export async function deletePerformance(id: number) {
  return requestClient.delete(`/performance/${id}`);
}

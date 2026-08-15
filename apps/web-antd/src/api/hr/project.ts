import type { PageQuery, PageResult } from './types';
import type { TaskVO } from './task';

import { requestClient } from '#/api/request';

export interface ProjectVO {
  createdAt?: string;
  deptId?: number;
  deptName?: string;
  description?: string;
  endDate?: string;
  id: number;
  memberIds?: number[];
  memberNames?: string[];
  name: string;
  ownerId?: number;
  ownerName?: string;
  progress?: number;
  progressLocked?: boolean;
  startDate?: string;
  status?: number;
  taskCount?: number;
}

export async function getProjects(
  params?: PageQuery & { scope?: string; status?: number },
) {
  return requestClient.get<PageResult<ProjectVO>>('/projects', { params });
}

export async function getProjectDetail(id: number) {
  return requestClient.get<ProjectVO>(`/projects/${id}`);
}

export async function getProjectTasks(id: number) {
  return requestClient.get<TaskVO[]>(`/projects/${id}/tasks`);
}

export async function createProject(data: {
  description?: string;
  endDate?: string;
  memberIds?: number[];
  name: string;
  ownerId?: number;
  startDate?: string;
  status?: number;
}) {
  return requestClient.post<number>('/projects', data);
}

export async function updateProject(
  id: number,
  data: {
    description?: string;
    endDate?: string;
    memberIds?: number[];
    name: string;
    ownerId?: number;
    startDate?: string;
    status?: number;
  },
) {
  return requestClient.put(`/projects/${id}`, data);
}

export async function updateProjectProgress(
  id: number,
  data: { locked?: boolean; progress: number },
) {
  return requestClient.put(`/projects/${id}/progress`, data);
}

export async function closeProject(id: number) {
  return requestClient.post(`/projects/${id}/close`);
}

import type { PageQuery, PageResult } from './types';

import { requestClient } from '#/api/request';

export interface TaskVO {
  content?: string;
  creatorId?: number;
  creatorName?: string;
  dueTime?: string;
  hasChildren?: boolean;
  id: number;
  myProgress?: number;
  myStatus?: number;
  overdue?: boolean;
  parentId?: number;
  priority?: number;
  /** 任务整体进度（有子任务时为子任务均值）0-100 */
  progress?: number;
  projectId?: number;
  startTime?: string;
  status?: number;
  title: string;
}

export interface TaskAssigneeVO {
  acceptTime?: string;
  employeeId: number;
  employeeName?: string;
  feedback?: string;
  finishTime?: string;
  progress?: number;
  scoreBonus?: number;
  scoreGrade?: number;
  scoreGradeLabel?: string;
  scoredAt?: string;
  scoredBy?: number;
  scoredByName?: string;
  status?: number;
}

export interface TaskLogVO {
  action?: string;
  createdAt?: string;
  operatorId?: number;
  operatorName?: string;
  remark?: string;
}

export interface TaskAttachmentVO {
  contentType?: string;
  createdAt?: string;
  fileName: string;
  fileSize?: number;
  id: number;
  taskId?: number;
  uploaderId?: number;
  uploaderName?: string;
  url?: string;
}

export interface TaskDetailVO extends TaskVO {
  assignees?: TaskAssigneeVO[];
  attachments?: TaskAttachmentVO[];
  children?: TaskVO[];
  logs?: TaskLogVO[];
  parentId?: number;
  projectId?: number;
}

export interface TaskTodoStatsVO {
  overdueCount: number;
  todoCount: number;
}

export interface TaskBoardVO {
  closed: TaskVO[];
  done: TaskVO[];
  inProgress: TaskVO[];
  pending: TaskVO[];
}

export async function getTasks(params?: PageQuery & { scope?: string; status?: number }) {
  return requestClient.get<PageResult<TaskVO>>('/tasks', { params });
}

export async function getTaskDetail(id: number) {
  return requestClient.get<TaskDetailVO>(`/tasks/${id}`);
}

export async function createTask(data: {
  assigneeIds: number[];
  content?: string;
  dueTime?: string;
  parentId?: number;
  priority?: number;
  projectId?: number;
  startTime?: string;
  title: string;
}) {
  return requestClient.post('/tasks', data);
}

export async function acceptTask(id: number) {
  return requestClient.post(`/tasks/${id}/accept`);
}

export async function updateTaskProgress(
  id: number,
  data: { feedback?: string; progress: number },
) {
  return requestClient.post<TaskDetailVO>(`/tasks/${id}/progress`, data);
}

export async function rejectTask(id: number, reason: string) {
  return requestClient.post(`/tasks/${id}/reject`, { reason });
}

export async function closeTask(id: number) {
  return requestClient.post(`/tasks/${id}/close`);
}

export async function urgeTask(id: number) {
  return requestClient.post(`/tasks/${id}/urge`);
}

/** 对已完成执行人五级评分（写入奖金） */
export async function scoreTaskAssignee(
  taskId: number,
  employeeId: number,
  grade: number,
) {
  return requestClient.post(`/tasks/${taskId}/assignees/${employeeId}/score`, {
    grade,
  });
}

export async function getMyTodoTasks() {
  return requestClient.get<TaskVO[]>('/tasks/my/todo');
}

export async function getMyOverdueTasks() {
  return requestClient.get<TaskVO[]>('/tasks/my/overdue');
}

export async function getMyTaskStats() {
  return requestClient.get<TaskTodoStatsVO>('/tasks/my/stats');
}

export async function getTaskBoard(scope: 'created' | 'mine' = 'mine') {
  return requestClient.get<TaskBoardVO>('/tasks/board', { params: { scope } });
}

/** 手动触发逾期提醒（HR/超管演示补跑） */
export async function runTaskOverdueRemind() {
  return requestClient.post<{ sent: number }>('/tasks/overdue-remind/run');
}

export async function getTaskAttachments(taskId: number) {
  return requestClient.get<TaskAttachmentVO[]>(`/tasks/${taskId}/attachments`);
}

export async function uploadTaskAttachment(taskId: number, file: File) {
  return requestClient.upload<TaskAttachmentVO>(`/tasks/${taskId}/attachments`, {
    file,
  });
}

export async function deleteTaskAttachment(taskId: number, attachmentId: number) {
  return requestClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`);
}

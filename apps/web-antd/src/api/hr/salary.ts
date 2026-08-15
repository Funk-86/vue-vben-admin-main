import type { PageQuery, PageResult, SalaryVO } from './types';

import { requestClient } from '#/api/request';

export interface SalaryPreviewVO {
  actualSalary: number;
  baseSalary: number;
  bonus: number;
  deduction: number;
  empNo?: string;
  employeeId: number;
  employeeName?: string;
  positionId?: number;
  positionName?: string;
  salaryMonth: string;
  taskBonus: number;
  tip?: string;
}

export interface SalaryBaseDictVO {
  baseSalary: number;
  id: number;
  positionId: number;
  positionName?: string;
  remark?: string;
  status: number;
}

export interface TaskScoreBonusDictVO {
  bonusAmount: number;
  grade: number;
  gradeLabel: string;
  id: number;
  status: number;
}

export async function getSalaryList(params?: PageQuery) {
  return requestClient.get<PageResult<SalaryVO>>('/salary', { params });
}

export async function getSalaryById(id: number) {
  return requestClient.get<SalaryVO>(`/salary/${id}`);
}

export async function previewSalary(data: {
  employeeId: number;
  salaryMonth: string;
}) {
  return requestClient.post<SalaryPreviewVO>('/salary/preview', data);
}

export async function createSalary(data: {
  baseSalary: number;
  bonus?: number;
  deduction?: number;
  employeeId: number;
  positionId?: number;
  remark?: string;
  salaryMonth: string;
  taskBonus?: number;
}) {
  return requestClient.post('/salary', data);
}

export async function updateSalary(
  id: number,
  data: {
    baseSalary: number;
    bonus?: number;
    deduction?: number;
    employeeId: number;
    remark?: string;
    salaryMonth: string;
  },
) {
  return requestClient.put(`/salary/${id}`, data);
}

export async function paySalary(id: number, payDate?: string) {
  return requestClient.put(
    `/salary/${id}/pay`,
    {},
    {
      params: payDate ? { payDate } : undefined,
    },
  );
}

export async function deleteSalary(id: number) {
  return requestClient.delete(`/salary/${id}`);
}

export async function getSalaryBaseDictList() {
  return requestClient.get<SalaryBaseDictVO[]>('/salary/base-dict');
}

export async function createSalaryBaseDict(data: {
  baseSalary: number;
  positionId: number;
  remark?: string;
  status?: number;
}) {
  return requestClient.post('/salary/base-dict', data);
}

export async function updateSalaryBaseDict(
  id: number,
  data: {
    baseSalary: number;
    positionId: number;
    remark?: string;
    status?: number;
  },
) {
  return requestClient.put(`/salary/base-dict/${id}`, data);
}

export async function deleteSalaryBaseDict(id: number) {
  return requestClient.delete(`/salary/base-dict/${id}`);
}

export async function getScoreBonusDictList() {
  return requestClient.get<TaskScoreBonusDictVO[]>('/salary/score-bonus-dict');
}

export async function createScoreBonusDict(data: {
  bonusAmount: number;
  grade: number;
  gradeLabel: string;
  status?: number;
}) {
  return requestClient.post('/salary/score-bonus-dict', data);
}

export async function updateScoreBonusDict(
  id: number,
  data: {
    bonusAmount: number;
    grade: number;
    gradeLabel: string;
    status?: number;
  },
) {
  return requestClient.put(`/salary/score-bonus-dict/${id}`, data);
}

export async function deleteScoreBonusDict(id: number) {
  return requestClient.delete(`/salary/score-bonus-dict/${id}`);
}

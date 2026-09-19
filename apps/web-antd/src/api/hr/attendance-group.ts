import { requestClient } from '#/api/request';

export function listShifts() {
  return requestClient.get('/attendance-groups/shifts');
}
export function listGroups() {
  return requestClient.get('/attendance-groups');
}
export function createGroup(data: any) {
  return requestClient.post('/attendance-groups', data);
}
export function updateGroup(id: number, data: any) {
  return requestClient.put(`/attendance-groups/${id}`, data);
}
export function setMembers(id: number, employeeIds: number[]) {
  return requestClient.put(`/attendance-groups/${id}/members`, employeeIds);
}
export function listMembers(id: number) {
  return requestClient.get<number[]>(`/attendance-groups/${id}/members`);
}
export function listSchedules(id: number, from: string, to: string) {
  return requestClient.get(`/attendance-groups/${id}/schedules`, {
    params: { from, to },
  });
}
export function generateSchedules(id: number, year: number, month: number) {
  return requestClient.post(`/attendance-groups/${id}/schedules/generate`, {
    year,
    month,
  });
}

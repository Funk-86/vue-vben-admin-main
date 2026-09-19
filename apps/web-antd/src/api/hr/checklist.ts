import { requestClient } from '#/api/request';

export function listChecklistInstances(employeeId: number, scene?: string) {
  return requestClient.get('/checklists/instances', {
    params: { employeeId, scene },
  });
}
export function startChecklist(employeeId: number, scene: string) {
  return requestClient.post('/checklists/start', { employeeId, scene });
}
export function completeChecklistItem(id: number) {
  return requestClient.post(`/checklists/instances/${id}/complete`);
}

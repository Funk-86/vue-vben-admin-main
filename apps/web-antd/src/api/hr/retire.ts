import { requestClient } from '#/api/request';

export function listRetireRecords(employeeId?: number) {
  return requestClient.get('/retire/records', { params: { employeeId } });
}
export function createRetire(data: any) {
  return requestClient.post('/retire/records', data);
}
export function effectRetire(id: number) {
  return requestClient.post(`/retire/records/${id}/effect`);
}
export function listPensionGrades() {
  return requestClient.get('/retire/pension-grades');
}
export function listPensionPayments(employeeId?: number) {
  return requestClient.get('/retire/pension-payments', {
    params: { employeeId },
  });
}
export function generatePensionPayments(payMonth: string) {
  return requestClient.post('/retire/pension-payments/generate', { payMonth });
}

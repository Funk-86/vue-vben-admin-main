import { requestClient } from '#/api/request';

export interface HolidayVO {
  id: number;
  holidayDate: string;
  name: string;
  holidayType: string;
  year: number;
  remark?: string;
}

export function getHolidays(year?: number) {
  return requestClient.get<HolidayVO[]>('/holidays', { params: { year } });
}
export function createHoliday(data: Partial<HolidayVO>) {
  return requestClient.post<number>('/holidays', data);
}
export function updateHoliday(id: number, data: Partial<HolidayVO>) {
  return requestClient.put(`/holidays/${id}`, data);
}
export function deleteHoliday(id: number) {
  return requestClient.delete(`/holidays/${id}`);
}

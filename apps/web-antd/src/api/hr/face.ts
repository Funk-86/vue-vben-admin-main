import { requestClient } from '#/api/request';

export interface FaceStatusVO {
  enrolled: boolean;
  enrolledAt?: string;
  modelVersion?: string;
}

export async function enrollFace(
  employeeId: number,
  descriptor: number[],
  sampleCount?: number,
) {
  return requestClient.post(`/people/${employeeId}/face/enroll`, {
    descriptor,
    sampleCount,
  });
}

export async function getFaceStatus(employeeId: number) {
  return requestClient.get<FaceStatusVO>(`/people/${employeeId}/face/status`);
}

import type { PageQuery, PageResult } from './types';

import { requestClient } from '#/api/request';

export interface EmployeeDocumentVO {
  contentType?: string;
  createdAt?: string;
  deptId?: number;
  deptName?: string;
  docType: number;
  docTypeLabel?: string;
  effectiveDate?: string;
  employeeId: number;
  employeeName?: string;
  empNo?: string;
  expireDate?: string;
  expiringSoon?: boolean;
  fileName: string;
  fileSize?: number;
  id: number;
  positionId?: number;
  positionName?: string;
  remark?: string;
  title?: string;
  uploaderId?: number;
  uploaderName?: string;
  url?: string;
}

export const DOC_TYPE_OPTIONS = [
  { label: '劳动合同', value: 1 },
  { label: '保密协议', value: 2 },
  { label: '薪资确认单', value: 3 },
  { label: '其他', value: 4 },
];

export async function getEmployeeDocuments(
  params?: PageQuery & {
    deptId?: number;
    docType?: number;
    employeeId?: number;
    keyword?: string;
    positionId?: number;
  },
) {
  return requestClient.get<PageResult<EmployeeDocumentVO>>('/documents', {
    params,
  });
}

export async function uploadEmployeeDocument(data: {
  docType?: number;
  effectiveDate?: string;
  employeeId: number;
  expireDate?: string;
  file: File;
  remark?: string;
  title?: string;
}) {
  return requestClient.upload<EmployeeDocumentVO>('/documents', data);
}

export async function deleteEmployeeDocument(id: number) {
  return requestClient.delete(`/documents/${id}`);
}

/** 预览(inline) / 下载(attachment) 文档二进制 */
export async function fetchEmployeeDocumentFile(
  id: number,
  disposition: 'attachment' | 'inline' = 'inline',
) {
  return requestClient.download<Blob>(`/documents/${id}/file`, {
    params: { disposition },
  });
}

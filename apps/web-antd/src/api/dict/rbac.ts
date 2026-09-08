import { requestClient } from '#/api/request';

export interface RoleVO {
  description?: string;
  id: number;
  roleCode: string;
  roleName: string;
  status?: number;
}

export interface PermissionNodeVO {
  children?: PermissionNodeVO[];
  id: number;
  parentId?: number;
  path?: string;
  permCode: string;
  permName: string;
  permType: number;
  sortOrder?: number;
  status?: number;
}

export async function getRbacRoles() {
  return requestClient.get<RoleVO[]>('/dict/rbac/roles');
}

export async function getPermissionTree(permType: 1 | 2) {
  return requestClient.get<PermissionNodeVO[]>('/dict/rbac/permissions/tree', {
    params: { permType },
  });
}

export async function getRolePermissionIds(roleCode: string, permType: 1 | 2) {
  return requestClient.get<number[]>(
    `/dict/rbac/roles/${roleCode}/permissions`,
    { params: { permType } },
  );
}

export async function saveRolePermissions(
  roleCode: string,
  data: { permissionIds: number[]; permType: 1 | 2 },
) {
  return requestClient.put(`/dict/rbac/roles/${roleCode}/permissions`, data);
}

export async function getPageRoutes() {
  return requestClient.get<PermissionNodeVO[]>('/dict/rbac/page-routes');
}

export async function createPageRoute(data: {
  parentId: number;
  path: string;
  permName: string;
  sortOrder?: number;
  status?: number;
}) {
  return requestClient.post('/dict/rbac/page-routes', data);
}

export async function updatePageRoute(
  id: number,
  data: {
    parentId: number;
    path: string;
    permName: string;
    sortOrder?: number;
    status?: number;
  },
) {
  return requestClient.put(`/dict/rbac/page-routes/${id}`, data);
}

export async function deletePageRoute(id: number) {
  return requestClient.delete(`/dict/rbac/page-routes/${id}`);
}

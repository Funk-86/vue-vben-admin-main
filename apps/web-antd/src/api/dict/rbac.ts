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

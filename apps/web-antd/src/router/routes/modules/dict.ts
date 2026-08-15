import type { RouteRecordRaw } from 'vue-router';

import { ROLE_SUPER_ADMIN } from '#/views/hr/roles';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      authority: ROLE_SUPER_ADMIN,
      icon: 'lucide:book-marked',
      order: 8,
      title: '字典管理',
    },
    name: 'Dict',
    path: '/dict',
    children: [
      {
        name: 'DictSalary',
        path: '/dict/salary',
        component: () => import('#/views/dict/salary/index.vue'),
        meta: {
          authority: ROLE_SUPER_ADMIN,
          icon: 'lucide:wallet',
          title: '薪资字典',
        },
      },
      {
        name: 'DictRolePermission',
        path: '/dict/role-permission',
        component: () => import('#/views/dict/role-permission/index.vue'),
        meta: {
          authority: ROLE_SUPER_ADMIN,
          icon: 'lucide:key-round',
          title: '用户权限字典',
        },
      },
      {
        name: 'DictPagePermission',
        path: '/dict/page-permission',
        component: () => import('#/views/dict/page-permission/index.vue'),
        meta: {
          authority: ROLE_SUPER_ADMIN,
          icon: 'lucide:layout-list',
          title: '页面字典',
        },
      },
    ],
  },
];

export default routes;

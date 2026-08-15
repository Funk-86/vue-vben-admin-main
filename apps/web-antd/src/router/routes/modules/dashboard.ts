import type { RouteRecordRaw } from 'vue-router';

import { ROLE_ALL } from '#/views/hr/roles';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:layout-dashboard',
      order: 0,
      title: '工作台',
    },
    name: 'Dashboard',
    path: '/dashboard',
    children: [
      {
        name: 'Workspace',
        path: '/workspace',
        component: () => import('#/views/dashboard/workspace/index.vue'),
        meta: {
          affixTab: true,
          authority: ROLE_ALL,
          icon: 'carbon:workspace',
          title: '工作台首页',
        },
      },
      {
        name: 'Analytics',
        path: '/analytics',
        component: () => import('#/views/dashboard/analytics/index.vue'),
        meta: {
          hideInMenu: true,
          icon: 'lucide:area-chart',
          title: '分析页',
        },
      },
    ],
  },
];

export default routes;

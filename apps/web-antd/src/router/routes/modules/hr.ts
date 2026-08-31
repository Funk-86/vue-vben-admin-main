import type { RouteRecordRaw } from 'vue-router';

import { ROLE_ALL, ROLE_HR_STAFF, ROLE_MANAGER_UP } from '#/views/hr/roles';

/**
 * 侧栏按业务拆分多个顶级菜单；页面 path 仍保持 /hr/*，避免影响既有链接与书签。
 */
const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:building-2',
      order: 1,
      title: '组织人事',
    },
    name: 'OrgHr',
    path: '/org',
    children: [
      {
        name: 'HrDepartment',
        path: '/hr/department',
        component: () => import('#/views/hr/department/index.vue'),
        meta: {
          authority: ROLE_HR_STAFF,
          icon: 'lucide:git-branch',
          title: '部门管理',
        },
      },
      {
        name: 'HrPosition',
        path: '/hr/position',
        component: () => import('#/views/hr/position/index.vue'),
        meta: {
          authority: ROLE_HR_STAFF,
          icon: 'lucide:briefcase',
          title: '岗位管理',
        },
      },
      {
        name: 'HrEmployee',
        path: '/hr/employee',
        component: () => import('#/views/hr/employee/index.vue'),
        meta: {
          authority: ROLE_MANAGER_UP,
          icon: 'lucide:users',
          title: '员工管理',
        },
      },
      {
        name: 'HrPersonnel',
        path: '/hr/personnel',
        component: () => import('#/views/hr/personnel/index.vue'),
        meta: {
          authority: ROLE_ALL,
          icon: 'lucide:user-cog',
          title: '入转调离',
        },
      },
      {
        name: 'HrDocument',
        path: '/hr/document',
        component: () => import('#/views/hr/document/index.vue'),
        meta: {
          authority: ROLE_ALL,
          icon: 'lucide:file-text',
          title: '文档管理',
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:calendar-clock',
      order: 2,
      title: '考勤假期',
    },
    name: 'AttendanceModule',
    path: '/attendance-module',
    children: [
      {
        name: 'HrAttendance',
        path: '/hr/attendance',
        component: () => import('#/views/hr/attendance/index.vue'),
        meta: {
          authority: ROLE_ALL,
          icon: 'lucide:clock',
          title: '考勤管理',
        },
      },
      {
        name: 'HrLeave',
        path: '/hr/leave',
        component: () => import('#/views/hr/leave/index.vue'),
        meta: {
          authority: ROLE_ALL,
          icon: 'lucide:calendar-off',
          title: '请假管理',
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:folder-kanban',
      order: 3,
      title: '项目协作',
    },
    name: 'Collaboration',
    path: '/collaboration',
    children: [
      {
        name: 'HrProject',
        path: '/hr/project',
        component: () => import('#/views/hr/project/index.vue'),
        meta: {
          authority: ROLE_ALL,
          icon: 'lucide:folder-kanban',
          title: '项目管理',
        },
      },
      {
        name: 'HrTask',
        path: '/hr/task',
        component: () => import('#/views/hr/task/index.vue'),
        meta: {
          authority: ROLE_ALL,
          icon: 'lucide:list-todo',
          title: '任务管理',
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:wallet',
      order: 4,
      title: '薪酬绩效',
    },
    name: 'CompPerf',
    path: '/comp-perf',
    children: [
      {
        name: 'HrSalaryMine',
        path: '/hr/salary-mine',
        component: () => import('#/views/hr/salary/mine.vue'),
        meta: {
          authority: ROLE_ALL,
          icon: 'lucide:receipt',
          title: '我的薪资条',
        },
      },
      {
        name: 'HrSalary',
        path: '/hr/salary',
        component: () => import('#/views/hr/salary/index.vue'),
        meta: {
          authority: ROLE_HR_STAFF,
          icon: 'lucide:wallet',
          title: '薪资管理',
        },
      },
      {
        name: 'HrPerformance',
        path: '/hr/performance',
        component: () => import('#/views/hr/performance/index.vue'),
        meta: {
          authority: ROLE_ALL,
          icon: 'lucide:gauge',
          title: '绩效考核',
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:chart-column',
      order: 5,
      title: '数据分析',
    },
    name: 'DataAnalytics',
    path: '/data-analytics',
    children: [
      {
        name: 'HrStats',
        path: '/hr/stats',
        component: () => import('#/views/hr/stats/index.vue'),
        meta: {
          authority: ROLE_HR_STAFF,
          icon: 'lucide:chart-column',
          title: '统计看板',
        },
      },
    ],
  },
  {
    meta: {
      authority: ROLE_HR_STAFF,
      icon: 'lucide:shield-check',
      order: 9,
      title: '系统审计',
    },
    name: 'SystemAudit',
    path: '/system-audit',
    children: [
      {
        name: 'HrOperationLog',
        path: '/hr/operation-log',
        component: () => import('#/views/hr/operation-log/index.vue'),
        meta: {
          authority: ROLE_HR_STAFF,
          icon: 'lucide:scroll-text',
          title: '操作日志',
        },
      },
    ],
  },
];

export default routes;

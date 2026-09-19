import type { RouteRecordRaw } from 'vue-router';

import {
  ROLE_ALL,
  ROLE_CANDIDATE,
  ROLE_HR_COMP,
  ROLE_HR_ER,
  ROLE_HR_SSC,
  ROLE_INTERVIEW_ROOM,
  ROLE_MANAGER_UP,
  ROLE_RECRUIT_MANAGER,
} from '#/views/hr/roles';

/**
 * 侧栏按业务拆分多个顶级菜单；页面 path 仍保持 /hr/*，避免影响既有链接与书签。
 */
const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:clipboard-check',
      order: 0,
      title: '审批中心',
    },
    name: 'ApprovalCenter',
    path: '/approval',
    children: [
      {
        name: 'HrTodo',
        path: '/hr/todo',
        component: () => import('#/views/hr/todo/index.vue'),
        meta: {
          authority: ROLE_ALL,
          icon: 'lucide:inbox',
          title: '审批待办',
        },
      },
    ],
  },
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
          authority: ROLE_HR_SSC,
          icon: 'lucide:git-branch',
          title: '部门管理',
        },
      },
      {
        name: 'HrPosition',
        path: '/hr/position',
        component: () => import('#/views/hr/position/index.vue'),
        meta: {
          authority: ROLE_HR_SSC,
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
      {
        name: 'HrContract',
        path: '/hr/contract',
        component: () => import('#/views/hr/contract/index.vue'),
        meta: {
          authority: ROLE_HR_SSC,
          icon: 'lucide:file-signature',
          title: '合同主数据',
        },
      },
      {
        name: 'HrContractExpire',
        path: '/hr/contract-expire',
        component: () => import('#/views/hr/contract-expire/index.vue'),
        meta: {
          authority: ROLE_HR_SSC,
          icon: 'lucide:calendar-x',
          title: '合同到期',
        },
      },
      {
        name: 'HrOnboarding',
        path: '/hr/onboarding',
        component: () => import('#/views/hr/onboarding/index.vue'),
        meta: {
          authority: ROLE_HR_SSC,
          icon: 'lucide:user-plus',
          title: '入职清单',
        },
      },
      {
        name: 'HrOffboarding',
        path: '/hr/offboarding',
        component: () => import('#/views/hr/offboarding/index.vue'),
        meta: {
          authority: ROLE_HR_SSC,
          icon: 'lucide:user-minus',
          title: '离职交接',
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
      {
        name: 'HrHoliday',
        path: '/hr/holiday',
        component: () => import('#/views/hr/holiday/index.vue'),
        meta: {
          authority: ROLE_HR_SSC,
          icon: 'lucide:calendar-days',
          title: '节假日日历',
        },
      },
      {
        name: 'HrAttendanceGroup',
        path: '/hr/attendance-group',
        component: () => import('#/views/hr/attendance-group/index.vue'),
        meta: {
          authority: ROLE_HR_SSC,
          icon: 'lucide:calendar-range',
          title: '考勤组排班',
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
        name: 'HrTaskHall',
        path: '/hr/task-hall',
        component: () => import('#/views/hr/task-hall/index.vue'),
        meta: {
          authority: ROLE_ALL,
          icon: 'lucide:store',
          title: '任务大厅',
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
          authority: ROLE_HR_COMP,
          icon: 'lucide:wallet',
          title: '薪资管理',
        },
      },
      {
        name: 'HrSeniorityGrade',
        path: '/hr/seniority-grade',
        component: () => import('#/views/hr/seniority-grade/index.vue'),
        meta: {
          authority: ROLE_HR_COMP,
          icon: 'lucide:layers',
          title: '工龄薪档',
        },
      },
      {
        name: 'HrRetire',
        path: '/hr/retire',
        component: () => import('#/views/hr/retire/index.vue'),
        meta: {
          authority: ROLE_HR_ER,
          icon: 'lucide:person-standing',
          title: '退休管理',
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
          authority: ROLE_HR_COMP,
          icon: 'lucide:chart-column',
          title: '统计看板',
        },
      },
    ],
  },

  {
    meta: {
      icon: 'lucide:user-search',
      order: 6,
      title: '招聘面试',
    },
    name: 'RecruitModule',
    path: '/recruit-module',
    children: [
      {
        name: 'HrRecruit',
        path: '/hr/recruit',
        component: () => import('#/views/hr/recruit/index.vue'),
        meta: {
          authority: ROLE_RECRUIT_MANAGER,
          icon: 'lucide:briefcase',
          title: '招聘工作台',
        },
      },
      {
        name: 'HrRecruitMine',
        path: '/hr/recruit-mine',
        component: () => import('#/views/hr/recruit/mine.vue'),
        meta: {
          authority: ROLE_CANDIDATE,
          icon: 'lucide:clipboard-list',
          title: '我的求职',
        },
      },
      {
        name: 'HrInterviewRoom',
        path: '/hr/interview-room',
        component: () => import('#/views/hr/interview-room/index.vue'),
        meta: {
          authority: ROLE_INTERVIEW_ROOM,
          hideInMenu: true,
          icon: 'lucide:video',
          title: 'AI面试间',
        },
      },
    ],
  },

  {
    meta: {
      authority: ROLE_HR_ER,
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
          authority: ROLE_HR_ER,
          icon: 'lucide:scroll-text',
          title: '操作日志',
        },
      },
    ],
  },
];

export default routes;

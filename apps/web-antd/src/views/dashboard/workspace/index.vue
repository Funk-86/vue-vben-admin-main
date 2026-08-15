<script lang="ts" setup>
import type { DashboardStats } from '#/api/hr/dashboard';
import type { TaskTodoStatsVO, TaskVO } from '#/api/hr/task';
import type { WorkbenchQuickNavItem } from '@vben/common-ui';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { WorkbenchHeader, WorkbenchQuickNav } from '@vben/common-ui';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

import {
  Card,
  Col,
  Empty,
  List,
  Progress,
  Row,
  Spin,
  Statistic,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  getDashboardStats,
  getMyTaskStats,
  getMyTodoTasks,
} from '#/api/hr';
import {
  TASK_ASSIGNEE_STATUS_MAP,
  TASK_PRIORITY_MAP,
} from '#/views/hr/constants';
import {
  hasAnyRole,
  isPureSuperAdmin,
  ROLE_ALL,
  ROLE_HR_STAFF,
  ROLE_MANAGER_UP,
  ROLE_NAME_MAP,
} from '#/views/hr/roles';

import AttendanceCalendar from './AttendanceCalendar.vue';

const userStore = useUserStore();
const router = useRouter();

const loading = ref(false);
const stats = ref<DashboardStats>();
const taskStats = ref<TaskTodoStatsVO>({ overdueCount: 0, todoCount: 0 });
const todoTasks = ref<TaskVO[]>([]);

const userRoles = computed(() => userStore.userInfo?.roles ?? []);

/** 关联员工档案的账号才有「我的任务」 */
const showTaskPanel = computed(() => !isPureSuperAdmin(userRoles.value));

const showCalendar = computed(() => !isPureSuperAdmin(userRoles.value));

const showManagerStats = computed(() =>
  hasAnyRole(userRoles.value, ROLE_MANAGER_UP),
);

const showHrStats = computed(() => hasAnyRole(userRoles.value, ROLE_HR_STAFF));

const roleLabels = computed(() =>
  userRoles.value.map((role) => ROLE_NAME_MAP[role] ?? role).join('、'),
);

const greeting = computed(() => {
  const hour = dayjs().hour();
  if (hour < 12) return '上午好';
  if (hour < 18) return '下午好';
  return '晚上好';
});

const recentTodos = computed(() => todoTasks.value.slice(0, 5));

/** 页头：待办 / 项目（预留）/ 团队（本部门人数） */
const headerStats = computed(() => [
  { label: '待办', value: String(taskStats.value.todoCount) },
  { label: '项目', value: String(stats.value?.projectCount ?? 0) },
  { label: '团队', value: String(stats.value?.teamCount ?? 0) },
]);

const statCards = computed(() => {
  const data = stats.value;
  return [
    {
      color: '#1677ff',
      show: showTaskPanel.value,
      title: '我的待办任务',
      value: taskStats.value.todoCount,
    },
    {
      color: '#ff4d4f',
      show: showTaskPanel.value,
      title: '逾期任务',
      value: taskStats.value.overdueCount,
    },
    {
      color: '#1677ff',
      show: showManagerStats.value,
      title: '在职员工',
      value: data?.employeeCount ?? 0,
    },
    {
      color: '#52c41a',
      show: showHrStats.value,
      title: '部门数量',
      value: data?.departmentCount ?? 0,
    },
    {
      color: '#13c2c2',
      show: showManagerStats.value,
      title: '本月新入职',
      value: data?.newHiresThisMonth ?? 0,
    },
    {
      color: '#722ed1',
      show: showManagerStats.value,
      title: '待审批事项',
      value: data?.pendingLeaveCount ?? 0,
    },
    {
      color: '#eb2f96',
      show: showHrStats.value,
      title: '待发薪资',
      value: data?.pendingSalaryCount ?? 0,
    },
  ].filter((item) => item.show);
});

const quickNavItems = computed<WorkbenchQuickNavItem[]>(() => {
  const roles = userRoles.value;
  const items: Array<WorkbenchQuickNavItem & { roles: string[] }> = [
    {
      color: '#fa541c',
      icon: 'lucide:list-todo',
      roles: ROLE_ALL,
      title: '任务管理',
      url: '/hr/task',
    },
    {
      color: '#1677ff',
      icon: 'lucide:git-branch',
      roles: ROLE_HR_STAFF,
      title: '部门管理',
      url: '/hr/department',
    },
    {
      color: '#2f54eb',
      icon: 'lucide:briefcase',
      roles: ROLE_HR_STAFF,
      title: '岗位管理',
      url: '/hr/position',
    },
    {
      color: '#52c41a',
      icon: 'lucide:users',
      roles: ROLE_MANAGER_UP,
      title: '员工管理',
      url: '/hr/employee',
    },
    {
      color: '#13c2c2',
      icon: 'lucide:clock',
      roles: ROLE_ALL,
      title: '考勤管理',
      url: '/hr/attendance',
    },
    {
      color: '#fa8c16',
      icon: 'lucide:calendar-off',
      roles: ROLE_ALL,
      title: '请假管理',
      url: '/hr/leave',
    },
    {
      color: '#eb2f96',
      icon: 'lucide:wallet',
      roles: ROLE_HR_STAFF,
      title: '薪资管理',
      url: '/hr/salary',
    },
    {
      color: '#2f54eb',
      icon: 'lucide:file-text',
      roles: ROLE_ALL,
      title: '文档管理',
      url: '/hr/document',
    },
  ];
  return items.filter((item) => hasAnyRole(roles, item.roles));
});

function priorityColor(priority?: number) {
  if (priority === 3) return 'red';
  if (priority === 1) return 'default';
  return 'blue';
}

function progressColor(percent: number) {
  if (percent >= 100) return '#52c41a';
  if (percent >= 70) return '#1677ff';
  if (percent >= 30) return '#faad14';
  return '#ff4d4f';
}

async function loadTaskPanel() {
  if (!showTaskPanel.value) {
    taskStats.value = { overdueCount: 0, todoCount: 0 };
    todoTasks.value = [];
    return;
  }
  try {
    const [statsRes, todos] = await Promise.all([
      getMyTaskStats(),
      getMyTodoTasks(),
    ]);
    taskStats.value = {
      overdueCount: statsRes?.overdueCount ?? 0,
      todoCount: statsRes?.todoCount ?? 0,
    };
    todoTasks.value = todos ?? [];
  } catch {
    taskStats.value = { overdueCount: 0, todoCount: 0 };
    todoTasks.value = [];
  }
}

async function loadStats() {
  loading.value = true;
  try {
    const [dashboard] = await Promise.all([
      getDashboardStats(),
      loadTaskPanel(),
    ]);
    stats.value = dashboard;
  } finally {
    loading.value = false;
  }
}

function navTo(item: WorkbenchQuickNavItem) {
  if (item.url?.startsWith('/')) {
    router.push(item.url);
  }
}

function goLeaveApproval() {
  router.push('/hr/leave');
}

function goTaskPage() {
  router.push('/hr/task');
}

onMounted(loadStats);
</script>

<template>
  <div class="p-5">
    <WorkbenchHeader
      :avatar="userStore.userInfo?.avatar || preferences.app.defaultAvatar"
    >
      <template #title>
        {{ greeting }}，{{ userStore.userInfo?.realName || '用户' }}，欢迎使用智汇人事管理系统
      </template>
      <template #description>
        <span v-if="roleLabels">当前角色：{{ roleLabels }}</span>
        <span v-else>尚未分配角色</span>
        · 今日 {{ dayjs().format('YYYY-MM-DD dddd') }}
      </template>
      <template #actions>
        <div
          v-for="(item, index) in headerStats"
          :key="item.label"
          class="flex flex-col justify-center text-right"
          :class="
            index === 0
              ? ''
              : index === headerStats.length - 1
                ? 'ml-12 mr-4 md:ml-16 md:mr-10'
                : 'mx-12 md:mx-16'
          "
        >
          <span class="text-foreground/80">{{ item.label }}</span>
          <span class="text-2xl">{{ item.value }}</span>
        </div>
      </template>
    </WorkbenchHeader>

    <Spin :spinning="loading">
      <Row v-if="statCards.length" :gutter="[16, 16]" class="mt-2">
        <Col v-for="item in statCards" :key="item.title" :lg="4" :md="8" :xs="12">
          <Card :body-style="{ padding: '20px' }" class="h-full">
            <Statistic
              :title="item.title"
              :value="item.value"
              :value-style="{ color: item.color, fontWeight: 600 }"
            />
          </Card>
        </Col>
      </Row>

      <Row :gutter="16" class="mt-4">
        <Col :lg="14" :xs="24">
          <Card
            v-if="showTaskPanel"
            title="我的任务待办"
          >
            <template #extra>
              <a @click="goTaskPage">全部任务 →</a>
            </template>
            <template v-if="recentTodos.length">
              <List item-layout="horizontal" :data-source="recentTodos">
                <template #renderItem="{ item }">
                  <List.Item>
                    <List.Item.Meta>
                      <template #title>
                        <div class="flex flex-wrap items-center gap-2">
                          <span>{{ item.title }}</span>
                          <Tag
                            v-if="item.overdue"
                            color="error"
                          >
                            逾期
                          </Tag>
                          <Tag :color="priorityColor(item.priority)">
                            {{ TASK_PRIORITY_MAP[item.priority ?? 2] ?? '中' }}
                          </Tag>
                          <Tag>
                            {{
                              TASK_ASSIGNEE_STATUS_MAP[item.myStatus ?? 0] ??
                              '待接收'
                            }}
                          </Tag>
                        </div>
                      </template>
                      <template #description>
                        <span>
                          截止：
                          {{
                            item.dueTime
                              ? dayjs(item.dueTime).format('YYYY-MM-DD HH:mm')
                              : '未设置'
                          }}
                          · 创建人：{{ item.creatorName || '-' }}
                        </span>
                      </template>
                    </List.Item.Meta>
                    <div class="w-28">
                      <Progress
                        :percent="item.myProgress ?? item.progress ?? 0"
                        :stroke-color="
                          progressColor(item.myProgress ?? item.progress ?? 0)
                        "
                        size="small"
                      />
                    </div>
                  </List.Item>
                </template>
              </List>
            </template>
            <Empty v-else description="暂无待办任务" />
          </Card>

          <div v-if="showCalendar" :class="{ 'mt-4': showTaskPanel }">
            <AttendanceCalendar />
          </div>

          <Card
            v-if="showManagerStats"
            :class="{ 'mt-4': showCalendar || showTaskPanel }"
            title="待办：待审批请假"
          >
            <template v-if="stats?.pendingLeaves?.length">
              <List item-layout="horizontal" :data-source="stats.pendingLeaves">
                <template #renderItem="{ item }">
                  <List.Item>
                    <List.Item.Meta
                      :description="`${item.leaveType} · ${item.days} 天 · ${item.startTime} ~ ${item.endTime}`"
                      :title="`${item.employeeName}：${item.reason}`"
                    />
                    <Tag color="orange">待审批</Tag>
                  </List.Item>
                </template>
              </List>
              <div class="mt-3 text-right">
                <a @click="goLeaveApproval">前往审批 →</a>
              </div>
            </template>
            <Empty v-else description="暂无待审批请假" />
          </Card>
        </Col>

        <Col :lg="10" :xs="24">
          <WorkbenchQuickNav
            :items="quickNavItems"
            title="快捷入口"
            @click="navTo"
          />
        </Col>
      </Row>
    </Spin>
  </div>
</template>

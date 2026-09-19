<script lang="ts" setup>
import type { ApplicationVO, JobPostVO } from '#/api/hr/recruit';

import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useAccessStore } from '@vben/stores';

import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Table,
  Tabs,
  Tag,
  Textarea,
} from 'ant-design-vue';

import {
  createInterview,
  getReport,
  listProctorEvents,
  listRecordings,
} from '#/api/hr/interview';
import {
  createInvite,
  createJob,
  decideApplication,
  listApplications,
  listJobs,
  reopenApplication,
  updateJob,
} from '#/api/hr/recruit';
import {
  APP_STATUS_COLOR,
  APP_STATUS_LABEL,
  appStatusLabel,
  JOB_STATUS_COLOR,
  jobStatusLabel,
} from '#/views/hr/recruit/status';
import { useHrAccess } from '#/views/hr/roles';

import '#/views/hr/hr-common.css';

defineOptions({ name: 'HrRecruit' });

const router = useRouter();
const accessStore = useAccessStore();
const { canFeat } = useHrAccess();
const canManage = computed(() => canFeat('feat.recruit.manage'));

const activeTab = ref('jobs');
const jobLoading = ref(false);
const appLoading = ref(false);
const jobs = ref<JobPostVO[]>([]);
const applications = ref<ApplicationVO[]>([]);
const jobTotal = ref(0);
const appTotal = ref(0);
const jobQuery = reactive({
  pageNum: 1,
  pageSize: 10,
  status: undefined as string | undefined,
});
const appQuery = reactive({
  jobPostId: undefined as number | undefined,
  minScore: undefined as number | undefined,
  pageNum: 1,
  pageSize: 10,
  status: undefined as string | undefined,
});

const jobModalOpen = ref(false);
const jobEditingId = ref<null | number>(null);
const jobForm = reactive({ jdText: '', title: '' });

const detailOpen = ref(false);
const detailTitle = ref('');
const detailLoading = ref(false);
const detailReport = ref<null | Record<string, unknown>>(null);
const detailProctors = ref<any[]>([]);
const detailRecordings = ref<any[]>([]);

const statusFilterOptions = Object.entries(APP_STATUS_LABEL).map(
  ([value, label]) => ({
    label,
    value,
  }),
);

const jobColumns = [
  { dataIndex: 'title', title: '岗位标题', ellipsis: true },
  { dataIndex: 'status', title: '状态', width: 110 },
  { dataIndex: 'createdAt', title: '创建时间', width: 180 },
  { key: 'action', title: '操作', width: 280 },
];

const appColumns = [
  { dataIndex: 'jobTitle', title: '岗位', ellipsis: true },
  { dataIndex: 'candidateUsername', title: '候选人', width: 120 },
  { dataIndex: 'status', title: '状态', width: 120 },
  { dataIndex: 'totalScore', title: 'AI评分', width: 90 },
  { dataIndex: 'interviewSessionId', title: '会话ID', width: 90 },
  { key: 'action', title: '操作', width: 420 },
];

function formatTime(v?: string) {
  if (!v) return '-';
  return String(v).replace('T', ' ').slice(0, 19);
}

async function loadJobs() {
  jobLoading.value = true;
  try {
    const res = await listJobs();
    jobs.value = Array.isArray(res) ? res : [];
    jobTotal.value = jobs.value.length;
  } finally {
    jobLoading.value = false;
  }
}

async function loadApplications() {
  appLoading.value = true;
  try {
    const res = await listApplications({
      jobPostId: appQuery.jobPostId,
      minScore: appQuery.minScore,
      status: appQuery.status,
    });
    applications.value = Array.isArray(res) ? res : [];
    appTotal.value = applications.value.length;
  } finally {
    appLoading.value = false;
  }
}

function openCreateJob() {
  jobEditingId.value = null;
  jobForm.title = '';
  jobForm.jdText = '';
  jobModalOpen.value = true;
}

function openEditJob(row: JobPostVO) {
  jobEditingId.value = row.id;
  jobForm.title = row.title;
  jobForm.jdText = row.jdText || '';
  jobModalOpen.value = true;
}

async function saveJob() {
  if (!jobForm.title.trim()) {
    message.warning('请填写岗位标题');
    return;
  }
  if (jobEditingId.value) {
    await updateJob(jobEditingId.value, {
      jdText: jobForm.jdText,
      title: jobForm.title.trim(),
    });
    message.success('已更新岗位');
  } else {
    await createJob({
      jdText: jobForm.jdText,
      title: jobForm.title.trim(),
    });
    message.success('已创建岗位');
  }
  jobModalOpen.value = false;
  await loadJobs();
}

async function closeJob(row: JobPostVO) {
  await updateJob(row.id, { status: 'CLOSED' });
  message.success('已关闭岗位');
  await loadJobs();
}

async function genInvite(row: JobPostVO) {
  const invite = await createInvite(row.id);
  const url = `${location.origin}${location.pathname}#/hr/recruit-mine?invite=${invite.token}`;
  try {
    await navigator.clipboard.writeText(url);
    message.success('邀请链接已复制');
  } catch {
    Modal.info({ content: url, title: '邀请链接' });
  }
}

async function startInterview(row: ApplicationVO) {
  // 仅进行中的会话复用；仅「已投递」可新建（后端同门禁）
  const reuse =
    !!row.interviewSessionId &&
    ['IN_INTERVIEW', 'PENDING_INTERVIEW'].includes(row.status || '');
  if (reuse) {
    router.push({
      path: '/hr/interview-room',
      query: { id: String(row.interviewSessionId) },
    });
    return;
  }
  if (row.status !== 'APPLIED') {
    message.info(
      row.status === 'REOPEN'
        ? '请先让候选人再次投递后再开启面试'
        : '当前状态不可开启新面试；已结束请先「允许再次面试」',
    );
    return;
  }
  const session = await createInterview({ applicationId: row.id });
  message.success('已开启模拟面试');
  await loadApplications();
  router.push({
    path: '/hr/interview-room',
    query: { id: String(session.id) },
  });
}

async function decide(row: ApplicationVO, decision: 'PASS' | 'REJECT') {
  if (
    ![
      'IN_INTERVIEW',
      'PASSED',
      'PENDING_INTERVIEW',
      'REJECTED',
      'SCORED',
    ].includes(row.status || '')
  ) {
    message.info('当前状态暂不可做录用决策');
    return;
  }
  await decideApplication(row.id, decision);
  message.success(decision === 'PASS' ? '已通过' : '已淘汰');
  await loadApplications();
}

function canReopen(row: ApplicationVO) {
  return ['PASSED', 'REJECTED', 'SCORED'].includes(row.status || '');
}

function canStartInterview(row: ApplicationVO) {
  return (
    row.status === 'APPLIED' ||
    ['IN_INTERVIEW', 'PENDING_INTERVIEW'].includes(row.status || '')
  );
}

function canDecide(row: ApplicationVO) {
  return [
    'IN_INTERVIEW',
    'PASSED',
    'PENDING_INTERVIEW',
    'REJECTED',
    'SCORED',
  ].includes(row.status || '');
}

async function allowReinterview(row: ApplicationVO) {
  await reopenApplication(row.id);
  message.success('已允许该候选人再次投递 / 再次面试');
  await loadApplications();
}

const detailPlaybackUrls = ref<Record<number, string>>({});

function revokeDetailPlayback() {
  Object.values(detailPlaybackUrls.value).forEach((u) => {
    try {
      URL.revokeObjectURL(u);
    } catch {
      /* ignore */
    }
  });
  detailPlaybackUrls.value = {};
}

async function loadDetailPlaybackBlobs(
  sessionId: number,
  list: Array<{ id?: number }>,
) {
  revokeDetailPlayback();
  const token = accessStore.accessToken;
  if (!token || !sessionId) return;
  const raw = import.meta.env.VITE_GLOB_API_URL || '/api';
  let base = String(raw).replace(/\/$/, '');
  if (!/^https?:\/\//i.test(base)) {
    base = `${window.location.origin}${base.startsWith('/') ? base : `/${base}`}`;
  }
  const next: Record<number, string> = {};
  let fail = 0;
  for (const r of list) {
    if (!r?.id) continue;
    const url = `${base}/interviews/${sessionId}/recording/${r.id}/file`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        fail += 1;
        continue;
      }
      next[r.id] = URL.createObjectURL(await res.blob());
    } catch {
      fail += 1;
    }
  }
  detailPlaybackUrls.value = next;
  if (fail && Object.keys(next).length === 0) {
    message.warning('录像加载失败，请确认已登录且有权限');
  }
}

async function openDetail(row: ApplicationVO) {
  if (!row.interviewSessionId) {
    message.info('暂无面试会话');
    return;
  }
  detailTitle.value = `${row.candidateUsername || '候选人'} · ${row.jobTitle || ''}`;
  detailOpen.value = true;
  detailLoading.value = true;
  detailReport.value = null;
  detailProctors.value = [];
  detailRecordings.value = [];
  try {
    const [report, proctors, recordings] = await Promise.all([
      getReport(row.interviewSessionId).catch(() => null),
      listProctorEvents(row.interviewSessionId).catch(() => []),
      listRecordings(row.interviewSessionId).catch(() => []),
    ]);
    detailReport.value = (report as any) || null;
    const p = proctors as any;
    detailProctors.value = Array.isArray(p) ? p : p?.records || [];
    detailRecordings.value = Array.isArray(recordings) ? recordings : [];
    await loadDetailPlaybackBlobs(
      row.interviewSessionId,
      detailRecordings.value,
    );
  } finally {
    detailLoading.value = false;
  }
}

function enterRoom(row: ApplicationVO) {
  if (!row.interviewSessionId) return;
  router.push({
    path: '/hr/interview-room',
    query: { id: String(row.interviewSessionId) },
  });
}

onMounted(async () => {
  await Promise.all([loadJobs(), loadApplications()]);
});

onBeforeUnmount(() => {
  revokeDetailPlayback();
});
</script>

<template>
  <Page description="岗位发布、申请筛选与 AI 模拟面试" title="招聘工作台">
    <Tabs v-model:active-key="activeTab">
      <Tabs.TabPane key="jobs" tab="岗位列表">
        <div class="hr-toolbar">
          <Button v-if="canManage" type="primary" @click="openCreateJob">
            新建岗位
          </Button>
          <Button @click="loadJobs">刷新</Button>
        </div>
        <Table
          :columns="jobColumns"
          :data-source="jobs"
          :loading="jobLoading"
          :pagination="{
            current: jobQuery.pageNum,
            pageSize: jobQuery.pageSize,
            total: jobTotal,
            onChange: (p: number, ps: number) => {
              jobQuery.pageNum = p;
              jobQuery.pageSize = ps;
              loadJobs();
            },
          }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'status'">
              <Tag :color="JOB_STATUS_COLOR[record.status] || 'default'">
                {{ jobStatusLabel(record.status) }}
              </Tag>
            </template>
            <template v-else-if="column.dataIndex === 'createdAt'">
              {{ formatTime(record.createdAt) }}
            </template>
            <template v-else-if="column.key === 'action'">
              <div class="flex flex-wrap items-center gap-1">
                <Button
                  size="small"
                  type="link"
                  @click="openEditJob(record as JobPostVO)"
                >
                  编辑
                </Button>
                <Button
                  v-if="record.status !== 'CLOSED'"
                  size="small"
                  type="link"
                  @click="closeJob(record as JobPostVO)"
                >
                  关闭
                </Button>
                <Button
                  size="small"
                  type="link"
                  @click="genInvite(record as JobPostVO)"
                >
                  生成邀请链接
                </Button>
              </div>
            </template>
          </template>
        </Table>
      </Tabs.TabPane>

      <Tabs.TabPane key="apps" tab="申请列表">
        <div class="hr-toolbar">
          <InputNumber
            v-model:value="appQuery.minScore"
            :max="100"
            :min="0"
            class="hr-w-sm"
            placeholder="最低AI分"
          />
          <Select
            v-model:value="appQuery.status"
            allow-clear
            :options="statusFilterOptions"
            class="w-32"
            placeholder="申请状态"
          />
          <Button
            type="primary"
            @click="
              () => {
                appQuery.pageNum = 1;
                loadApplications();
              }
            "
          >
            查询
          </Button>
        </div>
        <Table
          :columns="appColumns"
          :data-source="applications"
          :loading="appLoading"
          :pagination="{
            current: appQuery.pageNum,
            pageSize: appQuery.pageSize,
            total: appTotal,
            onChange: (p: number, ps: number) => {
              appQuery.pageNum = p;
              appQuery.pageSize = ps;
              loadApplications();
            },
          }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'status'">
              <Tag :color="APP_STATUS_COLOR[record.status] || 'default'">
                {{ appStatusLabel(record.status) }}
              </Tag>
            </template>
            <template v-else-if="column.dataIndex === 'totalScore'">
              {{ record.totalScore ?? '-' }}
            </template>
            <template v-else-if="column.key === 'action'">
              <div class="flex flex-wrap items-center gap-1">
                <Button
                  v-if="canStartInterview(record as ApplicationVO)"
                  size="small"
                  type="link"
                  @click="startInterview(record as ApplicationVO)"
                >
                  {{
                    ['PENDING_INTERVIEW', 'IN_INTERVIEW'].includes(
                      record.status || '',
                    )
                      ? '进入面试间'
                      : '开启模拟面试'
                  }}
                </Button>
                <Button
                  v-if="
                    record.interviewSessionId &&
                    !canStartInterview(record as ApplicationVO)
                  "
                  size="small"
                  type="link"
                  @click="enterRoom(record as ApplicationVO)"
                >
                  查看面试间
                </Button>
                <Button
                  v-if="canDecide(record as ApplicationVO)"
                  size="small"
                  type="link"
                  @click="decide(record as ApplicationVO, 'PASS')"
                >
                  通过
                </Button>
                <Button
                  v-if="canDecide(record as ApplicationVO)"
                  danger
                  size="small"
                  type="link"
                  @click="decide(record as ApplicationVO, 'REJECT')"
                >
                  淘汰
                </Button>
                <Button
                  v-if="canReopen(record as ApplicationVO)"
                  size="small"
                  type="link"
                  @click="allowReinterview(record as ApplicationVO)"
                >
                  允许再次面试
                </Button>
                <Button
                  size="small"
                  type="link"
                  @click="openDetail(record as ApplicationVO)"
                >
                  报告/录像/反作弊
                </Button>
              </div>
            </template>
          </template>
        </Table>
      </Tabs.TabPane>
    </Tabs>

    <Modal
      v-model:open="jobModalOpen"
      :title="jobEditingId ? '编辑岗位' : '新建岗位'"
      ok-text="保存"
      @ok="saveJob"
    >
      <Form layout="vertical">
        <Form.Item label="岗位标题" required>
          <Input v-model:value="jobForm.title" placeholder="例如：前端工程师" />
        </Form.Item>
        <Form.Item label="岗位描述 JD">
          <Textarea
            v-model:value="jobForm.jdText"
            :rows="8"
            placeholder="职责、要求、加分项..."
          />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      v-model:open="detailOpen"
      :footer="null"
      :title="detailTitle"
      width="720px"
    >
      <div v-if="detailLoading">加载中...</div>
      <template v-else>
        <h4 class="mb-2">面试报告</h4>
        <pre class="mb-4 whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm">{{
          detailReport ? JSON.stringify(detailReport, null, 2) : '暂无报告'
        }}</pre>
        <h4 class="mb-2">反作弊事件</h4>
        <Table
          :columns="[
            { dataIndex: 'eventType', title: '类型', width: 140 },
            { dataIndex: 'occurredAt', title: '时间', width: 180 },
            { dataIndex: 'detail', title: '详情' },
          ]"
          :data-source="detailProctors"
          :pagination="false"
          class="mb-4"
          row-key="id"
          size="small"
        />
        <h4 class="mb-2">录像回放</h4>
        <div v-if="!detailRecordings.length" class="text-slate-500">
          暂无录像
        </div>
        <div v-else class="flex w-full flex-col gap-2">
          <video
            v-for="item in detailRecordings"
            :key="item.id"
            :src="detailPlaybackUrls[item.id] || ''"
            class="w-full max-h-60 bg-slate-900"
            controls
          ></video>
        </div>
      </template>
    </Modal>
  </Page>
</template>

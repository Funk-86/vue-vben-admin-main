<script lang="ts" setup>
import type { ApplicationVO, JobPostVO } from '#/api/hr/recruit';

import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  Form,
  message,
  Modal,
  Space,
  Table,
  Tag,
  Textarea,
  Upload,
} from 'ant-design-vue';

import {
  applyApplication,
  getInvitePublic,
  listApplications,
  listPublicJobs,
} from '#/api/hr/recruit';
import {
  APP_STATUS_COLOR,
  appStatusLabel,
  JOB_STATUS_COLOR,
  jobStatusLabel,
} from '#/views/hr/recruit/status';

defineOptions({ name: 'HrRecruitMine' });

const route = useRoute();
const router = useRouter();

const inviteToken = ref((route.query.invite as string) || '');
const inviteInfo = ref<null | { jobPostId?: number; jobTitle?: string }>(null);

const jobsLoading = ref(false);
const appsLoading = ref(false);
const jobs = ref<JobPostVO[]>([]);
const applications = ref<ApplicationVO[]>([]);
const jobTotal = ref(0);
const appTotal = ref(0);
const jobQuery = reactive({ pageNum: 1, pageSize: 10 });
const appQuery = reactive({ pageNum: 1, pageSize: 10 });

const applyOpen = ref(false);
const applying = ref(false);
const applyJob = ref<JobPostVO | null>(null);
const applyForm = reactive({
  file: null as File | null,
  resumeText: '',
});

/** 非 REOPEN 的申请占用该岗位，不可再点「投递」 */
const blockedJobIds = computed(() => {
  const ids = new Set<number>();
  for (const a of applications.value) {
    if (
      a.jobPostId !== null &&
      a.jobPostId !== undefined &&
      a.status !== 'REOPEN'
    ) {
      ids.add(a.jobPostId);
    }
  }
  return ids;
});

const jobColumns = [
  { dataIndex: 'title', title: '岗位', ellipsis: true },
  { dataIndex: 'status', title: '状态', width: 100 },
  { key: 'action', title: '操作', width: 140 },
];

const appColumns = [
  { dataIndex: 'jobTitle', title: '岗位', ellipsis: true },
  { dataIndex: 'status', title: '状态', width: 120 },
  { dataIndex: 'totalScore', title: 'AI评分', width: 90 },
  { dataIndex: 'interviewSessionId', title: '会话', width: 90 },
  { key: 'action', title: '操作', width: 160 },
];

async function loadJobs() {
  jobsLoading.value = true;
  try {
    const res = await listPublicJobs();
    jobs.value = Array.isArray(res) ? res : [];
    jobTotal.value = jobs.value.length;
  } finally {
    jobsLoading.value = false;
  }
}

async function loadApps() {
  appsLoading.value = true;
  try {
    const res = await listApplications();
    applications.value = Array.isArray(res) ? res : [];
    appTotal.value = applications.value.length;
  } finally {
    appsLoading.value = false;
  }
}

function hasApplied(jobPostId: number) {
  return blockedJobIds.value.has(jobPostId);
}

function canReapply(jobPostId: number) {
  return applications.value.some(
    (a) => a.jobPostId === jobPostId && a.status === 'REOPEN',
  );
}

function openApply(row: JobPostVO) {
  if (hasApplied(row.id) && !canReapply(row.id)) {
    message.info(
      '该岗位已投递，请等待面试官安排；面试结束后由面试官决定是否再次面试',
    );
    return;
  }
  applyJob.value = row;
  applyForm.resumeText = '';
  applyForm.file = null;
  applyOpen.value = true;
}

async function submitApply() {
  if (!applyJob.value) return;
  if (!applyForm.resumeText.trim() && !applyForm.file) {
    message.warning('请填写简历文本或上传 PDF/DOCX/TXT/MD（内容需像简历）');
    return;
  }
  applying.value = true;
  try {
    const fd = new FormData();
    fd.append('jobPostId', String(applyJob.value.id));
    fd.append('resumeText', applyForm.resumeText);
    if (inviteToken.value && !canReapply(applyJob.value.id)) {
      fd.append('inviteToken', inviteToken.value);
    }
    if (applyForm.file) fd.append('file', applyForm.file);
    await applyApplication(fd);
    message.success(
      canReapply(applyJob.value.id) ? '已重新提交申请' : '已提交申请',
    );
    applyOpen.value = false;
    await Promise.all([loadApps(), loadJobs()]);
  } catch (error: any) {
    message.error(error?.message || error?.msg || '投递失败');
  } finally {
    applying.value = false;
  }
}

function beforeUpload(file: File) {
  applyForm.file = file;
  return false;
}

function canEnterInterview(row: ApplicationVO) {
  return (
    !!row.interviewSessionId &&
    ['IN_INTERVIEW', 'PENDING_INTERVIEW'].includes(row.status || '')
  );
}

function enterInterview(row: ApplicationVO) {
  const sid = row.interviewSessionId;
  if (!sid) {
    message.info('面试会话尚未创建，请等待面试官开启');
    return;
  }
  router.push({ path: '/hr/interview-room', query: { id: String(sid) } });
}

function actionHint(row: ApplicationVO) {
  if (row.status === 'REOPEN') return '面试官已允许再次投递';
  if (row.status === 'PASSED') return '已通过';
  if (row.status === 'REJECTED') return '已淘汰';
  if (row.status === 'SCORED') return '已评分，等待筛选';
  return '等待面试';
}

onMounted(async () => {
  if (inviteToken.value) {
    try {
      inviteInfo.value = await getInvitePublic(inviteToken.value);
    } catch {
      inviteInfo.value = null;
    }
  }
  await Promise.all([loadJobs(), loadApps()]);
});
</script>

<template>
  <Page description="浏览开放岗位并管理我的申请" title="我的求职">
    <div
      v-if="inviteToken"
      class="mb-4 rounded border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-slate-700"
    >
      邀请码：{{ inviteToken }}
      <span v-if="inviteInfo?.jobTitle"> · 岗位 {{ inviteInfo.jobTitle }}</span>
    </div>

    <h3 class="mb-3 text-base font-medium">开放岗位</h3>
    <Table
      class="mb-8"
      :columns="jobColumns"
      :data-source="jobs"
      :loading="jobsLoading"
      :pagination="{
        current: jobQuery.pageNum,
        pageSize: jobQuery.pageSize,
        total: jobTotal,
        onChange: (p: number, ps: number) => {
          jobQuery.pageNum = p;
          jobQuery.pageSize = ps;
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
        <template v-else-if="column.key === 'action'">
          <Button
            v-if="hasApplied(record.id)"
            size="small"
            type="link"
            disabled
          >
            已投递
          </Button>
          <Button
            v-else
            size="small"
            type="link"
            @click="openApply(record as JobPostVO)"
          >
            {{ canReapply(record.id) ? '再次投递' : '投递' }}
          </Button>
        </template>
      </template>
    </Table>

    <h3 class="mb-3 text-base font-medium">我的申请</h3>
    <Space class="mb-3">
      <Button @click="loadApps">刷新</Button>
    </Space>
    <Table
      :columns="appColumns"
      :data-source="applications"
      :loading="appsLoading"
      :pagination="{
        current: appQuery.pageNum,
        pageSize: appQuery.pageSize,
        total: appTotal,
        onChange: (p: number, ps: number) => {
          appQuery.pageNum = p;
          appQuery.pageSize = ps;
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
        <template v-else-if="column.key === 'action'">
          <Button
            v-if="canEnterInterview(record as ApplicationVO)"
            size="small"
            type="link"
            @click="enterInterview(record as ApplicationVO)"
          >
            进入面试间
          </Button>
          <Button
            v-else-if="record.status === 'REOPEN'"
            size="small"
            type="link"
            @click="
              openApply(
                jobs.find((j) => j.id === record.jobPostId) || {
                  id: record.jobPostId,
                  title: record.jobTitle || '',
                  status: 'OPEN',
                },
              )
            "
          >
            再次投递
          </Button>
          <span v-else class="text-slate-400">{{
            actionHint(record as ApplicationVO)
          }}</span>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="applyOpen"
      :confirm-loading="applying"
      :title="`申请：${applyJob?.title || ''}`"
      ok-text="提交"
      @ok="submitApply"
    >
      <Form layout="vertical">
        <Form.Item label="简历文本" required>
          <Textarea
            v-model:value="applyForm.resumeText"
            :rows="8"
            placeholder="粘贴完整简历文本（需含教育/经历/技能等）；也可上传 PDF/DOCX/TXT/MD"
          />
        </Form.Item>
        <Form.Item label="附件（可选）">
          <Upload :before-upload="beforeUpload" :max-count="1">
            <Button>选择文件</Button>
          </Upload>
          <div v-if="applyForm.file" class="mt-1 text-xs text-slate-500">
            {{ applyForm.file.name }}
          </div>
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>

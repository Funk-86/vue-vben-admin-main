<script lang="ts" setup>
import type { OperationLogVO } from '#/api/hr';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  message,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { getOperationLogDetail, getOperationLogs } from '#/api/hr';

const loading = ref(false);
const detailLoading = ref(false);
const list = ref<OperationLogVO[]>([]);
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });

const query = reactive({
  module: '',
  range: undefined as [dayjs.Dayjs, dayjs.Dayjs] | undefined,
  status: undefined as number | undefined,
});

const detailOpen = ref(false);
const detail = ref<null | OperationLogVO>(null);

const columns = [
  { dataIndex: 'createdAt', key: 'createdAt', title: '时间', width: 170 },
  { dataIndex: 'username', key: 'username', title: '操作人', width: 120 },
  { dataIndex: 'module', key: 'module', title: '模块', width: 120 },
  { dataIndex: 'operation', key: 'operation', title: '操作', width: 120 },
  { dataIndex: 'method', key: 'method', title: '请求', ellipsis: true },
  { dataIndex: 'status', key: 'status', title: '结果', width: 90 },
  { dataIndex: 'duration', key: 'duration', title: '耗时(ms)', width: 100 },
  { dataIndex: 'ip', key: 'ip', title: 'IP', width: 130 },
  { key: 'action', title: '操作', width: 90, fixed: 'right' as const },
];

const requestDisplay = computed(() =>
  formatPayload(detail.value?.requestInfo || detail.value?.params),
);
const responseDisplay = computed(() =>
  formatPayload(detail.value?.responseInfo),
);

function formatPayload(raw?: null | string) {
  if (!raw || !raw.trim()) {
    return '';
  }
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

async function loadData(page?: { current: number; pageSize: number }) {
  if (page) {
    pagination.current = page.current;
    pagination.pageSize = page.pageSize;
  }
  loading.value = true;
  try {
    const result = await getOperationLogs({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      module: query.module || undefined,
      status: query.status,
      startTime: query.range?.[0]?.startOf('day').format('YYYY-MM-DDTHH:mm:ss'),
      endTime: query.range?.[1]?.endOf('day').format('YYYY-MM-DDTHH:mm:ss'),
    });
    list.value = result.records ?? [];
    pagination.total = result.total ?? 0;
    pagination.current = result.pageNum ?? pagination.current;
  } finally {
    loading.value = false;
  }
}

function onSearch() {
  pagination.current = 1;
  void loadData();
}

function onReset() {
  query.module = '';
  query.status = undefined;
  query.range = undefined;
  onSearch();
}

function handleTableChange(pag: { current?: number; pageSize?: number }) {
  void loadData({
    current: pag.current ?? 1,
    pageSize: pag.pageSize ?? pagination.pageSize,
  });
}

async function openDetail(record: OperationLogVO) {
  detailOpen.value = true;
  detail.value = null;
  detailLoading.value = true;
  try {
    detail.value = await getOperationLogDetail(record.id);
  } catch {
    detailOpen.value = false;
  } finally {
    detailLoading.value = false;
  }
}

async function copyText(text: string, label: string) {
  if (!text) {
    message.warning(`${label}为空`);
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    message.success(`${label}已复制`);
  } catch {
    message.error('复制失败');
  }
}

onMounted(() => {
  void loadData();
});
</script>

<template>
  <Page
    description="系统操作审计日志（可查看 Request / Response）"
    title="操作日志"
  >
    <Form layout="inline" class="mb-4 flex flex-wrap gap-2">
      <Form.Item label="模块">
        <Input
          v-model:value="query.module"
          allow-clear
          placeholder="如：员工管理"
          class="w-40"
        />
      </Form.Item>
      <Form.Item label="结果">
        <Select
          v-model:value="query.status"
          allow-clear
          placeholder="全部"
          class="w-28"
          :options="[
            { label: '成功', value: 1 },
            { label: '失败', value: 0 },
          ]"
        />
      </Form.Item>
      <Form.Item label="时间">
        <DatePicker.RangePicker v-model:value="query.range" />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button type="primary" @click="onSearch">查询</Button>
          <Button @click="onReset">重置</Button>
        </Space>
      </Form.Item>
    </Form>

    <Table
      :columns="columns"
      :data-source="list"
      :loading="loading"
      :pagination="{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
      }"
      :scroll="{ x: 1200 }"
      row-key="id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Tag :color="record.status === 1 ? 'success' : 'error'">
            {{ record.status === 1 ? '成功' : '失败' }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'username'">
          {{ record.username || record.userId || '-' }}
        </template>
        <template v-else-if="column.key === 'action'">
          <Button
            type="link"
            size="small"
            @click="openDetail(record as OperationLogVO)"
          >
            详情
          </Button>
        </template>
      </template>
    </Table>

    <Drawer
      v-model:open="detailOpen"
      title="操作日志详情"
      :width="680"
      destroy-on-close
    >
      <div v-if="detailLoading" class="py-8 text-center text-gray-400">
        加载中...
      </div>
      <template v-else-if="detail">
        <Descriptions :column="1" bordered size="small" class="mb-4">
          <Descriptions.Item label="时间">
            {{ detail.createdAt || '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="操作人">
            {{ detail.username || detail.userId || '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="模块">
            {{ detail.module || '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="操作">
            {{ detail.operation || '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="请求">
            {{ detail.method || '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="IP">
            {{ detail.ip || '-' }}
          </Descriptions.Item>
          <Descriptions.Item label="结果">
            <Tag :color="detail.status === 1 ? 'success' : 'error'">
              {{ detail.status === 1 ? '成功' : '失败' }}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="耗时">
            {{ detail.duration != null ? `${detail.duration} ms` : '-' }}
          </Descriptions.Item>
          <Descriptions.Item v-if="detail.errorMsg" label="错误">
            <span class="text-red-500">{{ detail.errorMsg }}</span>
          </Descriptions.Item>
        </Descriptions>

        <div class="mb-2 flex items-center justify-between">
          <div class="font-medium">Request</div>
          <Button
            size="small"
            type="link"
            @click="copyText(requestDisplay, 'Request')"
          >
            复制
          </Button>
        </div>
        <pre
          class="mb-4 max-h-64 overflow-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs leading-5"
          >{{ requestDisplay || '无请求记录（升级前日志）' }}</pre>

        <div class="mb-2 flex items-center justify-between">
          <div class="font-medium">Response</div>
          <Button
            size="small"
            type="link"
            @click="copyText(responseDisplay, 'Response')"
          >
            复制
          </Button>
        </div>
        <pre
          class="max-h-64 overflow-auto rounded border border-gray-200 bg-gray-50 p-3 text-xs leading-5"
          >{{ responseDisplay || '无响应记录（升级前日志）' }}</pre>
      </template>
    </Drawer>
  </Page>
</template>

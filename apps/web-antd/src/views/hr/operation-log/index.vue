<script lang="ts" setup>
import type { OperationLogVO } from '#/api/hr';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  DatePicker,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { getOperationLogs } from '#/api/hr';

const loading = ref(false);
const list = ref<OperationLogVO[]>([]);
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });

const query = reactive({
  module: '',
  range: undefined as [dayjs.Dayjs, dayjs.Dayjs] | undefined,
  status: undefined as number | undefined,
});

const columns = [
  { dataIndex: 'createdAt', key: 'createdAt', title: '时间', width: 170 },
  { dataIndex: 'username', key: 'username', title: '操作人', width: 120 },
  { dataIndex: 'module', key: 'module', title: '模块', width: 120 },
  { dataIndex: 'operation', key: 'operation', title: '操作', width: 120 },
  { dataIndex: 'method', key: 'method', title: '请求', ellipsis: true },
  { dataIndex: 'status', key: 'status', title: '结果', width: 90 },
  { dataIndex: 'duration', key: 'duration', title: '耗时(ms)', width: 100 },
  { dataIndex: 'ip', key: 'ip', title: 'IP', width: 130 },
];

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

onMounted(() => {
  void loadData();
});
</script>

<template>
  <Page description="系统操作审计日志（落库查询）" title="操作日志">
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
      :scroll="{ x: 1100 }"
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
      </template>
    </Table>
  </Page>
</template>

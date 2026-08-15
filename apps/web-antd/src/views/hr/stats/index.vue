<script lang="ts" setup>
import type { HrStatsVO } from '#/api/hr';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Card,
  Col,
  DatePicker,
  Progress,
  Row,
  Statistic,
  Table,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { getHrStats } from '#/api/hr';

const loading = ref(false);
const yearMonth = ref(dayjs());
const stats = ref<HrStatsVO | null>(null);

const deptColumns = [
  { title: '部门', dataIndex: 'name' },
  { title: '在职人数', dataIndex: 'count', width: 120 },
];

const abnormalColumns = [
  { title: '类型', dataIndex: 'name' },
  { title: '人次', dataIndex: 'count', width: 120 },
];

async function load() {
  loading.value = true;
  try {
    stats.value = await getHrStats(yearMonth.value.format('YYYY-MM'));
  } finally {
    loading.value = false;
  }
}

function mapRecord(record?: Record<string, number>) {
  return Object.entries(record || {}).map(([name, count]) => ({ name, count }));
}

onMounted(load);
</script>

<template>
  <Page title="统计看板" description="人力分布、考勤异常、发薪汇总、任务/项目完成率">
    <div class="mb-4">
      <DatePicker
        v-model:value="yearMonth"
        picker="month"
        @change="load"
      />
    </div>

    <Row :gutter="16" class="mb-4">
      <Col :span="6">
        <Card :loading="loading">
          <Statistic title="在职人数" :value="stats?.totalEmployees ?? 0" />
        </Card>
      </Col>
      <Col :span="6">
        <Card :loading="loading">
          <Statistic
            title="本月考勤异常"
            :value="stats?.attendanceAbnormalCount ?? 0"
            suffix="人次"
          />
        </Card>
      </Col>
      <Col :span="6">
        <Card :loading="loading">
          <Statistic
            title="本月应发合计"
            :value="Number(stats?.salaryTotalAmount ?? 0)"
            prefix="¥"
            :precision="2"
          />
        </Card>
      </Col>
      <Col :span="6">
        <Card :loading="loading">
          <Statistic
            title="发薪进度"
            :value="`${stats?.salaryPaidCount ?? 0}/${(stats?.salaryPaidCount ?? 0) + (stats?.salaryPendingCount ?? 0)}`"
          />
        </Card>
      </Col>
    </Row>

    <Row :gutter="16" class="mb-4">
      <Col :span="12">
        <Card title="任务完成率" :loading="loading">
          <Progress :percent="stats?.taskCompletionRate ?? 0" />
          <div class="mt-2 text-sm text-gray-500">
            已完成 {{ stats?.taskDoneCount ?? 0 }} / 未关闭根任务
            {{ stats?.taskTotalCount ?? 0 }}
          </div>
        </Card>
      </Col>
      <Col :span="12">
        <Card title="项目完成率" :loading="loading">
          <Progress :percent="stats?.projectCompletionRate ?? 0" />
          <div class="mt-2 text-sm text-gray-500">
            已完成 {{ stats?.projectDoneCount ?? 0 }} / 未关闭项目
            {{ stats?.projectTotalCount ?? 0 }}
          </div>
        </Card>
      </Col>
    </Row>

    <Row :gutter="16">
      <Col :span="12">
        <Card title="人力分布" :loading="loading">
          <Table
            :columns="deptColumns"
            :data-source="mapRecord(stats?.departmentDistribution)"
            :pagination="false"
            row-key="name"
            size="small"
          />
        </Card>
      </Col>
      <Col :span="12">
        <Card title="考勤异常明细" :loading="loading">
          <Table
            :columns="abnormalColumns"
            :data-source="mapRecord(stats?.attendanceAbnormal)"
            :pagination="false"
            row-key="name"
            size="small"
          />
        </Card>
      </Col>
    </Row>
  </Page>
</template>

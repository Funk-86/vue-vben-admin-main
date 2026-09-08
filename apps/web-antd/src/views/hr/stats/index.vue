<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { HrStatsVO } from '#/api/hr';

import { onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import {
  Card,
  Col,
  DatePicker,
  Progress,
  Row,
  Statistic,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { getHrStats } from '#/api/hr';

const loading = ref(false);
const yearMonth = ref(dayjs());
const stats = ref<HrStatsVO | null>(null);

const deptChartRef = ref<EchartsUIType>();
const abnormalChartRef = ref<EchartsUIType>();
const { renderEcharts: renderDeptChart } = useEcharts(deptChartRef);
const { renderEcharts: renderAbnormalChart } = useEcharts(abnormalChartRef);

function mapRecord(record?: Record<string, number>) {
  return Object.entries(record || {}).map(([name, count]) => ({ name, count }));
}

function renderCharts() {
  const deptData = mapRecord(stats.value?.departmentDistribution).filter(
    (d) => Number(d.count) > 0,
  );
  renderDeptChart({
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, type: 'scroll' },
    series: [
      {
        type: 'pie',
        radius: ['38%', '62%'],
        data:
          deptData.length > 0
            ? deptData.map((d) => ({ name: d.name, value: d.count }))
            : [{ name: '暂无在职人员', value: 0 }],
        label: { formatter: '{b}: {c}人' },
      },
    ],
  });

  const abnormalData = mapRecord(stats.value?.attendanceAbnormal);
  renderAbnormalChart({
    tooltip: { trigger: 'axis' },
    grid: { bottom: 24, left: 48, right: 16, top: 24 },
    xAxis: {
      data: abnormalData.map((d) => d.name),
      type: 'category',
    },
    yAxis: { minInterval: 1, type: 'value' },
    series: [
      {
        barMaxWidth: 48,
        data: abnormalData.map((d) => d.count),
        itemStyle: { color: '#ff7875' },
        type: 'bar',
      },
    ],
  });
}

async function load() {
  loading.value = true;
  try {
    stats.value = await getHrStats(yearMonth.value.format('YYYY-MM'));
    renderCharts();
  } finally {
    loading.value = false;
  }
}

watch(stats, () => renderCharts());

onMounted(load);
</script>

<template>
  <Page
    title="统计看板"
    description="人力分布、考勤异常、发薪汇总、任务/项目完成率"
  >
    <div class="mb-4">
      <DatePicker v-model:value="yearMonth" picker="month" @change="load" />
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
          <EchartsUI ref="deptChartRef" style="height: 320px" />
        </Card>
      </Col>
      <Col :span="12">
        <Card title="考勤异常明细" :loading="loading">
          <EchartsUI ref="abnormalChartRef" style="height: 320px" />
        </Card>
      </Col>
    </Row>
  </Page>
</template>

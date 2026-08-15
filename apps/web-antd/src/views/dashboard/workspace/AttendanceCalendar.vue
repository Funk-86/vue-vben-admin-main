<script lang="ts" setup>
import type { Dayjs } from 'dayjs';
import type { DashboardCalendar } from '#/api/hr/dashboard';

import { computed, ref, watch } from 'vue';

import { Button, Card, Col, DatePicker, Row, Spin, Statistic } from 'ant-design-vue';
import dayjs from 'dayjs';

import { getDashboardCalendar } from '#/api/hr';

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

const loading = ref(false);
const currentMonth = ref<Dayjs>(dayjs().startOf('month'));
const calendar = ref<DashboardCalendar>();

const STATUS_META: Record<
  number,
  { bg: string; label: string; text: string }
> = {
  0: { bg: '#f5f5f5', label: '无记录', text: '#8c8c8c' },
  1: { bg: '#b7eb8f', label: '正常', text: '#389e0d' },
  2: { bg: '#ffe58f', label: '迟到', text: '#d48806' },
  3: { bg: '#ffd591', label: '早退', text: '#d46b08' },
  4: { bg: '#ffa39e', label: '缺勤', text: '#cf1322' },
  5: { bg: '#d9d9d9', label: '请假', text: '#595959' },
};

const monthTitle = computed(() => currentMonth.value.format('YYYY年M月'));

const calendarCells = computed(() => {
  const data = calendar.value;
  if (!data) {
    return [];
  }

  const firstWeekday = currentMonth.value.startOf('month').day();
  const leading = (firstWeekday + 6) % 7;
  const cells: Array<{ day?: number; status?: number }> = [];

  for (let i = 0; i < leading; i++) {
    cells.push({});
  }

  for (let day = 1; day <= data.totalDays; day++) {
    cells.push({
      day,
      status: data.dayStatus[day - 1] ?? 0,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({});
  }

  return cells;
});

async function loadCalendar() {
  loading.value = true;
  try {
    calendar.value = await getDashboardCalendar(
      currentMonth.value.format('YYYY-MM'),
    );
  } finally {
    loading.value = false;
  }
}

function changeMonth(offset: number) {
  currentMonth.value = currentMonth.value.add(offset, 'month');
}

function onMonthPick(value: Dayjs | string) {
  currentMonth.value = dayjs(value).startOf('month');
}

function cellStyle(status: number | undefined) {
  const meta = STATUS_META[status ?? 0] ?? STATUS_META[0];
  return {
    backgroundColor: meta.bg,
    color: meta.text,
  };
}

watch(currentMonth, loadCalendar, { immediate: true });
</script>

<template>
  <Card title="我的考勤月历">
    <template #extra>
      <div class="flex items-center gap-2">
        <Button size="small" @click="changeMonth(-1)">上月</Button>
        <DatePicker
          :allow-clear="false"
          :value="currentMonth"
          picker="month"
          @update:value="onMonthPick"
        />
        <Button size="small" @click="changeMonth(1)">下月</Button>
      </div>
    </template>

    <Spin :spinning="loading">
      <Row :gutter="16" class="mb-4">
        <Col :span="8">
          <Statistic title="打卡天数" :value="calendar?.punchDays ?? 0" />
        </Col>
        <Col :span="8">
          <Statistic
            title="正常"
            :value="calendar?.normalCount ?? 0"
            :value-style="{ color: '#52c41a' }"
          />
        </Col>
        <Col :span="8">
          <Statistic
            title="迟到"
            :value="calendar?.lateCount ?? 0"
            :value-style="{ color: '#faad14' }"
          />
        </Col>
      </Row>

      <div class="text-center text-base font-medium text-gray-700">
        {{ monthTitle }}
      </div>

      <div class="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-gray-500">
        <div v-for="label in WEEK_LABELS" :key="label" class="py-1 font-medium">
          {{ label }}
        </div>
      </div>

      <div class="mt-1 grid grid-cols-7 gap-1">
        <div
          v-for="(cell, index) in calendarCells"
          :key="index"
          class="flex h-10 items-center justify-center rounded text-sm"
          :class="cell.day ? 'font-medium' : ''"
          :style="cell.day ? cellStyle(cell.status) : undefined"
        >
          {{ cell.day ?? '' }}
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
        <span
          v-for="(meta, status) in STATUS_META"
          :key="status"
          class="flex items-center gap-1"
        >
          <span
            class="inline-block h-3 w-3 rounded"
            :style="{ backgroundColor: meta.bg }"
          />
          {{ meta.label }}
        </span>
      </div>
    </Spin>
  </Card>
</template>

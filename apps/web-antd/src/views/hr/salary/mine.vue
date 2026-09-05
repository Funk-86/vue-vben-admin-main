<script lang="ts" setup>
import type { SalaryVO } from '#/api/hr';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { downloadFileFromBlob } from '@vben/utils';

import {
  Button,
  DatePicker,
  Descriptions,
  Drawer,
  message,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  exportMySalaryExcel,
  getMySalaryById,
  getMySalaryList,
} from '#/api/hr';
import { SALARY_STATUS_MAP } from '#/views/hr/constants';

const loading = ref(false);
const exportLoading = ref(false);
const list = ref<SalaryVO[]>([]);
const detailOpen = ref(false);
const detail = ref<null | SalaryVO>(null);
const filterMonth = ref<dayjs.Dayjs | undefined>();
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });

const columns = [
  { dataIndex: 'salaryMonth', key: 'salaryMonth', title: '月份', width: 100 },
  { dataIndex: 'baseSalary', key: 'baseSalary', title: '底薪', width: 100 },
  { dataIndex: 'bonus', key: 'bonus', title: '奖金', width: 100 },
  { dataIndex: 'deduction', key: 'deduction', title: '扣款', width: 90 },
  { dataIndex: 'actualSalary', key: 'actualSalary', title: '实发', width: 110 },
  { dataIndex: 'payDate', key: 'payDate', title: '发放日', width: 120 },
  { dataIndex: 'status', key: 'status', title: '状态', width: 90 },
  { key: 'action', title: '操作', width: 100 },
];

async function loadData(page?: { current: number; pageSize: number }) {
  loading.value = true;
  try {
    const result = await getMySalaryList({
      pageNum: page?.current ?? pagination.current,
      pageSize: page?.pageSize ?? pagination.pageSize,
      salaryMonth: filterMonth.value
        ? filterMonth.value.format('YYYY-MM')
        : undefined,
    });
    list.value = result.records;
    pagination.total = result.total;
    pagination.current = result.pageNum;
    pagination.pageSize = result.pageSize;
  } finally {
    loading.value = false;
  }
}

async function handleExport() {
  exportLoading.value = true;
  try {
    const blob = await exportMySalaryExcel({
      salaryMonth: filterMonth.value
        ? filterMonth.value.format('YYYY-MM')
        : undefined,
    });
    downloadFileFromBlob({
      fileName: `我的薪资条${filterMonth.value ? `_${filterMonth.value.format('YYYY-MM')}` : ''}.xlsx`,
      source: blob,
    });
    message.success('导出成功');
  } finally {
    exportLoading.value = false;
  }
}

async function openDetail(record: SalaryVO) {
  detail.value = await getMySalaryById(record.id);
  detailOpen.value = true;
}

onMounted(() => loadData());
</script>

<template>
  <Page description="仅展示已发放的本人薪资条" title="我的薪资条">
    <div class="mb-4">
      <Space>
        <DatePicker
          v-model:value="filterMonth"
          allow-clear
          picker="month"
          placeholder="按月份筛选"
        />
        <Button type="primary" @click="loadData()">查询</Button>
        <Button :loading="exportLoading" @click="handleExport">
          导出 Excel
        </Button>
      </Space>
    </div>

    <Table
      :columns="columns"
      :data-source="list"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      @change="
        (pag) =>
          loadData({ current: pag.current ?? 1, pageSize: pag.pageSize ?? 10 })
      "
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Tag color="green">{{ SALARY_STATUS_MAP[record.status] }}</Tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <Button size="small" type="link" @click="openDetail(record as any)">
            明细
          </Button>
        </template>
      </template>
    </Table>

    <Drawer v-model:open="detailOpen" title="薪资条明细" width="420">
      <Descriptions v-if="detail" :column="1" bordered size="small">
        <Descriptions.Item label="月份">
          {{ detail.salaryMonth }}
        </Descriptions.Item>
        <Descriptions.Item label="工号">{{ detail.empNo }}</Descriptions.Item>
        <Descriptions.Item label="姓名">
          {{ detail.employeeName }}
        </Descriptions.Item>
        <Descriptions.Item label="岗位">
          {{ detail.positionName || '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="底薪">
          {{ detail.baseSalary }}
        </Descriptions.Item>
        <Descriptions.Item label="任务奖金">
          {{ detail.taskBonus ?? 0 }}
        </Descriptions.Item>
        <Descriptions.Item label="最终奖金">
          {{ detail.bonus ?? 0 }}
        </Descriptions.Item>
        <Descriptions.Item label="扣款">
          {{ detail.deduction ?? 0 }}
        </Descriptions.Item>
        <Descriptions.Item label="实发">
          {{ detail.actualSalary }}
        </Descriptions.Item>
        <Descriptions.Item label="发放日">
          {{ detail.payDate || '-' }}
        </Descriptions.Item>
        <Descriptions.Item label="备注">
          {{ detail.remark || '-' }}
        </Descriptions.Item>
      </Descriptions>
    </Drawer>
  </Page>
</template>

<script lang="ts" setup>
import type { ContractExpireVO, DepartmentVO } from '#/api/hr';

import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Button,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  extendDocumentExpire,
  getContractExpireList,
  getDepartmentTree,
  runContractExpireRemind,
} from '#/api/hr';
import { flattenDepartments } from '#/views/hr/constants';

import '#/views/hr/hr-common.css';

const router = useRouter();

const loading = ref(false);
const remindLoading = ref(false);
const list = ref<ContractExpireVO[]>([]);
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });
const deptTree = ref<DepartmentVO[]>([]);

const query = reactive({
  deptId: undefined as number | undefined,
  keyword: '',
  status: 'ALL' as 'ALL' | 'EXPIRED' | 'EXPIRING',
  withinDays: 30,
});

const extendOpen = ref(false);
const extending = ref(false);
const current = ref<ContractExpireVO | null>(null);
const extendForm = reactive({
  expireDate: undefined as dayjs.Dayjs | undefined,
  remark: '',
});

const deptOptions = computed(() =>
  flattenDepartments(deptTree.value).map((d) => ({
    label: d.deptName,
    value: d.id,
  })),
);

const statusOptions = [
  { label: '全部', value: 'ALL' },
  { label: '即将到期', value: 'EXPIRING' },
  { label: '已过期', value: 'EXPIRED' },
];

const withinOptions = [
  { label: '30天内', value: 30 },
  { label: '15天内', value: 15 },
  { label: '7天内', value: 7 },
];

const columns = [
  { dataIndex: 'employeeName', key: 'employeeName', title: '员工', width: 100 },
  { dataIndex: 'empNo', key: 'empNo', title: '工号', width: 90 },
  { dataIndex: 'deptName', key: 'deptName', title: '部门', width: 120 },
  { dataIndex: 'title', key: 'title', title: '合同标题', ellipsis: true },
  { dataIndex: 'expireDate', key: 'expireDate', title: '到期日', width: 120 },
  { dataIndex: 'daysLeft', key: 'daysLeft', title: '剩余天数', width: 100 },
  { key: 'action', title: '操作', width: 160 },
];

async function loadData() {
  loading.value = true;
  try {
    const res = await getContractExpireList({
      deptId: query.deptId,
      keyword: query.keyword || undefined,
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      status: query.status,
      withinDays: query.withinDays,
    });
    list.value = res.records;
    pagination.total = res.total;
  } finally {
    loading.value = false;
  }
}

function onSearch() {
  pagination.current = 1;
  void loadData();
}

function onReset() {
  query.deptId = undefined;
  query.keyword = '';
  query.status = 'ALL';
  query.withinDays = 30;
  onSearch();
}

async function handleRemind() {
  remindLoading.value = true;
  try {
    const res = await runContractExpireRemind();
    message.success(`提醒完成，新发送 ${res.sent ?? 0} 条站内信`);
  } finally {
    remindLoading.value = false;
  }
}

function openExtend(row: ContractExpireVO) {
  current.value = row;
  extendForm.expireDate = row.expireDate
    ? dayjs(row.expireDate).add(1, 'year')
    : dayjs().add(1, 'year');
  extendForm.remark = '续签延期';
  extendOpen.value = true;
}

async function submitExtend() {
  if (!current.value?.documentId || !extendForm.expireDate) {
    message.warning('请选择新到期日');
    return;
  }
  extending.value = true;
  try {
    await extendDocumentExpire(current.value.documentId, {
      expireDate: extendForm.expireDate.format('YYYY-MM-DD'),
      remark: extendForm.remark || undefined,
    });
    message.success('已延长到期日');
    extendOpen.value = false;
    await loadData();
  } finally {
    extending.value = false;
  }
}

onMounted(async () => {
  deptTree.value = await getDepartmentTree();
  await loadData();
});
</script>

<template>
  <Page
    description="劳动合同即将到期 / 已过期工作台（站内信 + 邮件提醒）"
    title="合同到期"
  >
    <Form class="mb-4 flex flex-wrap gap-3" layout="inline">
      <Form.Item label="状态">
        <Select
          v-model:value="query.status"
          :options="statusOptions"
          :popup-match-select-width="false"
          class="w-36"
          popup-class-name="hr-filter-select-dropdown"
        />
      </Form.Item>
      <Form.Item label="窗口">
        <Select
          v-model:value="query.withinDays"
          :options="withinOptions"
          :popup-match-select-width="false"
          class="w-28"
          popup-class-name="hr-filter-select-dropdown"
        />
      </Form.Item>
      <Form.Item label="部门">
        <Select
          v-model:value="query.deptId"
          :options="deptOptions"
          :popup-match-select-width="false"
          allow-clear
          class="w-48"
          option-filter-prop="label"
          placeholder="全部"
          popup-class-name="hr-filter-select-dropdown"
          show-search
        />
      </Form.Item>
      <Form.Item label="关键字">
        <Input
          v-model:value="query.keyword"
          allow-clear
          class="w-44"
          placeholder="姓名/工号"
        />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button type="primary" @click="onSearch">查询</Button>
          <Button @click="onReset">重置</Button>
          <Button
            :loading="remindLoading"
            ghost
            type="primary"
            @click="handleRemind"
          >
            立即扫描提醒
          </Button>
          <Button @click="router.push('/hr/document')">文档管理</Button>
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
        showTotal: (total: number) => `共 ${total} 条`,
      }"
      :scroll="{ x: 1000 }"
      row-key="documentId"
      @change="
        (p) => {
          pagination.current = p.current ?? 1;
          pagination.pageSize = p.pageSize ?? 10;
          loadData();
        }
      "
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'daysLeft'">
          <Tag :color="(record.daysLeft ?? 0) < 0 ? 'error' : 'orange'">
            {{
              (record.daysLeft ?? 0) < 0
                ? `已过期 ${Math.abs(record.daysLeft ?? 0)} 天`
                : `剩余 ${record.daysLeft} 天`
            }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <Button size="small" type="link" @click="openExtend(record as any)">
            续签延期
          </Button>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="extendOpen"
      :confirm-loading="extending"
      title="延长合同到期日"
      @ok="submitExtend"
    >
      <Form layout="vertical">
        <Form.Item label="员工">
          <span>{{ current?.employeeName }}（{{ current?.empNo }}）</span>
        </Form.Item>
        <Form.Item label="原到期日">
          <span>{{ current?.expireDate || '-' }}</span>
        </Form.Item>
        <Form.Item label="新到期日" required>
          <DatePicker v-model:value="extendForm.expireDate" class="w-full" />
        </Form.Item>
        <Form.Item label="备注">
          <Input v-model:value="extendForm.remark" />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>

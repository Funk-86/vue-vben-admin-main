<script lang="ts" setup>
import type { LeaveBalanceVO, LeaveRequestVO, LeaveTypeVO } from '#/api/hr';

import { computed, onMounted, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';
import { useAccessStore, useUserStore } from '@vben/stores';

import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  approveLeaveRequest,
  cancelLeaveRequest,
  createLeaveRequest,
  createLeaveType,
  deleteLeaveType,
  getLeaveBalances,
  getLeaveRequests,
  getLeaveTypes,
  getMyLeaveBalances,
  initLeaveBalances,
  rejectLeaveRequest,
  updateLeaveType,
} from '#/api/hr';
import { COMMON_STATUS, LEAVE_REQUEST_STATUS_MAP } from '#/views/hr/constants';
import { hasAccessCode } from '#/views/hr/roles';

const userStore = useUserStore();
const accessStore = useAccessStore();

const canApprove = computed(() =>
  hasAccessCode(accessStore.accessCodes, 'feat.leave.approve'),
);

const canManageTypes = computed(() =>
  hasAccessCode(accessStore.accessCodes, 'feat.org.manage'),
);

const canViewTeamBalances = computed(() =>
  hasAccessCode(accessStore.accessCodes, [
    'feat.leave.approve',
    'feat.leave.balance.manage',
  ]),
);

const canInitBalances = computed(() =>
  hasAccessCode(accessStore.accessCodes, 'feat.leave.balance.manage'),
);

const activeTab = ref('requests');
const loadingRequests = ref(false);
const loadingTypes = ref(false);
const loadingBalances = ref(false);
const requests = ref<LeaveRequestVO[]>([]);
const types = ref<LeaveTypeVO[]>([]);
const myBalances = ref<LeaveBalanceVO[]>([]);
const teamBalances = ref<LeaveBalanceVO[]>([]);
const balanceYear = ref(dayjs().year());
const requestPagination = reactive({ current: 1, pageSize: 10, total: 0 });

const typeModalOpen = ref(false);
const requestModalOpen = ref(false);
const editingType = ref<LeaveTypeVO | null>(null);

const typeForm = reactive({
  maxDays: undefined as number | undefined,
  status: 1,
  typeCode: '',
  typeName: '',
});

const requestForm = reactive({
  days: 1,
  endTime: undefined as dayjs.Dayjs | undefined,
  leaveTypeId: undefined as number | undefined,
  reason: '',
  startTime: undefined as dayjs.Dayjs | undefined,
});

const typeOptions = ref<{ label: string; value: number }[]>([]);

const selectedBalanceHint = computed(() => {
  if (!requestForm.leaveTypeId) return '';
  const bal = myBalances.value.find(
    (b) => b.leaveTypeId === requestForm.leaveTypeId,
  );
  if (!bal) {
    const type = types.value.find((t) => t.id === requestForm.leaveTypeId);
    if (type && (type.maxDays === null || type.maxDays === undefined))
      return '该类型不限额';
    return '暂无余额记录（提交时将按年度额度初始化）';
  }
  return `剩余 ${bal.remainingDays} 天（额度 ${bal.quotaDays}，已用 ${bal.usedDays}，占用中 ${bal.pendingDays}）`;
});

const requestColumns = [
  {
    dataIndex: 'employeeName',
    key: 'employeeName',
    title: '申请人',
    width: 100,
  },
  { dataIndex: 'leaveType', key: 'leaveType', title: '假期类型', width: 100 },
  { dataIndex: 'startTime', key: 'startTime', title: '开始时间', width: 170 },
  { dataIndex: 'endTime', key: 'endTime', title: '结束时间', width: 170 },
  { dataIndex: 'days', key: 'days', title: '天数', width: 70 },
  { dataIndex: 'status', key: 'status', title: '状态', width: 90 },
  { dataIndex: 'reason', key: 'reason', title: '原因', ellipsis: true },
  { key: 'action', title: '操作', width: 220 },
];

const typeColumns = [
  { dataIndex: 'typeName', key: 'typeName', title: '类型名称' },
  { dataIndex: 'typeCode', key: 'typeCode', title: '类型编码' },
  { dataIndex: 'maxDays', key: 'maxDays', title: '最大天数' },
  { dataIndex: 'status', key: 'status', title: '状态', width: 90 },
  { key: 'action', title: '操作', width: 160 },
];

const balanceColumns = [
  { dataIndex: 'employeeName', key: 'employeeName', title: '员工', width: 100 },
  {
    dataIndex: 'leaveTypeName',
    key: 'leaveTypeName',
    title: '假期类型',
    width: 100,
  },
  { dataIndex: 'year', key: 'year', title: '年度', width: 80 },
  { dataIndex: 'quotaDays', key: 'quotaDays', title: '额度', width: 80 },
  { dataIndex: 'usedDays', key: 'usedDays', title: '已用', width: 80 },
  { dataIndex: 'pendingDays', key: 'pendingDays', title: '占用中', width: 80 },
  {
    dataIndex: 'remainingDays',
    key: 'remainingDays',
    title: '剩余',
    width: 80,
  },
];

const myBalanceColumns = balanceColumns.filter((c) => c.key !== 'employeeName');

async function loadTypes() {
  loadingTypes.value = true;
  try {
    types.value = await getLeaveTypes();
    typeOptions.value = types.value.map((t) => ({
      label: t.typeName,
      value: t.id,
    }));
  } finally {
    loadingTypes.value = false;
  }
}

async function loadRequests() {
  loadingRequests.value = true;
  try {
    const params = {
      pageNum: requestPagination.current,
      pageSize: requestPagination.pageSize,
    };
    const result = await getLeaveRequests(params);
    requests.value = result.records;
    requestPagination.total = result.total;
    requestPagination.current = result.pageNum;
    requestPagination.pageSize = result.pageSize;
  } finally {
    loadingRequests.value = false;
  }
}

async function loadBalances() {
  loadingBalances.value = true;
  try {
    myBalances.value = await getMyLeaveBalances(balanceYear.value);
    if (canViewTeamBalances.value) {
      teamBalances.value = await getLeaveBalances({ year: balanceYear.value });
    }
  } finally {
    loadingBalances.value = false;
  }
}

async function handleInitBalances() {
  await initLeaveBalances({
    overwriteQuota: false,
    year: balanceYear.value,
  });
  message.success('已初始化当年余额');
  await loadBalances();
}

function openTypeCreate() {
  editingType.value = null;
  Object.assign(typeForm, {
    maxDays: undefined,
    status: 1,
    typeCode: '',
    typeName: '',
  });
  typeModalOpen.value = true;
}

function openTypeEdit(record: LeaveTypeVO) {
  editingType.value = record;
  Object.assign(typeForm, {
    maxDays: record.maxDays ?? undefined,
    status: record.status,
    typeCode: record.typeCode,
    typeName: record.typeName,
  });
  typeModalOpen.value = true;
}

async function submitType() {
  if (!typeForm.typeName || !typeForm.typeCode) {
    message.warning('请填写类型名称和编码');
    return;
  }
  const payload = {
    maxDays: typeForm.maxDays ?? null,
    status: typeForm.status,
    typeCode: typeForm.typeCode,
    typeName: typeForm.typeName,
  };
  if (editingType.value) {
    await updateLeaveType(editingType.value.id, payload);
    message.success('更新成功');
  } else {
    await createLeaveType(payload);
    message.success('创建成功');
  }
  typeModalOpen.value = false;
  await loadTypes();
}

async function handleDeleteType(record: LeaveTypeVO) {
  await deleteLeaveType(record.id);
  message.success('已禁用该假期类型');
  await loadTypes();
}

function openRequestCreate() {
  Object.assign(requestForm, {
    days: 1,
    endTime: undefined,
    leaveTypeId: undefined,
    reason: '',
    startTime: undefined,
  });
  void loadBalances();
  requestModalOpen.value = true;
}

async function submitRequest() {
  if (
    !requestForm.leaveTypeId ||
    !requestForm.startTime ||
    !requestForm.endTime ||
    !requestForm.reason
  ) {
    message.warning('请填写完整申请信息');
    return;
  }
  await createLeaveRequest({
    days: requestForm.days,
    endTime: requestForm.endTime.format('YYYY-MM-DDTHH:mm:ss'),
    leaveTypeId: requestForm.leaveTypeId,
    reason: requestForm.reason,
    startTime: requestForm.startTime.format('YYYY-MM-DDTHH:mm:ss'),
  });
  message.success('提交成功');
  requestModalOpen.value = false;
  await Promise.all([loadRequests(), loadBalances()]);
}

async function handleApprove(record: LeaveRequestVO) {
  await approveLeaveRequest(record.id);
  message.success('已通过');
  await Promise.all([loadRequests(), loadBalances()]);
}

async function handleReject(record: LeaveRequestVO) {
  await rejectLeaveRequest(record.id);
  message.success('已拒绝');
  await Promise.all([loadRequests(), loadBalances()]);
}

async function handleCancel(record: LeaveRequestVO) {
  await cancelLeaveRequest(record.id);
  message.success('已撤销');
  await Promise.all([loadRequests(), loadBalances()]);
}

watch(balanceYear, () => {
  void loadBalances();
});

onMounted(async () => {
  await Promise.all([loadTypes(), loadRequests(), loadBalances()]);
});
</script>

<template>
  <Page description="假期类型、余额台账与请假申请审批" title="请假管理">
    <Tabs v-model:active-key="activeTab">
      <Tabs.TabPane key="requests" tab="请假申请">
        <div class="mb-4">
          <Button type="primary" @click="openRequestCreate">提交申请</Button>
        </div>
        <Table
          :columns="requestColumns"
          :data-source="requests"
          :loading="loadingRequests"
          :pagination="requestPagination"
          :scroll="{ x: 1100 }"
          row-key="id"
          @change="
            (pag) => {
              requestPagination.current = pag.current;
              requestPagination.pageSize = pag.pageSize;
              loadRequests();
            }
          "
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <Tag>{{ LEAVE_REQUEST_STATUS_MAP[record.status] }}</Tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <Space v-if="record.status === 0">
                <template v-if="canApprove">
                  <Button
                    size="small"
                    type="link"
                    @click="handleApprove(record)"
                  >
                    通过
                  </Button>
                  <Button
                    danger
                    size="small"
                    type="link"
                    @click="handleReject(record)"
                  >
                    拒绝
                  </Button>
                </template>
                <Button size="small" type="link" @click="handleCancel(record)">
                  撤销
                </Button>
              </Space>
              <span v-else class="text-gray-400">-</span>
            </template>
          </template>
        </Table>
      </Tabs.TabPane>

      <Tabs.TabPane key="balances" tab="假期余额">
        <div class="mb-4 flex flex-wrap items-center gap-3">
          <span>年度</span>
          <InputNumber v-model:value="balanceYear" :min="2020" :max="2100" />
          <Button v-if="canInitBalances" @click="handleInitBalances">
            初始化在职员工额度
          </Button>
        </div>
        <h4 class="mb-2">我的余额</h4>
        <Table
          :columns="myBalanceColumns"
          :data-source="myBalances"
          :loading="loadingBalances"
          :pagination="false"
          class="mb-6"
          row-key="id"
        />
        <template v-if="canViewTeamBalances">
          <h4 class="mb-2">团队/全员余额</h4>
          <Table
            :columns="balanceColumns"
            :data-source="teamBalances"
            :loading="loadingBalances"
            :pagination="false"
            row-key="id"
          />
        </template>
      </Tabs.TabPane>

      <Tabs.TabPane v-if="canManageTypes" key="types" tab="假期类型">
        <div class="mb-4">
          <Button type="primary" @click="openTypeCreate">新增类型</Button>
        </div>
        <Table
          :columns="typeColumns"
          :data-source="types"
          :loading="loadingTypes"
          :pagination="false"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'maxDays'">
              {{ record.maxDays ?? '不限' }}
            </template>
            <template v-else-if="column.key === 'status'">
              <Tag :color="record.status === 1 ? 'green' : 'red'">
                {{ COMMON_STATUS[record.status] }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <Space>
                <Button size="small" type="link" @click="openTypeEdit(record)">
                  编辑
                </Button>
                <Popconfirm
                  title="确定禁用该类型？"
                  @confirm="handleDeleteType(record)"
                >
                  <Button danger size="small" type="link">禁用</Button>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </Tabs.TabPane>
    </Tabs>

    <Modal
      v-model:open="typeModalOpen"
      :title="editingType ? '编辑假期类型' : '新增假期类型'"
      @ok="submitType"
    >
      <Form layout="vertical">
        <Form.Item label="类型名称" required>
          <Input v-model:value="typeForm.typeName" />
        </Form.Item>
        <Form.Item label="类型编码" required>
          <Input v-model:value="typeForm.typeCode" :disabled="!!editingType" />
        </Form.Item>
        <Form.Item label="每年最大天数">
          <InputNumber
            v-model:value="typeForm.maxDays"
            :min="0"
            class="w-full"
            placeholder="留空表示不限"
          />
        </Form.Item>
        <Form.Item label="状态">
          <Select v-model:value="typeForm.status">
            <Select.Option :value="1">启用</Select.Option>
            <Select.Option :value="0">禁用</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      v-model:open="requestModalOpen"
      title="提交请假申请"
      width="560px"
      @ok="submitRequest"
    >
      <Form layout="vertical">
        <Form.Item label="申请人">
          <Input
            :value="
              userStore.userInfo?.realName || userStore.userInfo?.username
            "
            disabled
          />
        </Form.Item>
        <Form.Item label="假期类型" required>
          <Select
            v-model:value="requestForm.leaveTypeId"
            :options="typeOptions"
            class="w-full"
          />
        </Form.Item>
        <Form.Item v-if="selectedBalanceHint" label="余额提示">
          <span class="text-gray-500">{{ selectedBalanceHint }}</span>
        </Form.Item>
        <Form.Item label="开始时间" required>
          <DatePicker
            v-model:value="requestForm.startTime"
            class="w-full"
            show-time
          />
        </Form.Item>
        <Form.Item label="结束时间" required>
          <DatePicker
            v-model:value="requestForm.endTime"
            class="w-full"
            show-time
          />
        </Form.Item>
        <Form.Item label="请假天数" required>
          <InputNumber
            v-model:value="requestForm.days"
            :min="0.5"
            :step="0.5"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="请假原因" required>
          <Input.TextArea v-model:value="requestForm.reason" :rows="3" />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>

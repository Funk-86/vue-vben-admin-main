<script lang="ts" setup>
import type {
  AttendanceAppealVO,
  FieldWorkRequestVO,
  OvertimeRequestVO,
} from '#/api/hr';

import { computed, onMounted, reactive, ref } from 'vue';

import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  TimePicker,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  approveAppealRequest,
  approveFieldWorkRequest,
  approveOvertimeRequest,
  cancelAppealRequest,
  cancelFieldWorkRequest,
  cancelOvertimeRequest,
  createAppealRequest,
  createFieldWorkRequest,
  createOvertimeRequest,
  getAppealRequests,
  getFieldWorkRequests,
  getOvertimeRequests,
  rejectAppealRequest,
  rejectFieldWorkRequest,
  rejectOvertimeRequest,
} from '#/api/hr';
import {
  ATTENDANCE_STATUS_MAP,
  LEAVE_REQUEST_STATUS_MAP,
} from '#/views/hr/constants';
import { useHrAccess } from '#/views/hr/roles';

const { canFeat } = useHrAccess();
const canApprove = computed(() => canFeat('feat.attendance.approve'));

const activeTab = ref('overtime');
const loading = ref(false);

const overtimeList = ref<OvertimeRequestVO[]>([]);
const appealList = ref<AttendanceAppealVO[]>([]);
const fieldList = ref<FieldWorkRequestVO[]>([]);
const otPag = reactive({ current: 1, pageSize: 10, total: 0 });
const appealPag = reactive({ current: 1, pageSize: 10, total: 0 });
const fieldPag = reactive({ current: 1, pageSize: 10, total: 0 });

const STATUS_OPTIONS = [
  { label: '待审', value: 0 },
  { label: '已通过', value: 1 },
  { label: '已驳回', value: 2 },
  { label: '已撤销', value: 3 },
];

const otFilter = reactive({
  dateRange: undefined as [dayjs.Dayjs, dayjs.Dayjs] | undefined,
  status: undefined as number | undefined,
});
const appealFilter = reactive({
  dateRange: undefined as [dayjs.Dayjs, dayjs.Dayjs] | undefined,
  status: undefined as number | undefined,
});

const otModal = ref(false);
const appealModal = ref(false);
const fieldModal = ref(false);

const otForm = reactive({
  endTime: undefined as dayjs.Dayjs | undefined,
  hours: 1,
  reason: '',
  startTime: undefined as dayjs.Dayjs | undefined,
  workDate: undefined as dayjs.Dayjs | undefined,
});

const appealForm = reactive({
  attendDate: undefined as dayjs.Dayjs | undefined,
  checkIn: undefined as dayjs.Dayjs | undefined,
  checkOut: undefined as dayjs.Dayjs | undefined,
  fromStatus: undefined as number | undefined,
  reason: '',
  toStatus: 1,
});

const fieldForm = reactive({
  location: '',
  reason: '',
  workDate: undefined as dayjs.Dayjs | undefined,
});

const otColumns = [
  {
    dataIndex: 'employeeName',
    key: 'employeeName',
    title: '申请人',
    width: 100,
  },
  { dataIndex: 'workDate', key: 'workDate', title: '日期', width: 110 },
  { dataIndex: 'startTime', key: 'startTime', title: '开始', width: 90 },
  { dataIndex: 'endTime', key: 'endTime', title: '结束', width: 90 },
  { dataIndex: 'hours', key: 'hours', title: '时长', width: 70 },
  { dataIndex: 'reason', key: 'reason', title: '原因', ellipsis: true },
  { dataIndex: 'status', key: 'status', title: '状态', width: 90 },
  { key: 'action', title: '操作', width: 200 },
];

const appealColumns = [
  {
    dataIndex: 'employeeName',
    key: 'employeeName',
    title: '申请人',
    width: 100,
  },
  { dataIndex: 'attendDate', key: 'attendDate', title: '补卡日期', width: 110 },
  { dataIndex: 'fromStatus', key: 'fromStatus', title: '原状态', width: 90 },
  { dataIndex: 'toStatus', key: 'toStatus', title: '目标状态', width: 90 },
  { dataIndex: 'reason', key: 'reason', title: '原因', ellipsis: true },
  { dataIndex: 'status', key: 'status', title: '状态', width: 90 },
  { key: 'action', title: '操作', width: 200 },
];

const fieldColumns = [
  {
    dataIndex: 'employeeName',
    key: 'employeeName',
    title: '申请人',
    width: 100,
  },
  { dataIndex: 'workDate', key: 'workDate', title: '日期', width: 110 },
  { dataIndex: 'location', key: 'location', title: '地点', width: 140 },
  { dataIndex: 'reason', key: 'reason', title: '原因', ellipsis: true },
  { dataIndex: 'status', key: 'status', title: '状态', width: 90 },
  { key: 'action', title: '操作', width: 200 },
];

async function loadOvertime() {
  loading.value = true;
  try {
    const res = await getOvertimeRequests({
      dateFrom: otFilter.dateRange?.[0]?.format('YYYY-MM-DD'),
      dateTo: otFilter.dateRange?.[1]?.format('YYYY-MM-DD'),
      pageNum: otPag.current,
      pageSize: otPag.pageSize,
      status: otFilter.status,
    });
    overtimeList.value = res.records;
    otPag.total = res.total;
  } finally {
    loading.value = false;
  }
}

async function loadAppeals() {
  loading.value = true;
  try {
    const res = await getAppealRequests({
      dateFrom: appealFilter.dateRange?.[0]?.format('YYYY-MM-DD'),
      dateTo: appealFilter.dateRange?.[1]?.format('YYYY-MM-DD'),
      pageNum: appealPag.current,
      pageSize: appealPag.pageSize,
      status: appealFilter.status,
    });
    appealList.value = res.records;
    appealPag.total = res.total;
  } finally {
    loading.value = false;
  }
}

async function loadField() {
  loading.value = true;
  try {
    const res = await getFieldWorkRequests({
      pageNum: fieldPag.current,
      pageSize: fieldPag.pageSize,
    });
    fieldList.value = res.records;
    fieldPag.total = res.total;
  } finally {
    loading.value = false;
  }
}

async function submitOt() {
  if (
    !otForm.workDate ||
    !otForm.startTime ||
    !otForm.endTime ||
    !otForm.reason
  ) {
    message.warning('请填写完整');
    return;
  }
  await createOvertimeRequest({
    endTime: otForm.endTime.format('HH:mm:ss'),
    hours: otForm.hours,
    reason: otForm.reason,
    startTime: otForm.startTime.format('HH:mm:ss'),
    workDate: otForm.workDate.format('YYYY-MM-DD'),
  });
  message.success('已提交');
  otModal.value = false;
  await loadOvertime();
}

async function submitAppeal() {
  if (!appealForm.attendDate || !appealForm.reason) {
    message.warning('请填写完整');
    return;
  }
  await createAppealRequest({
    attendDate: appealForm.attendDate.format('YYYY-MM-DD'),
    checkIn: appealForm.checkIn?.format('HH:mm:ss'),
    checkOut: appealForm.checkOut?.format('HH:mm:ss'),
    fromStatus: appealForm.fromStatus,
    reason: appealForm.reason,
    toStatus: appealForm.toStatus,
  });
  message.success('已提交');
  appealModal.value = false;
  await loadAppeals();
}

async function submitField() {
  if (!fieldForm.workDate || !fieldForm.location || !fieldForm.reason) {
    message.warning('请填写完整');
    return;
  }
  await createFieldWorkRequest({
    location: fieldForm.location,
    reason: fieldForm.reason,
    workDate: fieldForm.workDate.format('YYYY-MM-DD'),
  });
  message.success('已提交');
  fieldModal.value = false;
  await loadField();
}

onMounted(() => {
  void loadOvertime();
});
</script>

<template>
  <Tabs
    v-model:active-key="activeTab"
    @change="
      (key) => {
        if (key === 'overtime') loadOvertime();
        else if (key === 'appeal') loadAppeals();
        else loadField();
      }
    "
  >
    <Tabs.TabPane key="overtime" tab="加班申请">
      <div class="mb-3 flex flex-wrap items-center gap-3">
        <Button type="primary" @click="otModal = true">提交加班</Button>
        <Select
          v-model:value="otFilter.status"
          :options="STATUS_OPTIONS"
          allow-clear
          class="w-32"
          placeholder="状态"
          @change="
            () => {
              otPag.current = 1;
              loadOvertime();
            }
          "
        />
        <DatePicker.RangePicker
          v-model:value="otFilter.dateRange"
          @change="
            () => {
              otPag.current = 1;
              loadOvertime();
            }
          "
        />
      </div>
      <Table
        :columns="otColumns"
        :data-source="overtimeList"
        :loading="loading"
        :pagination="otPag"
        row-key="id"
        @change="
          (p) => {
            otPag.current = p.current ?? 1;
            otPag.pageSize = p.pageSize ?? 10;
            loadOvertime();
          }
        "
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Tag>{{ LEAVE_REQUEST_STATUS_MAP[record.status] }}</Tag>
          </template>
          <template v-else-if="column.key === 'action' && record.status === 0">
            <Space>
              <template v-if="canApprove">
                <Button
                  size="small"
                  type="link"
                  @click="
                    approveOvertimeRequest(record.id).then(() => {
                      message.success('已通过并写入考勤备注');
                      loadOvertime();
                    })
                  "
                >
                  通过
                </Button>
                <Button
                  danger
                  size="small"
                  type="link"
                  @click="
                    rejectOvertimeRequest(record.id).then(() => {
                      message.success('已拒绝');
                      loadOvertime();
                    })
                  "
                >
                  拒绝
                </Button>
              </template>
              <Button
                size="small"
                type="link"
                @click="
                  cancelOvertimeRequest(record.id).then(() => {
                    message.success('已撤销');
                    loadOvertime();
                  })
                "
              >
                撤销
              </Button>
            </Space>
          </template>
        </template>
      </Table>
    </Tabs.TabPane>

    <Tabs.TabPane key="appeal" tab="补卡申请">
      <div class="mb-3 flex flex-wrap items-center gap-3">
        <Button type="primary" @click="appealModal = true">提交补卡</Button>
        <Select
          v-model:value="appealFilter.status"
          :options="STATUS_OPTIONS"
          allow-clear
          class="w-32"
          placeholder="状态"
          @change="
            () => {
              appealPag.current = 1;
              loadAppeals();
            }
          "
        />
        <DatePicker.RangePicker
          v-model:value="appealFilter.dateRange"
          @change="
            () => {
              appealPag.current = 1;
              loadAppeals();
            }
          "
        />
      </div>
      <Table
        :columns="appealColumns"
        :data-source="appealList"
        :loading="loading"
        :pagination="appealPag"
        row-key="id"
        @change="
          (p) => {
            appealPag.current = p.current ?? 1;
            appealPag.pageSize = p.pageSize ?? 10;
            loadAppeals();
          }
        "
      >
        <template #bodyCell="{ column, record }">
          <template
            v-if="column.key === 'fromStatus' || column.key === 'toStatus'"
          >
            {{
              ATTENDANCE_STATUS_MAP[record[column.key]] ??
              record[column.key] ??
              '-'
            }}
          </template>
          <template v-else-if="column.key === 'status'">
            <Tag>{{ LEAVE_REQUEST_STATUS_MAP[record.status] }}</Tag>
          </template>
          <template v-else-if="column.key === 'action' && record.status === 0">
            <Space>
              <template v-if="canApprove">
                <Button
                  size="small"
                  type="link"
                  @click="
                    approveAppealRequest(record.id).then(() => {
                      message.success('已通过并回写考勤台账');
                      loadAppeals();
                    })
                  "
                >
                  通过
                </Button>
                <Button
                  danger
                  size="small"
                  type="link"
                  @click="
                    rejectAppealRequest(record.id).then(() => {
                      message.success('已拒绝');
                      loadAppeals();
                    })
                  "
                >
                  拒绝
                </Button>
              </template>
              <Button
                size="small"
                type="link"
                @click="
                  cancelAppealRequest(record.id).then(() => {
                    message.success('已撤销');
                    loadAppeals();
                  })
                "
              >
                撤销
              </Button>
            </Space>
          </template>
        </template>
      </Table>
    </Tabs.TabPane>

    <Tabs.TabPane key="field" tab="外勤申请">
      <div class="mb-3">
        <Button type="primary" @click="fieldModal = true">提交外勤</Button>
      </div>
      <Table
        :columns="fieldColumns"
        :data-source="fieldList"
        :loading="loading"
        :pagination="fieldPag"
        row-key="id"
        @change="
          (p) => {
            fieldPag.current = p.current ?? 1;
            fieldPag.pageSize = p.pageSize ?? 10;
            loadField();
          }
        "
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Tag>{{ LEAVE_REQUEST_STATUS_MAP[record.status] }}</Tag>
          </template>
          <template v-else-if="column.key === 'action' && record.status === 0">
            <Space>
              <template v-if="canApprove">
                <Button
                  size="small"
                  type="link"
                  @click="
                    approveFieldWorkRequest(record.id).then(() => {
                      message.success('已通过');
                      loadField();
                    })
                  "
                >
                  通过
                </Button>
                <Button
                  danger
                  size="small"
                  type="link"
                  @click="
                    rejectFieldWorkRequest(record.id).then(() => {
                      message.success('已拒绝');
                      loadField();
                    })
                  "
                >
                  拒绝
                </Button>
              </template>
              <Button
                size="small"
                type="link"
                @click="
                  cancelFieldWorkRequest(record.id).then(() => {
                    message.success('已撤销');
                    loadField();
                  })
                "
              >
                撤销
              </Button>
            </Space>
          </template>
        </template>
      </Table>
    </Tabs.TabPane>
  </Tabs>

  <Modal v-model:open="otModal" title="提交加班申请" @ok="submitOt">
    <Form layout="vertical">
      <Form.Item label="日期" required>
        <DatePicker v-model:value="otForm.workDate" class="w-full" />
      </Form.Item>
      <Form.Item label="开始时间" required>
        <TimePicker v-model:value="otForm.startTime" class="w-full" />
      </Form.Item>
      <Form.Item label="结束时间" required>
        <TimePicker v-model:value="otForm.endTime" class="w-full" />
      </Form.Item>
      <Form.Item label="时长(小时)" required>
        <InputNumber
          v-model:value="otForm.hours"
          :min="0.5"
          :step="0.5"
          class="w-full"
        />
      </Form.Item>
      <Form.Item label="原因" required>
        <Input.TextArea v-model:value="otForm.reason" :rows="3" />
      </Form.Item>
    </Form>
  </Modal>

  <Modal
    v-model:open="appealModal"
    title="提交补卡申请"
    width="560px"
    @ok="submitAppeal"
  >
    <Form layout="vertical">
      <Form.Item label="补卡日期" required>
        <DatePicker v-model:value="appealForm.attendDate" class="w-full" />
      </Form.Item>
      <Form.Item label="原状态">
        <Select
          v-model:value="appealForm.fromStatus"
          allow-clear
          class="w-full"
        >
          <Select.Option
            v-for="(label, val) in ATTENDANCE_STATUS_MAP"
            :key="val"
            :value="Number(val)"
          >
            {{ label }}
          </Select.Option>
        </Select>
      </Form.Item>
      <Form.Item label="目标状态" required>
        <Select v-model:value="appealForm.toStatus" class="w-full">
          <Select.Option
            v-for="(label, val) in ATTENDANCE_STATUS_MAP"
            :key="val"
            :value="Number(val)"
          >
            {{ label }}
          </Select.Option>
        </Select>
      </Form.Item>
      <Form.Item label="补上班时间">
        <TimePicker v-model:value="appealForm.checkIn" class="w-full" />
      </Form.Item>
      <Form.Item label="补下班时间">
        <TimePicker v-model:value="appealForm.checkOut" class="w-full" />
      </Form.Item>
      <Form.Item label="原因" required>
        <Input.TextArea v-model:value="appealForm.reason" :rows="3" />
      </Form.Item>
    </Form>
  </Modal>

  <Modal v-model:open="fieldModal" title="提交外勤申请" @ok="submitField">
    <Form layout="vertical">
      <Form.Item label="日期" required>
        <DatePicker v-model:value="fieldForm.workDate" class="w-full" />
      </Form.Item>
      <Form.Item label="地点" required>
        <Input v-model:value="fieldForm.location" />
      </Form.Item>
      <Form.Item label="原因" required>
        <Input.TextArea v-model:value="fieldForm.reason" :rows="3" />
      </Form.Item>
    </Form>
  </Modal>
</template>

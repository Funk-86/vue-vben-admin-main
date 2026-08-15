<script lang="ts" setup>
import type { AttendanceVO, EmployeeVO } from '#/api/hr';
import type { FacePunchMode } from '#/components/face-punch-modal/index.vue';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';
import { downloadFileFromBlob } from '@vben/utils';

import {
  Button,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  TimePicker,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import FacePunchModal from '#/components/face-punch-modal/index.vue';
import {
  checkIn,
  checkOut,
  createAttendance,
  deleteAttendance,
  exportAttendanceExcel,
  getAttendanceList,
  fetchAllEmployees,
  updateAttendance,
} from '#/api/hr';
import { resolveMyEmployeeId } from '#/utils/hr/resolve-employee-id';
import { ATTENDANCE_STATUS_MAP } from '#/views/hr/constants';
import {
  hasAnyRole,
  HR_ROLE,
  ROLE_HR_STAFF,
} from '#/views/hr/roles';

const userStore = useUserStore();

/** 仅超管可选员工代打卡 */
const isSuperAdmin = computed(() =>
  hasAnyRole(userStore.userInfo?.roles, [HR_ROLE.SUPER_ADMIN]),
);

/** HR / 超管可手动补录、编辑、删除 */
const isHrStaff = computed(() =>
  hasAnyRole(userStore.userInfo?.roles, ROLE_HR_STAFF),
);

const loading = ref(false);
const exportLoading = ref(false);
const list = ref<AttendanceVO[]>([]);
const employees = ref<EmployeeVO[]>([]);
const checkEmployeeId = ref<number>();
const myEmployeeId = ref<number>();
const facePunchOpen = ref(false);
const facePunchMode = ref<FacePunchMode>('check-in');
const modalOpen = ref(false);
const editing = ref<AttendanceVO | null>(null);
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });

const formState = reactive({
  attendDate: undefined as dayjs.Dayjs | undefined,
  checkIn: undefined as dayjs.Dayjs | undefined,
  checkOut: undefined as dayjs.Dayjs | undefined,
  employeeId: undefined as number | undefined,
  remark: '',
  status: 1,
});

const employeeOptions = ref<{ label: string; value: number }[]>([]);

const columns = [
  { dataIndex: 'attendDate', key: 'attendDate', title: '日期', width: 120 },
  { dataIndex: 'empNo', key: 'empNo', title: '工号', width: 100 },
  { dataIndex: 'employeeName', key: 'employeeName', title: '姓名', width: 100 },
  { dataIndex: 'checkIn', key: 'checkIn', title: '上班', width: 100 },
  { dataIndex: 'checkOut', key: 'checkOut', title: '下班', width: 100 },
  { dataIndex: 'workHours', key: 'workHours', title: '工时(h)', width: 90 },
  { dataIndex: 'status', key: 'status', title: '状态', width: 90 },
  { key: 'action', title: '操作', width: 160 },
];

async function loadEmployees() {
  employees.value = await fetchAllEmployees();
  employeeOptions.value = employees.value.map((e) => ({
    label: `${e.name}（${e.empNo}）`,
    value: e.id,
  }));
}

async function loadData(page?: { current: number; pageSize: number }) {
  loading.value = true;
  try {
    const params = {
      pageNum: page?.current ?? pagination.current,
      pageSize: page?.pageSize ?? pagination.pageSize,
    };
    const result = await getAttendanceList(params);
    list.value = result.records;
    pagination.total = result.total;
    pagination.current = result.pageNum;
    pagination.pageSize = result.pageSize;
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag: { current: number; pageSize: number }) {
  loadData({ current: pag.current, pageSize: pag.pageSize });
}

async function handleCheckIn() {
  if (isSuperAdmin.value && !checkEmployeeId.value) {
    message.warning('请选择员工');
    return;
  }
  await checkIn(isSuperAdmin.value ? checkEmployeeId.value : undefined);
  message.success('上班打卡成功');
  await loadData();
}

async function handleCheckOut() {
  if (isSuperAdmin.value && !checkEmployeeId.value) {
    message.warning('请选择员工');
    return;
  }
  await checkOut(isSuperAdmin.value ? checkEmployeeId.value : undefined);
  message.success('下班打卡成功');
  await loadData();
}

async function openFacePunch(mode: FacePunchMode) {
  // 超管必须选择代打卡员工
  if (isSuperAdmin.value && !checkEmployeeId.value) {
    message.warning('请选择员工');
    return;
  }
  // 普通员工/部门经理：后端会根据登录用户自动解析 employeeId，无需前端传递
  // myEmployeeId 仅用于前端展示/录入等场景，非管理员人脸打卡不依赖它
  facePunchMode.value = mode;
  facePunchOpen.value = true;
}

function onFacePunchSuccess() {
  void loadData();
}

function openCreate() {
  editing.value = null;
  Object.assign(formState, {
    attendDate: dayjs(),
    checkIn: undefined,
    checkOut: undefined,
    employeeId: undefined,
    remark: '',
    status: 1,
  });
  modalOpen.value = true;
}

function openEdit(record: AttendanceVO) {
  editing.value = record;
  Object.assign(formState, {
    attendDate: record.attendDate ? dayjs(record.attendDate) : dayjs(),
    checkIn: record.checkIn ? dayjs(record.checkIn, 'HH:mm:ss') : undefined,
    checkOut: record.checkOut ? dayjs(record.checkOut, 'HH:mm:ss') : undefined,
    employeeId: record.employeeId,
    remark: record.remark ?? '',
    status: record.status ?? 1,
  });
  modalOpen.value = true;
}

async function handleSubmit() {
  if (!formState.employeeId || !formState.attendDate) {
    message.warning('请填写必填项');
    return;
  }
  const payload: Partial<AttendanceVO> = {
    attendDate: formState.attendDate.format('YYYY-MM-DD'),
    checkIn: formState.checkIn?.format('HH:mm:ss'),
    checkOut: formState.checkOut?.format('HH:mm:ss'),
    employeeId: formState.employeeId,
    remark: formState.remark,
    status: formState.status,
  };
  try {
    if (editing.value) {
      await updateAttendance(editing.value.id, payload);
      message.success('更新成功');
    } else {
      await createAttendance(payload);
      message.success('创建成功');
    }
    modalOpen.value = false;
    await loadData();
  } catch {
    // handled
  }
}

async function handleDelete(record: AttendanceVO) {
  await deleteAttendance(record.id);
  message.success('删除成功');
  await loadData();
}

async function handleExport() {
  exportLoading.value = true;
  try {
    const blob = await exportAttendanceExcel();
    downloadFileFromBlob({ fileName: '考勤台账.xlsx', source: blob });
    message.success('导出成功');
  } catch {
    // handled
  } finally {
    exportLoading.value = false;
  }
}

onMounted(async () => {
  try {
    myEmployeeId.value = await resolveMyEmployeeId();
  } catch {
    // 非管理员可能获取列表失败，不阻塞列表和打卡
  }
  if (isSuperAdmin.value || isHrStaff.value) {
    await loadEmployees();
  }
  await loadData();
});
</script>

<template>
  <Page description="考勤打卡与记录管理" title="考勤管理">
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <Select
        v-if="isSuperAdmin"
        v-model:value="checkEmployeeId"
        :options="employeeOptions"
        class="w-64"
        placeholder="选择员工打卡"
      />
      <Button type="primary" @click="handleCheckIn">上班打卡</Button>
      <Button @click="handleCheckOut">下班打卡</Button>
      <Button type="primary" ghost @click="openFacePunch('check-in')">
        人脸上班打卡
      </Button>
      <Button ghost @click="openFacePunch('check-out')">人脸下班打卡</Button>
      <Button :loading="exportLoading" @click="handleExport">导出 Excel</Button>
      <Button v-if="isHrStaff" class="ml-auto" @click="openCreate">
        手动补录
      </Button>
    </div>

    <Table
      :columns="columns"
      :data-source="list"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ x: 900 }"
      row-key="id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Tag>{{ ATTENDANCE_STATUS_MAP[record.status] ?? record.status }}</Tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <Space v-if="isHrStaff">
            <Button size="small" type="link" @click="openEdit(record)">
              编辑
            </Button>
            <Popconfirm
              title="确定删除该记录？"
              @confirm="handleDelete(record)"
            >
              <Button danger size="small" type="link">删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="modalOpen"
      :title="editing ? '编辑考勤' : '补录考勤'"
      width="560px"
      @ok="handleSubmit"
    >
      <Form layout="vertical">
        <Form.Item label="员工" required>
          <Select
            v-model:value="formState.employeeId"
            :disabled="!!editing"
            :options="employeeOptions"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="考勤日期" required>
          <DatePicker v-model:value="formState.attendDate" class="w-full" />
        </Form.Item>
        <Form.Item label="上班时间">
          <TimePicker v-model:value="formState.checkIn" class="w-full" />
        </Form.Item>
        <Form.Item label="下班时间">
          <TimePicker v-model:value="formState.checkOut" class="w-full" />
        </Form.Item>
        <Form.Item label="状态">
          <Select v-model:value="formState.status">
            <Select.Option
              v-for="(label, val) in ATTENDANCE_STATUS_MAP"
              :key="val"
              :value="Number(val)"
            >
              {{ label }}
            </Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="备注">
          <Input v-model:value="formState.remark" />
        </Form.Item>
      </Form>
    </Modal>

    <FacePunchModal
      :employee-id="isSuperAdmin ? checkEmployeeId : myEmployeeId"
      :mode="facePunchMode"
      :open="facePunchOpen"
      :submit-with-employee-id="isSuperAdmin"
      @success="onFacePunchSuccess"
      @update:open="(val) => (facePunchOpen = val)"
    />
  </Page>
</template>

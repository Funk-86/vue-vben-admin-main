<script lang="ts" setup>
import type { TablePaginationConfig } from 'ant-design-vue/es/table';

import type { DepartmentVO, EmployeeVO, PositionVO } from '#/api/hr';

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
  Upload,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  createEmployee,
  deleteEmployee,
  downloadEmployeeImportTemplate,
  exportEmployeesExcel,
  getDepartmentTree,
  getEmployees,
  getPositionsByDept,
  importEmployeesExcel,
  runProbationRemind,
  updateEmployee,
} from '#/api/hr';
import AvatarUpload from '#/components/avatar-upload/index.vue';
import {
  EMPLOYEE_STATUS_MAP,
  EMPLOYMENT_TYPE_MAP,
  flattenDepartmentOptions,
  GENDER_MAP,
} from '#/views/hr/constants';
import {
  hasAnyRole,
  HR_ROLE,
  ROLE_NAME_MAP,
  useHrAccess,
} from '#/views/hr/roles';
import { asSelectNumber, onTablePageChange } from '#/views/hr/table-utils';

import '#/views/hr/hr-common.css';

const userStore = useUserStore();
const { canFeat } = useHrAccess();
/** 仅超级管理员可在编辑时重置登录密码 */
const canResetPassword = computed(() =>
  hasAnyRole(userStore.userInfo?.roles, [HR_ROLE.SUPER_ADMIN]),
);
/** 仅 HR / 超管可修改员工系统角色 */
const canChangeRole = computed(() =>
  hasAnyRole(userStore.userInfo?.roles, [
    HR_ROLE.SUPER_ADMIN,
    HR_ROLE.HR_ADMIN,
  ]),
);
const canRunProbationRemind = computed(() => canFeat('feat.org.manage'));
const canExport = computed(() => canFeat('feat.employee.manage'));
const canManage = computed(() => canFeat('feat.employee.manage'));
const remindLoading = ref(false);
const exportLoading = ref(false);
const importLoading = ref(false);
const importResultOpen = ref(false);
const importResult = ref<null | {
  failCount: number;
  failures: { empNo?: string; reason?: string; row?: number }[];
  successCount: number;
}>(null);

const loading = ref(false);
const list = ref<EmployeeVO[]>([]);
const deptTree = ref<DepartmentVO[]>([]);
const positions = ref<PositionVO[]>([]);
const modalOpen = ref(false);
const editing = ref<EmployeeVO | null>(null);
const editingAvatar = ref('');
// 分页状态
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });

const query = reactive({
  deptId: undefined as number | undefined,
  keyword: '',
  roleCode: undefined as string | undefined,
  status: undefined as number | undefined,
});

const formState = reactive({
  deptId: undefined as number | undefined,
  email: '',
  empNo: '',
  employmentType: 1,
  gender: 1,
  hireDate: undefined as dayjs.Dayjs | undefined,
  name: '',
  password: '',
  phone: '',
  positionId: undefined as number | undefined,
  roleCode: HR_ROLE.EMPLOYEE,
  status: 1,
  username: '',
});

const assignableRoles = [
  HR_ROLE.EMPLOYEE,
  HR_ROLE.DEPT_MANAGER,
  HR_ROLE.HR_ADMIN,
];

const roleOptions = computed(() =>
  assignableRoles.map((code) => ({
    label: ROLE_NAME_MAP[code] ?? code,
    value: code,
  })),
);

const deptOptions = computed(() => flattenDepartmentOptions(deptTree.value));

const statusOptions = Object.entries(EMPLOYEE_STATUS_MAP).map(
  ([val, label]) => ({
    label,
    value: Number(val),
  }),
);

const positionOptions = computed(() =>
  positions.value.map((p) => ({
    label: p.positionName,
    value: p.id,
  })),
);

const columns = [
  { dataIndex: 'avatar', key: 'avatar', title: '头像', width: 72 },
  { dataIndex: 'empNo', key: 'empNo', title: '工号', width: 120 },
  { dataIndex: 'name', key: 'name', title: '姓名', width: 100 },
  { dataIndex: 'deptName', key: 'deptName', title: '部门' },
  { dataIndex: 'positionName', key: 'positionName', title: '岗位' },
  { dataIndex: 'roleCode', key: 'roleCode', title: '角色', width: 110 },
  { dataIndex: 'gender', key: 'gender', title: '性别', width: 70 },
  { dataIndex: 'phone', key: 'phone', title: '手机号', width: 130 },
  { dataIndex: 'status', key: 'status', title: '状态', width: 90 },
  { key: 'action', title: '操作', width: 160 },
];

async function loadDepts() {
  deptTree.value = await getDepartmentTree();
}

async function loadPositions(deptId?: number) {
  if (!deptId) {
    positions.value = [];
    return;
  }
  positions.value = await getPositionsByDept(deptId);
}

async function loadData(page?: { current: number; pageSize: number }) {
  loading.value = true;
  try {
    const params = {
      pageNum: page?.current ?? pagination.current,
      pageSize: page?.pageSize ?? pagination.pageSize,
      deptId: query.deptId,
      status: query.status,
      roleCode: query.roleCode,
      keyword: query.keyword.trim() || undefined,
    };
    const result = await getEmployees(params);
    list.value = result.records;
    pagination.total = result.total;
    pagination.current = result.pageNum;
    pagination.pageSize = result.pageSize;
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag: TablePaginationConfig) {
  onTablePageChange(pag, pagination, () =>
    loadData({ current: pagination.current, pageSize: pagination.pageSize }),
  );
}

function openCreate() {
  editing.value = null;
  editingAvatar.value = '';
  Object.assign(formState, {
    deptId: undefined,
    email: '',
    empNo: '',
    employmentType: 1,
    gender: 1,
    hireDate: dayjs(),
    name: '',
    password: '',
    phone: '',
    positionId: undefined,
    roleCode: HR_ROLE.EMPLOYEE,
    status: 1,
    username: '',
  });
  positions.value = [];
  modalOpen.value = true;
}

async function openEdit(record: EmployeeVO) {
  editing.value = record;
  editingAvatar.value = record.avatar ?? '';
  await loadPositions(record.deptId);
  Object.assign(formState, {
    deptId: record.deptId,
    email: record.email ?? '',
    empNo: record.empNo,
    employmentType: record.employmentType ?? 1,
    gender: record.gender ?? 1,
    hireDate: record.hireDate ? dayjs(record.hireDate) : dayjs(),
    name: record.name,
    password: '',
    phone: record.phone ?? '',
    positionId: record.positionId,
    roleCode: record.roleCode || HR_ROLE.EMPLOYEE,
    status: record.status ?? 1,
  });
  modalOpen.value = true;
}

async function onDeptChange(value: unknown) {
  const deptId = asSelectNumber(value);
  if (deptId === undefined) {
    return;
  }
  formState.positionId = undefined;
  await loadPositions(deptId);
}

async function handleSubmit() {
  if (
    !formState.name ||
    !formState.empNo ||
    !formState.deptId ||
    !formState.positionId ||
    !formState.hireDate
  ) {
    message.warning('请填写必填项');
    return;
  }
  if (!editing.value && !formState.username?.trim()) {
    message.warning('请填写登录用户名');
    return;
  }
  if (!editing.value && !formState.password) {
    message.warning('请设置初始登录密码');
    return;
  }
  const payload = {
    deptId: formState.deptId,
    email: formState.email || undefined,
    empNo: formState.empNo,
    employmentType: formState.employmentType,
    gender: formState.gender,
    hireDate: formState.hireDate.format('YYYY-MM-DD'),
    name: formState.name,
    phone: formState.phone || undefined,
    positionId: formState.positionId,
    status: formState.status,
  };
  try {
    if (editing.value) {
      const updatePayload = {
        ...payload,
        ...(canResetPassword.value && formState.password
          ? { password: formState.password }
          : {}),
        ...(canChangeRole.value && formState.roleCode
          ? { roleCode: formState.roleCode }
          : {}),
      };
      if (
        canResetPassword.value &&
        formState.password &&
        formState.password.length < 6
      ) {
        message.warning('密码至少 6 位');
        return;
      }
      await updateEmployee(editing.value.id, updatePayload);
      message.success(
        canResetPassword.value && formState.password
          ? '更新成功，登录密码已重置'
          : '更新成功',
      );
    } else {
      await createEmployee({
        ...payload,
        password: formState.password,
        roleCode: formState.roleCode,
        username: formState.username.trim(),
      });
      message.success('创建成功，请使用登录用户名进入系统');
    }
    modalOpen.value = false;
    await loadData();
  } catch {
    // handled
  }
}

async function handleDelete(record: EmployeeVO) {
  await deleteEmployee(record.id);
  message.success('删除成功');
  await loadData();
}

function onEmployeeAvatarSuccess(url: string) {
  editingAvatar.value = url;
  if (editing.value) {
    editing.value = { ...editing.value, avatar: url };
  }
  void loadData();
}

async function handleProbationRemind() {
  remindLoading.value = true;
  try {
    const result = await runProbationRemind();
    message.success(`试用期提醒已执行，新发送 ${result?.sent ?? 0} 条站内信`);
  } catch {
    // handled
  } finally {
    remindLoading.value = false;
  }
}

async function handleExport() {
  exportLoading.value = true;
  try {
    const blob = await exportEmployeesExcel({
      deptId: query.deptId,
      status: query.status,
      roleCode: query.roleCode,
      keyword: query.keyword.trim() || undefined,
    });
    downloadFileFromBlob({ fileName: '员工花名册.xlsx', source: blob });
    message.success('导出成功');
  } catch {
    // handled
  } finally {
    exportLoading.value = false;
  }
}

async function handleDownloadImportTemplate() {
  const blob = await downloadEmployeeImportTemplate();
  downloadFileFromBlob({ fileName: '员工导入模板.xlsx', source: blob });
  message.success('模板已下载');
}

async function handleImportExcel(file: File) {
  importLoading.value = true;
  try {
    const result = await importEmployeesExcel(file);
    importResult.value = {
      successCount: result.successCount ?? 0,
      failCount: result.failCount ?? 0,
      failures: result.failures ?? [],
    };
    importResultOpen.value = true;
    if ((result.successCount ?? 0) > 0) {
      await loadData({ current: 1, pageSize: pagination.pageSize });
    }
  } finally {
    importLoading.value = false;
  }
  return false;
}

onMounted(async () => {
  await loadDepts();
  await loadData();
});
</script>

<template>
  <Page description="员工档案维护" title="员工管理">
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <Select
        v-model:value="query.deptId"
        allow-clear
        :options="deptOptions"
        :popup-match-select-width="false"
        class="w-52"
        option-filter-prop="label"
        placeholder="选择部门"
        popup-class-name="hr-filter-select-dropdown"
        show-search
      />
      <Select
        v-model:value="query.status"
        allow-clear
        :options="statusOptions"
        class="w-36 shrink-0"
        placeholder="在职状态"
        popup-class-name="hr-filter-select-dropdown"
      />
      <Select
        v-model:value="query.roleCode"
        allow-clear
        :options="roleOptions"
        class="w-36 shrink-0"
        placeholder="选择角色"
        popup-class-name="hr-filter-select-dropdown"
      />
      <Input
        v-model:value="query.keyword"
        allow-clear
        class="!w-44 shrink-0"
        placeholder="姓名/工号/手机号"
        @press-enter="loadData({ current: 1, pageSize: pagination.pageSize })"
      />
      <Button
        type="primary"
        @click="loadData({ current: 1, pageSize: pagination.pageSize })"
      >
        查询
      </Button>
      <Button v-if="canManage" @click="openCreate">新增员工</Button>
      <Button v-if="canExport" :loading="exportLoading" @click="handleExport">
        导出 Excel
      </Button>
      <Button
        v-if="canChangeRole"
        :loading="importLoading"
        @click="handleDownloadImportTemplate"
      >
        下载导入模板
      </Button>
      <Upload
        v-if="canChangeRole"
        :before-upload="handleImportExcel"
        :show-upload-list="false"
        accept=".xlsx,.xls"
      >
        <Button :loading="importLoading">导入 Excel</Button>
      </Upload>
      <Button
        v-if="canRunProbationRemind"
        :loading="remindLoading"
        @click="handleProbationRemind"
      >
        执行试用期提醒
      </Button>
    </div>

    <Table
      :columns="columns"
      :data-source="list"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ x: 1000 }"
      row-key="id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'avatar'">
          <img
            v-if="record.avatar"
            :src="record.avatar"
            alt="avatar"
            class="size-10 rounded-full object-cover"
          />
          <span v-else class="text-gray-400">-</span>
        </template>
        <template v-else-if="column.key === 'roleCode'">
          {{ ROLE_NAME_MAP[record.roleCode] || record.roleCode || '-' }}
        </template>
        <template v-else-if="column.key === 'gender'">
          {{ GENDER_MAP[record.gender] ?? '-' }}
        </template>
        <template v-else-if="column.key === 'status'">
          <Tag
            :color="
              record.status === 3
                ? 'default'
                : record.status === 2
                  ? 'orange'
                  : 'blue'
            "
          >
            {{ EMPLOYEE_STATUS_MAP[record.status] ?? record.status }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <Space v-if="canManage">
            <Button size="small" type="link" @click="openEdit(record as any)">
              编辑
            </Button>
            <Popconfirm
              title="确定删除该员工？"
              @confirm="handleDelete(record as any)"
            >
              <Button danger size="small" type="link">删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="modalOpen"
      :title="editing ? '编辑员工' : '新增员工'"
      width="640px"
      @ok="handleSubmit"
    >
      <Form layout="vertical">
        <div v-if="editing" class="mb-4 flex flex-col items-center gap-2">
          <AvatarUpload
            avatar-class="size-24"
            :employee-id="editing.id"
            mode="employee"
            :src="editingAvatar"
            @success="onEmployeeAvatarSuccess"
          />
          <span class="text-xs text-gray-500">点击头像可更换（JPG/PNG/WEBP，≤2MB）</span>
        </div>
        <div
          v-if="!editing"
          class="mb-2 rounded bg-gray-50 p-3 text-sm text-gray-600"
        >
          创建员工时将同步开通系统登录账号
        </div>
        <div class="grid grid-cols-2 gap-x-4">
          <Form.Item label="工号" required>
            <Input v-model:value="formState.empNo" :disabled="!!editing" />
          </Form.Item>
          <Form.Item label="姓名" required>
            <Input v-model:value="formState.name" />
          </Form.Item>
          <template v-if="!editing">
            <Form.Item label="登录用户名" required>
              <Input
                v-model:value="formState.username"
                placeholder="用于系统登录（不要用工号）"
              />
            </Form.Item>
            <Form.Item label="初始密码" required>
              <Input.Password
                v-model:value="formState.password"
                autocomplete="new-password"
                placeholder="用于首次登录"
              />
            </Form.Item>
            <Form.Item label="系统角色" required>
              <Select
                v-model:value="formState.roleCode"
                :options="roleOptions"
                class="w-full"
              />
            </Form.Item>
          </template>
          <Form.Item v-else-if="canResetPassword" label="重置登录密码">
            <Input.Password
              v-model:value="formState.password"
              autocomplete="new-password"
              placeholder="留空则不修改密码"
            />
          </Form.Item>
          <Form.Item v-if="editing" label="系统角色" :required="canChangeRole">
            <Select
              v-model:value="formState.roleCode"
              :disabled="!canChangeRole"
              :options="roleOptions"
              class="w-full"
              placeholder="选择角色"
            />
          </Form.Item>
          <Form.Item label="部门" required>
            <Select
              v-model:value="formState.deptId"
              :options="deptOptions"
              :popup-match-select-width="false"
              class="w-full"
              option-filter-prop="label"
              popup-class-name="hr-filter-select-dropdown"
              show-search
              @change="onDeptChange"
            />
          </Form.Item>
          <Form.Item label="岗位" required>
            <Select
              v-model:value="formState.positionId"
              :options="positionOptions"
              :popup-match-select-width="false"
              class="w-full"
              option-filter-prop="label"
              popup-class-name="hr-filter-select-dropdown"
              show-search
            />
          </Form.Item>
          <Form.Item label="性别">
            <Select v-model:value="formState.gender">
              <Select.Option
                v-for="(label, val) in GENDER_MAP"
                :key="val"
                :value="Number(val)"
              >
                {{ label }}
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="用工类型">
            <Select v-model:value="formState.employmentType">
              <Select.Option
                v-for="(label, val) in EMPLOYMENT_TYPE_MAP"
                :key="val"
                :value="Number(val)"
              >
                {{ label }}
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="入职日期" required>
            <DatePicker v-model:value="formState.hireDate" class="w-full" />
          </Form.Item>
          <Form.Item label="状态">
            <Select v-model:value="formState.status">
              <Select.Option
                v-for="(label, val) in EMPLOYEE_STATUS_MAP"
                :key="val"
                :value="Number(val)"
              >
                {{ label }}
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="手机号">
            <Input v-model:value="formState.phone" />
          </Form.Item>
          <Form.Item label="邮箱">
            <Input v-model:value="formState.email" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
    <Modal
      v-model:open="importResultOpen"
      title="导入结果"
      :footer="null"
      destroy-on-close
    >
      <p>
        成功 {{ importResult?.successCount ?? 0 }} 条，失败
        {{ importResult?.failCount ?? 0 }} 条
      </p>
      <Table
        v-if="(importResult?.failures?.length ?? 0) > 0"
        class="mt-3"
        size="small"
        :pagination="false"
        :data-source="importResult?.failures || []"
        :columns="[
          { title: '行号', dataIndex: 'row', width: 70 },
          { title: '工号', dataIndex: 'empNo', width: 100 },
          { title: '原因', dataIndex: 'reason' },
        ]"
        row-key="row"
      />
    </Modal>
  </Page>
</template>

<script lang="ts" setup>
import type {
  DepartmentVO,
  EmployeeDocumentVO,
  EmployeeVO,
  PositionVO,
} from '#/api/hr';

import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue';

import { Page } from '@vben/common-ui';

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
  Spin,
  Table,
  Tag,
  Upload,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  deleteEmployeeDocument,
  DOC_TYPE_OPTIONS,
  fetchAllEmployees,
  fetchEmployeeDocumentFile,
  getDepartmentTree,
  getEmployeeDocuments,
  getPositionsByDept,
  uploadEmployeeDocument,
} from '#/api/hr';
import { flattenDepartments } from '#/views/hr/constants';
import { useHrAccess } from '#/views/hr/roles';

import '#/views/hr/hr-common.css';

const { canFeat } = useHrAccess();
const canUpload = computed(() => canFeat('feat.document.self'));
const canFilterOrg = computed(() => canFeat('feat.employee.manage'));

const loading = ref(false);
const list = ref<EmployeeDocumentVO[]>([]);
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });

const employees = ref<EmployeeVO[]>([]);
const deptTree = ref<DepartmentVO[]>([]);
const positionOptions = ref<{ label: string; value: number }[]>([]);

const query = reactive({
  deptId: undefined as number | undefined,
  docType: undefined as number | undefined,
  employeeId: undefined as number | undefined,
  keyword: '',
  positionId: undefined as number | undefined,
});

const modalOpen = ref(false);
const uploading = ref(false);
const uploadFile = ref<File | null>(null);
const formState = reactive({
  docType: 1,
  effectiveDate: undefined as dayjs.Dayjs | undefined,
  employeeId: undefined as number | undefined,
  expireDate: undefined as dayjs.Dayjs | undefined,
  remark: '',
  title: '',
});

const deptOptions = computed(() =>
  flattenDepartments(deptTree.value).map((d) => ({
    label: d.deptName,
    value: d.id,
  })),
);

const employeeOptions = computed(() =>
  employees.value.map((e) => ({
    label: `${e.name}（${e.empNo}）`,
    value: e.id,
  })),
);

const columns = [
  { dataIndex: 'employeeName', key: 'employeeName', title: '员工', width: 100 },
  { dataIndex: 'empNo', key: 'empNo', title: '工号', width: 90 },
  { dataIndex: 'deptName', key: 'deptName', title: '部门', width: 100 },
  { dataIndex: 'positionName', key: 'positionName', title: '岗位', width: 110 },
  { dataIndex: 'docTypeLabel', key: 'docTypeLabel', title: '类型', width: 110 },
  { dataIndex: 'title', key: 'title', title: '标题', ellipsis: true },
  { dataIndex: 'fileName', key: 'fileName', title: '文件名', ellipsis: true },
  { dataIndex: 'expireDate', key: 'expireDate', title: '到期日', width: 120 },
  {
    dataIndex: 'uploaderName',
    key: 'uploaderName',
    title: '上传人',
    width: 90,
  },
  { key: 'action', title: '操作', width: 220, fixed: 'right' as const },
];

const previewOpen = ref(false);
const previewLoading = ref(false);
const previewTitle = ref('文档预览');
const previewKind = ref<'pdf' | 'unsupported' | 'word'>('unsupported');
const previewSrc = ref('');
const previewKey = ref(0);
const previewRecord = ref<EmployeeDocumentVO | null>(null);
let previewObjectUrl = '';

function revokePreviewUrl() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = '';
  }
}

function isPdf(record: EmployeeDocumentVO) {
  const ct = (record.contentType || '').toLowerCase();
  const name = (record.fileName || '').toLowerCase();
  return ct.includes('pdf') || name.endsWith('.pdf');
}

function isWord(record: EmployeeDocumentVO) {
  const ct = (record.contentType || '').toLowerCase();
  const name = (record.fileName || '').toLowerCase();
  return (
    ct.includes('word') ||
    ct.includes('officedocument') ||
    name.endsWith('.doc') ||
    name.endsWith('.docx')
  );
}

async function openPreview(record: EmployeeDocumentVO) {
  // 先拆掉上一次 iframe / blob，避免第二次复用导致「已重置连接」
  revokePreviewUrl();
  previewSrc.value = '';
  previewKind.value = 'unsupported';

  previewRecord.value = record;
  previewTitle.value = record.title || record.fileName || '文档预览';
  previewKey.value += 1;
  previewOpen.value = true;
  previewLoading.value = true;

  try {
    if (isPdf(record)) {
      const blob = await fetchEmployeeDocumentFile(record.id, 'inline');
      // 完整读入后再生成地址，避免流式 blob 二次打开异常
      const buffer = await blob.arrayBuffer();
      const typed = new Blob([buffer], { type: 'application/pdf' });
      previewObjectUrl = URL.createObjectURL(typed);
      previewSrc.value = previewObjectUrl;
      previewKind.value = 'pdf';
      return;
    }

    if (isWord(record)) {
      // Office 嵌入页二次打开易报「已重置连接」，改为页内引导 + 新窗口预览
      previewKind.value = 'word';
      return;
    }

    previewKind.value = 'unsupported';
  } catch {
    message.error('预览失败，请尝试下载后查看');
    previewKind.value = 'unsupported';
  } finally {
    previewLoading.value = false;
  }
}

function openWordInNewWindow(record: EmployeeDocumentVO) {
  if (!record.url) {
    message.warning('暂无在线预览地址，请下载后查看');
    return;
  }
  const url = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(record.url)}&_t=${Date.now()}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function closePreview() {
  previewOpen.value = false;
  previewKind.value = 'unsupported';
  previewSrc.value = '';
  revokePreviewUrl();
  previewRecord.value = null;
}

async function downloadDocument(record: EmployeeDocumentVO) {
  try {
    const blob = await fetchEmployeeDocumentFile(record.id, 'attachment');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = record.fileName || `document-${record.id}`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    // request interceptor 已提示
  }
}

onBeforeUnmount(() => {
  revokePreviewUrl();
});

async function loadDepts() {
  if (!canFilterOrg.value) return;
  deptTree.value = await getDepartmentTree();
}

async function loadPositions(deptId?: number) {
  if (!deptId) {
    positionOptions.value = [];
    return;
  }
  const listPos: PositionVO[] = await getPositionsByDept(deptId);
  positionOptions.value = listPos.map((p) => ({
    label: p.positionName,
    value: p.id,
  }));
}

async function loadEmployees() {
  employees.value = await fetchAllEmployees();
}

async function loadData(page?: { current: number; pageSize: number }) {
  if (page) {
    pagination.current = page.current;
    pagination.pageSize = page.pageSize;
  }
  loading.value = true;
  try {
    const result = await getEmployeeDocuments({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      deptId: query.deptId,
      positionId: query.positionId,
      employeeId: query.employeeId,
      docType: query.docType,
      keyword: query.keyword || undefined,
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
  query.deptId = undefined;
  query.positionId = undefined;
  query.employeeId = undefined;
  query.docType = undefined;
  query.keyword = '';
  positionOptions.value = [];
  onSearch();
}

function handleTableChange(pag: { current?: number; pageSize?: number }) {
  void loadData({
    current: pag.current ?? 1,
    pageSize: pag.pageSize ?? pagination.pageSize,
  });
}

function openUpload() {
  uploadFile.value = null;
  Object.assign(formState, {
    docType: 1,
    effectiveDate: undefined,
    employeeId: undefined,
    expireDate: undefined,
    remark: '',
    title: '',
  });
  modalOpen.value = true;
}

function beforeUpload(file: File) {
  if (file.size > 20 * 1024 * 1024) {
    message.warning('文件不能超过 20MB');
    return false;
  }
  uploadFile.value = file;
  if (!formState.title) {
    formState.title = file.name.replace(/\.[^.]+$/, '');
  }
  return false;
}

async function submitUpload() {
  if (!formState.employeeId) {
    message.warning('请选择员工');
    return;
  }
  if (!uploadFile.value) {
    message.warning('请选择文件');
    return;
  }
  uploading.value = true;
  try {
    await uploadEmployeeDocument({
      employeeId: formState.employeeId,
      docType: formState.docType,
      title: formState.title || undefined,
      effectiveDate: formState.effectiveDate?.format('YYYY-MM-DD'),
      expireDate: formState.expireDate?.format('YYYY-MM-DD'),
      remark: formState.remark || undefined,
      file: uploadFile.value,
    });
    message.success('上传成功');
    modalOpen.value = false;
    await loadData();
  } finally {
    uploading.value = false;
  }
}

async function onDelete(record: EmployeeDocumentVO) {
  await deleteEmployeeDocument(record.id);
  message.success('已删除');
  await loadData();
}

function formatSize(size?: number) {
  if (size === null || size === undefined) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

watch(
  () => query.deptId,
  (deptId) => {
    query.positionId = undefined;
    void loadPositions(deptId);
  },
);

onMounted(async () => {
  await Promise.all([loadDepts(), loadEmployees()]);
  await loadData();
});
</script>

<template>
  <Page
    description="集中管理劳动合同、协议、薪资确认单等 Word/PDF 文档"
    title="文档管理"
  >
    <Form layout="inline" class="mb-4 flex flex-wrap items-center gap-y-2">
      <Form.Item v-if="canFilterOrg" label="部门">
        <Select
          v-model:value="query.deptId"
          :options="deptOptions"
          :popup-match-select-width="false"
          allow-clear
          class="w-52"
          option-filter-prop="label"
          placeholder="全部"
          popup-class-name="hr-filter-select-dropdown"
          show-search
        />
      </Form.Item>
      <Form.Item v-if="canFilterOrg" label="岗位">
        <Select
          v-model:value="query.positionId"
          :options="positionOptions"
          :popup-match-select-width="false"
          allow-clear
          class="w-52"
          option-filter-prop="label"
          placeholder="全部"
          popup-class-name="hr-filter-select-dropdown"
          show-search
        />
      </Form.Item>
      <Form.Item label="员工">
        <Select
          v-model:value="query.employeeId"
          :options="employeeOptions"
          :popup-match-select-width="false"
          allow-clear
          class="w-64"
          option-filter-prop="label"
          placeholder="全部"
          popup-class-name="hr-filter-select-dropdown"
          show-search
        />
      </Form.Item>
      <Form.Item label="类型">
        <Select
          v-model:value="query.docType"
          :options="DOC_TYPE_OPTIONS"
          :popup-match-select-width="false"
          allow-clear
          class="w-44"
          placeholder="全部"
          popup-class-name="hr-filter-select-dropdown"
        />
      </Form.Item>
      <Form.Item label="关键词">
        <Input
          v-model:value="query.keyword"
          allow-clear
          class="w-48"
          placeholder="标题/文件名"
        />
      </Form.Item>
      <Form.Item>
        <Space>
          <Button type="primary" @click="onSearch">查询</Button>
          <Button @click="onReset">重置</Button>
          <Button v-if="canUpload" type="primary" @click="openUpload">
            上传文档
          </Button>
        </Space>
      </Form.Item>
    </Form>

    <Table
      :columns="columns"
      :data-source="list"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ x: 1300 }"
      row-key="id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'fileName'">
          <Tag
            v-if="isWord(record as any)"
            :bordered="false"
            class="max-w-full truncate"
            color="processing"
          >
            {{ record.fileName }}
          </Tag>
          <Tag
            v-else-if="isPdf(record as any)"
            :bordered="false"
            class="max-w-full truncate"
            color="error"
          >
            {{ record.fileName }}
          </Tag>
          <span v-else>{{ record.fileName }}</span>
        </template>
        <template v-else-if="column.key === 'expireDate'">
          <span>{{ record.expireDate || '-' }}</span>
          <Tag v-if="record.expiringSoon" color="orange" class="ml-1">
            即将到期
          </Tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <Space>
            <Button
              size="small"
              type="link"
              @click="openPreview(record as any)"
            >
              预览
            </Button>
            <Button
              size="small"
              type="link"
              @click="downloadDocument(record as any)"
            >
              下载
            </Button>
            <Popconfirm
              title="确定删除该文档？"
              @confirm="onDelete(record as any)"
            >
              <Button danger size="small" type="link">删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="previewOpen"
      :footer="null"
      :title="previewTitle"
      destroy-on-close
      width="920px"
      @cancel="closePreview"
    >
      <Spin :spinning="previewLoading">
        <iframe
          v-if="previewKind === 'pdf' && previewSrc"
          :key="previewKey"
          :src="previewSrc"
          class="h-[70vh] w-full rounded border-0 bg-gray-50"
          title="document-preview"
        ></iframe>
        <div
          v-else-if="previewKind === 'word'"
          class="py-10 text-center text-gray-600"
        >
          <p class="mb-2">
            Word 文档建议在新窗口预览，或下载后用本地 Office 打开。
          </p>
          <p class="mb-6 text-xs text-gray-400">
            （页内嵌入微软预览第二次易出现「已重置连接」）
          </p>
          <Space>
            <Button
              v-if="previewRecord"
              type="primary"
              @click="openWordInNewWindow(previewRecord)"
            >
              新窗口预览
            </Button>
            <Button
              v-if="previewRecord"
              @click="downloadDocument(previewRecord)"
            >
              下载文件
            </Button>
          </Space>
        </div>
        <div v-else class="py-10 text-center text-gray-500">
          <p class="mb-4">该格式暂不支持页内预览，请下载后用本地软件打开。</p>
          <Button
            v-if="previewRecord"
            type="primary"
            @click="downloadDocument(previewRecord)"
          >
            下载文件
          </Button>
        </div>
      </Spin>
    </Modal>

    <Modal
      v-model:open="modalOpen"
      :confirm-loading="uploading"
      title="上传员工文档"
      width="560px"
      @ok="submitUpload"
    >
      <Form layout="vertical">
        <Form.Item label="员工" required>
          <Select
            v-model:value="formState.employeeId"
            :options="employeeOptions"
            class="w-full"
            show-search
            option-filter-prop="label"
          />
        </Form.Item>
        <Form.Item label="文档类型" required>
          <Select
            v-model:value="formState.docType"
            :options="DOC_TYPE_OPTIONS"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="标题">
          <Input v-model:value="formState.title" placeholder="默认取文件名" />
        </Form.Item>
        <Form.Item label="生效 / 到期">
          <Space>
            <DatePicker
              v-model:value="formState.effectiveDate"
              placeholder="生效日"
            />
            <DatePicker
              v-model:value="formState.expireDate"
              placeholder="到期日"
            />
          </Space>
        </Form.Item>
        <Form.Item label="备注">
          <Input v-model:value="formState.remark" />
        </Form.Item>
        <Form.Item label="文件" required>
          <Upload
            :before-upload="beforeUpload"
            :max-count="1"
            :show-upload-list="!!uploadFile"
            accept=".pdf,.doc,.docx"
          >
            <Button>选择 PDF / Word</Button>
          </Upload>
          <div v-if="uploadFile" class="mt-2 text-xs text-gray-500">
            {{ uploadFile.name }}（{{ formatSize(uploadFile.size) }}）
          </div>
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>

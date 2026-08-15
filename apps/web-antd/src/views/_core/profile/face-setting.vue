<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { Alert, Button, Card, Space, Tag, message } from 'ant-design-vue';

import { getFaceStatus } from '#/api/hr';
import FacePunchModal from '#/components/face-punch-modal/index.vue';
import { resolveMyEmployeeId } from '#/utils/hr/resolve-employee-id';

const employeeId = ref<number>();
const enrolled = ref(false);
const enrolledAt = ref<string>();
const loading = ref(false);
const enrollOpen = ref(false);

async function loadStatus() {
  loading.value = true;
  try {
    const id = await resolveMyEmployeeId();
    employeeId.value = id;
    if (!id) {
      enrolled.value = false;
      return;
    }
    const status = await getFaceStatus(id);
    enrolled.value = status.enrolled;
    enrolledAt.value = status.enrolledAt;
  } catch {
    enrolled.value = false;
  } finally {
    loading.value = false;
  }
}

function openEnroll() {
  if (!employeeId.value) {
    message.warning('当前账号未关联员工，无法录入人脸');
    return;
  }
  enrollOpen.value = true;
}

onMounted(() => {
  void loadStatus();
});
</script>

<template>
  <Card :loading="loading" title="人脸信息">
    <Space class="mb-3" direction="vertical" size="middle">
      <div>
        录入状态：
        <Tag :color="enrolled ? 'success' : 'default'">
          {{ enrolled ? '已录入' : '未录入' }}
        </Tag>
      </div>
      <div v-if="enrolled && enrolledAt" class="text-sm text-gray-500">
        最近录入：{{ enrolledAt }}
      </div>
      <Alert
        v-if="!employeeId"
        message="当前账号未绑定员工档案，无法使用人脸录入与打卡。"
        show-icon
        type="warning"
      />
      <Button
        :disabled="!employeeId"
        type="primary"
        @click="openEnroll"
      >
        {{ enrolled ? '重新录入人脸' : '录入人脸' }}
      </Button>
    </Space>

    <FacePunchModal
      v-if="employeeId"
      :employee-id="employeeId"
      mode="enroll"
      :open="enrollOpen"
      @success="loadStatus"
      @update:open="(val) => (enrollOpen = val)"
    />
  </Card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { Alert, Button, Modal, Spin, message } from 'ant-design-vue';

import {
  checkInByFace,
  checkOutByFace,
  enrollFace,
  getFaceStatus,
} from '#/api/hr';
import FaceCamera from '#/components/face-camera/index.vue';
import {
  descriptorToArray,
  extractAverageDescriptor,
  extractDescriptor,
  loadFaceModels,
} from '#/utils/face-api/service';

export type FacePunchMode = 'check-in' | 'check-out' | 'enroll';

const props = defineProps<{
  employeeId?: number;
  mode: FacePunchMode;
  open: boolean;
  /** 仅超管代打卡时为 true，请求体携带 employeeId */
  submitWithEmployeeId?: boolean;
}>();

const emit = defineEmits<{
  success: [];
  'update:open': [value: boolean];
}>();

const cameraRef = ref<InstanceType<typeof FaceCamera> | null>(null);
const loading = ref(false);
const preparing = ref(false);
const statusText = ref('请正对摄像头，保持面部在画面中央');

const title = computed(() => {
  if (props.mode === 'enroll') {
    return '人脸录入';
  }
  if (props.mode === 'check-out') {
    return '人脸下班打卡';
  }
  return '人脸上班打卡';
});

const actionText = computed(() => {
  if (props.mode === 'enroll') {
    return '确认录入';
  }
  if (props.mode === 'check-out') {
    return '确认下班打卡';
  }
  return '确认上班打卡';
});

const tips = computed(() => {
  if (props.mode === 'enroll') {
    return '录入时将连续采样多帧并取平均，请缓慢眨眼、保持正对摄像头约 2 秒。';
  }
  return '识别通过后将自动提交打卡，请正对摄像头。';
});

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      return;
    }
    preparing.value = true;
    statusText.value = '正在加载人脸识别模型…';
    try {
      await loadFaceModels();
      if (props.mode !== 'enroll' && props.employeeId) {
        const status = await getFaceStatus(props.employeeId);
        if (!status.enrolled) {
          statusText.value = '尚未录入人脸，请先到个人中心完成人脸录入';
        } else {
          statusText.value = '模型已就绪，请正对摄像头';
        }
      } else {
        statusText.value = '模型已就绪，请正对摄像头';
      }
    } catch {
      statusText.value = '模型加载失败，请检查网络后重试';
    } finally {
      preparing.value = false;
    }
  },
);

function closeModal() {
  emit('update:open', false);
}

async function handleConfirm() {
  // 录入模式必须有 employeeId
  if (props.mode === 'enroll' && !props.employeeId) {
    message.warning('无法确定录入员工');
    return;
  }
  // 打卡模式：超管代打卡需要 employeeId，普通用户后端自动解析
  if (props.mode !== 'enroll' && props.submitWithEmployeeId && !props.employeeId) {
    message.warning('请选择员工后再打卡');
    return;
  }

  const video = cameraRef.value?.getVideo();
  if (!video) {
    message.error('摄像头未就绪');
    return;
  }

  loading.value = true;
  statusText.value =
    props.mode === 'enroll' ? '正在采样录入…' : '正在识别人脸…';

  try {
    const descriptor =
      props.mode === 'enroll'
        ? await extractAverageDescriptor(video, 5, 300)
        : await extractDescriptor(video);

    if (!descriptor) {
      message.error('未检测到人脸，请调整光线与角度后重试');
      return;
    }

    const descriptorArray = descriptorToArray(descriptor);
    const employeeId = props.employeeId!;
    const apiEmployeeId = props.submitWithEmployeeId ? employeeId : undefined;

    if (props.mode === 'enroll') {
      await enrollFace(employeeId, descriptorArray, 5);
      message.success('人脸录入成功');
    } else if (props.mode === 'check-in') {
      await checkInByFace(descriptorArray, apiEmployeeId);
      message.success('上班打卡成功');
    } else {
      await checkOutByFace(descriptorArray, apiEmployeeId);
      message.success('下班打卡成功');
    }

    emit('success');
    closeModal();
  } catch {
    // 全局异常处理
  } finally {
    loading.value = false;
    statusText.value = '请正对摄像头，保持面部在画面中央';
  }
}
</script>

<template>
  <Modal
    :confirm-loading="loading"
    :ok-text="actionText"
    :open="open"
    :title="title"
    width="480px"
    @cancel="closeModal"
    @ok="handleConfirm"
  >
    <Alert class="mb-3" :message="tips" show-icon type="info" />
    <Spin :spinning="preparing || loading">
      <FaceCamera ref="cameraRef" :active="open" />
      <p class="mt-3 text-center text-sm text-gray-500">{{ statusText }}</p>
    </Spin>
    <template #footer>
      <Button @click="closeModal">取消</Button>
      <Button
        :loading="loading"
        type="primary"
        @click="handleConfirm"
      >
        {{ actionText }}
      </Button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    active?: boolean;
    mirrored?: boolean;
  }>(),
  {
    active: true,
    mirrored: true,
  },
);

const videoRef = ref<HTMLVideoElement | null>(null);
const streamRef = ref<MediaStream | null>(null);
const cameraError = ref('');

async function startCamera() {
  stopCamera();
  cameraError.value = '';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
      },
    });
    streamRef.value = stream;
    if (videoRef.value) {
      videoRef.value.srcObject = stream;
      await videoRef.value.play();
    }
  } catch {
    cameraError.value = '无法打开摄像头，请检查浏览器权限或使用 HTTPS / localhost';
  }
}

function stopCamera() {
  if (streamRef.value) {
    streamRef.value.getTracks().forEach((track) => track.stop());
    streamRef.value = null;
  }
  if (videoRef.value) {
    videoRef.value.srcObject = null;
  }
}

watch(
  () => props.active,
  (active) => {
    if (active) {
      void startCamera();
    } else {
      stopCamera();
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  stopCamera();
});

defineExpose({
  getVideo: () => videoRef.value,
  restart: startCamera,
});
</script>

<template>
  <div class="face-camera">
    <video
      ref="videoRef"
      autoplay
      class="face-camera__video"
      :class="{ 'face-camera__video--mirror': mirrored }"
      muted
      playsinline
    />
    <div v-if="cameraError" class="face-camera__error">{{ cameraError }}</div>
  </div>
</template>

<style scoped>
.face-camera {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: 8px;
  background: #111;
}

.face-camera__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.face-camera__video--mirror {
  transform: scaleX(-1);
}

.face-camera__error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: #fff;
  text-align: center;
  background: rgb(0 0 0 / 65%);
}
</style>

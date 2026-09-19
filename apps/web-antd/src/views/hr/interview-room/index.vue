<script lang="ts" setup>
import type {
  InterviewMessageVO,
  InterviewRecordingVO,
  InterviewReportVO,
  ProctorEventVO,
} from '#/api/hr/interview';

import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';
import { useAccessStore, useUserStore } from '@vben/stores';

import { Button, message, Textarea } from 'ant-design-vue';
import { Room, RoomEvent, Track } from 'livekit-client';

import {
  completeInterview,
  getInterview,
  getReport,
  getToken,
  listMessages,
  listProctorEvents,
  listRecordings,
  openInterviewOpening,
  reportProctorEvents,
  sendInterviewMessage,
  uploadRecording,
} from '#/api/hr/interview';
import { hasAnyRole, HR_ROLE } from '#/views/hr/roles';

defineOptions({ name: 'HrInterviewRoom' });

const route = useRoute();
const userStore = useUserStore();
const accessStore = useAccessStore();

const sessionId = computed(() => Number(route.query.id || 0));
const canRecruitManage = computed(() =>
  hasAnyRole(userStore.userInfo?.roles, [
    HR_ROLE.INTERVIEWER,
    HR_ROLE.SUPER_ADMIN,
    HR_ROLE.HR_ADMIN,
    HR_ROLE.HR_SSC,
    HR_ROLE.HR_ER,
  ]),
);
/** 本场是否以候选人身份进房（以后端会话为准，避免双角色误判） */
const amICandidate = ref(true);
const roleResolved = ref(false);
/** 观察模式：非本场候选人（面试官/管理员旁听） */
const observeOnly = computed(
  () => roleResolved.value && !amICandidate.value && canRecruitManage.value,
);

const SESSION_STATUS_LABEL: Record<string, string> = {
  CREATED: '待开始',
  READY: '就绪',
  OPENING: '开场中',
  IN_PROGRESS: '进行中',
  COMPLETED: '已结束',
  DONE: '已结束',
};

const PROCTOR_LABEL: Record<string, string> = {
  TAB_HIDDEN: '切换标签页',
  WINDOW_BLUR: '窗口失焦',
  CAMERA_OFF: '摄像头关闭',
};

const statusCode = ref('CREATED');
const statusText = ref('准备中');
const mediaError = ref('');
const mediaReady = ref(false);
const speaking = ref(false);
const streaming = ref(false);
const completing = ref(false);
const inputText = ref('');
const messages = ref<InterviewMessageVO[]>([]);
const report = ref<InterviewReportVO | null>(null);
const proctorEvents = ref<ProctorEventVO[]>([]);
const recordings = ref<InterviewRecordingVO[]>([]);
const playbackUrls = ref<Record<number, string>>({});
const jobTitle = ref('');
const chatBoxRef = ref<HTMLElement | null>(null);
const localVideoRef = ref<HTMLVideoElement | null>(null);
const remoteVideoRef = ref<HTMLVideoElement | null>(null);
const remoteConnected = ref(false);

let localStream: MediaStream | null = null;
let livekitRoom: null | Room = null;
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: BlobPart[] = [];
let abortCtrl: AbortController | null = null;
const proctorQueue: Array<{
  detail?: string;
  eventType: string;
  occurredAt: string;
}> = [];
let proctorTimer: null | ReturnType<typeof setInterval> = null;
let blurTimer: null | ReturnType<typeof setTimeout> = null;

function setStatus(code: string, fallback?: string) {
  statusCode.value = code;
  statusText.value = SESSION_STATUS_LABEL[code] || fallback || code || '准备中';
}

function proctorLabel(type?: string) {
  if (!type) return '-';
  return PROCTOR_LABEL[type] ?? type;
}

function formatTime(v?: string) {
  if (!v) return '-';
  return String(v).replace('T', ' ').slice(0, 19);
}

function nowIso() {
  return new Date().toISOString();
}

function pushProctor(eventType: string, detail?: string) {
  if (observeOnly.value) return;
  proctorQueue.push({ detail, eventType, occurredAt: nowIso() });
}

async function flushProctor() {
  if (!sessionId.value || proctorQueue.length === 0) return;
  const batch = proctorQueue.splice(0);
  try {
    await reportProctorEvents(sessionId.value, batch);
  } catch {
    proctorQueue.unshift(...batch);
  }
}

function speakText(text: string) {
  if (
    !text?.trim() ||
    typeof window === 'undefined' ||
    !window.speechSynthesis
  ) {
    return;
  }
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'zh-CN';
  utter.addEventListener('start', () => {
    speaking.value = true;
  });
  utter.addEventListener('end', () => {
    speaking.value = false;
  });
  utter.addEventListener('error', () => {
    speaking.value = false;
  });
  speaking.value = true;
  window.speechSynthesis.speak(utter);
}

async function scrollChat() {
  await nextTick();
  if (chatBoxRef.value) {
    chatBoxRef.value.scrollTop = chatBoxRef.value.scrollHeight;
  }
}

async function ensureMedia() {
  mediaError.value = '';
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    mediaReady.value = true;
    await nextTick();
    if (localVideoRef.value) {
      localVideoRef.value.srcObject = localStream;
      await localVideoRef.value.play().catch(() => undefined);
    }
    startRecorder();
    watchLocalTracks();
  } catch (error: any) {
    mediaReady.value = false;
    const msg = String(error?.message || '');
    mediaError.value =
      /Could not start video source|NotReadableError|NotAllowedError/i.test(msg)
        ? '无法启动摄像头，请检查权限或是否被其他应用占用'
        : msg || '无法访问摄像头/麦克风，请允许权限后刷新';
    setStatus(statusCode.value, '媒体未就绪');
  }
}

function watchLocalTracks() {
  if (!localStream) return;
  localStream.getVideoTracks().forEach((track) => {
    track.addEventListener('mute', () =>
      pushProctor('CAMERA_OFF', 'video muted'),
    );
    track.addEventListener('ended', () =>
      pushProctor('CAMERA_OFF', 'video ended'),
    );
  });
}

function startRecorder() {
  if (!localStream || typeof MediaRecorder === 'undefined') return;
  recordedChunks = [];
  const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';
  try {
    mediaRecorder = new MediaRecorder(localStream, { mimeType: mime });
  } catch {
    mediaRecorder = new MediaRecorder(localStream);
  }
  mediaRecorder.addEventListener('dataavailable', (ev) => {
    if (ev.data && ev.data.size > 0) recordedChunks.push(ev.data);
  });
  mediaRecorder.start(2000);
}

async function stopAndUploadRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
  const recorder = mediaRecorder;
  await new Promise<void>((resolve) => {
    recorder.addEventListener('stop', () => resolve(), { once: true });
    recorder.stop();
  });
  if (recordedChunks.length === 0 || !sessionId.value) return;
  const blob = new Blob(recordedChunks, { type: 'video/webm' });
  const fd = new FormData();
  fd.append('file', blob, `interview-${sessionId.value}.webm`);
  try {
    await uploadRecording(sessionId.value, fd);
  } catch {
    message.warning('录像上传失败，可稍后重试');
  }
}

function attachRemoteTrack(track: Track) {
  if (track.kind === Track.Kind.Video && remoteVideoRef.value) {
    track.attach(remoteVideoRef.value);
    remoteConnected.value = true;
  } else if (track.kind === Track.Kind.Audio) {
    const el = track.attach();
    el.style.display = 'none';
    document.body.append(el);
  }
}

function attachExistingRemotes(room: Room) {
  room.remoteParticipants.forEach((participant) => {
    participant.trackPublications.forEach((pub) => {
      if (pub.track) attachRemoteTrack(pub.track);
    });
  });
}

async function connectLiveKit(asCandidate: boolean) {
  if (!sessionId.value) return;
  if (asCandidate && !localStream) return;
  try {
    const tokenVo = await getToken(sessionId.value);
    if (typeof tokenVo.amICandidate === 'boolean') {
      amICandidate.value = tokenVo.amICandidate;
      roleResolved.value = true;
    }
    if (!tokenVo?.url || !tokenVo?.token) {
      setStatus(
        statusCode.value,
        asCandidate ? '本地预览' : '观察中（未配置 LiveKit）',
      );
      return;
    }
    livekitRoom = new Room();
    livekitRoom.on(RoomEvent.TrackSubscribed, (track) => {
      attachRemoteTrack(track);
    });
    livekitRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach();
      if (track.kind === Track.Kind.Video) {
        remoteConnected.value = false;
      }
    });
    livekitRoom.on(RoomEvent.Disconnected, () => {
      remoteConnected.value = false;
      setStatus(statusCode.value, '连接已断开');
    });
    await livekitRoom.connect(tokenVo.url, tokenVo.token);
    attachExistingRemotes(livekitRoom);

    if (asCandidate && localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      const audioTrack = localStream.getAudioTracks()[0];
      if (videoTrack) {
        await livekitRoom.localParticipant.publishTrack(videoTrack, {
          source: Track.Source.Camera,
        });
      }
      if (audioTrack) {
        await livekitRoom.localParticipant.publishTrack(audioTrack, {
          source: Track.Source.Microphone,
        });
      }
    }
  } catch (error: any) {
    console.warn(error);
    setStatus(statusCode.value, asCandidate ? '本地预览' : '观察连接失败');
  }
}

async function loadHistory() {
  if (!sessionId.value) return;
  const [session, msgs] = await Promise.all([
    getInterview(sessionId.value),
    listMessages(sessionId.value).catch(() => []),
  ]);
  jobTitle.value = session.jobTitle || '';
  if (typeof session.amICandidate === 'boolean') {
    amICandidate.value = session.amICandidate;
    roleResolved.value = true;
  }
  setStatus(session.status || 'CREATED');
  messages.value = msgs || [];
  await scrollChat();
  if (session.status === 'COMPLETED' || session.status === 'DONE') {
    report.value = await getReport(sessionId.value).catch(() => null);
  }
  if (observeOnly.value) {
    await loadObserverData();
  }
}

async function loadObserverData() {
  if (!sessionId.value) return;
  const [events, recs] = await Promise.all([
    listProctorEvents(sessionId.value).catch(() => []),
    listRecordings(sessionId.value).catch(() => []),
  ]);
  const e = events as any;
  proctorEvents.value = Array.isArray(e) ? e : [];
  recordings.value = Array.isArray(recs) ? recs : [];
  await loadPlaybackBlobs(recordings.value);
}

function appendAssistantStreaming(chunk: string) {
  const last = messages.value[messages.value.length - 1];
  if (last && last.role === 'assistant' && (last as any)._streaming) {
    last.content += chunk;
  } else {
    messages.value.push({
      content: chunk,
      role: 'assistant',
      ...({ _streaming: true } as any),
    });
  }
  scrollChat();
}

function finalizeAssistant() {
  const last = messages.value[messages.value.length - 1];
  if (last && last.role === 'assistant') {
    delete (last as any)._streaming;
    speakText(last.content);
  }
}

async function startInterview() {
  if (['CANCELLED', 'COMPLETED', 'DONE'].includes(statusCode.value)) {
    message.info('本场面试已结束');
    return;
  }
  if (!mediaReady.value) {
    message.error('请先允许摄像头与麦克风权限');
    return;
  }
  if (!sessionId.value) {
    message.error('缺少面试会话 id');
    return;
  }
  streaming.value = true;
  setStatus('OPENING');
  abortCtrl?.abort();
  abortCtrl = new AbortController();
  try {
    await openInterviewOpening(
      sessionId.value,
      (chunk) => {
        appendAssistantStreaming(chunk);
      },
      abortCtrl.signal,
    );
    finalizeAssistant();
    setStatus('IN_PROGRESS');
  } catch (error: any) {
    if (error?.name !== 'AbortError') {
      message.error(error?.message || '开场失败');
      setStatus(statusCode.value, '开场失败');
    }
  } finally {
    streaming.value = false;
  }
}

async function sendAnswer() {
  const content = inputText.value.trim();
  if (!content) return;
  if (!mediaReady.value) {
    message.error('媒体权限未就绪，无法作答');
    return;
  }
  if (streaming.value) return;
  messages.value.push({ content, role: 'user' });
  inputText.value = '';
  await scrollChat();
  streaming.value = true;
  setStatus('IN_PROGRESS', '思考中');
  abortCtrl?.abort();
  abortCtrl = new AbortController();
  try {
    await sendInterviewMessage(
      sessionId.value,
      content,
      (chunk) => appendAssistantStreaming(chunk),
      abortCtrl.signal,
    );
    finalizeAssistant();
    setStatus('IN_PROGRESS');
  } catch (error: any) {
    if (error?.name !== 'AbortError') {
      message.error(error?.message || '发送失败');
    }
  } finally {
    streaming.value = false;
  }
}

async function finishInterview() {
  if (!sessionId.value) return;
  completing.value = true;
  try {
    await flushProctor();
    await stopAndUploadRecording();
    report.value = await completeInterview(sessionId.value);
    setStatus('COMPLETED');
    message.success('报告已生成');
    if (observeOnly.value) await loadObserverData();
  } catch (error: any) {
    message.error(error?.message || '结束失败');
  } finally {
    completing.value = false;
  }
}

function onVisibility() {
  if (document.visibilityState === 'hidden') {
    pushProctor('TAB_HIDDEN', 'page hidden');
  }
}

function onBlur() {
  if (blurTimer) clearTimeout(blurTimer);
  blurTimer = setTimeout(() => {
    if (document.visibilityState === 'visible') {
      pushProctor('WINDOW_BLUR', 'window blur');
    }
  }, 800);
}

function onFocus() {
  if (blurTimer) {
    clearTimeout(blurTimer);
    blurTimer = null;
  }
}

onMounted(async () => {
  if (!sessionId.value) {
    mediaError.value = '缺少查询参数 id（面试会话）';
    return;
  }
  if (!accessStore.accessToken) {
    mediaError.value = '未登录';
    return;
  }
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);
  proctorTimer = setInterval(() => {
    flushProctor();
  }, 5000);

  // 先拉会话，按本场身份决定是否强开摄像头 / 进 LiveKit
  try {
    await loadHistory();
  } catch (error: any) {
    mediaError.value = error?.message || '加载面试会话失败';
    return;
  }

  if (observeOnly.value) {
    mediaReady.value = true;
    setStatus(statusCode.value, '观察中');
    await connectLiveKit(false);
  } else {
    await ensureMedia();
    if (mediaReady.value) {
      await connectLiveKit(true);
    }
  }
});

onBeforeUnmount(() => {
  revokePlaybackUrls();
  abortCtrl?.abort();
  document.removeEventListener('visibilitychange', onVisibility);
  window.removeEventListener('blur', onBlur);
  window.removeEventListener('focus', onFocus);
  if (proctorTimer) clearInterval(proctorTimer);
  if (blurTimer) clearTimeout(blurTimer);
  flushProctor();
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try {
      mediaRecorder.stop();
    } catch {
      /* ignore */
    }
  }
  livekitRoom?.disconnect();
  localStream?.getTracks().forEach((t) => t.stop());
});

watch(
  () => route.query.id,
  async () => {
    if (sessionId.value) await loadHistory();
  },
);

function formatReportList(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean).join('；') || '-';
  }
  if (typeof value === 'string') return value || '-';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function revokePlaybackUrls() {
  Object.values(playbackUrls.value).forEach((u) => {
    try {
      URL.revokeObjectURL(u);
    } catch {
      /* ignore */
    }
  });
  playbackUrls.value = {};
}

function recordingPlayUrl(r: InterviewRecordingVO): string {
  if (r.id && playbackUrls.value[r.id]) {
    return playbackUrls.value[r.id] ?? '';
  }
  return '';
}

async function loadPlaybackBlobs(list: InterviewRecordingVO[]) {
  revokePlaybackUrls();
  const token = accessStore.accessToken;
  if (!token || !sessionId.value) return;
  const raw = import.meta.env.VITE_GLOB_API_URL || '/api';
  let base = String(raw).replace(/\/$/, '');
  if (!/^https?:\/\//i.test(base)) {
    base = `${window.location.origin}${base.startsWith('/') ? base : `/${base}`}`;
  }
  const next: Record<number, string> = {};
  for (const r of list) {
    if (!r?.id) continue;
    const url = `${base}/interviews/${sessionId.value}/recording/${r.id}/file`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) continue;
      const blob = await res.blob();
      next[r.id] = URL.createObjectURL(blob);
    } catch {
      /* ignore single file */
    }
  }
  playbackUrls.value = next;
}

function dimensionEntries(
  dims: unknown,
): Array<{ key: string; value: string }> {
  if (!dims || typeof dims !== 'object') return [];
  return Object.entries(dims as Record<string, unknown>).map(
    ([key, value]) => ({
      key,
      value: String(value ?? '-'),
    }),
  );
}

const reportDimensions = computed(() =>
  dimensionEntries(report.value?.dimensions),
);
</script>

<template>
  <Page content-class="ir-page" title="AI 面试间">
    <div class="ir-studio">
      <header class="ir-top">
        <div class="ir-top-main">
          <p class="ir-kicker">模拟面试</p>
          <h2 class="ir-title">{{ jobTitle || '未命名岗位' }}</h2>
        </div>
        <div class="ir-top-meta">
          <span class="ir-chip" :data-tone="statusCode">{{ statusText }}</span>
          <span class="ir-meta-text">会话 {{ sessionId || '—' }}</span>
          <span v-if="observeOnly" class="ir-chip ir-chip-soft">观察模式</span>
        </div>
      </header>

      <div class="ir-body">
        <aside class="ir-stage">
          <div class="ir-ai" :class="{ speaking }">
            <div class="ir-ai-ring"></div>
            <div class="ir-ai-core">
              <span class="ir-ai-mark">面</span>
            </div>
            <p class="ir-ai-caption">
              {{
                speaking
                  ? 'AI 正在提问…'
                  : observeOnly
                    ? '数字面试官待命'
                    : '数字面试官'
              }}
            </p>
          </div>

          <div v-if="!observeOnly" class="ir-camera">
            <video
              ref="localVideoRef"
              autoplay
              class="ir-video"
              muted
              playsinline
            ></video>
            <div class="ir-camera-label">我的画面</div>
            <div v-if="mediaError" class="ir-camera-tip is-error">
              {{ mediaError }}
            </div>
            <div v-else-if="mediaReady" class="ir-camera-tip is-ok">
              摄像头与麦克风已就绪
            </div>
          </div>
          <div v-else class="ir-camera ir-remote">
            <video
              ref="remoteVideoRef"
              autoplay
              class="ir-video"
              playsinline
            ></video>
            <div class="ir-camera-label">候选人画面</div>
            <div v-if="remoteConnected" class="ir-camera-tip is-ok">
              实时画面已接入
            </div>
            <div v-else class="ir-camera-tip">等待候选人进入房间…</div>
          </div>
        </aside>

        <section class="ir-main">
          <div class="ir-chat-head">
            <h3>对话</h3>
            <span v-if="streaming" class="ir-typing">生成中</span>
          </div>

          <div ref="chatBoxRef" class="ir-chat">
            <div v-if="!messages.length" class="ir-empty">
              <p>
                {{
                  observeOnly
                    ? '等待候选人开始面试'
                    : '点击下方「开始面试」开启对话'
                }}
              </p>
            </div>
            <div
              v-for="(m, idx) in messages"
              :key="idx"
              class="ir-msg"
              :class="m.role"
            >
              <div class="ir-msg-role">
                {{ m.role === 'user' ? '候选人' : '面试官' }}
              </div>
              <div class="ir-bubble">{{ m.content }}</div>
            </div>
          </div>

          <div v-if="!observeOnly" class="ir-composer">
            <Textarea
              v-model:value="inputText"
              :disabled="!mediaReady || streaming"
              :rows="3"
              class="ir-input"
              placeholder="输入你的回答，Enter 发送"
              @press-enter.exact.prevent="sendAnswer"
            />
            <div class="ir-actions">
              <Button
                :disabled="
                  !mediaReady ||
                  streaming ||
                  ['COMPLETED', 'DONE', 'CANCELLED'].includes(statusCode)
                "
                type="primary"
                @click="startInterview"
              >
                开始面试
              </Button>
              <Button
                :disabled="
                  !mediaReady ||
                  streaming ||
                  !inputText.trim() ||
                  ['COMPLETED', 'DONE', 'CANCELLED'].includes(statusCode)
                "
                @click="sendAnswer"
              >
                发送回答
              </Button>
              <Button
                :disabled="
                  ['COMPLETED', 'DONE', 'CANCELLED'].includes(statusCode)
                "
                :loading="completing"
                danger
                @click="finishInterview"
              >
                结束并生成报告
              </Button>
            </div>
          </div>
          <div v-else class="ir-composer ir-composer-obs">
            <div class="ir-actions">
              <Button :loading="completing" danger @click="finishInterview">
                结束并生成报告
              </Button>
              <Button @click="loadObserverData">刷新监控数据</Button>
            </div>
          </div>

          <div v-if="report" class="ir-report">
            <div class="ir-section-title">面试报告</div>
            <div class="ir-score-row">
              <div class="ir-score">
                <span class="ir-score-num">{{ report.totalScore ?? '—' }}</span>
                <span class="ir-score-label">综合评分</span>
              </div>
              <div class="ir-dims">
                <div v-for="d in reportDimensions" :key="d.key" class="ir-dim">
                  <span>{{ d.key }}</span>
                  <strong>{{ d.value }}</strong>
                </div>
                <div v-if="!reportDimensions.length" class="ir-muted">
                  暂无维度分
                </div>
              </div>
            </div>
            <div class="ir-report-block">
              <h4>优势</h4>
              <p>{{ formatReportList(report.strengths) }}</p>
            </div>
            <div class="ir-report-block">
              <h4>不足</h4>
              <p>{{ formatReportList(report.weaknesses) }}</p>
            </div>
            <div class="ir-report-block">
              <h4>建议</h4>
              <p>{{ formatReportList(report.suggestions) }}</p>
            </div>
          </div>

          <div v-if="observeOnly" class="ir-monitor">
            <div class="ir-section-title">反作弊时间线</div>
            <div v-if="!proctorEvents.length" class="ir-muted">暂无事件</div>
            <ul v-else class="ir-timeline">
              <li
                v-for="ev in proctorEvents"
                :key="ev.id"
                class="ir-timeline-item"
              >
                <span class="ir-tl-type">{{ proctorLabel(ev.eventType) }}</span>
                <span class="ir-tl-time">{{ formatTime(ev.occurredAt) }}</span>
                <span class="ir-tl-detail">{{ ev.detail || '—' }}</span>
              </li>
            </ul>

            <div class="ir-section-title ir-section-gap">录像回放</div>
            <div v-if="!recordings.length" class="ir-muted">暂无录像</div>
            <div v-else class="ir-playback-list">
              <video
                v-for="r in recordings"
                :key="r.id"
                :src="recordingPlayUrl(r)"
                class="ir-playback"
                controls
              ></video>
            </div>
          </div>
        </section>
      </div>
    </div>
  </Page>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,500&family=Noto+Sans+SC:wght@400;500;700&display=swap');

.ir-page :deep(.vben-page-content),
.ir-studio {
  --ink: #1a2332;
  --muted: #5c6b7a;
  --line: #d7e0e6;
  --paper: #f3f6f8;
  --panel: #fff;
  --accent: #0b7a6e;
  --accent-deep: #065f56;
  --warn: #b45309;
  --danger: #b91c1c;

  font-family: 'DM Sans', 'Noto Sans SC', sans-serif;
  color: var(--ink);
}

.ir-studio {
  position: relative;
  min-height: 72vh;
  padding: 20px 22px 24px;
  overflow: hidden;
  background:
    radial-gradient(
      900px 420px at 8% -10%,
      rgb(11 122 110 / 12%),
      transparent 55%
    ),
    radial-gradient(
      700px 380px at 100% 0%,
      rgb(26 35 50 / 6%),
      transparent 50%
    ),
    linear-gradient(165deg, #f7fafb 0%, #eef3f5 48%, #e8eef1 100%);
  border: 1px solid var(--line);
  animation: ir-fade-in 0.45s ease both;
}

.ir-top {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 20px;
  align-items: flex-end;
  justify-content: space-between;
  padding-bottom: 16px;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--line);
}

.ir-kicker {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.ir-title {
  margin: 4px 0 0;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.ir-top-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.ir-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent-deep);
  background: rgb(255 255 255 / 85%);
  border: 1px solid var(--line);
}

.ir-chip[data-tone='IN_PROGRESS'],
.ir-chip[data-tone='OPENING'] {
  color: var(--accent);
  border-color: rgb(11 122 110 / 35%);
}

.ir-chip[data-tone='COMPLETED'],
.ir-chip[data-tone='DONE'] {
  color: var(--muted);
}

.ir-chip-soft {
  font-weight: 500;
  color: var(--muted);
}

.ir-meta-text {
  font-size: 12px;
  color: var(--muted);
}

.ir-body {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.ir-stage {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ir-ai {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 16px 18px;
  overflow: hidden;
  color: #edf3f5;
  background: linear-gradient(160deg, #1a2332 0%, #243447 55%, #0b4f48 100%);
}

.ir-ai::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background: linear-gradient(
    120deg,
    transparent 40%,
    rgb(255 255 255 / 4%) 50%,
    transparent 60%
  );
  background-size: 200% 100%;
  animation: ir-sheen 6s ease-in-out infinite;
}

.ir-ai-ring {
  position: absolute;
  width: 118px;
  height: 118px;
  border: 1px solid rgb(148 214 204 / 35%);
  opacity: 0;
  transform: scale(0.85);
}

.ir-ai.speaking .ir-ai-ring {
  animation: ir-ring 1.1s ease-out infinite;
}

.ir-ai-core {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 88px;
  height: 88px;
  background: linear-gradient(145deg, #2dd4bf 0%, #0b7a6e 70%);
  clip-path: polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%);
  transition: transform 0.25s ease;
}

.ir-ai.speaking .ir-ai-core {
  animation: ir-breathe 0.9s ease-in-out infinite;
}

.ir-ai-mark {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.ir-ai-caption {
  position: relative;
  z-index: 1;
  margin: 14px 0 0;
  font-size: 13px;
  color: rgb(237 243 245 / 82%);
}

.ir-camera {
  position: relative;
  background: #0f1720;
  border: 1px solid var(--line);
}

.ir-video {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  background: #0a1018;
}

.ir-camera-label {
  position: absolute;
  top: 8px;
  left: 8px;
  padding: 2px 8px;
  font-size: 11px;
  color: #e8eef1;
  letter-spacing: 0.04em;
  background: rgb(15 23 32 / 72%);
}

.ir-camera-tip {
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.45;
  background: var(--panel);
  border-top: 1px solid var(--line);
}

.ir-camera-tip.is-error {
  color: var(--danger);
}

.ir-camera-tip.is-ok {
  color: var(--accent-deep);
}

.ir-remote .ir-video {
  background: #0f1720;
}

.ir-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 14px 14px 16px;
  background: rgb(255 255 255 / 78%);
  border: 1px solid var(--line);
}

.ir-chat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.ir-chat-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
}

.ir-typing {
  font-size: 12px;
  color: var(--accent);
  animation: ir-blink 1.2s ease-in-out infinite;
}

.ir-chat {
  height: min(46vh, 440px);
  padding: 12px;
  overflow: auto;
  background: linear-gradient(
    180deg,
    rgb(243 246 248 / 90%),
    rgb(238 243 245 / 95%)
  );
  border: 1px solid var(--line);
}

.ir-empty {
  display: grid;
  place-items: center;
  height: 100%;
  font-size: 13px;
  color: var(--muted);
  text-align: center;
}

.ir-msg {
  max-width: 88%;
  margin-bottom: 14px;
  animation: ir-msg-in 0.28s ease both;
}

.ir-msg.user {
  margin-left: auto;
  text-align: right;
}

.ir-msg-role {
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.06em;
}

.ir-bubble {
  display: inline-block;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.55;
  text-align: left;
  word-break: normal;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.ir-msg.assistant .ir-bubble,
.ir-msg.system .ir-bubble {
  background: #fff;
  border: 1px solid var(--line);
  border-left: 3px solid var(--accent);
}

.ir-msg.user .ir-bubble {
  color: #fff;
  background: var(--accent);
}

.ir-composer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.ir-composer-obs {
  padding-top: 4px;
}

.ir-input :deep(textarea) {
  font-family: inherit;
  border-color: var(--line) !important;
  border-radius: 0 !important;
}

.ir-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.ir-section-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 650;
}

.ir-section-gap {
  margin-top: 18px;
}

.ir-report,
.ir-monitor {
  padding-top: 14px;
  margin-top: 16px;
  border-top: 1px solid var(--line);
}

.ir-score-row {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.ir-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 8px;
  color: #edf3f5;
  background: linear-gradient(160deg, #1a2332, #0b4f48);
}

.ir-score-num {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.ir-score-label {
  margin-top: 6px;
  font-size: 11px;
  opacity: 0.85;
}

.ir-dims {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}

.ir-dim {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  font-size: 12px;
  color: var(--muted);
  background: var(--paper);
  border: 1px solid var(--line);
}

.ir-dim strong {
  font-size: 14px;
  color: var(--ink);
}

.ir-report-block {
  margin-top: 10px;
}

.ir-report-block h4 {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
}

.ir-report-block p {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
}

.ir-muted {
  font-size: 13px;
  color: var(--muted);
}

.ir-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.ir-timeline-item {
  display: grid;
  grid-template-columns: 100px 160px 1fr;
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
  background: var(--paper);
  border: 1px solid var(--line);
}

.ir-tl-type {
  font-weight: 600;
  color: var(--accent-deep);
}

.ir-tl-time {
  font-variant-numeric: tabular-nums;
  color: var(--muted);
}

.ir-tl-detail {
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ink);
  white-space: nowrap;
}

.ir-playback-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ir-playback {
  width: 100%;
  max-height: 240px;
  background: #0f1720;
}

@keyframes ir-fade-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes ir-msg-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes ir-breathe {
  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
  }
}

@keyframes ir-ring {
  0% {
    opacity: 0.55;
    transform: scale(0.9);
  }

  100% {
    opacity: 0;
    transform: scale(1.35);
  }
}

@keyframes ir-sheen {
  0%,
  100% {
    background-position: 120% 0;
  }

  50% {
    background-position: -20% 0;
  }
}

@keyframes ir-blink {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.35;
  }
}

@media (max-width: 960px) {
  .ir-body {
    grid-template-columns: 1fr;
  }

  .ir-score-row {
    grid-template-columns: 1fr;
  }

  .ir-timeline-item {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .ir-chat {
    height: 360px;
  }
}
</style>

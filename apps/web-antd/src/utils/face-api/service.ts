import * as tf from '@tensorflow/tfjs-core';
import * as faceapi from '@vladmandic/face-api';

import '@tensorflow/tfjs-backend-webgl';

const DESCRIPTOR_SIZE = 128;
const MATCH_THRESHOLD = 0.6;

/** 默认从 jsDelivr 加载模型，也可在 .env 设置 VITE_FACE_MODEL_URL=/models */
const MODEL_BASE =
  import.meta.env.VITE_FACE_MODEL_URL ||
  'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model';

let modelsLoaded = false;
let modelsLoading: null | Promise<void> = null;

export async function loadFaceModels() {
  if (modelsLoaded) {
    return;
  }
  if (modelsLoading) {
    await modelsLoading;
    return;
  }
  modelsLoading = (async () => {
    await tf.setBackend('webgl');
    await tf.ready();
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_BASE),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_BASE),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_BASE),
    ]);
    modelsLoaded = true;
  })();
  await modelsLoading;
}

export async function extractDescriptor(video: HTMLVideoElement) {
  await loadFaceModels();
  const detection = await faceapi
    .detectSingleFace(
      video,
      new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }),
    )
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection?.descriptor ?? null;
}

export async function extractAverageDescriptor(
  video: HTMLVideoElement,
  sampleCount = 5,
  intervalMs = 300,
) {
  const samples: Float32Array[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const descriptor = await extractDescriptor(video);
    if (descriptor) {
      samples.push(descriptor);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  if (samples.length < 3) {
    return null;
  }
  const avg = new Float32Array(DESCRIPTOR_SIZE);
  for (let i = 0; i < DESCRIPTOR_SIZE; i++) {
    avg[i] =
      samples.reduce((sum, item) => sum + (item[i] ?? 0), 0) / samples.length;
  }
  return avg;
}

export function descriptorToArray(descriptor: Float32Array): number[] {
  return [...descriptor];
}

export function euclideanDistance(a: Float32Array, b: Float32Array) {
  return faceapi.euclideanDistance(a, b);
}

export function isFaceMatch(distance: number, threshold = MATCH_THRESHOLD) {
  return distance < threshold;
}

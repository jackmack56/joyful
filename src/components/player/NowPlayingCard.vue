<script setup lang="ts">
import { computed } from "vue";
import type { MusicTrack } from "@/types/music";

const props = withDefaults(defineProps<{
  track: MusicTrack | null;
  isPlaying: boolean;
  coverShape?: "rounded" | "circle";
  verticalAlign?: "start" | "center";
  spinCover?: boolean;
  coverSize?: "md" | "lg";
  showWave?: boolean;
  waveLevel?: number;
  waveTime?: number;
}>(), {
  coverShape: "rounded",
  verticalAlign: "start",
  spinCover: false,
  coverSize: "md",
  showWave: false,
  waveLevel: 0,
  waveTime: 0,
});

const coverClass = computed(() => (props.coverShape === "circle" ? "rounded-full" : "rounded-[28px]"));
const coverSizeClass = computed(() => (props.coverSize === "lg" ? "h-52 w-52" : "h-48 w-48"));
const waveSpacingClass = computed(() => {
  if (!props.showWave) return "";
  return props.coverSize === "lg" ? "mb-16" : "mb-12";
});
const waveVisible = computed(() => props.showWave);
const normalizedWaveLevel = computed(() => Math.min(1, Math.max(0, props.waveLevel ?? 0)));
const waveCanvasSize = computed(() => (props.coverSize === "lg" ? 340 : 320));
const waveSvgClass = computed(() =>
  props.coverSize === "lg"
    ? "pointer-events-none absolute inset-[-66px] h-[340px] w-[340px] overflow-visible transition-all duration-150 ease-out"
    : "pointer-events-none absolute inset-[-64px] h-[320px] w-[320px] overflow-visible transition-all duration-150 ease-out"
);
const waveGradientId = `lyrics-wave-gradient-${Math.random().toString(36).slice(2, 9)}`;
const wavePointCount = 200;
const waveLayerDefs = [
  { seed: 0.2, intensity: 0.48, width: 1.1, alphaBase: 0.1, alphaGain: 0.12 },
  { seed: 0.9, intensity: 0.66, width: 1.3, alphaBase: 0.14, alphaGain: 0.16 },
  { seed: 1.7, intensity: 0.86, width: 1.6, alphaBase: 0.2, alphaGain: 0.2 },
  { seed: 2.4, intensity: 1.02, width: 1.95, alphaBase: 0.26, alphaGain: 0.24 },
  { seed: 3.1, intensity: 1.18, width: 2.3, alphaBase: 0.32, alphaGain: 0.3 },
];

function buildWavePath(seed: number, intensity = 1): string {
  const level = normalizedWaveLevel.value;
  const time = Number.isFinite(props.waveTime) ? props.waveTime : 0;
  const canvas = waveCanvasSize.value;
  const center = canvas / 2;
  const baseRadius = (props.coverSize === "lg" ? 104 : 96) + 24;
  const amplitude = props.isPlaying
    ? (3 + Math.pow(level, 1.35) * 28) * intensity
    : 1.6 * intensity;

  let path = "";
  for (let i = 0; i <= wavePointCount; i += 1) {
    const theta = (Math.PI * 2 * i) / wavePointCount;
    const waveA = Math.sin(theta * 5 + time * 3.8 + seed);
    const waveB = Math.sin(theta * 10 - time * 2.4 + seed * 0.8);
    const waveC = Math.sin(theta * 2 + time * 1.1 + seed * 1.7);
    const offset = (waveA * 0.55 + waveB * 0.28 + waveC * 0.17) * amplitude;
    const radius = baseRadius + offset;
    const x = center + Math.cos(theta) * radius;
    const y = center + Math.sin(theta) * radius;
    path += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${path} Z`;
}

const waveLayers = computed(() => {
  const level = normalizedWaveLevel.value;
  return waveLayerDefs.map((layer) => ({
    d: buildWavePath(layer.seed, layer.intensity),
    width: layer.width,
    opacity: props.isPlaying ? layer.alphaBase + level * layer.alphaGain : layer.alphaBase * 0.5,
  }));
});
</script>

<template>
  <div class="text-slate-800 dark:text-white/80" :class="props.verticalAlign === 'center' ? 'h-full flex flex-col' : ''">
    <div class="text-xs uppercase tracking-[0.4em] text-slate-400 dark:text-white/50">当前歌曲</div>
    <div
      class="mt-4 flex flex-col items-center text-center text-sm leading-relaxed"
      :class="props.verticalAlign === 'center' ? 'flex-1 justify-center' : ''"
    >
      <div class="relative flex items-center justify-center" :class="[coverSizeClass, waveSpacingClass]">
        <svg
          v-if="waveVisible"
          :class="waveSvgClass"
          :viewBox="`0 0 ${waveCanvasSize} ${waveCanvasSize}`"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient :id="waveGradientId" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#22d3ee" />
              <stop offset="30%" stop-color="#22c55e" />
              <stop offset="60%" stop-color="#f59e0b" />
              <stop offset="100%" stop-color="#a855f7" />
            </linearGradient>
          </defs>
          <path
            v-for="(layer, index) in waveLayers"
            :key="index"
            :d="layer.d"
            :stroke="`url(#${waveGradientId})`"
            :stroke-width="layer.width"
            stroke-linecap="round"
            :style="{ opacity: layer.opacity }"
          />
        </svg>
        <img
          :src="track?.pic ?? 'https://placehold.co/240x240?text=Cover'"
          alt="封面"
          :class="[coverClass, coverSizeClass, props.spinCover ? 'animate-slow-spin' : '']"
          class="relative object-cover shadow-xl"
          :style="
            props.spinCover
              ? { animationPlayState: props.isPlaying ? 'running' : 'paused' }
              : undefined
          "
        />
      </div>
      <p class="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{{ track?.name ?? "静待播放" }}</p>
      <p class="text-slate-500 dark:text-white/60">歌手：{{ track?.artist ?? "--" }}</p>
      <p class="text-slate-500 dark:text-white/60">专辑：{{ track?.album ?? "--" }}</p>
    </div>
  </div>
</template>

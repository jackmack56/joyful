import type { LyricLine } from "@/types/player";

const inlineTimeRegex = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?]/g;
const blockRegex =
  /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?](.*?)(?=\[\d{1,2}:\d{1,2}(?:\.\d{1,3})?]|$)/gs;

function pushLine(target: LyricLine[], minutes: string, seconds: string, milli: string | undefined, text: string) {
  if (!text.trim()) return;
  const totalSeconds = Number(minutes) * 60 + Number(seconds) + (Number(milli) || 0) / 1000;
  target.push({
    time: Number(totalSeconds.toFixed(3)),
    text: text.trim(),
  });
}

export function parseLrc(input?: string | null): LyricLine[] {
  if (!input) return [];
  const normalized = input.replace(/\r\n?/g, "\n");
  const parsed: LyricLine[] = [];
  let matched = false;

  for (const match of normalized.matchAll(blockRegex)) {
    matched = true;
    const [, minutes, seconds, milliseconds, rawText] = match;
    pushLine(parsed, minutes, seconds, milliseconds, rawText ?? "");
  }

  if (!matched) {
    const lines = normalized
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      inlineTimeRegex.lastIndex = 0;
      const text = line.replace(inlineTimeRegex, "").trim();
      const matches = [...line.matchAll(inlineTimeRegex)];
      if (!matches.length || !text) continue;
      for (const match of matches) {
        const [, minutes, seconds, milliseconds] = match;
        pushLine(parsed, minutes, seconds, milliseconds, text);
      }
    }
  }

  return parsed.sort((a, b) => a.time - b.time);
}

export function findActiveLyricIndex(lines: LyricLine[], currentTime: number): number {
  if (!lines.length) return -1;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (currentTime >= lines[i].time) return i;
  }
  return -1;
}

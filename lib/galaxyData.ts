import emotionRecords from "@/data/book-emotions.json";

export type EmotionKind =
  | "温暖"
  | "遗憾"
  | "喜悦"
  | "孤独"
  | "释然"
  | "希望"
  | "离别"
  | "童真"
  | "紧张"
  | "平静"
  | "压抑"
  | "温柔";

export type SourceLine = {
  text: string;
  score: number;
  emotion: EmotionKind;
  intensity: number;
  chapterIndex: number;
  chapterTitle: string;
  chapterPosition: number;
  motifs: string[];
  domain: string;
};

export type GalaxyStar = SourceLine & {
  id: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  chapter: number;
  chapterTitle: string;
  chapterPosition: number;
  motifs: string[];
  domain: string;
  isGoldenEye: boolean;
};

type EmotionRecord = {
  text: string;
  emotion_score: number;
  emotion_type: string;
  emotion_intensity?: number;
  chapter_index?: number;
  chapter_title?: string;
  chapter_position?: number;
  motifs?: string[];
  domain?: string;
};

const motifRules = [
  { motif: "黄金瞳", words: ["黄金瞳", "金色的瞳", "金色瞳", "金瞳"] },
  { motif: "龙", words: ["龙", "龙王", "龙类", "龙族"] },
  { motif: "言灵", words: ["言灵"] },
  { motif: "青铜", words: ["青铜", "青铜城", "白帝城"] },
  { motif: "卡塞尔", words: ["卡塞尔", "学院", "诺玛"] },
  { motif: "七宗罪", words: ["七宗罪", "刀", "刀剑"] },
  { motif: "路明非", words: ["路明非", "李嘉图"] },
  { motif: "诺诺", words: ["诺诺", "陈墨瞳"] },
  { motif: "楚子航", words: ["楚子航"] },
  { motif: "恺撒", words: ["恺撒", "加图索"] }
];

function detectMotifs(text: string) {
  return motifRules
    .filter((rule) => rule.words.some((word) => text.includes(word)))
    .map((rule) => rule.motif);
}

function domainForChapter(chapterTitle: string) {
  if (chapterTitle.includes("卡塞尔")) return "学院入口星域";
  if (chapterTitle.includes("黄金瞳")) return "黄金瞳星域";
  if (chapterTitle.includes("恺撒")) return "加图索星域";
  if (chapterTitle.includes("青铜")) return "青铜迷宫星域";
  if (chapterTitle.includes("龙影")) return "龙影深渊星域";
  if (chapterTitle.includes("星与花")) return "星花舞会星域";
  if (chapterTitle.includes("弟弟")) return "黑暗甬道星域";
  if (chapterTitle.includes("哥哥")) return "血缘回声星域";
  if (chapterTitle.includes("龙墓")) return "龙墓遗迹星域";
  if (chapterTitle.includes("七宗罪")) return "七宗罪星域";
  return `${chapterTitle}星域`;
}

const knownEmotions: EmotionKind[] = [
  "温暖",
  "遗憾",
  "喜悦",
  "孤独",
  "释然",
  "希望",
  "离别",
  "童真",
  "紧张",
  "平静",
  "压抑",
  "温柔"
];

const fallbackLines: SourceLine[] = [
  { text: "她在雨停之后推开窗，街灯像刚醒来的金子。", score: 0.66, emotion: "温暖", intensity: 0.7, chapterIndex: 1, chapterTitle: "示例章节", chapterPosition: 0, motifs: [], domain: "示例星域" },
  { text: "那封没有寄出的信，被夹在旧书最暗的一页。", score: -0.42, emotion: "遗憾", intensity: 0.52, chapterIndex: 1, chapterTitle: "示例章节", chapterPosition: 1, motifs: [], domain: "示例星域" },
  { text: "他们在桥上笑起来，风把沉默吹得很远。", score: 0.72, emotion: "喜悦", intensity: 0.74, chapterIndex: 1, chapterTitle: "示例章节", chapterPosition: 2, motifs: [], domain: "示例星域" },
  { text: "夜色压低了屋檐，连钟声也不敢惊动谁。", score: -0.36, emotion: "孤独", intensity: 0.48, chapterIndex: 1, chapterTitle: "示例章节", chapterPosition: 3, motifs: [], domain: "示例星域" },
  { text: "他忽然明白，所谓告别只是另一种抵达。", score: 0.18, emotion: "释然", intensity: 0.44, chapterIndex: 1, chapterTitle: "示例章节", chapterPosition: 4, motifs: [], domain: "示例星域" }
];

function normalizeEmotion(emotion: string): EmotionKind {
  return knownEmotions.includes(emotion as EmotionKind) ? (emotion as EmotionKind) : "平静";
}

const sourceLines: SourceLine[] = ((emotionRecords as EmotionRecord[]) || [])
  .filter((record) => record.text && typeof record.emotion_score === "number")
  .map((record) => ({
    text: record.text,
    score: clamp(record.emotion_score, -1, 1),
    emotion: normalizeEmotion(record.emotion_type),
    intensity: clamp(record.emotion_intensity ?? Math.abs(record.emotion_score), 0, 1),
    chapterIndex: record.chapter_index ?? 1,
    chapterTitle: record.chapter_title ?? "未命名章节",
    chapterPosition: record.chapter_position ?? 0,
    motifs: record.motifs?.length ? record.motifs : detectMotifs(record.text),
    domain: record.domain ?? domainForChapter(record.chapter_title ?? "未命名章节")
  }));

const activeSourceLines = sourceLines.length > 0 ? sourceLines : fallbackLines;

function hash(seed: number) {
  const value = Math.sin(seed * 999.91) * 10000;
  return value - Math.floor(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hslToHex(h: number, s: number, l: number) {
  const hue = ((h % 360) + 360) % 360;
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function colorForEmotion(score: number, emotion: EmotionKind) {
  const emotionHue: Record<EmotionKind, number> = {
    喜悦: 322,
    温暖: 340,
    童真: 212,
    温柔: 306,
    希望: 224,
    释然: 246,
    平静: 232,
    遗憾: 262,
    孤独: 238,
    离别: 274,
    紧张: 314,
    压抑: 286
  };
  const intensity = Math.abs(score);
  const polarityShift = score >= 0 ? score * 16 : score * 18;
  const hue = emotionHue[emotion] + polarityShift;
  const saturation = lerp(44, 88, intensity);
  const lightness = lerp(58, 76, intensity);
  return hslToHex(hue, saturation, lightness);
}

export function createGalaxyStars(total = activeSourceLines.length): GalaxyStar[] {
  return Array.from({ length: total }, (_, index) => {
    const t = total === 1 ? 0 : index / (total - 1);
    const source = activeSourceLines[index % activeSourceLines.length];
    const score = clamp(source.score, -1, 1);
    const localHueJitter = (hash(index + 29) - 0.5) * 18;
    const turns = 1.85;
    const clusterCenters = [0.1, 0.2, 0.34, 0.52, 0.68, 0.83, 0.94];
    const cluster = clusterCenters.reduce((sum, center, clusterIndex) => {
      const width = clusterIndex % 2 === 0 ? 0.025 : 0.045;
      const distance = Math.abs(t - center);
      return sum + Math.exp(-(distance * distance) / (width * width));
    }, 0);
    const armIndex = Math.floor(hash(index + 101) * 3);
    const armOffset = armIndex * ((Math.PI * 2) / 3) + (hash(index + 111) - 0.5) * 0.72;
    const angle =
      t * Math.PI * 2 * turns +
      armOffset +
      Math.sin(t * Math.PI * 7.2 + armIndex) * 0.32 +
      (hash(index + 77) - 0.5) * lerp(0.55, 0.18, Math.min(cluster, 1));
    const spineRadius = lerp(16.2, 3.2, Math.pow(t, 0.88));
    const voidPush = Math.sin(t * Math.PI * 10.5 + 0.8) * 0.65;
    const armNoise = (hash(index + 41) - 0.5) * lerp(2.8, 0.62, Math.min(cluster, 1));
    const thickness = lerp(4.2, 1.15, Math.min(cluster, 1)) * Math.pow(hash(index + 63), 1.55);
    const side = hash(index + 81) > 0.5 ? 1 : -1;
    const vertical =
      Math.sin(angle * 0.42) * 1.35 +
      (hash(index + 95) - 0.5) * lerp(3.6, 1.3, Math.min(cluster, 1));
    const radius =
      lerp(0.07, 0.22, Math.abs(score)) *
      lerp(0.62, 1.65, hash(index + 13)) *
      lerp(0.85, 1.4, Math.min(cluster, 1));

    return {
      id: index,
      text: source.text,
      emotion: source.emotion,
      intensity: source.intensity,
      score,
      color: colorForEmotion(clamp(score + localHueJitter / 160, -1, 1), source.emotion),
      chapter: source.chapterIndex,
      chapterIndex: source.chapterIndex,
      chapterTitle: source.chapterTitle,
      chapterPosition: source.chapterPosition,
      motifs: source.motifs,
      domain: source.domain,
      isGoldenEye:
        source.intensity > 0.82 ||
        source.motifs.includes("黄金瞳") ||
        source.motifs.includes("龙"),
      radius: radius * lerp(0.82, 1.32, source.intensity),
      x: Math.cos(angle) * (spineRadius + armNoise + voidPush) + Math.cos(angle + Math.PI / 2) * thickness * side,
      y: vertical,
      z: Math.sin(angle) * (spineRadius + armNoise + voidPush) + Math.sin(angle + Math.PI / 2) * thickness * side
    };
  });
}

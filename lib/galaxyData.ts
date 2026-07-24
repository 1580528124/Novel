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
};

export type GalaxyStar = SourceLine & {
  id: number;
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  chapter: number;
};

const sourceLines: SourceLine[] = [
  { text: "她在雨停之后推开窗，街灯像刚醒来的金子。", score: 0.66, emotion: "温暖" },
  { text: "那封没有寄出的信，被夹在旧书最暗的一页。", score: -0.42, emotion: "遗憾" },
  { text: "他们在桥上笑起来，风把沉默吹得很远。", score: 0.72, emotion: "喜悦" },
  { text: "夜色压低了屋檐，连钟声也不敢惊动谁。", score: -0.36, emotion: "孤独" },
  { text: "他忽然明白，所谓告别只是另一种抵达。", score: 0.18, emotion: "释然" },
  { text: "火车穿过山谷，所有窗户都闪着短暂的光。", score: 0.34, emotion: "希望" },
  { text: "她没有回头，像把一整座城留在身后。", score: -0.64, emotion: "离别" },
  { text: "孩子把贝壳贴在耳边，听见夏天仍在里面。", score: 0.81, emotion: "童真" },
  { text: "门外的脚步停住了，空气紧得像一根弦。", score: -0.78, emotion: "紧张" },
  { text: "晨雾散开时，河面露出安静的银色。", score: 0.22, emotion: "平静" },
  { text: "他说没关系，可指节已经攥得发白。", score: -0.7, emotion: "压抑" },
  { text: "月亮升起，所有失物都有了温柔的轮廓。", score: 0.58, emotion: "温柔" }
];

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
    喜悦: 42,
    温暖: 28,
    童真: 56,
    温柔: 332,
    希望: 156,
    释然: 188,
    平静: 205,
    遗憾: 244,
    孤独: 226,
    离别: 262,
    紧张: 345,
    压抑: 292
  };
  const intensity = Math.abs(score);
  const polarityShift = score >= 0 ? -10 + score * 18 : score * 20;
  const hue = emotionHue[emotion] + polarityShift;
  const saturation = lerp(58, 92, intensity);
  const lightness = score >= 0 ? lerp(62, 72, intensity) : lerp(58, 68, intensity);
  return hslToHex(hue, saturation, lightness);
}

export function createGalaxyStars(total = 840): GalaxyStar[] {
  return Array.from({ length: total }, (_, index) => {
    const t = total === 1 ? 0 : index / (total - 1);
    const source = sourceLines[index % sourceLines.length];
    const wave = Math.sin(index * 0.071) * 0.28 + Math.sin(index * 0.019) * 0.18;
    const score = clamp(source.score + wave, -1, 1);
    const localHueJitter = (hash(index + 29) - 0.5) * 26;
    const turns = 4.7;
    const angle = t * Math.PI * 2 * turns;
    const spineRadius = lerp(13.8, 2.4, t);
    const armNoise = (hash(index + 41) - 0.5) * 1.8;
    const thickness = 0.55 + Math.pow(hash(index + 63), 1.8) * 2.45;
    const drift = (hash(index + 77) - 0.5) * Math.PI * 0.7;
    const vertical = Math.sin(angle * 0.42) * 1.6 + (hash(index + 95) - 0.5) * 3.2;
    const radius = lerp(0.055, 0.19, Math.abs(score)) * lerp(0.72, 1.28, hash(index + 13));

    return {
      id: index,
      text: source.text,
      emotion: source.emotion,
      score,
      color: colorForEmotion(clamp(score + localHueJitter / 160, -1, 1), source.emotion),
      chapter: Math.floor(t * 18) + 1,
      radius,
      x: Math.cos(angle + drift) * (spineRadius + armNoise) + Math.cos(angle * 2.3) * thickness,
      y: vertical,
      z: Math.sin(angle + drift) * (spineRadius + armNoise) + Math.sin(angle * 1.7) * thickness
    };
  });
}

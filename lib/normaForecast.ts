export type NormaForecastSignal = {
  code: string;
  title: string;
  level: string;
  status: string;
  location: string;
  coordinate: string;
  signal: string;
  disasterType: string;
  observedAt: string;
  predictedKing: string;
  probability: number;
  indicators: string[];
  clearance: 1 | 2 | 3 | 4;
  lat: number;
  lon: number;
  tone: string;
  summary: string;
  norma: string;
  recommendation: string;
  source: "USGS" | "NASA_EONET" | "GDACS" | "FALLBACK";
};

export type NormaForecastResponse = {
  updatedAt: string;
  sourceStatus: "LIVE" | "DEGRADED" | "FALLBACK";
  sources: Array<{ id: "USGS" | "NASA_EONET" | "GDACS"; ok: boolean; count: number; error?: string }>;
  signals: NormaForecastSignal[];
};

type UsgsFeature = {
  id?: string;
  properties?: {
    mag?: number;
    place?: string;
    time?: number;
    title?: string;
  };
  geometry?: {
    coordinates?: [number, number, number?];
  };
};

type EonetEvent = {
  id?: string;
  title?: string;
  categories?: Array<{ id?: string; title?: string }>;
  geometry?: Array<{
    date?: string;
    coordinates?: [number, number] | [number, number, number];
  }>;
};

type GdacsFeature = {
  id?: string;
  properties?: {
    eventid?: string | number;
    eventtype?: string;
    name?: string;
    alertlevel?: string;
    country?: string;
    fromdate?: string;
    todate?: string;
    episodeid?: string | number;
    severity?: string | number;
  };
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
};

const timeoutMs = 20000;
const eonetCategoryFeeds = [
  "wildfires",
  "volcanoes",
  "severeStorms",
  "floods",
  "seaLakeIce",
  "dustHaze"
];

export const fallbackNormaForecastSignals: NormaForecastSignal[] = [
  {
    code: "PACIFIC-RING-26",
    title: "环太平洋地震链频率异常",
    level: "GEO-A",
    status: "FORECASTING",
    location: "环太平洋火山地震带",
    coordinate: "36.2048N / 138.2529E",
    signal: "浅源地震密度升高 / 地壳应力偏移",
    disasterType: "地震 / 地壳活动",
    observedAt: "2026-08-01 06:40 CST",
    predictedKing: "大地与山之王",
    probability: 68,
    indicators: ["浅源震群扩散", "地下空洞回声增强", "山脉带重力异常"],
    clearance: 2,
    lat: 36.2048,
    lon: 138.2529,
    tone: "#d8bd66",
    summary: "NORMA 将近期浅源地震、地壳应力、地下空洞回声进行合并计算，结果显示异常更接近大地与山之王的复苏前兆，而非普通板块释放。",
    norma: "当前缺少实体活动证据，但地质信号之间的相关性已超过学院预警阈值。该记录被标记为龙王复苏概率预测，而不是已发生事件。",
    recommendation: "保持全球地震链监听，申请调取炼金地震仪与执行部地下节点数据。",
    source: "FALLBACK"
  },
  {
    code: "ICELAND-VOLCANO-04",
    title: "冰岛火山热源持续增强",
    level: "THERMAL-A",
    status: "WATCH",
    location: "冰岛 / 大西洋火山带",
    coordinate: "64.9631N / 19.0208W",
    signal: "岩浆热源抬升 / 金属矿脉磁偏移",
    disasterType: "火山 / 地热异常",
    observedAt: "2026-08-01 04:15 CST",
    predictedKing: "青铜与火之王",
    probability: 57,
    indicators: ["地下热源抬升", "金属矿脉磁偏移", "硫化物浓度异常"],
    clearance: 2,
    lat: 64.9631,
    lon: -19.0208,
    tone: "#6fb7ff",
    summary: "火山热源与金属矿脉磁偏移同时出现，符合青铜与火之王相关征兆的低阶组合，但尚未出现龙文或炼金矩阵回声。",
    norma: "推断概率处于观察区间。若热源继续抬升并伴随金属共振，预警等级将自动上调。",
    recommendation: "关联青铜与火之王档案，持续监听工业区与矿脉异常。",
    source: "FALLBACK"
  },
  {
    code: "N-ATLANTIC-09",
    title: "北大西洋深层洋流异常",
    level: "OCEAN-A",
    status: "FORECASTING",
    location: "北大西洋 / 深海温跃层",
    coordinate: "52.0000N / 30.0000W",
    signal: "深层洋流偏转 / 声呐低频脉冲",
    disasterType: "海洋 / 洋流异常",
    observedAt: "2026-08-01 03:20 CST",
    predictedKing: "海洋与水之王",
    probability: 62,
    indicators: ["温跃层断裂", "声呐低频脉冲", "船舶罗盘漂移"],
    clearance: 1,
    lat: 52,
    lon: -30,
    tone: "#79d6bd",
    summary: "多个海洋观测站在同一深度层记录到洋流偏转。NORMA 认为它可能只是自然海况，也可能是海洋与水之王相关的低频征兆。",
    norma: "该信号对专员开放，可作为低权限预警样本。当前不建议执行部介入。",
    recommendation: "维持卫星与声呐链路，等待第二组深海数据。",
    source: "FALLBACK"
  },
  {
    code: "SAHARA-STORM-12",
    title: "撒哈拉高空沙暴电荷异常",
    level: "ATM-S",
    status: "SEALED",
    location: "撒哈拉 / 高空风暴带",
    coordinate: "23.4162N / 25.6628E",
    signal: "高空电荷聚集 / 风暴路径逆转",
    disasterType: "风暴 / 电磁异常",
    observedAt: "2026-08-01 01:55 CST",
    predictedKing: "天空与风之王",
    probability: 74,
    indicators: ["高空电荷密度异常", "风暴路径逆转", "航空无线电噪声"],
    clearance: 3,
    lat: 23.4162,
    lon: 25.6628,
    tone: "#c95e4c",
    summary: "该风暴带出现逆常规路径迁移，并伴随高空电荷聚集。完整推断涉及天空与风之王高权限档案。",
    norma: "当前权限不足时仅显示灾害索引。若信号持续增强，执行部会收到自动授权请求。",
    recommendation: "需要 CLEARANCE 3 后读取完整气象-龙王关联模型。",
    source: "FALLBACK"
  }
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatCoordinate(lat: number, lon: number) {
  return `${Math.abs(lat).toFixed(4)}${lat >= 0 ? "N" : "S"} / ${Math.abs(lon).toFixed(4)}${lon >= 0 ? "E" : "W"}`;
}

function localizePlaceName(place: string): string {
  return place
    .replace(/^(\d+)\s+km\s+([NSEW]{1,2})\s+of\s+(.+)$/i, (_match, distance: string, direction: string, name: string) => {
      const directionMap: Record<string, string> = {
        N: "以北",
        S: "以南",
        E: "以东",
        W: "以西",
        NE: "东北",
        NW: "西北",
        SE: "东南",
        SW: "西南"
      };
      return `${localizePlaceName(name)} ${directionMap[direction.toUpperCase()] ?? direction} ${distance} 公里`;
    })
    .replace(/^south of the (.+)$/i, "$1 以南海域")
    .replace(/^north of the (.+)$/i, "$1 以北海域")
    .replace(/^east of the (.+)$/i, "$1 以东海域")
    .replace(/^west of the (.+)$/i, "$1 以西海域")
    .replace(/\bregion\b/gi, "地区")
    .replace(/\bIslands\b/g, "群岛")
    .replace(/\bIsland\b/g, "岛")
    .replace(/\bJapan\b/g, "日本")
    .replace(/\bFiji\b/g, "斐济")
    .replace(/\bTristan da Cunha\b/g, "特里斯坦-达库尼亚")
    .replace(/\bCalifornia\b/g, "加利福尼亚")
    .replace(/\bUtah\b/g, "犹他")
    .replace(/\bSouth Dakota\b/g, "南达科他")
    .replace(/\bNew Mexico\b/g, "新墨西哥")
    .replace(/\bMillard\b/g, "米勒德")
    .replace(/\bJackson\b/g, "杰克逊")
    .replace(/\bKern\b/g, "克恩")
    .replace(/\bColfax\b/g, "科尔法克斯")
    .replace(/\bWidemouth 2\b/g, "宽口二号")
    .replace(/\bPotato Creek\b/g, "土豆溪")
    .replace(/\bFISH\b/g, "鱼溪")
    .replace(/\bAlaska\b/g, "阿拉斯加")
    .replace(/\bChile\b/g, "智利")
    .replace(/\bIndonesia\b/g, "印度尼西亚")
    .replace(/\bPhilippines\b/g, "菲律宾")
    .replace(/\bRussia\b/g, "俄罗斯")
    .trim();
}

function localizeEonetTitle(title: string, disasterType: string): string {
  const wildfireMatch = title.match(/^Wildfire\s+([^,]+),\s*([^,]+),\s*(.+)$/i);
  if (wildfireMatch) {
    const county = localizePlaceName(wildfireMatch[2]);
    const state = localizePlaceName(wildfireMatch[3]);
    return `野火：${state}${county}地区`;
  }

  const localized = localizePlaceName(title)
    .replace(/^Wildfire\s+/i, "野火：")
    .replace(/^Volcano\s+/i, "火山活动：")
    .replace(/^Tropical Storm\s+/i, "热带风暴：")
    .replace(/^Tropical Cyclone\s+/i, "热带气旋：")
    .replace(/^Severe Storm\s+/i, "强风暴：")
    .replace(/^Flood\s+/i, "洪水：")
    .replace(/^Dust Storm\s+/i, "沙尘暴：")
    .replace(/^Sea and Lake Ice\s+/i, "海冰异常：");

  return localized === title ? `${disasterType}：${localized}` : localized;
}

async function fetchJson<T>(url: string, requestTimeoutMs = timeoutMs): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url: string, requestTimeoutMs = timeoutMs): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      headers: { accept: "application/xml,text/xml,text/plain,*/*" },
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

function formatApiDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function usgsToForecast(feature: UsgsFeature, index: number): NormaForecastSignal | null {
  const coordinates = feature.geometry?.coordinates;
  if (!coordinates) return null;
  const [lon, lat, depth = 0] = coordinates;
  const mag = feature.properties?.mag ?? 0;
  const place = feature.properties?.place ?? "Unknown seismic zone";
  const localizedPlace = localizePlaceName(place);
  const probability = clamp(Math.round(42 + mag * 6 + (depth < 70 ? 8 : 0)), 44, 86);

  return {
    code: `USGS-QUAKE-${String(index + 1).padStart(2, "0")}`,
    title: `${localizedPlace} 地震活动`,
    level: mag >= 6 ? "GEO-S" : "GEO-A",
    status: "FORECASTING",
    location: localizedPlace,
    coordinate: formatCoordinate(lat, lon),
    signal: `M${mag.toFixed(1)} / 震源深度 ${Math.round(depth)}km`,
    disasterType: "地震 / 地壳活动",
    observedAt: feature.properties?.time ? new Date(feature.properties.time).toISOString() : new Date().toISOString(),
    predictedKing: "大地与山之王",
    probability,
    indicators: ["震源深度异常", "地壳应力释放", "板块边界扰动"],
    clearance: probability >= 76 ? 3 : 2,
    lat,
    lon,
    tone: "#d8bd66",
    summary: `USGS 记录到 ${localizedPlace} 附近 M${mag.toFixed(1)} 地震。NORMA 将震级、震源深度与区域震群背景合并计算，生成大地与山之王复苏概率。`,
    norma: "地震本身仍可由自然板块运动解释；若同区域出现地下空洞回声、山脉带重力异常或连续浅源震群，概率将继续上调。",
    recommendation: "维持地震链监听，并等待第二组地质数据交叉验证。",
    source: "USGS"
  };
}

function classifyEonet(event: EonetEvent) {
  const category = event.categories?.[0]?.id?.toLowerCase() ?? "";
  if (category.includes("volcano") || category.includes("wildfire")) {
    return {
      king: "青铜与火之王",
      disasterType: category.includes("volcano") ? "火山 / 地热异常" : "野火 / 热源异常",
      level: category.includes("volcano") ? "THERMAL-A" : "FIRE-A",
      signal: category.includes("volcano") ? "火山事件 / 热源抬升" : "野火事件 / 地表热源扩散",
      indicators: ["热源扩散", "金属矿脉磁偏移", "燃烧带异常"],
      tone: "#d8bd66",
      clearance: 2 as const,
      probability: 58
    };
  }
  if (category.includes("storm") || category.includes("dust")) {
    return {
      king: "天空与风之王",
      disasterType: category.includes("dust") ? "沙尘 / 高空气流异常" : "风暴 / 气压异常",
      level: "ATM-A",
      signal: "风暴路径 / 高空电荷扰动",
      indicators: ["气压梯度异常", "高空电荷密度变化", "风暴路径偏移"],
      tone: "#c95e4c",
      clearance: 2 as const,
      probability: 61
    };
  }
  if (category.includes("flood") || category.includes("ice") || category.includes("water")) {
    return {
      king: "海洋与水之王",
      disasterType: category.includes("ice") ? "海冰 / 极地水文异常" : "洪水 / 水文异常",
      level: "OCEAN-A",
      signal: "水文事件 / 深层流向扰动",
      indicators: ["水位突变", "深层流向偏移", "低频声呐噪声"],
      tone: "#79d6bd",
      clearance: 1 as const,
      probability: 56
    };
  }
  return {
    king: "黑王相关空白区",
    disasterType: "复合灾害 / 未分类异常",
    level: "UNKNOWN-A",
    signal: "多源事件 / 分类不足",
    indicators: ["灾害类型未归类", "信号来源不足", "等待人工判读"],
    tone: "#9b87ff",
    clearance: 2 as const,
    probability: 42
  };
}

function eonetToForecast(event: EonetEvent, index: number): NormaForecastSignal | null {
  const geometry = event.geometry?.at(-1);
  const coordinates = geometry?.coordinates;
  if (!coordinates) return null;
  const [lon, lat] = coordinates;
  if (typeof lon !== "number" || typeof lat !== "number") return null;
  const profile = classifyEonet(event);
  const probability = clamp(profile.probability + Math.min(index * 2, 8), 38, 82);
  const rawTitle = event.title ?? "NASA EONET 自然事件";
  const displayTitle = localizeEonetTitle(rawTitle, profile.disasterType);

  return {
    code: `EONET-${String(index + 1).padStart(2, "0")}`,
    title: displayTitle,
    level: profile.level,
    status: probability >= 70 ? "SEALED" : "FORECASTING",
    location: displayTitle,
    coordinate: formatCoordinate(lat, lon),
    signal: profile.signal,
    disasterType: profile.disasterType,
    observedAt: geometry.date ?? new Date().toISOString(),
    predictedKing: profile.king,
    probability,
    indicators: profile.indicators,
    clearance: probability >= 70 ? 3 : profile.clearance,
    lat,
    lon,
    tone: profile.tone,
    summary: `NASA EONET 记录到 ${displayTitle}。NORMA 将事件类型、坐标与龙王权柄档案进行关联，生成复苏概率预测。`,
    norma: "该记录来自现实自然灾害数据源；NORMA 只进行征兆关联，不判定龙王已经出现。",
    recommendation: "保持持续监听，并与同区域后续灾害信号交叉验证。",
    source: "NASA_EONET"
  };
}

function firstCoordinatePair(coordinates: unknown): [number, number] | null {
  if (!Array.isArray(coordinates)) return null;
  if (typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
    return [coordinates[0], coordinates[1]];
  }

  for (const item of coordinates) {
    const pair = firstCoordinatePair(item);
    if (pair) return pair;
  }

  return null;
}

function classifyGdacs(eventType: string, alertLevel: string) {
  const level = alertLevel.toLowerCase();
  const highRisk = level.includes("red") || level.includes("orange");

  if (eventType === "FL") {
    return {
      king: "海洋与水之王",
      disasterType: "洪水 / 水文异常",
      level: highRisk ? "OCEAN-S" : "OCEAN-A",
      signal: "GDACS 洪水警报 / 水文灾害链",
      indicators: ["流域水位异常", "洪峰扩散", "城市水文压力"],
      tone: "#79d6bd",
      clearance: highRisk ? 3 : 2,
      probability: highRisk ? 72 : 61
    };
  }

  if (eventType === "TC") {
    return {
      king: "天空与风之王",
      disasterType: "热带气旋 / 风暴异常",
      level: highRisk ? "ATM-S" : "ATM-A",
      signal: "GDACS 热带气旋警报 / 风场路径",
      indicators: ["低压核心增强", "风场路径偏移", "海气耦合异常"],
      tone: "#c95e4c",
      clearance: highRisk ? 3 : 2,
      probability: highRisk ? 76 : 64
    };
  }

  if (eventType === "VO") {
    return {
      king: "青铜与火之王",
      disasterType: "火山 / 地热异常",
      level: highRisk ? "THERMAL-S" : "THERMAL-A",
      signal: "GDACS 火山警报 / 地热异常",
      indicators: ["火山活动增强", "地表热源抬升", "硫化物异常"],
      tone: "#d8bd66",
      clearance: highRisk ? 3 : 2,
      probability: highRisk ? 73 : 59
    };
  }

  return {
    king: "黑王相关空白区",
    disasterType: "复合灾害 / 未分类异常",
    level: "UNKNOWN-A",
    signal: "GDACS 灾害警报 / 分类不足",
    indicators: ["灾害类型未归类", "信号来源不足", "等待人工判读"],
    tone: "#9b87ff",
    clearance: 2,
    probability: 44
  };
}

function gdacsToForecast(feature: GdacsFeature, index: number): NormaForecastSignal | null {
  const pair = firstCoordinatePair(feature.geometry?.coordinates);
  if (!pair) return null;
  const [lon, lat] = pair;
  const properties = feature.properties ?? {};
  const eventType = properties.eventtype ?? "";
  const alertLevel = properties.alertlevel ?? "green";
  const profile = classifyGdacs(eventType, alertLevel);
  const name = localizePlaceName(properties.name ?? `${eventType || "GDACS"} 灾害警报`);
  const country = properties.country ? localizePlaceName(String(properties.country)) : "";
  const location = country ? `${name} / ${country}` : name;
  const eventId = properties.eventid ?? properties.episodeid ?? index + 1;

  return {
    code: `GDACS-${eventType || "EV"}-${String(eventId).slice(-4)}`,
    title: `${profile.disasterType}：${name}`,
    level: profile.level,
    status: profile.clearance >= 3 ? "SEALED" : "FORECASTING",
    location,
    coordinate: formatCoordinate(lat, lon),
    signal: `${profile.signal} / ${alertLevel.toUpperCase()} ALERT`,
    disasterType: profile.disasterType,
    observedAt: properties.fromdate ?? properties.todate ?? new Date().toISOString(),
    predictedKing: profile.king,
    probability: clamp(profile.probability + Math.min(index, 6), 40, 84),
    indicators: profile.indicators,
    clearance: profile.clearance as 1 | 2 | 3,
    lat,
    lon,
    tone: profile.tone,
    summary: `GDACS 记录到 ${location} 的${profile.disasterType}警报。NORMA 将灾害等级、位置与龙王权柄档案进行交叉计算，生成复苏概率预测。`,
    norma: "该记录来自全球灾害警报系统；NORMA 将其视为现实灾害征兆，不判定龙王已经出现。",
    recommendation: "保留每日同步，并与同区域气象、水文或执行部记录交叉验证。",
    source: "GDACS"
  };
}

function xmlValue(source: string, tag: string) {
  const match = source.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1]
    ?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function gdacsRssToForecastItems(xml: string): GdacsFeature[] {
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  return itemMatches.map((item, index) => {
    const title = xmlValue(item, "title") ?? "GDACS event";
    const point = xmlValue(item, "georss:point") ?? xmlValue(item, "point");
    const [latText, lonText] = point?.split(/\s+/) ?? [];
    const lat = Number(latText);
    const lon = Number(lonText);
    const lowerTitle = title.toLowerCase();
    const eventtype = lowerTitle.includes("tropical cyclone")
      ? "TC"
      : lowerTitle.includes("flood")
        ? "FL"
        : lowerTitle.includes("volcano")
          ? "VO"
          : "";
    const alertlevel = lowerTitle.includes("red")
      ? "red"
      : lowerTitle.includes("orange")
        ? "orange"
        : lowerTitle.includes("green")
          ? "green"
          : "";

    return {
      id: xmlValue(item, "guid") ?? `rss-${index}`,
      properties: {
        eventid: xmlValue(item, "guid") ?? index,
        eventtype,
        name: title,
        alertlevel,
        fromdate: xmlValue(item, "pubDate")
      },
      geometry: Number.isFinite(lat) && Number.isFinite(lon)
        ? {
            type: "Point",
            coordinates: [lon, lat]
          }
        : undefined
    };
  });
}

function signalHistoryKey(signal: NormaForecastSignal) {
  return `${signal.predictedKing}:${signal.title.replace(/\s+/g, " ").trim()}`;
}

function dedupeForecastSignals(signals: NormaForecastSignal[]) {
  const groups = new Map<string, NormaForecastSignal>();

  for (const signal of signals) {
    const key = signalHistoryKey(signal);
    const existing = groups.get(key);
    if (!existing || signal.probability > existing.probability) {
      groups.set(key, signal);
    }
  }

  return Array.from(groups.values());
}

function balanceForecastSignals(signals: NormaForecastSignal[], perKingLimit = 4) {
  const buckets = new Map<string, NormaForecastSignal[]>();

  for (const signal of signals) {
    const bucket = buckets.get(signal.predictedKing) ?? [];
    bucket.push(signal);
    buckets.set(signal.predictedKing, bucket);
  }

  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => b.probability - a.probability);
  }

  const preferredKings = ["大地与山之王", "青铜与火之王", "海洋与水之王", "天空与风之王"];
  const balanced: NormaForecastSignal[] = [];

  for (let round = 0; round < perKingLimit; round += 1) {
    let added = false;
    for (const king of preferredKings) {
      const signal = buckets.get(king)?.[round];
      if (!signal) continue;
      balanced.push(signal);
      added = true;
    }
    if (!added) break;
  }

  return balanced;
}

export function mergeForecastSignals(
  freshSignals: NormaForecastSignal[],
  historySignals: NormaForecastSignal[],
  perKingLimit = 4
) {
  const freshKeys = new Set(freshSignals.map(signalHistoryKey));
  const carriedHistory = historySignals.filter((signal) => !freshKeys.has(signalHistoryKey(signal)));

  return balanceForecastSignals(dedupeForecastSignals([...freshSignals, ...carriedHistory]), perKingLimit);
}

export async function getNormaForecast(): Promise<NormaForecastResponse> {
  const sources: NormaForecastResponse["sources"] = [];
  const signals: NormaForecastSignal[] = [];

  try {
    const usgs = await fetchJson<{ features?: UsgsFeature[] }>(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson"
    );
    const mapped = (usgs.features ?? []).slice(0, 12).map(usgsToForecast).filter(Boolean) as NormaForecastSignal[];
    signals.push(...mapped);
    sources.push({ id: "USGS", ok: true, count: mapped.length });
  } catch (error) {
    sources.push({ id: "USGS", ok: false, count: 0, error: error instanceof Error ? error.message : "Unknown error" });
  }

  try {
    const eonetResults = await Promise.allSettled(
      eonetCategoryFeeds.map((category) =>
        fetchJson<{ events?: EonetEvent[] }>(
          `https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=${category}&limit=8`
        )
      )
    );
    const eonetResponses = eonetResults
      .filter((result): result is PromiseFulfilledResult<{ events?: EonetEvent[] }> => result.status === "fulfilled")
      .map((result) => result.value);
    const eonetEvents = eonetResponses.flatMap((response) => response.events ?? []);
    const seenEvents = new Set<string>();
    const uniqueEvents = eonetEvents.filter((event) => {
      const key = event.id ?? event.title;
      if (!key || seenEvents.has(key)) return false;
      seenEvents.add(key);
      return true;
    });
    const mapped = uniqueEvents.map(eonetToForecast).filter(Boolean) as NormaForecastSignal[];
    signals.push(...mapped);
    sources.push({
      id: "NASA_EONET",
      ok: mapped.length > 0,
      count: mapped.length,
      error: mapped.length > 0 ? undefined : "No EONET category feed returned usable events"
    });
  } catch (error) {
    sources.push({ id: "NASA_EONET", ok: false, count: 0, error: error instanceof Error ? error.message : "Unknown error" });
  }

  try {
    const gdacsFromDate = new Date();
    gdacsFromDate.setDate(gdacsFromDate.getDate() - 90);
    let gdacsFeatures: GdacsFeature[] = [];
    try {
      const gdacs = await fetchJson<{ features?: GdacsFeature[] }>(
        `https://www.gdacs.org/gdacsapi/api/events/geteventlist/MAP?eventtypes=TC,FL,VO&fromdate=${formatApiDate(gdacsFromDate)}&pagesize=30`,
        35000
      );
      gdacsFeatures = gdacs.features ?? [];
    } catch {
      const gdacsRss = await fetchText("https://www.gdacs.org/xml/rss.xml", 20000);
      gdacsFeatures = gdacsRssToForecastItems(gdacsRss);
    }
    const mapped = gdacsFeatures.map(gdacsToForecast).filter(Boolean) as NormaForecastSignal[];
    signals.push(...mapped);
    sources.push({ id: "GDACS", ok: mapped.length > 0, count: mapped.length, error: mapped.length > 0 ? undefined : "No GDACS events returned" });
  } catch (error) {
    sources.push({ id: "GDACS", ok: false, count: 0, error: error instanceof Error ? error.message : "Unknown error" });
  }

  const liveSignals = balanceForecastSignals(dedupeForecastSignals(signals), 4);
  const finalSignals = liveSignals.length ? liveSignals : fallbackNormaForecastSignals;
  const anyLive = sources.some((source) => source.ok && source.count > 0);

  return {
    updatedAt: new Date().toISOString(),
    sourceStatus: anyLive ? (sources.every((source) => source.ok) ? "LIVE" : "DEGRADED") : "FALLBACK",
    sources,
    signals: finalSignals
  };
}

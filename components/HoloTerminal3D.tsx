"use client";

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { CSSProperties, ReactNode } from "react";
import { MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { feature } from "topojson-client";
import type { FeatureCollection } from "geojson";
import normaLoreData from "@/data/norma-lore.json";
import worldAtlas from "world-atlas/countries-50m.json";
import type { AccessLog, AgentProfile } from "@/lib/agentProfile";
import { fallbackNormaForecastSignals, type NormaForecastResponse } from "@/lib/normaForecast";

type HoloModuleId =
  | "overview"
  | "identity"
  | "missions"
  | "kings"
  | "alchemy"
  | "academy"
  | "surveillance"
  | "evidence";

type LoreModuleId =
  | "identity"
  | "norma_core"
  | "missions"
  | "dragon_kings"
  | "alchemy"
  | "academy"
  | "surveillance"
  | "emotion_library";

type DeepArchiveId =
  | "mission_kuimen"
  | "mission_beijing_nibelung"
  | "mission_japan_containment"
  | "mission_greenland_ice"
  | "mission_cassell_invasion"
  | "mission_bronze_second"
  | "black_king"
  | "white_king"
  | "bronze_fire"
  | "sky_wind"
  | "earth_mountain"
  | "ocean_water";

type LoreEvidence = {
  id: string;
  module_id: LoreModuleId;
  module_label: string;
  capability: string;
  matched_keywords: string[];
  book_index: number;
  book_title: string;
  chapter_index: number | null;
  chapter_title: string;
  chapter_position: number;
  excerpt: string;
  confidence: number;
};

type LoreModule = {
  id: LoreModuleId;
  label: string;
  terminal_name: string;
  ui_object: string;
  evidence_count: number;
  books: number[];
  capabilities: string[];
  top_evidence_ids: string[];
};

type NormaLore = {
  books: Array<{ book_index: number; book_title: string; record_count: number }>;
  modules: LoreModule[];
  evidence: LoreEvidence[];
};

type HoloModule = {
  id: HoloModuleId;
  loreId: LoreModuleId;
  label: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  position: [number, number, number];
  color: string;
  camera: [number, number, number];
  target: [number, number, number];
  mark: string;
  lines: string[];
};

const lore = normaLoreData as NormaLore;

const modules: HoloModule[] = [
  {
    id: "overview",
    loreId: "norma_core",
    label: "主控",
    eyebrow: "NORMA CONSCIOUSNESS CORE",
    title: "NORMA · 卡塞尔全息终端",
    subtitle: "专员权限已接入，学院档案室处于全息展开状态。",
    position: [0, 0.38, 0],
    color: "#d9c27a",
    camera: [0, 1.55, 6.8],
    target: [0, 0.18, 0],
    mark: "S",
    lines: ["身份认证：已通过", "学院连接：在线", "三部档案：已载入"]
  },
  {
    id: "identity",
    loreId: "identity",
    label: "身份",
    eyebrow: "IDENTITY PROTOCOL",
    title: "身份认证 · 血统权限",
    subtitle: "专员身份、血统等级、数据库权限与异常访问记录。",
    position: [0, 1.86, 0.18],
    color: "#d9c27a",
    camera: [0, 2.16, 4.55],
    target: [0, 1.66, 0.18],
    mark: "ID",
    lines: ["血统签名：待校准", "权限环：S / A / 封存", "异常访问：EVA 监测"]
  },
  {
    id: "missions",
    loreId: "missions",
    label: "执行部",
    eyebrow: "EXECUTIVE DEPARTMENT",
    title: "执行部 · 战情档案",
    subtitle: "任务等级、执行人员、现场通讯、救援请求与行动路线。",
    position: [-4.55, 1.02, -1.72],
    color: "#b44c3f",
    camera: [-4.2, 1.65, 2.95],
    target: [-4.55, 0.84, -1.72],
    mark: "SS",
    lines: ["任务信标：高危", "现场通讯：可回放", "行动路线：待展开"]
  },
  {
    id: "kings",
    loreId: "dragon_kings",
    label: "龙王",
    eyebrow: "DRAGON KING ARCHIVE",
    title: "龙王档案 · 封印索引",
    subtitle: "黑王、白王与四大君主的最高危王座索引。",
    position: [4.55, 1.02, -1.72],
    color: "#e2bd64",
    camera: [4.2, 1.65, 2.95],
    target: [4.55, 0.84, -1.72],
    mark: "王",
    lines: ["黑白王：禁忌", "四君主：封存", "王座档案：可解封"]
  },
  {
    id: "alchemy",
    loreId: "alchemy",
    label: "炼金",
    eyebrow: "ALCHEMY VAULT",
    title: "炼金与言灵 · 禁忌知识",
    subtitle: "言灵、龙文、七宗罪、炼金武器与青铜器物。",
    position: [3.45, -0.28, 1.12],
    color: "#8bb6ff",
    camera: [3.44, 0.05, 4.25],
    target: [3.45, -0.28, 1.12],
    mark: "VII",
    lines: ["言灵目录：索引中", "七宗罪：武器剖面", "龙文释读：限制访问"]
  },
  {
    id: "academy",
    loreId: "academy",
    label: "学院",
    eyebrow: "CASSELL COLLEGE",
    title: "卡塞尔学院 · 组织档案",
    subtitle: "校长、教授团、学生会、狮心会、冰窖与中央控制室。",
    position: [-3.45, -0.28, 1.12],
    color: "#6fae9a",
    camera: [-3.44, 0.05, 4.25],
    target: [-3.45, -0.28, 1.12],
    mark: "CC",
    lines: ["学院外壳：大学", "真实结构：军事机构", "冰窖权限：封存"]
  },
  {
    id: "surveillance",
    loreId: "surveillance",
    label: "预警",
    eyebrow: "SURVEILLANCE GRID",
    title: "监控预警 · 全球信息流",
    subtitle: "异常信号、坐标定位、通讯截获与执行部响应链路。",
    position: [-1.5, -1.08, 2.25],
    color: "#48d6c2",
    camera: [-1.1, -0.42, 4.85],
    target: [-1.5, -0.92, 2.25],
    mark: "RAD",
    lines: ["全球异常：扫描中", "通讯截获：低频", "响应链路：执行部"]
  },
  {
    id: "evidence",
    loreId: "emotion_library",
    label: "证据库",
    eyebrow: "TEXT EVIDENCE LIBRARY",
    title: "原文证据库 · 隐藏档案馆",
    subtitle: "按书籍、模块、人物、关键词索引所有原文证据。",
    position: [1.5, -1.08, 2.25],
    color: "#c9a96e",
    camera: [1.1, -0.42, 4.85],
    target: [1.5, -0.92, 2.25],
    mark: "TXT",
    lines: ["三部原文：已接入", "证据卡：可检索", "情绪样本：隐藏"]
  }
];

type ArchiveRecord = {
  title: string;
  level: string;
  status: string;
  detail: string;
  deepView?: DeepArchiveId;
};

type SurveillanceAnomaly = {
  code: string;
  title: string;
  level: string;
  status: string;
  location: string;
  coordinate: string;
  signal: string;
  disasterType?: string;
  observedAt?: string;
  predictedKing?: string;
  probability?: number;
  indicators?: string[];
  clearance: AgentProfile["clearance"];
  lat: number;
  lon: number;
  tone: string;
  summary: string;
  norma: string;
  recommendation: string;
};

type AnomalyReviewState =
  | "EXECUTIVE REVIEW"
  | "ARCHIVE LINKED"
  | "WATCH"
  | "ELEVATE FORECAST"
  | "LINK ARCHIVE"
  | "KEEP WATCH";

const surveillanceAnomalies: SurveillanceAnomaly[] = [
  {
    code: "BJ-METRO-07",
    title: "北京地铁疑似尼伯龙根异常",
    level: "CITY-A",
    status: "PENDING REVIEW",
    location: "北京 / 地铁环线",
    coordinate: "39.9042N / 116.4074E",
    signal: "空间折返 / 低频龙文残响",
    clearance: 2,
    lat: 39.9042,
    lon: 116.4074,
    tone: "#d8bd66",
    summary: "城市交通节点出现重复折返样本，乘客证词与摄像头时间戳存在轻微错位。NORMA 已将该项归入预警网格，不生成强制执行任务。",
    norma: "疑似尼伯龙根边缘化现象，暂未观测到高危龙类实体活动。",
    recommendation: "保留执行部旁路监听，等待二次证据交叉验证。"
  },
  {
    code: "GR-ICE-04",
    title: "格陵兰冰海封存波动",
    level: "ARCHIVE-A",
    status: "WATCH",
    location: "格陵兰海域",
    coordinate: "72.0000N / 38.0000W",
    signal: "低温炼金场 / 沉眠噪声",
    clearance: 2,
    lat: 72,
    lon: -38,
    tone: "#6fb7ff",
    summary: "冰海节点能量场存在周期性涨落，但波峰仍低于执行部干预阈值。",
    norma: "与历史封存记录存在弱相关，建议保持远程监控。",
    recommendation: "维持卫星链路，不派遣地面小组。"
  },
  {
    code: "CSL-GATE-02",
    title: "学院门禁异常访问",
    level: "CAMPUS-B",
    status: "RESOLVED",
    location: "卡塞尔学院 / 中央控制区",
    coordinate: "41.8781N / 87.6298W",
    signal: "权限请求重放 / EVA 过滤",
    clearance: 1,
    lat: 41.8781,
    lon: -87.6298,
    tone: "#79d6bd",
    summary: "一次低级权限请求被系统识别为重放包，未进入真实档案层。",
    norma: "异常已平息，写入专员审计日志。",
    recommendation: "无需处理。"
  },
  {
    code: "JP-REDWELL-11",
    title: "日本红井遗留风险",
    level: "REGION-S",
    status: "SEALED",
    location: "日本 / 近海封存区",
    coordinate: "35.6762N / 139.6503E",
    signal: "高密度龙血样本 / 封存档案",
    clearance: 3,
    lat: 35.6762,
    lon: 139.6503,
    tone: "#c95e4c",
    summary: "红井相关记录仍处于封存状态，仅允许高权限专员读取摘要。",
    norma: "该异常与区域级污染风险相关，当前专员权限不足时仅显示预警标题。",
    recommendation: "申请执行部授权后再查看完整记录。"
  }
];

const disasterForecastSignals: SurveillanceAnomaly[] = [
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
    summary: "NORMA 将过去 72 小时内的浅源地震、地壳应力、地下空洞回声进行合并计算，结果显示异常更接近大地与山之王的复苏前兆，而非普通板块释放。",
    norma: "当前缺少实体活动证据，但地质信号之间的相关性已超过学院预警阈值。该记录被标记为龙王复苏概率预测，而不是已发生事件。",
    recommendation: "保持全球地震链监听，申请调取炼金地震仪与执行部地下节点数据。"
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
    recommendation: "关联青铜与火之王档案，持续监听工业区与矿脉异常。"
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
    recommendation: "维持卫星与声呐链路，等待第二组深海数据。"
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
    recommendation: "需要 CLEARANCE 3 后读取完整气象-龙王关联模型。"
  }
];

function localizeForecastText(text: string): string {
  const localizedWildfire = text.match(/^野火：([^,]+),\s*([^,]+),\s*(.+)$/);
  if (localizedWildfire) {
    return `野火：${localizeForecastText(localizedWildfire[3])}${localizeForecastText(localizedWildfire[2])}地区`;
  }

  return text
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
      return `${localizeForecastText(name)} ${directionMap[direction.toUpperCase()] ?? direction} ${distance} 公里`;
    })
    .replace(/^south of the (.+)$/i, "$1 以南海域")
    .replace(/^north of the (.+)$/i, "$1 以北海域")
    .replace(/^east of the (.+)$/i, "$1 以东海域")
    .replace(/^west of the (.+)$/i, "$1 以西海域")
    .replace(/^Wildfire\s+/i, "野火：")
    .replace(/\bTristan da Cunha\b/g, "特里斯坦-达库尼亚")
    .replace(/\bMatsubase\b/g, "松桥")
    .replace(/\bJapan\b/g, "日本")
    .replace(/\bFiji\b/g, "斐济")
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
    .replace(/\bregion\b/gi, "地区")
    .replace(/\bIslands\b/g, "群岛")
    .replace(/\bIsland\b/g, "岛")
    .trim();
}

const normaForecastCacheKey = "norma.forecast.daily.v1";
const oneDayMs = 24 * 60 * 60 * 1000;

type CachedNormaForecast = {
  forecast: NormaForecastResponse;
  nextRefreshAt: number;
};

function getNextLocalMidnight(from = new Date()) {
  const next = new Date(from);
  next.setHours(24, 0, 0, 0);
  return next.getTime();
}

function formatForecastTime(value?: string) {
  if (!value) return "时间待确认";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getRequiredArchiveId(moduleId: HoloModuleId, record: ArchiveRecord) {
  if (moduleId !== "kings" || !record.deepView) return null;
  if (record.deepView === "bronze_fire") return "archive-bronze-fire";
  return `archive-${record.deepView}`;
}

function getRequiredClearance(moduleId: HoloModuleId, record: ArchiveRecord) {
  if (!record.deepView) return 1;
  if (moduleId === "kings") {
    if (record.deepView === "bronze_fire") return 2;
    if (record.deepView === "earth_mountain") return 3;
    return 4;
  }
  if (moduleId === "missions") {
    if (record.level.includes("MISSION-SS")) return 3;
    return 2;
  }
  return 1;
}

type ArchiveBlueprint = {
  summary: string;
  records: ArchiveRecord[];
  workflow: string[];
};

type BronzeFireSection = {
  id: string;
  label: string;
  level: string;
  status: string;
  fileNo: string;
  classification: string;
  summary: string;
  report: string[];
  related: string[];
  risk: string;
  directive: string;
};

type MissionArchiveLayer = {
  id: string;
  code: string;
  title: string;
  mapFocus: string;
  summary: string;
  points: string[];
  directive: string;
};

type MissionDeepDossier = {
  title: string;
  subtitle: string;
  color: string;
  mapVariant: "japan" | "greenland" | "cassell" | "bronzeSecond";
  mapTitle: string;
  coordinate: string;
  sections: BronzeFireSection[];
  layers: MissionArchiveLayer[];
};

type MissionLaunchState = {
  id: DeepArchiveId;
  title: string;
  level: string;
  status: string;
};

const archiveBlueprints: Partial<Record<HoloModuleId, ArchiveBlueprint>> = {
  identity: {
    summary: "这一区域负责专员身份、血统等级、访问权限和异常授权记录。",
    records: [
      { title: "路明非", level: "S", status: "权限已开启", detail: "学院名单、数据库访问、账户与行程由诺玛自动签发。" },
      { title: "楚子航", level: "A", status: "执行部王牌", detail: "高危任务执行人，存在信号源追踪与特殊监控记录。" },
      { title: "恺撒", level: "A", status: "学生会", detail: "加图索家族继承人，学生会系统权限与行动资源较高。" },
      { title: "陈墨瞳", level: "A", status: "招生 / 侧写", detail: "可作为人物观察、关系触发和任务引导型档案。" },
      { title: "芬格尔", level: "未知", status: "EVA 隐藏接口", detail: "输入该姓名时终端切入 EVA 模式，显示异常人格界面。" },
      { title: "夏弥", level: "异常", status: "权限污染", detail: "存在高级权限取得与冰窖访问相关风险记录。" }
    ],
    workflow: ["读取身份签名", "比对血统等级", "开启数据库访问", "检查异常授权"]
  },
  missions: {
    summary: "执行部战情室只记录行动代号、风险等级、现场状态和诺玛复盘。所有任务以作战台形式展开，禁止写成普通事件介绍。",
    records: [
      { title: "夔门计划", level: "MISSION-S", status: "已封存 / 伤亡确认", detail: "长江水下侦察行动，目标为确认青铜城、获取王座物证并评估诺顿复苏风险。", deepView: "mission_kuimen" },
      { title: "北京尼伯龙根事件", level: "MISSION-SS", status: "城市级异常", detail: "北京地铁异常、隐藏站点、地下巢穴和 KING-03 双生王座确认链。", deepView: "mission_beijing_nibelung" },
      { title: "日本收容链", level: "MISSION-SS", status: "白王遗产 / 封存", detail: "蛇岐八家、猛鬼众、圣骸、红井和白王遗产复苏风险的地区收容链。", deepView: "mission_japan_containment" },
      { title: "格陵兰冰海记录", level: "MISSION-A", status: "历史事故", detail: "冰海失联、潜水服收容与执行部纪律禁令的封存来源。", deepView: "mission_greenland_ice" },
      { title: "卡塞尔学院入侵事件", level: "MISSION-S", status: "校内战情", detail: "学院安保层级、中央控制室警报、入侵路线和学生战斗记录。", deepView: "mission_cassell_invasion" },
      { title: "青铜计划 / 二次作战", level: "MISSION-SS", status: "鱼雷处置", detail: "摩尼亚赫号二次作战、风暴鱼雷、船体损伤和龙王处决窗口。", deepView: "mission_bronze_second" }
    ],
    workflow: ["任务队列", "风险等级", "指挥链", "现场态势", "诺玛复盘"]
  },
  kings: {
    summary: "龙王档案是诺玛最高危的王座索引，只保留黑王、白王与四大君主。四大君主均按“双生王座”记录：任何王座都不是单一目标，而是一组互相召回、互相补全的双生节点。",
    records: [
      { title: "黑王", level: "PRIME-00", status: "尼德霍格 / 龙皇", detail: "龙族谱系最高王座，关联言灵·皇帝、终末预言、黑王血裔和人类屠龙战争的终点。", deepView: "black_king" },
      { title: "白王", level: "PRIME-01", status: "叛乱王座 / 神谕", detail: "黑王之外的禁忌王座，关联白王叛乱、言灵·神谕、白王血裔、圣骸与日本收容事件。", deepView: "white_king" },
      { title: "青铜与火之王", level: "KING-01", status: "诺顿 / 康斯坦丁", detail: "双生王座已确认。档案聚焦主王座节点、双生回声、青铜城、七宗罪与复苏召回链。", deepView: "bronze_fire" },
      { title: "天空与风之王", level: "KING-02", status: "双生体未解封", detail: "双生王座未完成确认。档案仅收录风权柄、镰鼬样本、风系言灵和本体苏醒前的外围信号。", deepView: "sky_wind" },
      { title: "大地与山之王", level: "KING-03", status: "耶梦加得 / 芬里厄", detail: "双生王座已确认。档案聚焦北京地铁异常、尼伯龙根入口、夏弥伪装、芬里厄巢穴与地质级灾害。", deepView: "earth_mountain" },
      { title: "海洋与水之王", level: "KING-04", status: "双生体未解封", detail: "双生王座未完成确认。档案预留给水域权柄、潮汐异常、深海遗迹、沉眠容器与后续苏醒线索。", deepView: "ocean_water" }
    ],
    workflow: ["验证权限", "确认王座序列", "扫描双生节点", "显示王座索引", "进入对应档案"]
  },
  alchemy: {
    summary: "这一区域保存言灵、龙文、炼金武器、青铜器物和七宗罪。",
    records: [
      { title: "七宗罪", level: "S", status: "武器剖面", detail: "炼金刀剑组，是青铜与火之王相关档案的关键节点。" },
      { title: "言灵 · 君焰", level: "高危", status: "可索引", detail: "适合做成音节点亮与火焰波纹的交互。" },
      { title: "言灵 · 蛇", level: "侦测", status: "可索引", detail: "可连接监控预警区，表现为信息流和感知网络。" },
      { title: "龙文释读", level: "封存", status: "解析中", detail: "用于生成符文阵、残缺译文和权限不足反馈。" },
      { title: "青铜器物", level: "A", status: "可展开", detail: "与青铜城、机关结构、炼金术历史绑定。" }
    ],
    workflow: ["识别言灵", "读取龙文", "展开炼金阵", "映射使用者", "标注风险"]
  },
  academy: {
    summary: "这一区域呈现卡塞尔学院的双层结构：表面大学，真实军事机构。",
    records: [
      { title: "中央控制室", level: "核心", status: "在线", detail: "诺玛汇聚全球学院相关信息，人类情报员进行判断。" },
      { title: "冰窖", level: "封存", status: "限制访问", detail: "高危档案与异常权限事件的重要地点。" },
      { title: "图书馆", level: "学院", status: "开放", detail: "学习、档案、讨论和学院日常的入口。" },
      { title: "学生会", level: "组织", status: "可查看", detail: "恺撒相关组织线，连接学院权力结构。" },
      { title: "狮心会", level: "组织", status: "可查看", detail: "楚子航相关组织线，连接学院传统与战斗精神。" },
      { title: "教授团", level: "管理", status: "可查看", detail: "昂热、施耐德、曼施坦因等人物关系入口。" }
    ],
    workflow: ["进入学院门廊", "选择组织 / 地点", "读取校规", "申请封存区域"]
  },
  surveillance: {
    summary: "这一区域表现诺玛的全球信息抓取、异常监控和执行部响应链路。",
    records: [
      { title: "全球信息抓取", level: "核心", status: "在线", detail: "超级主机抓取全世界与学院有关的信息。" },
      { title: "异常坐标定位", level: "A", status: "扫描中", detail: "把龙类活动、任务地点和通讯来源转成空间坐标。" },
      { title: "通讯截获", level: "A", status: "低频", detail: "可作为现场语音、邮件、警报的证据入口。" },
      { title: "警报等级", level: "S", status: "自动升级", detail: "与执行部任务区联动，触发红色战情层。" },
      { title: "中央控制室响应", level: "核心", status: "待决策", detail: "信息汇入诺玛后由学院人员分析并下发行动。" }
    ],
    workflow: ["接收信号", "定位异常", "生成警报", "通知执行部", "记录证据"]
  },
  evidence: {
    summary: "这是隐藏档案馆，所有模块都必须能回溯到原文证据。",
    records: [
      { title: "龙族Ⅰ：火之晨曦", level: "BOOK 1", status: "已接入", detail: "带有章节和情绪标注，是当前结构最完整的基础库。" },
      { title: "龙族Ⅱ：悼亡者之瞳", level: "BOOK 2", status: "已接入", detail: "已按档案片段切分，后续可补章节标题。" },
      { title: "龙族Ⅲ：黑月之潮", level: "BOOK 3", status: "已接入", detail: "已按档案片段切分，执行部和日本任务证据量显著增加。" },
      { title: "模块证据索引", level: "SYS", status: "可检索", detail: "每条记录保存所属模块、关键词、置信度和原文摘录。" },
      { title: "情绪样本", level: "HIDDEN", status: "隐藏", detail: "不在主界面自动出现，只作为档案馆内部资料。" }
    ],
    workflow: ["筛选书籍", "筛选模块", "搜索关键词", "打开证据卡", "回链对应区域"]
  }
};

const bronzeFireSections: BronzeFireSection[] = [
  {
    id: "throne",
    label: "王座身份",
    level: "KING-01",
    status: "诺顿 / 初代种 / 四大君主之一",
    fileNo: "DK-KING01-IDENTITY",
    classification: "封存档案 / 王座判定",
    summary: "诺顿是青铜与火之王的主王座节点，档案判定为初代种、四大君主之一、炼金权柄持有者。",
    report: [
      "该目标的危险性不只来自战斗力，而来自其对物质结构的支配。青铜、火焰、炼金术、宫殿和武器在该王座名下不是分散概念，而是同一套权力系统。",
      "诺顿相关记录反复指向“铸造”与“重启”：青铜可以成为城市，炼金术可以成为处决工具，沉眠地可以被设计成战争机器。"
    ],
    related: ["诺顿", "初代种", "四大君主", "炼金术", "青铜与火之王"],
    risk: "目标一旦进入完全苏醒状态，普通武器和常规任务小组均不具备处置资格。",
    directive: "维持 KING-01 最高危标记；任何诺顿身份线索必须同步执行部与炼金资料库。"
  },
  {
    id: "twin",
    label: "双生关系",
    level: "TWIN",
    status: "康斯坦丁 / 王座回声 / 复苏钥匙",
    fileNo: "DK-KING01-TWIN",
    classification: "关系档案 / 双生共鸣",
    summary: "康斯坦丁不是诺顿档案的附属条目，而是青铜与火之王王座的另一半回声。",
    report: [
      "双生关系使该王座具备强烈召回属性。一方的苏醒、伤害、死亡或遗留痕迹，均可能牵动另一方反应。",
      "康斯坦丁使龙王档案从敌对目标变成情感结构：呼唤、守护、失控、牺牲都可能成为复苏事件的一部分。"
    ],
    related: ["康斯坦丁", "诺顿", "双生子", "王座共鸣", "召回反应"],
    risk: "单点清除无法确保王座终止；残留记忆或遗骸可能成为下一次复苏入口。",
    directive: "涉及康斯坦丁的记录不得低于 KING-01 处理等级；禁止将其归入普通龙类个体。"
  },
  {
    id: "city",
    label: "青铜城",
    level: "SITE-S",
    status: "长江水下 / 王座宫殿 / 炼金结构",
    fileNo: "DK-KING01-SITE",
    classification: "地点档案 / 非人类工程",
    summary: "青铜城是诺顿权柄最直接的物质证明，现归入长江水下高危封存地点。",
    report: [
      "该地点不是普通遗迹，而是一座由青铜、机关、龙文、水压和封闭空间构成的王座宫殿。",
      "城市结构表现出高度完整性：墙壁、门、通路和内部构件均可能不是建筑部件，而是王座意志和炼金逻辑的一部分。"
    ],
    related: ["青铜城", "长江水域", "三峡", "水下宫殿", "金属异常"],
    risk: "任何进入行为都可能触发门禁、机关、活灵或王座苏醒链路。",
    directive: "后续界面建议以剖面方式呈现：水域层、金属异常层、机关通路层、王座核心层。"
  },
  {
    id: "kuimen",
    label: "夔门计划",
    level: "MISSION-S",
    status: "曼斯小组 / 长江水下 / 行动简报",
    fileNo: "ED-KUIMEN-ACTION",
    classification: "任务报告 / 执行部行动",
    summary: "夔门计划由校长亲自制定，目标锁定长江水域的青铜与火之王诺顿，是卡塞尔学院第一次真正触及青铜城核心的水下作战。",
    report: [
      "任务来源：全球约一千三百人正在搜索龙墓，曼斯教授小组进度最接近成功。计划时间被临时提前，叶胜与酒德亚纪接到通知赶赴四川，校长随后亲临中国。",
      "行动平台：摩尼亚赫号停泊长江上游暴风雨水域。曼斯以船长身份指挥，船上保留声呐、生命体征监控、通讯链路、回收绞盘和有限武器；海事局直升机救援预计两小时后抵达。",
      "现场人员：曼斯负责指挥和决策，叶胜、酒德亚纪组成水下作业组，塞尔玛负责生命信号与通讯监控，钥匙作为开启青铜城入口的活体权限，船员维持航行、声呐和回收系统。",
      "任务窗口：氧气与电力均按两小时估算，青铜城入口由活灵守卫，钥匙的高纯度龙血只能短时间满足门禁。曼斯反复确认两小时限制，并要求水下组压缩讨论和停留时间。",
      "作战目标：第一目标为确认青铜城与诺顿寝宫位置；第二目标为寻找龙王诺顿的卵；若无法带回或控制，则使用装备部炼金设备直接毁掉。爆破前要求至少撤离五十米。",
      "侦测流程：叶胜释放言灵·蛇，利用水体和金属导电优势扩大搜索半径；亚纪负责拍摄、取样和回传龙文资料。青铜城内部被确认存在巨大齿轮、活灵、蛇脸人雕像、龙文穹顶和可变形甬道。",
      "事故升级：亚纪拍摄龙文时疑似被诱发灵视并启动城内系统，救生索与数据线断裂。青铜城由静态遗迹转为炼金机械迷宫，旧道路封死、新道路生成，水下组撤离路线失效。",
      "撤离阶段：叶胜通过蛇获得青铜城三维地图，钥匙指出向下脱出路径。计算显示他们可以脱出青铜城，但氧气不足以支撑两人同时上浮。叶胜将氧气留给亚纪，并把重要铜罐/匣子交由其带回。",
      "伤亡记录：叶胜确认牺牲，遗体后续在青铜城下方被发现；酒德亚纪成功将关键铜罐推至救生艇附近，但随后被水下巨型生物拖回水中，现场出现大量血迹，判定牺牲。塞尔玛后续亦在摩尼亚赫号遭袭阶段被拖入水中失踪/死亡。",
      "战斗结果：摩尼亚赫号遭水下巨型龙类追击。曼斯使用改造狙击弹、微型水下炸弹和机动航线应对，确认目标具有高度智慧，能够吞噬炸弹、规避火力并利用水面环境戏弄猎物。"
    ],
    related: ["曼斯教授", "叶胜", "酒德亚纪", "塞尔玛", "钥匙", "摩尼亚赫号", "长江水域", "青铜城"],
    risk: "任务由水下侦察升级为龙王宫殿接触、炼金机械陷阱和水面追击战。主要伤亡集中于水下作业组与现场支援人员，原定两小时窗口在青铜城启动后失效。",
    directive: "界面建议拆成作战时间轴：PLAN ADVANCED / SITE CONFIRMED / DOOR OPENED / PALACE ENTRY / SYSTEM TRIGGERED / ROUTE LOST / CASUALTY CONFIRMED / SURFACE PURSUIT。"
  },
  {
    id: "snake_key",
    label: "言灵·蛇 / 活体密钥",
    level: "PROBE",
    status: "叶胜侦测 / 水下感知 / 门禁触发",
    fileNo: "AL-PROBE-SNAKE",
    classification: "技术报告 / 侦测协议",
    summary: "言灵·蛇是进入青铜城前最重要的感知协议，活体密钥则指向龙血、言灵权限与机关门禁之间的关系。",
    report: [
      "叶胜释放出的蛇类似电流与声呐混合的感知网络，可穿过水域、金属和幽暗通道，将人类无法目视的城市轮廓带回现场。",
      "青铜城门禁并非纯机械结构。高纯度龙血、言灵权限、活灵和古老机关之间存在联动，钥匙更接近活体授权，而非普通工具。"
    ],
    related: ["叶胜", "言灵·蛇", "钥匙", "龙血纯度", "活灵"],
    risk: "侦测信号可能反向暴露行动人员位置，并提前触发城内生命反应。",
    directive: "建议做成扫描层：蛇形信号沿青铜城剖面游走，依次点亮门、通路、宫殿和异常反应。"
  },
  {
    id: "awakening",
    label: "苏醒链路",
    level: "WATCH",
    status: "沉眠确认 / 宫殿接触 / 王座激活",
    fileNo: "DK-KING01-WATCH",
    classification: "监控报告 / 复苏阈值",
    summary: "青铜与火之王的恐怖感来自系统逐步证明其存在：龙墓搜索、水下异常、宫殿确认、王座苏醒。",
    report: [
      "建议将链路拆为 SEARCHING、CONTACT、PALACE CONFIRMED、AWAKENING、KING ACTIVE 五个状态。",
      "每进入一个状态，界面警报应同步升级：青铜环从冷光转为火红，任务等级由 S 上调至 SS。"
    ],
    related: ["龙墓搜索", "水下异常", "宫殿确认", "复苏阈值", "执行部响应"],
    risk: "一旦进入 KING ACTIVE，档案不再适用检索模式，必须转入战斗决策模式。",
    directive: "建议和监控预警区联动，显示警报级别、任务状态和撤离窗口。"
  },
  {
    id: "old_tang",
    label: "老唐 / 诺顿人格残影",
    level: "HOST",
    status: "人类身份 / 记忆错位 / 龙王复苏",
    fileNo: "ID-HOST-NORTON",
    classification: "身份报告 / 人格残影",
    summary: "老唐使青铜与火之王线从宏大屠龙任务转为私人悲剧：普通网友身份与龙王复苏身份发生重叠。",
    report: [
      "该身份首先表现为路明非在美国网络中的朋友，具备普通人的语气、关系和生活痕迹。",
      "后续记录显示该身份逐渐与诺顿重叠。君王并非从空白处降临，而是从一个已经与人建立联系的人格中醒来。"
    ],
    related: ["老唐", "诺顿", "路明非", "人格错位", "记忆残片"],
    risk: "目标具备情感干扰性，可能削弱执行人员对龙王身份的即时判断。",
    directive: "建议独立为情感档案，展示身份错位、兄弟召唤和路明非面对老唐时的异常反应。"
  },
  {
    id: "sampson",
    label: "龙侍 / 参孙",
    level: "GUARD",
    status: "王座护卫 / 君主命令 / 复仇执行",
    fileNo: "DK-KING01-GUARD",
    classification: "臣属档案 / 龙侍体系",
    summary: "参孙补足了青铜与火之王王座的臣属结构：龙王不是孤立目标，王座周围存在服从、护卫和复仇执行者。",
    report: [
      "龙侍为君主行动，其忠诚逻辑不等同于人类组织纪律。命令、复仇和保护会覆盖自我保存。",
      "参孙相关记录可用于表现龙王权力的外延：即使君王本体处于异常状态，臣属仍可能继续执行王座意志。"
    ],
    related: ["参孙", "龙侍", "君主命令", "复仇", "王座护卫"],
    risk: "忽视龙侍会导致任务判断过度集中于龙王本体，遗漏外围处决风险。",
    directive: "建议作为独立护卫层显示在王座外围，可与战斗警报和目标锁定联动。"
  },
  {
    id: "baidi",
    label: "白帝城 / 历史伪装层",
    level: "COVER",
    status: "人类地名 / 金属之王 / 遗迹遮蔽",
    fileNo: "DK-KING01-COVER",
    classification: "历史报告 / 伪装层解析",
    summary: "白帝城是青铜城档案的人类历史表层，地名、传说和真实龙族遗迹在这里发生叠合。",
    report: [
      "人类历史中的地名和传说可能遮蔽龙族遗迹。白帝城线索将长江地理、金属之王语义和青铜城入口连接起来。",
      "这类信息不应作为普通地点介绍处理，而应作为解谜层：表层是历史地名，深层是王座宫殿的坐标和伪装。"
    ],
    related: ["白帝城", "长江", "金属之王", "青铜城", "历史传说"],
    risk: "历史表层会降低异常判断敏感度，使龙族遗迹被误判为普通文化遗址。",
    directive: "建议在青铜城剖面外增加历史遮罩层，点击后从人类地图切换到龙族真实坐标。"
  },
  {
    id: "inscription",
    label: "龙文碑记 / 铸城记录",
    level: "INSCRIPTION",
    status: "残缺译文 / 炼金说明 / 权限解析",
    fileNo: "AL-INSCRIPTION-BRONZE",
    classification: "铭文报告 / 炼金释读",
    summary: "青铜城内部龙文资料可能记录铸城逻辑、机关结构和诺顿权柄，是连接青铜城与炼金库的关键文本层。",
    report: [
      "龙文不应只作为装饰符号。它可能是青铜城的说明书、碑记、警告或权限协议。",
      "界面可以显示为残缺译文：部分字句可读，关键字段被权限遮蔽，随着炼金区解锁逐步补全。"
    ],
    related: ["龙文", "青铜城", "铸城记录", "炼金术", "权限解析"],
    risk: "错误释读可能触发机关、误开门禁或唤醒沉眠结构。",
    directive: "建议与 ALCHEMY VAULT 联动，制作逐字解析、残缺译文和权限不足反馈。"
  },
  {
    id: "casualty",
    label: "牺牲档案",
    level: "CASUALTY",
    status: "叶胜 / 酒德亚纪 / 塞尔玛 / 现场判定",
    fileNo: "ED-KUIMEN-CASUALTY",
    classification: "伤亡档案 / 任务代价复核",
    summary: "本档案记录夔门计划与后续水面遭遇战中的主要伤亡。它不是附属人物简介，而是青铜与火之王档案中最能体现任务代价的行动报告。",
    report: [
      "伤亡对象一：叶胜，卡塞尔学院执行部助理专员。水下行动中负责释放言灵·蛇、建立青铜城内部感知图、协助酒德亚纪拍摄并取回关键资料。",
      "关键节点：青铜城启动后，原有撤离路线失效，水下组被困于变化中的金属宫殿。计算结果显示二人可以离开青铜城，但剩余氧气无法支撑叶胜与酒德亚纪同时上浮。",
      "牺牲判定：叶胜将氧气留给酒德亚纪，并继续承担开路、携带匣子和维持撤离判断的职责。后续遗体在青铜城下方被发现，铭牌确认身份；现场同时确认其氧气瓶缺失。",
      "伤亡对象二：酒德亚纪，执行部专员。她成功把黄铜罐推至水面救生艇附近，使学院获得青铜与火之王复苏载体的第一手物证。",
      "牺牲判定：亚纪完成物证交接后遭水下巨型生物拖回，现场出现大量血迹，任务指挥链判定死亡。该节点使夔门计划从侦察任务转为高危接触事件。",
      "伤亡对象三：塞尔玛，摩尼亚赫号现场通讯与监控人员。她负责记录叶胜、亚纪生命信号，维持水面指挥与水下组之间的信息链。",
      "失踪判定：水面追击阶段，摩尼亚赫号遭目标反复攻击，塞尔玛被拖入水中，随后失去可恢复生命信号。她的记录终止点用于标记水面防线被突破。",
      "复核结论：夔门计划的伤亡并非单纯由战斗失败造成，而是由青铜城自启动、氧气窗口失效、王座守卫追击和物证优先回收共同叠加形成。"
    ],
    related: ["叶胜", "酒德亚纪", "塞尔玛", "曼斯教授", "摩尼亚赫号", "黄铜罐", "青铜城", "言灵·蛇"],
    risk: "牺牲档案会直接改变玩家对任务性质的理解：这不是一次浪漫探秘，而是执行部以人员生命换取王座坐标、复苏物证和屠龙窗口的高危行动。",
    directive: "界面建议做成黑匣子报告：左侧列姓名、身份、任务职责、最终状态；右侧按时间轴展示氧气耗尽、物证上浮、失联、遗体发现四个关键节点。"
  },
  {
    id: "relic",
    label: "复苏物证",
    level: "RELIC",
    status: "黄铜罐 / 骨殖瓶 / 匣子 / 龙骨十字",
    fileNo: "AL-RELIC-NORTON",
    classification: "物证报告 / 复苏载体链",
    summary: "复苏物证把青铜城、诺顿之卵、七宗罪和龙王遗骸串成一条可追踪链路。它适合做成档案中最有实物感的一组证据柜。",
    report: [
      "物证 A：黄铜罐。由叶胜在青铜城内部取得，后由酒德亚纪推送至水面。该物品成为学院确认青铜与火之王沉眠方式的直接证据。",
      "性质判定：黄铜罐被校方归入骨殖瓶或卵的范畴，含义不是普通容器，而是龙王沉睡、孵化、保存精神与血肉信息的炼金容器。",
      "风险说明：如果罐内存在诺顿复苏核心，任何运输、扫描、打开或外部刺激都可能构成唤醒动作。物证保管必须与普通考古文物完全隔离。",
      "物证 B：长方形金属匣。后续在叶胜遗体背部位置发现，推断与黄铜罐同批次取得，但因任务现场极端混乱，未能由亚纪一并带离。",
      "性质判定：匣内关联七宗罪，七柄武器由诺顿亲手铸造，既是其炼金术巅峰产物，也是反向处决青铜与火之王自身的关键武器。",
      "物证 C：龙骨十字。作为龙王级目标死亡或残留的核心标志，它不应只作为战利品陈列，而应放入王座死亡确认、复苏残留和后续争夺链路。",
      "证据链结论：黄铜罐指向复苏，金属匣指向屠龙手段，龙骨十字指向王座死亡或遗留。三者构成青铜与火之王档案的物证三角。"
    ],
    related: ["黄铜罐", "骨殖瓶", "诺顿之卵", "金属匣", "七宗罪", "龙骨十字", "叶胜", "酒德亚纪"],
    risk: "物证链同时具备研究价值和灾难价值：它既能证明龙王存在，也可能成为下一次复苏、武器失控或学院内部争夺的触发点。",
    directive: "界面建议做成封存柜：每件物证显示编号、取得者、取得地点、当前状态和关联风险；点击物证时不要给长段介绍，而是展开‘收容记录 / 异常反应 / 关联任务’。"
  },
  {
    id: "bronze_plan",
    label: "青铜计划 / 二次作战",
    level: "MISSION-SS",
    status: "曼施坦因指挥 / 水下 A-B 组 / 风暴鱼雷",
    fileNo: "ED-BRONZE-PLAN-20100213",
    classification: "作战任务报告 / 龙王处决行动",
    summary: "青铜计划是夔门计划之后的二次进入与处决行动。行动目标从确认遗迹升级为诱导龙王离城、迫使其提前孵化，并以风暴鱼雷完成水面击杀。",
    report: [
      "行动时间：2010 年 2 月 13 日夜，春节前夜。行动平台仍为摩尼亚赫号，位置位于三峡水库相关水域，目标区域为地震后重新暴露的青铜城。",
      "指挥链：曼施坦因担任船长并执行校董会最终命令。大副格雷森负责操舵，二副古纳亚尔负责声呐与鱼雷系统，三副帕西诺负责底舱，轮机长熊谷木直负责动力与燃油。",
      "下潜编组：A 组为恺撒与零，B 组为诺诺与路明非。水下组任务不是单纯探索，而是进入青铜城核心区域，确认龙王复苏巢穴，并执行诱导或爆破方案。",
      "作战假设：诺顿尚未完全苏醒，完整龙躯再生需要时间；如果放任其完成孵化，人类常规武器将失效。因此计划使用炼金炸弹干扰巢穴环境，迫使目标提前离开青铜城。",
      "主武器：风暴鱼雷。该鱼雷速度极高，原计划依靠炼金弹头形成有效处决窗口；现场深度、地震造成的地形下沉与水域条件共同构成唯一可用发射场。",
      "战术目标：水下组负责把龙王从青铜城逼入可被声呐锁定的水域；摩尼亚赫号负责保持射界与距离，一旦目标进入发射窗口，即执行单次高风险打击。",
      "事故升级：青铜城再次启动，通讯中断，城市结构持续移动。摩尼亚赫号同时遭水下目标攻击，水密舱连续进水，燃油泄漏，船体逐步失去稳定性。",
      "临场指挥：风暴鱼雷受损后，恺撒接管近距离诱导。他使用镰鼬与狙击火力吸引龙王，使目标进入百米级极限发射距离；零在受伤状态下完成发射动作。",
      "处决结果：风暴鱼雷命中龙王并将其带离水面，形成决定性打击。行动后仍需记录幸存确认、听力损伤、船体损毁、水下组救援和第三方狙杀补刀等后续结果。"
    ],
    related: ["青铜计划", "曼施坦因", "恺撒", "零", "诺诺", "路明非", "风暴鱼雷", "摩尼亚赫号", "青铜城"],
    risk: "青铜计划的风险核心是单发窗口：龙王不能完全孵化，鱼雷不能错失，船体不能提前沉没，水下组也不能失联过久。任何一个条件崩塌都会导致全队覆灭。",
    directive: "界面建议做成正式作战面板：上方显示行动时间、指挥链、编组和武器状态；中段用时间轴呈现‘进入青铜城 / 放置炸弹 / 通讯中断 / 船体破损 / 近距诱导 / 鱼雷发射 / 目标命中’。"
  },
  {
    id: "sins",
    label: "七宗罪",
    level: "ARSENAL",
    status: "炼金刀剑组 / 王座武器 / 跨区联动",
    fileNo: "AL-ARSENAL-SEVEN",
    classification: "武器报告 / 炼金刀剑组",
    summary: "七宗罪是青铜与火之王档案和炼金资料库之间的核心桥梁，不能作为普通武器列表处理。",
    report: [
      "每一把武器都代表一种炼金意志，也对应一种对龙王级目标的处决方式。",
      "界面上建议显示为七个未完全解锁的刀剑槽：名称、罪名、状态、持有者、解封等级；大部分信息保持权限不足，只露出危险轮廓。"
    ],
    related: ["七宗罪", "炼金武器", "屠龙", "权限封锁", "武器剖面"],
    risk: "武器信息过早解封会削弱禁忌感，也会使炼金区失去后续展开空间。",
    directive: "点击该栏目后续应跳转至 ALCHEMY VAULT 的武器剖面层。"
  }
];

const skyWindSections: BronzeFireSection[] = [
  {
    id: "throne",
    label: "王座身份",
    level: "KING-02",
    status: "天空与风之王 / 四大君主 / 风元素王座",
    fileNo: "DK-KING02-STATUS",
    classification: "封存档案 / 王座身份",
    summary: "天空与风之王属于四大君主序列。当前档案不将已收录风灾样本误判为王座本体苏醒，而是归入风权柄外溢、尼伯龙根裂缝与处置参考。",
    report: [
      "王座归属：天空与风之王是龙族四大元素王座之一，与青铜与火之王、大地与山之王、海洋与水之王并列，均属黑王分裂出的初代君主体系。",
      "档案边界：已确认风系灾害样本主要包括镰鼬群、言灵·镰鼬和尼伯龙根裂缝中的风域外泄；这些内容可用于推演 KING-02，但不能等同于天空与风之王本体登场。",
      "核心差异：青铜与火之王的档案偏向铸造、金属、火焰、宫殿和武器；天空与风之王的档案应偏向速度、声音、气压、切割、群体生物和不可见战场。",
      "档案原则：所有现场事件只作为案例证据收录在报告中，一级条目必须服务于王座身份、权柄、样本、监测和处置。"
    ],
    related: ["天空与风之王", "大地与山之王", "北京尼伯龙根", "镰鼬", "恺撒", "王恭厂"],
    risk: "王座本体资料稀缺，容易被误并入低阶风系灾害。档案必须清楚区分“王座”“样本”“言灵”“案例”。",
    directive: "界面标注 KING-02 / WIND THRONE，并在元信息中显示：王座本体未确认现身，风系样本已收录。"
  },
  {
    id: "twin",
    label: "双生王座",
    level: "TWIN-LOCK",
    status: "双生体未解封 / 主副节点未判定",
    fileNo: "DK-KING02-TWIN-LOCK",
    classification: "关系档案 / 双生封存",
    summary: "天空与风之王必须按双生王座处理，但当前档案没有足够证据确认其双生体姓名、人格分工或苏醒顺序。",
    report: [
      "档案原则：四大君主不是单体龙王，而是双生王座。KING-02 的任何记录都必须预留第二节点，避免把风权柄误写成一个孤立目标。",
      "节点状态：主王座、双生节点、情感锚点和复苏钥匙均未完成身份判定。镰鼬、风系言灵和北京尼伯龙根风域只能作为外围样本，不能代替双生体记录。",
      "共鸣推演：若 KING-02 双生节点存在一强一弱、一显一隐或一战斗一召回的分工，则任意一方的苏醒、伤害、死亡、遗骸暴露或权柄外泄，都可能牵动另一方反应。",
      "记录限制：当前页面应使用“未解封”“待判定”“王座空位”等档案措辞，不填入未经学院确认的姓名；这样能维持 KING-02 的封存等级。"
    ],
    related: ["双生王座", "天空与风之王", "主副节点", "复苏钥匙", "王座共鸣", "未解封档案"],
    risk: "若忽略双生结构，KING-02 会被写成普通风系怪物档案，失去四大君主应有的王座层级和后续展开空间。",
    directive: "在视觉上保留一个空置副王座槽位：主投影显示风域，副节点以锁定环、缺失编号和未解封警示呈现。"
  },
  {
    id: "element",
    label: "风权柄",
    level: "DOMAIN",
    status: "速度 / 声音 / 气压 / 真空切割",
    fileNo: "DK-KING02-DOMAIN",
    classification: "能力档案 / 元素权柄",
    summary: "天空与风之王的危险不只是“风暴”。它更像对空气本身的占有：声音传播、气压变化、速度优势和真空切割都可能成为王座级武器。",
    report: [
      "权柄一：速度。风系目标的攻击窗口极短，常规目视、瞄准和反应流程会被压缩到失效。",
      "权柄二：声音。风可以成为感知网络，捕捉心跳、脚步、刀刃、气流和微小震动，使黑暗与遮蔽物失去意义。",
      "权柄三：切割。高速气流形成的真空或风刃可绕过普通防御，攻击缝隙、关节、玻璃、木材和无防护人体。",
      "权柄四：群体。风权柄可以表现为生物群灾，单个个体可被击杀，但群体数量会把战斗问题升级为封锁问题。"
    ],
    related: ["风元素", "气压", "声音传播", "真空切割", "高速目标", "群体灾害"],
    risk: "开放空间、玻璃幕墙、飞行器、无线通讯和人群密集区都会放大风权柄的破坏效果。",
    directive: "归档时优先记录等压线、声波回环与透明风刃痕迹；未出现连续王座信号前，不启动完整行动时间轴。"
  },
  {
    id: "yanling",
    label: "风系样本",
    level: "SPECIMEN",
    status: "镰鼬 / 镰鼬女皇 / 吸血镰",
    fileNo: "DK-KING02-SPECIMEN",
    classification: "生物档案 / 王座样本",
    summary: "镰鼬不是天空与风之王本体，而是最清晰的风系样本。它们让档案能够从抽象元素落到具体威胁：隐藏在风里、以高速行动、可成群外泄。",
    report: [
      "样本 A：活体镰鼬。北京尼伯龙根中出现的风系生物，外形近似骨鸟/风妖，具有吸血倾向，可被血统、气味或高价值炼金物吸引。",
      "样本 B：镰鼬女皇。个体规模和控制意味更强，可作为群体灾害的中心标本，用于解释风系生物群的聚集和繁殖倾向。",
      "样本 C：吸血镰。恺撒在极限状态下出现的言灵异变，说明“镰鼬”可以从侦测型风妖变为攻击型风妖。",
      "样本结论：活体镰鼬、言灵·镰鼬、吸血镰是三类不同对象，但都指向天空与风之王权柄的同一组关键词：高速、听觉、切割、群体和血。"
    ],
    related: ["镰鼬", "镰鼬女皇", "吸血镰", "言灵·镰鼬", "贤者之石", "尼伯龙根"],
    risk: "样本群体化后，处置目标从杀伤转为隔离；若外泄至现实城市，保密风险高于单次战斗伤亡。",
    directive: "界面中可显示标本柜：SPECIMEN-A 活体镰鼬、SPECIMEN-B 女皇、SPECIMEN-C 吸血镰。"
  },
  {
    id: "surveillance",
    label: "风系言灵",
    level: "YANLING",
    status: "镰鼬 / 阴流 / 风王之瞳",
    fileNo: "AL-KING02-YANLING",
    classification: "言灵档案 / 风域参照",
    summary: "风系言灵是推测天空与风之王王座的重要参照。它们不等于王座本体，但能显示风权柄在人类或混血种身上的低阶投影。",
    report: [
      "言灵·镰鼬：释放者命令风捕捉声音，使领域内心跳、脚步和刀刃都成为可追踪信号。它的本质偏向侦测和战场建图。",
      "阴流：控制可感知范围内的微风，使风携带金属刀刃进入缝隙，体现风系权柄的精密切割方向。",
      "风王之瞳：作为更高危的风域言灵参照，可用于描述攻击性飓风和风压撕扯，但档案中应保持“言灵参照”而非王座本体。",
      "档案结论：风系言灵的共同点不是单纯制造大风，而是把空气变成感知、切割、遮蔽、干扰和处决的媒介。"
    ],
    related: ["言灵·镰鼬", "阴流", "风王之瞳", "恺撒", "矢吹樱", "风域"],
    risk: "风系言灵极易被误并为同一类风域能力。档案必须区分侦测型、切割型、风暴型与王座级权柄，禁止以低阶言灵代替 KING-02 本体判定。",
    directive: "建立风系言灵分级索引：记录序列号、释放者、作用范围、攻击性、失控阈值与王座级相似度；相似度不足 80% 的记录不得上调至 KING-02 预警。"
  },
  {
    id: "protocol",
    label: "苏醒监测",
    level: "WATCH",
    status: "尼伯龙根裂缝 / 风妖外泄 / 声音异常",
    fileNo: "NORMA-KING02-WATCH",
    classification: "监控档案 / 异常指标",
    summary: "天空与风之王的监测不应只等本体出现。风系样本、裂缝、成群镰鼬和声音异常都可以作为王座苏醒前的外围信号。",
    report: [
      "指标一：尼伯龙根风域裂缝。现实地点出现风系生物外泄、声音定位异常或历史灾害重合时，应提升 KING-02 监测等级。",
      "指标二：镰鼬群体活动。少量个体可作为生物异常处理；数量进入几千、几万级别时，应判定为王座级风灾预警。",
      "指标三：声学污染。心跳、脚步、风声和金属摩擦被异常放大或失真，可能说明风域已经改变信息传播规则。",
      "指标四：诱饵反应。贤者之石、龙血、高价值炼金物或特定气味可引发风系生物聚集，应记录为样本吸引链。"
    ],
    related: ["尼伯龙根裂缝", "王恭厂", "镰鼬群", "声学异常", "贤者之石", "风域外泄"],
    risk: "风系苏醒信号可能被误判为天气、噪声或普通生物异常，导致封锁延误。",
    directive: "监测矩阵维持四项并列：裂缝、群体数量、声学污染、诱饵反应。任一指标异常扩大时，自动上调 KING-02 观察等级。"
  },
  {
    id: "visual",
    label: "处置原则",
    level: "PROTOCOL",
    status: "识别 / 封锁 / 诱导 / 远程处置",
    fileNo: "ED-KING02-PROTOCOL",
    classification: "处置档案 / 王座预案",
    summary: "天空与风之王档案的处置原则来自执行部既有风系案例。核心是：先让不可见的风变成可识别对象，再阻止其进入普通世界。",
    report: [
      "识别原则：优先启用声学、气压和风速复合监测。面对不可见目标时，目视情报的优先级必须下调。",
      "封锁原则：现实缺口、人群密集建筑和交通枢纽必须先封闭再清剿。王恭厂案例证明，保密封锁本身就是战斗的一部分。",
      "诱导原则：可使用贤者之石、龙血或特定气味诱导风系生物聚集，但诱饵携带者风险极高。",
      "处置原则：少量样本可近距击杀，群体灾害应采用隔离、封闭、爆破、远程炼金武器或高速撤离，不应试图逐个清除。",
      "王座原则：若天空与风之王本体苏醒，以上原则只作为低阶样本预案，需要立刻升级至四大君主级别作战。"
    ],
    related: ["封锁", "诱饵", "远程炼金武器", "高速撤离", "保密协议", "四大君主级作战"],
    risk: "风系事件的危险在于不可见和扩散快。处置迟疑会让单点异常变成城市级曝光。",
    directive: "页面保留冷色风场视觉，主标题使用档案名；案例只放在报告句和相关标签中。"
  }
];

const earthMountainSections: BronzeFireSection[] = [
  {
    id: "throne",
    label: "王座身份",
    level: "KING-03",
    status: "耶梦加得 / 芬里厄 / 大地与山之王",
    fileNo: "DK-KING03-IDENTITY",
    classification: "封存档案 / 双生王座判定",
    summary: "大地与山之王是已确认活动的四大君主王座，档案核心不是单体龙王，而是耶梦加得与芬里厄共同构成的地下王座。",
    report: [
      "该王座不应从“地震怪物”写起，而应从一座城市地下传来的异常心跳写起。北京地铁沿线出现无法解释的夜间震动，停运后的轨道仍在微微颤动，像有什么庞大的东西在城市下方翻身。",
      "诺玛记录显示，异常并不集中于单一地点，而是沿着轨道系统蔓延，最终勾勒出一张与北京地铁高度重合的地下图谱。现代交通系统由此变成尼伯龙根外壳，现实入口被藏进最不该藏匿怪物的人流密集区。"
    ],
    related: ["大地与山之王", "耶梦加得", "芬里厄", "北京地铁", "尼伯龙根", "地动异常"],
    risk: "KING-03 的风险不只是战斗破坏，而是城市基础设施被王座空间覆盖，普通地质灾害、交通异常和龙类巢穴会被混成同一事件。",
    directive: "确认 KING-03 活动后，所有地铁震动、地下失踪、龙类生物群和疑似人类身份伪装必须合并判读。"
  },
  {
    id: "twin",
    label: "双生关系",
    level: "TWIN",
    status: "智性伪装 / 巢穴力量 / 姐弟节点",
    fileNo: "DK-KING03-TWIN",
    classification: "关系档案 / 双生互补",
    summary: "耶梦加得与芬里厄不是主从关系，而是大地与山之王的两半：一半进入人类社会，一半留守地下巢穴。",
    report: [
      "耶梦加得以“夏弥”的身份进入人类社会，具备学习、伪装、诱导和情感干扰能力。她不是简单潜伏，而是把自己写进楚子航、路明非和学院日常关系里。",
      "芬里厄留在地下深处，表现出近乎儿童式的依赖和恐惧，却同时拥有龙王级体量与破坏力。耶梦加得是钥匙，也是谎言；芬里厄是巢穴，也是灾难本身。",
      "这组双生结构最危险的地方在于互补：智性节点负责接触世界、诱导目标、掩护巢穴；力量节点负责守巢、沉眠、地动和最终灾害输出。"
    ],
    related: ["夏弥", "芬里厄", "姐弟", "双生子", "王座共鸣", "守巢"],
    risk: "只处置其中一端无法完成王座终止。若耶梦加得死亡而芬里厄仍在巢穴内，地下王座仍具备失控与坍塌风险。",
    directive: "界面应把两个节点并列呈现：夏弥节点显示身份伪装和关系链，芬里厄节点显示地下巢穴和灾害半径。"
  },
  {
    id: "nibelung",
    label: "北京尼伯龙根",
    level: "SITE-BJ",
    status: "地铁接口 / 地下巢穴 / 现实覆盖",
    fileNo: "DK-KING03-SITE-BJ",
    classification: "地点档案 / 城市级异常空间",
    summary: "北京尼伯龙根不是远离人群的古代遗迹，而是覆盖在现代城市地下的一套龙族空间。",
    report: [
      "人类看到的是地铁站、轨道、灯箱、卷闸门和施工通道；龙族真正使用的是另一套空间逻辑。入口可以伪装成站点、隧道、列车或一张被改写的交通路线。",
      "地铁列车既是交通工具，也是穿行尼伯龙根的保护层。黑暗隧道、失踪专员、异常震动和镰鼬群，都是进入地下王座前的警告。"
    ],
    related: ["北京地铁", "隐藏站点", "地下隧道", "地铁列车", "尼伯龙根", "王恭厂"],
    risk: "现实接口一旦扩大，普通乘客、城市交通和执行部战场会被强行折叠到同一空间。",
    directive: "建立三层坐标档案：地表城市、地下交通、尼伯龙根巢穴。三层坐标必须同步校准，禁止单独引用地铁图作为最终坐标。"
  },
  {
    id: "xia_mi",
    label: "夏弥身份",
    level: "HOST",
    status: "人类伪装 / 情感锚点 / 身份暴露",
    fileNo: "ID-HOST-JORMUNGAND",
    classification: "身份档案 / 高危伪装",
    summary: "夏弥是耶梦加得进入人类关系网的身份，也是 KING-03 档案中最容易造成执行判断迟疑的情感层。",
    report: [
      "夏弥的危险性不在于她看起来不像人，而在于她太像人。她能进入学院生活，靠近楚子航和路明非，并把一次王座苏醒事件包装成青春日常中的相遇。",
      "身份暴露后，目标不再只是敌人。她曾经以人的姿态参与日常，也曾经把自己的痕迹留给楚子航。最终对峙的悲剧性来自这一点：执行者必须杀死龙王，但他面对的又不是一个完全陌生的怪物。"
    ],
    related: ["夏弥", "耶梦加得", "楚子航", "路明非", "学院日常", "身份暴露"],
    risk: "人类身份会削弱执行人员对龙王本体的即时判断，并在任务结束后留下长期精神残留。",
    directive: "该条目应与人物档案联动，但在龙王档案内保留 KING-03 级别标记，避免被降级为普通角色资料。"
  },
  {
    id: "fenrir",
    label: "芬里厄巢穴",
    level: "NEST",
    status: "地下深处 / 守巢节点 / 龙王级体量",
    fileNo: "DK-KING03-NEST",
    classification: "巢穴档案 / 双生节点",
    summary: "芬里厄是大地与山之王的另一半，承担巢穴、力量和地下主场。他的儿童化人格不能降低档案危险等级。",
    report: [
      "芬里厄留在地下深处，依赖姐姐，也保护姐姐。他的情感表现近似孩子，但体量、血统和权柄都属于龙王级目标。",
      "该节点使 KING-03 具备强烈反差：越是无害的语言和依赖关系，越会遮蔽他作为地下灾害核心的事实。巢穴不是背景，而是芬里厄身体和王座意志的延伸。"
    ],
    related: ["芬里厄", "地下巢穴", "姐姐", "龙王级目标", "大地权柄", "守巢"],
    risk: "若处置者被目标人格误导，可能低估地下空间坍塌、龙王失控和双生召回风险。",
    directive: "视觉上建议显示被城市剖面压住的巨大巢穴轮廓，芬里厄节点置于地铁线下方。"
  },
  {
    id: "metro_case",
    label: "地铁异常",
    level: "CASE",
    status: "夜间震动 / 失踪专员 / 路线重合",
    fileNo: "NORMA-KING03-METRO",
    classification: "监测报告 / 城市异常",
    summary: "地铁异常是 KING-03 档案的侦测入口，它将普通城市数据转化为龙王巢穴的坐标证据。",
    report: [
      "案件起点包括失踪执行部专员、地铁沿线血统搜查记录、夜间异常震动和隐藏站点线索。楚子航通过数据计算发现，震动分布与北京地铁路线高度重合。",
      "该结论的危险之处在于反常识：地铁隧道人流密集、巡查频繁、历史不长，本不适合作为龙王藏身处。正因如此，它才具备伪装价值。"
    ],
    related: ["失踪专员", "血系结罗", "地铁卡", "震动数据", "楚子航", "诺玛"],
    risk: "异常如果被拆散为交通故障、地质波动和普通失踪案，KING-03 的苏醒链路会被延误识别。",
    directive: "建议以任务报告形式呈现：数据输入、路线重合、入口推断、现场进入、尼伯龙根确认。"
  },
  {
    id: "aftermath",
    label: "情感损耗",
    level: "CASUALTY",
    status: "夏弥死亡 / 楚子航残留 / 任务后效",
    fileNo: "ED-KING03-AFTERMATH",
    classification: "后效档案 / 精神残留",
    summary: "KING-03 的伤亡不只发生在战场，也发生在身份被否认之后。夏弥既死于龙王处决，也死于她作为人的痕迹被迫消失。",
    report: [
      "楚子航与夏弥的关系应作为高危情感层记录。档案不能把它写成单纯恋爱支线，因为它直接影响执行者面对龙王身份时的判断、迟疑和任务后创伤。",
      "后续记录显示，夏弥死亡并不意味着事件从记忆中清除。她留下的地址、话语和身份残影，成为楚子航档案中长期存在的未闭合节点。"
    ],
    related: ["楚子航", "夏弥", "任务后创伤", "身份否认", "情感锚点", "未闭合节点"],
    risk: "情感损耗会让执行部报告失真：纸面上是龙王处决，个人记忆中却可能是一场无法复核的私人死亡。",
    directive: "该条目不做事件戏剧化复述，采用黑匣子报告样式：身份暴露、对峙、死亡确认、精神残留四段记录。"
  }
];

const oceanWaterSections: BronzeFireSection[] = [
  {
    id: "throne",
    label: "王座身份",
    level: "KING-04",
    status: "双生体未解封 / 水域王座",
    fileNo: "DK-KING04-IDENTITY",
    classification: "封存档案 / 未确认王座",
    summary: "海洋与水之王属于四大君主序列，但当前档案尚未解封其双生体姓名、沉眠地点和主要战场。",
    report: [
      "该王座适合写成最安静、也最不安的档案。水不像火那样爆裂，也不像地那样震动；它的危险在于覆盖、渗透和抹除。",
      "诺玛只确认 KING-04 属于四大君主序列。双生体姓名、苏醒方式、沉眠容器和主要战场均未完成判定，所有水域异常暂时只能归入候选证据链。"
    ],
    related: ["海洋与水之王", "双生体未解封", "四大君主", "水域权柄", "候选证据链"],
    risk: "过早填满该档案会削弱未知王座的压迫感，也可能把后续证据链锁死在错误方向。",
    directive: "维持封存字段：主王座节点未解封，双生节点未解封，沉眠地点未解封；未经新增证据不得补全姓名。"
  },
  {
    id: "domain",
    label: "水权柄",
    level: "DOMAIN",
    status: "潮汐 / 水压 / 低温 / 窒息",
    fileNo: "DK-KING04-DOMAIN",
    classification: "能力档案 / 元素权柄",
    summary: "海洋与水之王的权柄不应只写作控水，而应记录为对流体系统、压力、温度和证据保存环境的占有。",
    report: [
      "水可以吞没现场、改写证据、隔绝通讯，让一场灾难看起来像普通沉船、暴雨、潮汐异常或深潜事故。",
      "水权柄可延伸为潮汐、水压、低温、窒息、折射、腐蚀、血液循环和记忆沉没。它不像金属会留下清晰边界，而是渗入、包围、拖拽，然后让证据消失。"
    ],
    related: ["潮汐", "水压", "低温", "窒息", "折射", "证据消失"],
    risk: "水域事件很容易被自然灾害解释覆盖，导致龙王级预警被普通事故报告吞没。",
    directive: "归档时优先记录声呐回波、水压刻度、漂浮物证和断续通讯；未确认完整王座信号前，不建立本体模型。"
  },
  {
    id: "site",
    label: "深海遗迹",
    level: "SITE-LOCK",
    status: "未知坐标 / 声呐空洞 / 水下尼伯龙根",
    fileNo: "DK-KING04-DEEP-SEA",
    classification: "地点档案 / 坐标封存",
    summary: "深海遗迹应作为 KING-04 的候选战场，而不是确定地点。它负责承载未知、失联和无法回收的压迫感。",
    report: [
      "候选地点包括深海遗迹、沉船区、水下尼伯龙根、海底断层和长期声呐空洞。坐标不应一次性展示完整，而应以漂移、失真和权限不足形式出现。",
      "该类地点的危险不只来自水下战斗，而来自撤离困难、通讯衰减、尸体无法回收、证据被海流带走和任务记录被自然环境抹平。"
    ],
    related: ["深海遗迹", "沉船", "声呐空洞", "水下尼伯龙根", "坐标漂移"],
    risk: "若没有可靠坐标与回收链路，执行部可能在进入战场之前就失去撤离窗口。",
    directive: "建立封存海图：所有坐标点标记漂移等级，仅开放部分声呐剖面与失联记录；未经校董会授权不得显示完整航线。"
  },
  {
    id: "vessel",
    label: "沉眠容器",
    level: "VESSEL",
    status: "卵 / 遗骸 / 封存舱 / 待判定",
    fileNo: "DK-KING04-VESSEL",
    classification: "物证档案 / 沉眠结构",
    summary: "KING-04 的复苏载体尚未确认，档案应保留多种可能：卵、遗骸、圣骸、封存舱或水下宫殿。",
    report: [
      "沉眠容器是水王座最适合悬置的证据层。它可能不是一件物品，而是一片水域、一座遗迹、一艘沉船，甚至是一套持续循环的潮汐结构。",
      "与青铜与火之王的黄铜罐不同，KING-04 的容器不应被立刻实物化。越晚确认，越能保留“水下有什么东西正在等待”的档案张力。"
    ],
    related: ["沉眠容器", "卵", "遗骸", "封存舱", "水下宫殿", "潮汐结构"],
    risk: "错误回收可能主动触发复苏，或把王座残留从封闭水域带入现实世界。",
    directive: "建立多重锁定槽位，每个槽位仅保留假设名称、证据等级和禁止回收标记。"
  },
  {
    id: "twin",
    label: "双生空位",
    level: "TWIN-LOCK",
    status: "主王座未解封 / 双生节点未解封",
    fileNo: "DK-KING04-TWIN-LOCK",
    classification: "关系档案 / 双生封存",
    summary: "海洋与水之王必须按双生王座预留结构，但当前不填姓名，不确认主副分工。",
    report: [
      "四大君主均具备双生结构，因此 KING-04 不应被写作孤立个体。当前档案保留主王座节点和双生节点两个空位，等待后续证据填充。",
      "若按水权柄推演，双生分工可能体现为“深海沉眠 / 潮汐外泄”“记忆保存 / 证据抹除”“容器 / 召回”等方向，但这些只能作为诺玛假设，不进入身份判定。"
    ],
    related: ["双生空位", "主王座节点", "副王座节点", "王座共鸣", "未解封", "诺玛假设"],
    risk: "双生节点未确认前，任何单次击杀、单件遗骸回收或单一地点封锁都不能作为王座终止证明。",
    directive: "保留两个水下空王座槽位：一个标注 PRIME SIGNAL LOST，另一个标注 TWIN SIGNAL UNRESOLVED。"
  },
  {
    id: "watch",
    label: "苏醒预警",
    level: "WATCH",
    status: "潮汐逆转 / 集体失联 / 龙文浮现",
    fileNo: "NORMA-KING04-WATCH",
    classification: "监控档案 / 水域异常",
    summary: "KING-04 的预警不应等待王座现身，而应从水域异常、深水通讯和证据消失开始。",
    report: [
      "任何持续潮汐逆转、船只集体失联、深水声呐空洞、遗迹坐标漂移、未知龙文浮现，都应提升至 KING-04 预警。",
      "水域异常的第一特征往往不是出现怪物，而是人类记录开始失真：通讯中断、坐标漂移、尸体无法回收、影像被水压破坏、目击报告互相矛盾。"
    ],
    related: ["潮汐逆转", "船只失联", "声呐空洞", "坐标漂移", "未知龙文", "通讯中断"],
    risk: "水域会天然销毁证据，诺玛必须把“证据消失”本身视为证据。",
    directive: "双生节点未确认前，不得宣布 KING-04 王座终止；所有水域异常维持长期监控。"
  }
];

const blackKingSections: BronzeFireSection[] = [
  {
    id: "throne",
    label: "龙皇王座",
    level: "PRIME-00",
    status: "尼德霍格 / 龙族唯一祖先 / 终末王座",
    fileNo: "DK-PRIME00-THRONE",
    classification: "绝密档案 / 龙皇谱系",
    summary: "黑王尼德霍格是龙族谱系的最高源头，也是秘党所有屠龙行动最终指向的终末王座。",
    report: [
      "学院谱系学记录将黑王列为龙族唯一祖先。四大君主、白王血裔与混血种研究均不能脱离该源头判定，否则血统、言灵和王座继承会失去参照轴。",
      "黑王死亡记录带有强烈神话化痕迹：冰雪覆盖的王座、山巅遗骸、血雨和新时代宣告均被收录为古龙史核心残片。诺玛不将其视为普通神话，而是作为龙类政治秩序崩解的起始证据。"
    ],
    related: ["尼德霍格", "龙皇", "黑王血裔", "四大君主", "古龙史", "终末王座"],
    risk: "任何黑王复苏、黑王遗骸或龙皇级召唤信号均应直接越过普通龙王预警，进入 PRIME-00 终末响应。",
    directive: "维持 PRIME-00 最高封存。除校长、诺玛核心与校董会授权席位外，禁止调阅完整谱系链。"
  },
  {
    id: "emperor",
    label: "言灵·皇帝",
    level: "YANLING-PRIME",
    status: "龙皇召唤 / 血裔压制 / 最高言灵",
    fileNo: "AL-PRIME00-EMPEROR",
    classification: "言灵档案 / 最高序列",
    summary: "言灵·皇帝是黑王对其血裔的最高召唤与压制协议，可用于测试血统归属、敬畏反应和异常免疫。",
    report: [
      "该言灵对臣服于龙皇谱系的血裔具有强制性精神影响。常规反应包括敬畏、幻觉、召唤感、服从冲动和血统共鸣。",
      "对言灵·皇帝无响应的个体必须单独建档。该异常不应被轻易归因于低血统或测试失败，需同步排查白王血裔、未知血统变异、精神抗性和权限遮蔽。"
    ],
    related: ["言灵·皇帝", "3E考试", "血统共鸣", "白王血裔", "龙皇召唤", "异常免疫"],
    risk: "误判该言灵反应会直接影响学院招生、隔离、血统评级和高危个体处置。",
    directive: "所有无响应样本上调为 SUSPICIOUS BLOODLINE；完成白王侧、黑王侧与未知谱系三向复核前，不得公开评级结论。"
  },
  {
    id: "bloodline",
    label: "黑王血裔",
    level: "BLOODLINE",
    status: "混血种基准 / 谱系压制 / 黄金瞳",
    fileNo: "DK-PRIME00-BLOOD",
    classification: "血统档案 / 谱系基准",
    summary: "黑王血裔构成学院血统研究的基础样本，也是大多数混血种言灵反应、龙文敬畏和黄金瞳压制的判定背景。",
    report: [
      "混血种并非脱离龙族系统的独立物种。绝大多数样本仍受黑王谱系影响，龙文、言灵和高阶血统压制都能在其精神层面留下反应。",
      "黑王血裔的风险不在单个学生，而在群体规模。一旦龙皇级召唤重新激活，学院内部、执行部队伍和秘党家族都可能同时成为被召回对象。"
    ],
    related: ["混血种", "黄金瞳", "血统评级", "龙文反应", "执行部", "秘党"],
    risk: "黑王级召唤会把学院安全问题升级为全球混血种失控问题。",
    directive: "所有高血统专员必须保留龙皇召唤应急记录；诺玛需维持全校范围内的言灵反应静默监控。"
  },
  {
    id: "prophecy",
    label: "终末预案",
    level: "DOOMSDAY",
    status: "诸神黄昏 / 世界树 / 屠龙终点",
    fileNo: "NORMA-PRIME00-END",
    classification: "末日档案 / 最高响应",
    summary: "黑王档案的终点不是单次战斗，而是龙族秩序重启与人类文明终止的复合预案。",
    report: [
      "北欧神话中的终末叙事被学院纳入风险模型：黑王与世界树、诸神黄昏和世界毁灭存在高度稳定的象征对应。诺玛将其视作古代观测者对龙皇级灾害的编码记录。",
      "屠龙战争的终点不是消灭某一只龙，而是阻断黑王复苏、龙皇召唤和龙族王权重建。任何单一武器、单一专员或单一学院分部都不具备独立处置资格。"
    ],
    related: ["诸神黄昏", "世界树", "屠龙战争", "龙皇复苏", "终末预案", "秘党"],
    risk: "一旦 PRIME-00 进入 ACTIVE 状态，常规保密协议失效，学院必须转入文明级存续响应。",
    directive: "保留 DOOMSDAY PROTOCOL 封存。触发条件包括龙皇召唤复现、黑王遗骸活动、全球混血种同步异常和四大君主非自然聚集。"
  }
];

const whiteKingSections: BronzeFireSection[] = [
  {
    id: "throne",
    label: "叛乱王座",
    level: "PRIME-01",
    status: "白王 / 黑王造物 / 最大叛乱源",
    fileNo: "DK-PRIME01-THRONE",
    classification: "绝密档案 / 叛乱王座",
    summary: "白王是黑王之外最高危的禁忌王座。学院记录将其列为龙族历史中规模最大的叛乱源。",
    report: [
      "白王并非四大君主之一，而是黑王体系内部产生的更高阶裂变。其叛乱曾牵动大量龙族血裔，形成足以挑战龙皇秩序的独立王权。",
      "黑王阵营留下的毁灭记录不能作为白王完全消亡的最终证明。对初代种级别目标而言，肉体毁灭、骨骼粉碎和火山封存均不足以排除灵魂、圣骸或血裔侧复苏可能。"
    ],
    related: ["白王", "黑王", "叛乱", "龙族内战", "白王血裔", "圣骸"],
    risk: "白王档案的风险来自“被确认已消灭”的历史叙述。任何过早结案都会放大复苏窗口。",
    directive: "PRIME-01 维持独立封存，不并入四大君主序列。涉及白王血裔、圣骸和神谕的记录必须同步校长室。"
  },
  {
    id: "oracle",
    label: "言灵·神谕",
    level: "YANLING-PRIME",
    status: "克制皇帝 / 血裔解除 / 叛乱协议",
    fileNo: "AL-PRIME01-ORACLE",
    classification: "言灵档案 / 最高序列",
    summary: "言灵·神谕是白王血裔体系的核心标志，被列为唯一可对抗言灵·皇帝的最高危言灵参照。",
    report: [
      "神谕的危险不在直接杀伤，而在解除黑王谱系的服从结构。若皇帝是召回与压制，神谕就是脱离、反叛和重新归属。",
      "出现神谕级反应时，学院不得按普通精神抗性处理。该反应可能意味着白王血裔、白王遗产或未知王座权限正在目标体内启动。"
    ],
    related: ["言灵·神谕", "言灵·皇帝", "白王血裔", "血统免疫", "叛乱协议", "路明非异常"],
    risk: "神谕样本若被误判，将导致学院把白王侧高危个体留在常规学生系统内。",
    directive: "建立 ORACLE WATCH。凡对皇帝无响应且出现高血统迹象者，必须进入白王侧复核流程。"
  },
  {
    id: "bloodline",
    label: "白王血裔",
    level: "BLOODLINE",
    status: "传说残留 / 高危样本 / 隔离争议",
    fileNo: "DK-PRIME01-BLOOD",
    classification: "血统档案 / 禁忌谱系",
    summary: "白王血裔长期被视作未证实传说，但学院内部保留独立判定流程，防止异常个体被黑王血裔模型吞没。",
    report: [
      "白王血裔与黑王血裔的差异不应被简化为善恶阵营。龙族三原则仍然成立：龙类与人类之间的鸿沟，不会因白王曾反叛黑王而消失。",
      "相关讨论曾触发隔离、研究和学生保护之间的冲突。学院必须同时评估血统风险与人类身份，禁止在证据不足时将目标直接归入实验材料。"
    ],
    related: ["白王血裔", "隔离预案", "血统评级", "3E考试", "古德里安", "曼施坦因"],
    risk: "白王血裔样本具备双重风险：若放任，可能成为王座复苏容器；若误处置，学院将主动制造不可逆的人事灾难。",
    directive: "白王血裔疑似样本实行双签名制度：谱系学教授与执行部负责人共同确认后，方可上调隔离等级。"
  },
  {
    id: "relic",
    label: "圣骸",
    level: "RELIC-SS",
    status: "复苏载体 / 白王遗产 / 日本收容事件",
    fileNo: "DK-PRIME01-RELIC",
    classification: "物证档案 / 王座遗产",
    summary: "圣骸是白王档案中最危险的物证层。它不是普通遗骸，而是可能承载王权、血统和复苏权限的遗产结构。",
    report: [
      "日本相关事件显示，白王遗产可被长期收容、转移、研究和利用。圣骸一旦进入人体或龙类实验链，目标可能获得超越常规混血种的王座级权柄。",
      "赫尔佐格事件被列为 PRIME-01 最高危案例：人类阴谋、白王遗产、龙类进化和现代武装处置在同一战场重叠，证明白王档案不能仅作为古代史处理。"
    ],
    related: ["圣骸", "赫尔佐格", "日本分部", "红井", "蛇岐八家", "白王遗产"],
    risk: "圣骸具备强污染性。任何研究、运输、植入或毁损尝试都可能变成复苏流程的一部分。",
    directive: "所有圣骸相关物证执行零接触原则。未经校长室、装备部和诺玛三方确认，不得移动、切割或植入。"
  },
  {
    id: "japan",
    label: "日本收容链",
    level: "CASE-JP",
    status: "蛇岐八家 / 猛鬼众 / 王座复写",
    fileNo: "ED-PRIME01-JP",
    classification: "行动档案 / 地区收容链",
    summary: "日本收容链证明白王档案不是静态历史，而是仍能通过血统、组织和物证持续干预现实的王座遗留。",
    report: [
      "蛇岐八家、猛鬼众、圣骸、红井和赫尔佐格构成一条高危收容链。该链路中每个节点都可被伪装为地区事务，但合并后指向白王遗产复苏。",
      "白王事件的处置重点不只是击杀新生王座，还包括切断组织控制、销毁错误研究、隔离血裔样本和防止圣骸再次进入实验流程。"
    ],
    related: ["蛇岐八家", "猛鬼众", "红井", "赫尔佐格", "源稚生", "源稚女", "上杉绘梨衣"],
    risk: "地区组织一旦掌握王座遗产，会把屠龙任务转化为内部权力工程，导致学院情报长期失真。",
    directive: "日本线相关记录维持 CASE-JP 封存。任何白王遗产再发现，必须跳过地区分部直接回传诺玛核心。"
  }
];

const kuimenMissionSections: BronzeFireSection[] = [
  {
    id: "brief",
    label: "任务简报",
    level: "OBJECTIVE",
    status: "长江水域 / 青铜城确认 / 王座物证",
    fileNo: "ED-KUIMEN-BRIEF",
    classification: "执行部任务 / S 级水下行动",
    summary: "夔门计划由执行部启动，目标为确认长江水下异常结构、接触青铜城入口，并回收可证明青铜与火之王沉眠状态的关键物证。",
    report: [
      "任务区域锁定长江上游暴风雨水域。摩尼亚赫号作为水面指挥平台，负责声呐监控、生命体征记录、通讯中继、绞盘回收和紧急火力支援。",
      "水下行动窗口按两小时估算。氧气、电力、通讯线和救生索均被列为硬性限制；任一链路失效，任务应从侦察转入撤离。"
    ],
    related: ["夔门计划", "摩尼亚赫号", "长江水域", "青铜城", "青铜与火之王"],
    risk: "任务目标从遗迹确认升级为王座宫殿接触后，原 S 级侦察标准不足以覆盖后续追击、伤亡和物证污染风险。",
    directive: "所有夔门计划记录维持封存。该行动不得以普通水下考古、打捞或区域异常处理。"
  },
  {
    id: "command",
    label: "指挥链",
    level: "COMMAND",
    status: "曼斯教授 / 船载指挥 / 诺玛记录",
    fileNo: "ED-KUIMEN-COMMAND",
    classification: "指挥档案 / 现场链路",
    summary: "摩尼亚赫号为现场指挥节点，曼斯教授负责战术判断，诺玛负责记录生命信号、通讯状态和任务阶段。",
    report: [
      "指挥节点：曼斯教授。职责包括行动窗口确认、水下组命令下达、爆破授权、撤离判断和水面追击阶段火力决策。",
      "支援节点：塞尔玛负责生命信号与通讯监控，船员维持航行、声呐、绞盘和回收系统。海事救援被列入外部响应，但抵达时间无法覆盖水下组即时风险。"
    ],
    related: ["曼斯教授", "塞尔玛", "摩尼亚赫号", "诺玛", "通讯链路"],
    risk: "水下通讯断裂后，现场指挥只能依据残余信号和行动预案判断，极易出现物证优先与人员撤离之间的冲突。",
    directive: "指挥链记录必须保留完整时间戳。通讯失效后所有决策自动标注为 BLACK CHANNEL。"
  },
  {
    id: "team",
    label: "行动人员",
    level: "FIELD TEAM",
    status: "叶胜 / 酒德亚纪 / 钥匙",
    fileNo: "ED-KUIMEN-TEAM",
    classification: "人员档案 / 水下作业组",
    summary: "水下作业组由叶胜、酒德亚纪执行，钥匙作为活体权限进入门禁链路，三者共同构成青铜城入口接触单元。",
    report: [
      "叶胜负责释放言灵·蛇，建立水下感知网络和青铜城内部轮廓。酒德亚纪负责拍摄、取样、回传龙文资料和协助物证转移。",
      "钥匙不按普通人员处理。其高纯度龙血具备临时门禁授权价值，属于活体密钥而非技术工具；其存在会同步提高入口打开概率和王座系统反应概率。"
    ],
    related: ["叶胜", "酒德亚纪", "钥匙", "言灵·蛇", "活体密钥"],
    risk: "活体密钥接触门禁后，青铜城可能从沉默结构转入自启动状态。",
    directive: "水下组任何生命信号异常均需立即同步指挥台；钥匙相关记录不得进入普通人员伤亡表。"
  },
  {
    id: "site",
    label: "战场坐标",
    level: "BATTLESPACE",
    status: "水面平台 / 水下宫殿 / 炼金机关",
    fileNo: "ED-KUIMEN-SITE",
    classification: "战场档案 / 水域剖面",
    summary: "夔门计划战场分为水面平台、水下通道、青铜城入口、王座宫殿和异常追击区五层。",
    report: [
      "青铜城不是普通遗迹。墙壁、门禁、甬道、齿轮和龙文穹顶均可能属于同一套炼金机关，具备自启动、变形和封锁撤离路线的能力。",
      "水面与水下并非独立战场。水下宫殿被激活后，巨型龙类目标可进入水面追击阶段，直接威胁摩尼亚赫号。"
    ],
    related: ["青铜城", "水下宫殿", "龙文穹顶", "活灵", "水面追击"],
    risk: "战场空间会主动改变。任何静态地图均只能作为进入前参考，不得作为撤离保证。",
    directive: "战场图必须以动态剖面记录：水面、入口、宫殿、撤离通路、追击区五层并列。"
  },
  {
    id: "timeline",
    label: "时间轴",
    level: "TIMELINE",
    status: "CONTACT / ROUTE LOST / CASUALTY",
    fileNo: "ED-KUIMEN-TIMELINE",
    classification: "行动复盘 / 阶段记录",
    summary: "行动时间轴从水下接触开始，最终升级为青铜城自启动、撤离路线失效、人员牺牲和水面追击。",
    report: [
      "阶段一：水下组进入目标水域，言灵·蛇开始扫描，青铜城轮廓被确认。阶段二：钥匙接触门禁，入口权限短时开放。",
      "阶段三：城内龙文与机关触发异常，救生索、通讯链路和既有路径失效。阶段四：水下组执行物证转移，氧气窗口崩溃。阶段五：摩尼亚赫号遭巨型龙类追击。"
    ],
    related: ["CONTACT", "DOOR OPENED", "SYSTEM TRIGGERED", "ROUTE LOST", "SURFACE PURSUIT"],
    risk: "时间轴显示任务失败点不是单一战斗失误，而是多个安全窗口同时关闭。",
    directive: "时间轴节点不得删除。后续训练模拟必须保留 ROUTE LOST 与 OXYGEN FAILURE 两个强制失败条件。"
  },
  {
    id: "casualty",
    label: "伤亡记录",
    level: "CASUALTY",
    status: "叶胜 / 酒德亚纪 / 塞尔玛",
    fileNo: "ED-KUIMEN-CASUALTY",
    classification: "伤亡档案 / 任务代价",
    summary: "夔门计划主要伤亡集中于水下作业组和水面支援节点，任务代价与物证回收直接绑定。",
    report: [
      "叶胜确认牺牲。其最后阶段承担感知、开路和氧气分配判断，并将撤离窗口让渡给酒德亚纪。",
      "酒德亚纪完成关键物证上浮转移后遭水下目标拖回，判定牺牲。塞尔玛在摩尼亚赫号遭袭阶段失联，记录终止于水面防线被突破。"
    ],
    related: ["叶胜", "酒德亚纪", "塞尔玛", "氧气窗口", "物证上浮"],
    risk: "该行动证明执行部在王座级任务中可能被迫以人员生命换取坐标、物证和处置窗口。",
    directive: "伤亡记录不得作为附属人物简介处理，必须与行动时间轴和物证回收链绑定。"
  },
  {
    id: "evidence",
    label: "物证回收",
    level: "EVIDENCE",
    status: "黄铜罐 / 金属匣 / 龙王复苏链",
    fileNo: "ED-KUIMEN-EVIDENCE",
    classification: "物证档案 / 高危回收",
    summary: "夔门计划的关键成果不是战场胜利，而是青铜与火之王复苏链的物证确认。",
    report: [
      "黄铜罐作为复苏载体相关物证进入学院视野，证明水下结构与青铜与火之王沉眠机制存在直接关联。",
      "后续金属匣和七宗罪线索将夔门计划从侦察行动推入炼金武器、王座处决和二次作战链路。"
    ],
    related: ["黄铜罐", "金属匣", "七宗罪", "青铜与火之王", "复苏载体"],
    risk: "物证具备研究价值，也具备复苏污染风险。回收成功不等于任务安全结束。",
    directive: "所有回收物证执行封存柜协议：编号、取得者、取得地点、当前状态、异常反应五项必填。"
  },
  {
    id: "assessment",
    label: "诺玛复盘",
    level: "ASSESSMENT",
    status: "侦察升级 / 作战窗口 / 二次行动",
    fileNo: "NORMA-KUIMEN-ASSESSMENT",
    classification: "诺玛复盘 / 战术结论",
    summary: "诺玛判定夔门计划为执行部王座级行动模板。该任务暴露了水下作战、活体密钥、炼金机关和撤离窗口四类核心风险。",
    report: [
      "复盘结论一：水下王座遗迹不得按普通封闭空间处理。复盘结论二：活体密钥打开入口的同时也可能激活整座宫殿。",
      "复盘结论三：物证回收必须与人员撤离分开计算。复盘结论四：青铜城一旦进入活动状态，后续行动必须升级为处决方案。"
    ],
    related: ["王座级行动", "二次作战", "执行部训练", "水下撤离", "诺玛复盘"],
    risk: "若复盘结论未进入执行部训练体系，后续水下王座任务将重复同类伤亡。",
    directive: "将夔门计划列为 S 级行动教材。所有水下行动预案必须加入活体权限、路径变更和氧气失效三项推演。"
  }
];

const beijingNibelungSections: BronzeFireSection[] = [
  {
    id: "brief",
    label: "任务简报",
    level: "OBJECTIVE",
    status: "北京地铁 / 夜间震动 / 隐藏入口",
    fileNo: "ED-BJ-NIBELUNG-BRIEF",
    classification: "执行部任务 / SS 级城市异常",
    summary: "北京尼伯龙根事件由地铁沿线异常震动、失踪专员与隐藏站点线索触发。诺玛判定该事件不属于普通地质灾害，而是城市基础设施被龙族空间覆盖的高危样本。",
    report: [
      "任务初始信号来自北京地铁沿线夜间微震。异常发生于列车停运后，排除常规运营震动后仍保持稳定分布。",
      "失踪执行部专员与血统搜查记录提供二级证据。异常不是孤立地点，而是沿地铁系统形成可追踪图形，疑似尼伯龙根入口网络。"
    ],
    related: ["北京地铁", "尼伯龙根", "失踪专员", "夜间震动", "KING-03"],
    risk: "城市基础设施一旦成为尼伯龙根外壳，普通乘客、巡查人员和执行部专员都可能在不知情状态下进入龙族空间。",
    directive: "所有地铁异常与失踪记录合并归档，禁止拆分为交通故障、地质波动和普通失踪案。"
  },
  {
    id: "command",
    label: "指挥链",
    level: "COMMAND",
    status: "楚子航独立调查 / 诺玛数据复核",
    fileNo: "ED-BJ-NIBELUNG-COMMAND",
    classification: "指挥档案 / 非完整链路",
    summary: "该行动前期缺少完整现场指挥链，主要依赖楚子航个人调查、诺玛数据复核和学院远程资料支援。",
    report: [
      "楚子航通过异常数据、地铁线路和失踪专员资料建立初步模型。其行动具备执行部专员特征，但并非完整小队推进。",
      "诺玛在该阶段提供数据比对与异常归档，但现场态势变化过快，无法形成夔门计划式船载指挥平台。"
    ],
    related: ["楚子航", "诺玛", "执行部", "数据建模", "远程支援"],
    risk: "独立调查提高隐蔽性，但也削弱撤离、救援和多点验证能力。",
    directive: "类似城市级异常不得长期维持单人链路。确认尼伯龙根入口后，应立即建立现场指挥节点。"
  },
  {
    id: "team",
    label: "行动人员",
    level: "FIELD TEAM",
    status: "楚子航 / 路明非 / 芬格尔 / 夏弥",
    fileNo: "ED-BJ-NIBELUNG-TEAM",
    classification: "人员档案 / 接触链",
    summary: "北京尼伯龙根事件的人员链具有高度污染性：行动人员、疑似目标和王座身份伪装在同一城市空间内发生重叠。",
    report: [
      "楚子航为主要现场调查节点。路明非、芬格尔进入相关链路后，事件从数据调查升级为实际空间接触。",
      "夏弥身份需单独标记。其人类身份与 KING-03 耶梦加得重叠，属于高危接触对象，不得归入普通协同行动人员。"
    ],
    related: ["楚子航", "路明非", "芬格尔", "夏弥", "耶梦加得"],
    risk: "目标以人类身份进入接触链，会干扰执行判断和任务后复盘。",
    directive: "所有涉及夏弥的记录同步 KING-03 档案，禁止低于龙王级权限处理。"
  },
  {
    id: "site",
    label: "战场坐标",
    level: "BATTLESPACE",
    status: "地铁线路 / 隐藏站台 / 地下巢穴",
    fileNo: "ED-BJ-NIBELUNG-SITE",
    classification: "战场档案 / 城市覆盖层",
    summary: "战场由三层空间构成：地表城市、地铁交通系统、尼伯龙根巢穴。三层坐标并不完全同步。",
    report: [
      "地铁线路是入口外壳。站台、隧道、列车与卷闸门均可能成为现实接口，普通地图无法表示完整空间结构。",
      "地下巢穴是 KING-03 双生节点的核心区域。芬里厄守巢、地动异常和隐藏站点共同构成王座空间。"
    ],
    related: ["地表城市", "北京地铁", "隐藏站台", "芬里厄巢穴", "地下空间"],
    risk: "错误坐标会导致救援队进入现实地铁而非尼伯龙根，或在尼伯龙根内失去回到现实的接口。",
    directive: "建立三层坐标档案，所有坐标必须标注 REAL / METRO / NEST 三态。"
  },
  {
    id: "timeline",
    label: "时间轴",
    level: "TIMELINE",
    status: "数据重合 / 入口确认 / 身份暴露",
    fileNo: "ED-BJ-NIBELUNG-TIMELINE",
    classification: "行动复盘 / 阶段记录",
    summary: "时间轴从夜间震动数据开始，最终指向隐藏站台、地下巢穴和大地与山之王身份确认。",
    report: [
      "阶段一：夜间地铁震动被提取。阶段二：震动分布与地铁线路高度重合。阶段三：隐藏入口和尼伯龙根接口被确认。",
      "阶段四：地下巢穴与芬里厄节点进入视野。阶段五：夏弥身份暴露，事件由城市异常升级为 KING-03 王座接触。"
    ],
    related: ["震动数据", "路线重合", "隐藏入口", "芬里厄", "夏弥身份暴露"],
    risk: "时间轴的关键转折在身份暴露。此后所有现场判断必须从异常调查切换为龙王处置。",
    directive: "保留 IDENTITY EXPOSED 节点，作为后续训练模拟的强制转折。"
  },
  {
    id: "casualty",
    label: "伤亡记录",
    level: "CASUALTY",
    status: "失踪专员 / 夏弥死亡 / 精神残留",
    fileNo: "ED-BJ-NIBELUNG-CASUALTY",
    classification: "伤亡档案 / 任务后效",
    summary: "该事件的伤亡不只包括失踪与死亡，也包括龙王身份伪装造成的长期精神残留。",
    report: [
      "失踪专员为任务触发证据之一，其工作与地铁沿线血统搜查有关，应并入城市异常链。",
      "夏弥死亡属于 KING-03 处置结果，同时也是楚子航个人档案中的长期残留节点。该记录不得以普通战斗伤亡归档。"
    ],
    related: ["失踪专员", "夏弥", "楚子航", "任务后效", "精神残留"],
    risk: "若只记录死亡结果，会遗漏身份伪装对执行人员判断与心理状态的污染。",
    directive: "伤亡档案必须与 KING-03 情感损耗条目互链。"
  },
  {
    id: "evidence",
    label: "物证回收",
    level: "EVIDENCE",
    status: "地铁卡 / 笔记本 / 震动数据 / 影像残片",
    fileNo: "ED-BJ-NIBELUNG-EVIDENCE",
    classification: "物证档案 / 城市异常证据",
    summary: "物证链以城市数据和个人遗留物为主，区别于夔门计划的实体回收物证。",
    report: [
      "核心物证包括地铁线路重合数据、异常震动模型、失踪专员笔记本、隐藏站点线索和尼伯龙根影像残片。",
      "该类物证容易被普通城市数据覆盖，必须保留诺玛原始计算记录与人工复核记录。"
    ],
    related: ["地铁卡", "异常震动数据", "失踪专员笔记本", "尼伯龙根影像", "诺玛计算"],
    risk: "数据型物证可被删除、污染或误判。缺少原始记录会导致王座接触无法复核。",
    directive: "所有数据型物证执行双备份：诺玛核心、执行部离线封存各保留一份。"
  },
  {
    id: "assessment",
    label: "诺玛复盘",
    level: "ASSESSMENT",
    status: "城市覆盖 / 人类身份伪装 / 双生王座",
    fileNo: "NORMA-BJ-NIBELUNG-ASSESSMENT",
    classification: "诺玛复盘 / 城市级结论",
    summary: "诺玛判定北京尼伯龙根事件为城市基础设施被王座空间覆盖的高危样本，并确认人类身份伪装可直接渗透执行部接触链。",
    report: [
      "复盘结论一：现代城市交通系统可成为尼伯龙根外壳。复盘结论二：龙王可通过人类身份接近学院专员。",
      "复盘结论三：大地与山之王双生结构必须拆分研判，耶梦加得与芬里厄分别承担伪装、诱导、守巢和灾害输出。"
    ],
    related: ["城市覆盖", "身份伪装", "双生王座", "KING-03", "执行部训练"],
    risk: "同类事件若发生在人口密集区，保密难度、伤亡规模和救援复杂度会同步扩大。",
    directive: "将北京尼伯龙根事件列为城市级异常训练模板，所有地铁、隧道、地下商区异常均加入筛查。"
  }
];

const beijingStageTelemetry: typeof kuimenStageTelemetry = {
  brief: {
    code: "METRO SIGNAL",
    note: "NIGHT VIBRATION / INDEXED",
    tone: "stable",
    comm: ["23:04 / METRO VIBRATION RECORDED", "23:18 / MISSING AGENT FILE OPENED", "23:41 / ROUTE OVERLAY STARTED"],
    equipment: [
      { label: "MODEL", value: "BUILDING", state: "ok" },
      { label: "COMMS", value: "REMOTE", state: "ok" },
      { label: "MAP", value: "PARTIAL", state: "warn" },
      { label: "COVER", value: "CITY", state: "warn" }
    ]
  },
  command: {
    code: "LOCAL CHAIN",
    note: "INCOMPLETE COMMAND NODE",
    tone: "warning",
    comm: ["00:10 / CHU INVESTIGATION ACTIVE", "00:16 / NORMA DATA MATCH", "00:22 / SUPPORT CHANNEL LIMITED"],
    equipment: [
      { label: "TEAM", value: "SPLIT", state: "warn" },
      { label: "COMMS", value: "LIMITED", state: "warn" },
      { label: "MAP", value: "METRO", state: "ok" },
      { label: "EXIT", value: "UNKNOWN", state: "fail" }
    ]
  },
  team: {
    code: "CONTACT CHAIN",
    note: "FIELD PERSONNEL MIXED",
    tone: "warning",
    comm: ["00:31 / FIELD CONTACT EXPANDED", "00:36 / LU LINKED TO ROUTE", "00:44 / XIA MI FLAGGED"],
    equipment: [
      { label: "CHU", value: "ACTIVE", state: "ok" },
      { label: "LU", value: "EXPOSED", state: "warn" },
      { label: "FINGER", value: "REMOTE", state: "ok" },
      { label: "XIA", value: "LOCKED", state: "fail" }
    ]
  },
  site: {
    code: "NEST LAYER",
    note: "REAL / METRO / NEST",
    tone: "danger",
    comm: ["01:08 / HIDDEN STATION CONFIRMED", "01:17 / TRAIN INTERFACE ACTIVE", "01:36 / NEST DEPTH UNKNOWN"],
    equipment: [
      { label: "REAL", value: "DRIFT", state: "warn" },
      { label: "METRO", value: "OPEN", state: "ok" },
      { label: "NEST", value: "ACTIVE", state: "fail" },
      { label: "EXIT", value: "UNSTABLE", state: "fail" }
    ]
  },
  timeline: {
    code: "IDENTITY EXPOSED",
    note: "KING-03 CONTACT",
    tone: "danger",
    comm: ["01:48 / FENRIR NODE CONFIRMED", "02:03 / JORMUNGAND SIGNAL", "02:11 / FIELD STATUS BLACK"],
    equipment: [
      { label: "KING-03", value: "ACTIVE", state: "fail" },
      { label: "COMMS", value: "BLACK", state: "fail" },
      { label: "ROUTE", value: "BROKEN", state: "fail" },
      { label: "TEAM", value: "EXPOSED", state: "warn" }
    ]
  },
  casualty: {
    code: "LOSS RECORDED",
    note: "CASUALTY / AFTERMATH",
    tone: "danger",
    comm: ["02:20 / MISSING AGENT LINKED", "02:41 / XIA MI KIA", "03:10 / CHU RESIDUAL FLAGGED"],
    equipment: [
      { label: "AGENT", value: "MISSING", state: "fail" },
      { label: "XIA", value: "KIA", state: "fail" },
      { label: "CHU", value: "RESIDUAL", state: "warn" },
      { label: "FILE", value: "SEALED", state: "ok" }
    ]
  },
  evidence: {
    code: "DATA SEALED",
    note: "METRO / NOTEBOOK / VIDEO",
    tone: "warning",
    comm: ["03:22 / NOTEBOOK SEALED", "03:29 / VIBRATION MODEL SAVED", "03:34 / VIDEO FRAGMENT DAMAGED"],
    equipment: [
      { label: "CARD", value: "SEALED", state: "ok" },
      { label: "DATA", value: "BACKUP", state: "ok" },
      { label: "VIDEO", value: "DAMAGED", state: "warn" },
      { label: "MODEL", value: "LOCKED", state: "ok" }
    ]
  },
  assessment: {
    code: "CITY CASE",
    note: "TRAINING TEMPLATE",
    tone: "warning",
    comm: ["04:00 / CITY COVERAGE CONFIRMED", "04:12 / HUMAN IDENTITY WARNING", "04:30 / FILE MOVED TO KING-03"],
    equipment: [
      { label: "CASE", value: "SS", state: "ok" },
      { label: "THRONE", value: "KING-03", state: "fail" },
      { label: "COVER", value: "CITY", state: "warn" },
      { label: "DRILL", value: "REQUIRED", state: "ok" }
    ]
  }
};

const kuimenArchiveLayers: MissionArchiveLayer[] = [
  {
    id: "operation",
    code: "OPERATION",
    title: "水下行动层",
    mapFocus: "team",
    summary: "该层记录夔门计划作为执行部水下行动的基本结构：水面指挥、下潜组、活体权限、通讯线和氧气窗口同时运转。",
    points: [
      "摩尼亚赫号承担水面指挥、声呐、绞盘、生命体征与紧急火力。",
      "叶胜与酒德亚纪为下潜核心，钥匙被视为活体门禁而非普通随行人员。",
      "行动窗口由氧气、电力、通讯线、救生索共同限制，任一链路失效都应触发撤离判定。"
    ],
    directive: "后续水下任务必须将活体权限与撤离窗口拆开评估，禁止将进入成功等同于任务安全。"
  },
  {
    id: "city",
    code: "BRONZE",
    title: "青铜城接触层",
    mapFocus: "site",
    summary: "该层记录青铜城由遗迹目标升级为王座宫殿的证据。机关、甬道、龙文和门禁均属于同一套炼金系统。",
    points: [
      "墙壁、穹顶、齿轮和门禁具备联动反应，空间不应按静态遗迹处理。",
      "钥匙接触门禁后，青铜城从沉默结构转入响应状态，任务等级同步升高。",
      "宫殿内部结构与青铜与火之王的沉眠、复苏和物证载体存在直接关联。"
    ],
    directive: "青铜城相关地图必须标注为动态结构图，不得作为撤离路线保证。"
  },
  {
    id: "blackbox",
    code: "BLACK BOX",
    title: "通讯黑匣层",
    mapFocus: "timeline",
    summary: "该层保留救生索失效、通讯中断、氧气崩溃和水面追击的连续记录，是夔门计划最重要的训练样本。",
    points: [
      "失联不是单点事故，而是救生索、通讯、电力、路线和氧气窗口同步关闭。",
      "水下组最后阶段在撤离和物证回收之间被迫切换优先级。",
      "水面平台随后进入追击风险区，证明水下王座遗迹可向水面战场外溢。"
    ],
    directive: "训练模拟必须保留 ROUTE LOST、OXYGEN FAILURE、SURFACE PURSUIT 三个强制失败节点。"
  },
  {
    id: "evidence",
    code: "EVIDENCE",
    title: "物证封存层",
    mapFocus: "evidence",
    summary: "该层记录夔门计划的核心成果：黄铜罐、金属匣、七宗罪线索和青铜与火之王复苏链进入学院视野。",
    points: [
      "物证回收成功不代表战术胜利，只代表王座复苏链被确认。",
      "黄铜罐和后续金属匣应统一进入炼金封存柜，禁止按普通打捞物处理。",
      "七宗罪线索将夔门计划与后续处决行动相连，形成青铜与火之王完整作战链。"
    ],
    directive: "所有物证必须记录取得者、地点、状态、异常反应和关联王座五项索引。"
  }
];

const beijingArchiveLayers: MissionArchiveLayer[] = [
  {
    id: "space",
    code: "SPACE",
    title: "异常空间档案",
    mapFocus: "site",
    summary: "该层记录北京尼伯龙根的空间性质：现实城市、地铁交通层和地下巢穴互相覆盖，但坐标并不完全同步。",
    points: [
      "地铁线路是现实接口，隐藏站台是过渡阈值，巢穴层才是 KING-03 的核心空间。",
      "诺玛只能建立叠合模型，无法以普通城市地图复原完整路径。",
      "入口条件与列车、站台、夜间震动和血统接触有关，普通人员可能在无感状态下越界。"
    ],
    directive: "所有坐标必须标注 REAL / METRO / NEST 三态，禁止使用单一地理坐标发布救援指令。"
  },
  {
    id: "king",
    code: "KING-03",
    title: "龙王接触档案",
    mapFocus: "timeline",
    summary: "该层记录大地与山之王双生结构：耶梦加得负责伪装、诱导和接触链污染，芬里厄负责守巢与灾害输出。",
    points: [
      "夏弥的人类身份不得归入普通协同行动人员，应独立连接 KING-03 档案。",
      "芬里厄巢穴与地动异常直接关联，属于王座空间的物理核心。",
      "双生节点不能合并研判，伪装节点与守巢节点的威胁方式完全不同。"
    ],
    directive: "所有涉及夏弥、芬里厄、隐藏站台和地下巢穴的记录同步 KING-03 权限。"
  },
  {
    id: "blackbox",
    code: "BLACK BOX",
    title: "现场黑匣子",
    mapFocus: "evidence",
    summary: "该层保留地铁异常、失踪专员、通讯中断、身份暴露和影像残片的封存记录，用于复盘城市级王座接触。",
    points: [
      "震动数据与地铁线路重合是入口网络的第一证据。",
      "失踪专员笔记、地铁卡、影像残片和诺玛模型应作为同一证据链保存。",
      "身份暴露节点之后，普通异常调查立即升级为龙王处置，不再沿用城市事件权限。"
    ],
    directive: "黑匣子内容执行双备份：诺玛核心与执行部离线封存各保留一份。"
  },
  {
    id: "aftermath",
    code: "AFTERMATH",
    title: "后效评估档案",
    mapFocus: "assessment",
    summary: "该层记录北京事件的长期后效：城市地下空间筛查、人类身份伪装预警、执行人员精神残留和训练模板更新。",
    points: [
      "城市交通系统具备成为尼伯龙根外壳的风险，地下商区、隧道和废弃站点应纳入筛查。",
      "龙王以人类身份进入接触链，会污染任务判断、情报可信度和人员关系。",
      "楚子航相关残留记录不应作为私人经历处理，应并入执行部心理与记忆污染档案。"
    ],
    directive: "将该事件列为城市级异常训练模板，重点训练身份伪装识别与多层坐标救援。"
  }
];

const missionDeepDossiers: Record<
  "mission_japan_containment" | "mission_greenland_ice" | "mission_cassell_invasion" | "mission_bronze_second",
  MissionDeepDossier
> = {
  mission_japan_containment: {
    title: "日本收容链",
    subtitle: "MISSION-SS / 白王遗产 / 地区收容失控",
    color: "#d9c27a",
    mapVariant: "japan",
    mapTitle: "JAPAN / WHITE KING CONTAINMENT",
    coordinate: "TOKYO BAY / RED WELL / SEA ROUTE",
    sections: [
      {
        id: "brief",
        label: "任务简报",
        level: "OBJECTIVE",
        status: "白王遗产 / 日本分部 / 收容链",
        fileNo: "ED-JP-CONTAIN-BRIEF",
        classification: "执行部任务 / SS 级地区封存",
        summary: "日本收容链并非单一行动，而是围绕白王遗产、蛇岐八家、猛鬼众、圣骸和红井形成的长期封存任务。",
        report: ["任务目标为识别白王遗产在日本地区的实际承载物、组织链和复苏路径。", "地区势力具备独立武装、情报遮蔽和血统控制能力，学院资料在进入日本后需重新校验。"],
        related: ["白王遗产", "蛇岐八家", "猛鬼众", "圣骸", "红井"],
        risk: "地区组织可能将屠龙任务改写为内部权力工程，导致学院指令被延迟、篡改或利用。",
        directive: "所有白王遗产记录跳过普通地区权限，直接同步诺玛核心与校长室。"
      },
      {
        id: "command",
        label: "指挥链",
        level: "COMMAND",
        status: "学院本部 / 日本分部 / 本地势力",
        fileNo: "ED-JP-CONTAIN-COMMAND",
        classification: "指挥档案 / 多重权限",
        summary: "该任务的指挥链由学院本部、日本分部和本地家族系统共同构成，权限边界持续冲突。",
        report: ["本部指令需要穿透地区封锁，确认日本分部是否仍能作为可靠执行节点。", "蛇岐八家与猛鬼众均掌握现场资源，任何情报都必须标注来源和可能立场。"],
        related: ["学院本部", "日本分部", "源氏重工", "蛇岐八家", "猛鬼众"],
        risk: "指挥链复杂会使现场人员无法判断谁拥有最终授权。",
        directive: "建立三重指令记录：本部命令、地区回应、现场执行结果必须分栏保存。"
      },
      {
        id: "team",
        label: "行动人员",
        level: "FIELD TEAM",
        status: "本部专员 / 日本混血种 / 高危血裔",
        fileNo: "ED-JP-CONTAIN-TEAM",
        classification: "人员档案 / 血统污染",
        summary: "人员链包含本部专员、日本混血种、高危血裔和实验体，需按血统、组织身份和任务角色三轴记录。",
        report: ["源稚生、源稚女、上杉绘梨衣等个体不得只按地区人物归档，应与白王血裔风险互链。", "本部专员进入日本后同时承担侦察、外交、战斗和收容修正职责。"],
        related: ["源稚生", "源稚女", "上杉绘梨衣", "路明非", "恺撒"],
        risk: "高危血裔若被当作普通同盟或普通敌对目标处理，处置方案会立即失真。",
        directive: "人员档案必须标注血统稳定性、组织归属和白王遗产接触等级。"
      },
      {
        id: "site",
        label: "战场坐标",
        level: "BATTLESPACE",
        status: "东京 / 源氏重工 / 红井 / 海域",
        fileNo: "ED-JP-CONTAIN-SITE",
        classification: "战场档案 / 地区节点",
        summary: "日本收容链的战场不是单点地点，而是由城市、地下设施、红井和海域构成的复合战场。",
        report: ["源氏重工、红井和东京湾构成白王遗产由封存转向复苏的关键节点。", "城市层负责遮蔽，地下层负责实验和运输，海域层承担最终灾害外溢风险。"],
        related: ["东京", "源氏重工", "红井", "东京湾", "深海"],
        risk: "战场从城市转入海域后，保密、救援和火力控制难度同步升高。",
        directive: "所有坐标按 CITY / FACILITY / WELL / SEA 四层保存。"
      },
      {
        id: "evidence",
        label: "物证封存",
        level: "EVIDENCE",
        status: "圣骸 / 血样 / 实验记录",
        fileNo: "ED-JP-CONTAIN-EVIDENCE",
        classification: "物证档案 / 白王遗产",
        summary: "日本任务的核心物证是圣骸及其衍生记录，任何接触都可能成为复苏链的一部分。",
        report: ["圣骸不是普通遗骸，而是具备污染、寄生和复苏意义的王座遗留物。", "血样、实验日志、运输路线和红井记录必须并入同一证据柜。"],
        related: ["圣骸", "血样", "实验记录", "红井数据", "白王血裔"],
        risk: "研究行为本身可能推动复苏流程。",
        directive: "圣骸相关物证执行零接触封存，移动前必须获得三方确认。"
      },
      {
        id: "genji",
        label: "源氏重工",
        level: "FACILITY",
        status: "表层企业 / 地下设施 / 地区中枢",
        fileNo: "ED-JP-CONTAIN-GENJI",
        classification: "设施档案 / 地区权力节点",
        summary: "源氏重工是日本收容链的关键外壳：表面为企业设施，内部承担日本分部权力中枢、情报封锁和高危物证转运功能。",
        report: [
          "设施权限不能按普通企业或学院分部处理。其内部通道、实验空间、指挥层和封存层构成复合节点。",
          "源氏重工记录应与蛇岐八家、猛鬼众、圣骸运输和红井行动互链，任何单独读取都会低估地区系统性风险。"
        ],
        related: ["源氏重工", "日本分部", "蛇岐八家", "物证转运", "地区中枢"],
        risk: "设施一旦被地区组织封锁，本部专员会失去外部支援、地图权限和情报可信度。",
        directive: "源氏重工归入 FACILITY-S 级节点，所有门禁、地下层和运输记录永久封存。"
      },
      {
        id: "faction",
        label: "组织双线",
        level: "FACTION",
        status: "蛇岐八家 / 猛鬼众 / 权限冲突",
        fileNo: "ED-JP-CONTAIN-FACTION",
        classification: "组织档案 / 地区双线",
        summary: "蛇岐八家与猛鬼众不是普通敌我阵营，而是同一白王遗产生态下分裂出的两套组织逻辑。",
        report: [
          "蛇岐八家掌握秩序、资源和地区合法性，猛鬼众掌握阴影、实验残留和失控血统。",
          "两条组织线互相敌对，又共同遮蔽白王遗产真相。执行部必须把冲突本身视为收容链的一部分。"
        ],
        related: ["蛇岐八家", "猛鬼众", "源稚生", "源稚女", "地区权力"],
        risk: "若把组织冲突当成本地帮派战争处理，会遗漏王座遗产对双方的共同塑形。",
        directive: "地区组织档案采用双线并行格式，禁止只记录胜负关系。"
      },
      {
        id: "bloodline",
        label: "高危血裔",
        level: "HOST",
        status: "源稚生 / 源稚女 / 上杉绘梨衣",
        fileNo: "ED-JP-CONTAIN-BLOODLINE",
        classification: "人员档案 / 白王血裔",
        summary: "高危血裔是日本收容链最不稳定的活体节点，既可能成为战力，也可能成为圣骸复苏与地区失控的入口。",
        report: [
          "源稚生与源稚女记录必须同时读取：一方承担秩序与处决，一方承担阴影与失控，两者共同映射地区血统裂缝。",
          "上杉绘梨衣不得按普通保护对象归档。其血统风险、情感锚点和白王遗产价值均需独立标记。"
        ],
        related: ["源稚生", "源稚女", "上杉绘梨衣", "白王血裔", "情感锚点"],
        risk: "高危血裔一旦被组织目标、个人情感或圣骸流程绑定，处置代价会迅速超过任务预案。",
        directive: "所有高危血裔档案同步 PRIME-01，不允许降级为地区人物档案。"
      },
      {
        id: "redwell",
        label: "红井行动",
        level: "RED WELL",
        status: "圣骸 / 赫尔佐格 / 复苏链",
        fileNo: "ED-JP-CONTAIN-REDWELL",
        classification: "行动档案 / 复苏现场",
        summary: "红井是日本收容链从隐性封存转入公开失控的核心现场，圣骸、赫尔佐格和白王复苏链在此收束。",
        report: [
          "红井行动必须同时记录设施结构、圣骸位置、人员进入顺序、武装冲突和复苏迹象。",
          "赫尔佐格相关记录不按普通人类阴谋处理。其行为证明人类研究者可以主动改写王座遗产的释放路径。"
        ],
        related: ["红井", "圣骸", "赫尔佐格", "白王复苏", "最终收容"],
        risk: "红井一旦进入复苏阶段，现场处置目标会从夺回物证变为阻断王座重生。",
        directive: "红井相关坐标、影像、血样和人员记录一律归入 PRIME-01 红色封存柜。"
      },
      {
        id: "sea",
        label: "海域作战",
        level: "SEA ZONE",
        status: "东京湾 / 外溢风险 / 最终封锁",
        fileNo: "ED-JP-CONTAIN-SEA",
        classification: "战场档案 / 海域外溢",
        summary: "日本收容链最终风险会向海域扩散，东京湾与深海通道承担灾害外溢、追击和最终封锁压力。",
        report: [
          "海域战场会放大保密难度。城市、舰船、航空火力和龙类目标同时进入公开视野边缘。",
          "一旦白王遗产脱离地区设施进入海域，学院必须从收容任务切换为灾害级阻断。"
        ],
        related: ["东京湾", "深海", "外溢风险", "海域封锁", "灾害阻断"],
        risk: "海域外溢意味着白王遗产不再受城市设施约束，后续损失无法由地区势力独立承担。",
        directive: "日本线所有海域记录按灾害预案归档，连接海洋监控与执行部远程火力。"
      },
      {
        id: "assessment",
        label: "诺玛复盘",
        level: "ASSESSMENT",
        status: "地区失控 / 王座遗留 / 收容修正",
        fileNo: "NORMA-JP-CONTAIN-ASSESS",
        classification: "诺玛复盘 / 收容结论",
        summary: "诺玛判定日本收容链为白王遗产现代化失控案例，证明地区组织可长期隐藏王座级风险。",
        report: ["复盘重点不在单场战斗，而在组织遮蔽、血统继承、物证利用和地区权力结构。", "后续所有地区分部若掌握王座遗产，必须接受本部直接审计。"],
        related: ["地区审计", "白王遗产", "收容修正", "本部权限", "诺玛复盘"],
        risk: "若地区分部成为王座遗产的保护壳，学院情报系统会被反向污染。",
        directive: "将日本收容链列为地区分部最高级审计模板。"
      }
    ],
    layers: [
      { id: "legacy", code: "LEGACY", title: "白王遗产层", mapFocus: "evidence", summary: "记录圣骸、血统、实验与白王复苏链的连接方式。", points: ["圣骸是核心物证。", "白王血裔是活体风险。", "实验记录是复苏流程图。"], directive: "白王遗产不得由地区分部单独处理。" },
      { id: "faction", code: "FACTION", title: "地区组织层", mapFocus: "command", summary: "记录蛇岐八家、猛鬼众和日本分部的权限冲突。", points: ["组织身份会遮蔽任务身份。", "地区命令可能与本部命令冲突。", "情报来源必须独立标注。"], directive: "所有地区情报进入诺玛前必须执行来源评级。" },
      { id: "well", code: "RED WELL", title: "红井封存层", mapFocus: "site", summary: "记录红井作为白王遗产复苏现场的设施、运输和最终处置风险。", points: ["红井不是普通设施。", "地下结构具备封存与孵化双重意义。", "海域外溢会扩大灾害面。"], directive: "红井坐标按禁区处理，禁止开放给普通执行部训练。" },
      { id: "after", code: "AFTERMATH", title: "后效评估层", mapFocus: "assessment", summary: "记录日本任务对学院地区制度和白王档案的长期影响。", points: ["地区分部需重新审计。", "白王档案需独立于黑王体系。", "高危血裔需要长期监控。"], directive: "将日本线并入 PRIME-01 常设预警。" }
    ]
  },
  mission_greenland_ice: {
    title: "格陵兰冰海记录",
    subtitle: "MISSION-A / 历史事故 / 冰海封存",
    color: "#8ee7ff",
    mapVariant: "greenland",
    mapTitle: "GREENLAND / ICE SEA ARCHIVE",
    coordinate: "POLAR GRID / SUBSEA WRECK / SEALED",
    sections: [
      { id: "brief", label: "任务简报", level: "OBJECTIVE", status: "冰海失联 / 历史事故", fileNo: "ED-GL-ICE-BRIEF", classification: "执行部任务 / 历史封存", summary: "格陵兰冰海记录保存一次早期失控行动的残留信息，是执行部纪律和深海禁令的重要来源。", report: ["任务进入极地冰海后遭遇超出预案的龙类异常，通讯、定位和回收链先后失效。", "该记录因人员失联、装备残留和污染风险长期封存。"], related: ["格陵兰", "冰海", "失联", "潜水服", "历史事故"], risk: "极地环境会放大通讯失效和救援延迟，任何异常都可能成为不可逆事故。", directive: "历史事故不得简化为背景资料，必须作为行动纪律来源保存。" },
      { id: "prelude", label: "事故前置", level: "PRELUDE", status: "极地目标 / 任务升级 / 链路不足", fileNo: "ED-GL-ICE-PRELUDE", classification: "前置档案 / 行动来源", summary: "事故前置档案记录格陵兰任务从异常侦察升级为深海接触的过程。该阶段的关键问题不是勇气不足，而是任务等级增长快于支援配置。", report: ["前置情报指向极地水域异常，任务被授权进入冰海搜索与确认阶段。", "环境评估、通讯冗余和回收方案未能覆盖后续失联规模，导致行动一旦深入便难以主动终止。"], related: ["极地目标", "行动升级", "环境评估", "通讯冗余"], risk: "前置评估低估目标等级，会让后续所有撤离判断失去基础。", directive: "任何极地异常若出现龙类接触迹象，应立即从侦察任务升级为王座级预警候选。" },
      { id: "command", label: "指挥链", level: "COMMAND", status: "远程指挥 / 回收失败", fileNo: "ED-GL-ICE-COMMAND", classification: "指挥档案 / 极地链路", summary: "冰海任务暴露远程指挥在极端环境中的薄弱环节。", report: ["现场平台与本部之间链路不稳定，定位回传无法持续。", "回收窗口被天气、冰层和水下异常同时压缩。"], related: ["远程指挥", "回收窗口", "极地通讯", "诺玛记录"], risk: "远程指挥若缺少现场冗余，会在失联后无法重建任务态势。", directive: "极地任务必须配置独立黑匣和返航判据。" },
      { id: "team", label: "行动人员", level: "FIELD TEAM", status: "失联人员 / 禁止公开", fileNo: "ED-GL-ICE-TEAM", classification: "人员档案 / 限制访问", summary: "人员记录只保留行动角色、失联节点和封存等级，不开放普通身份细节。", report: ["失联人员不得进入普通伤亡表，需与装备残留和污染评估绑定。", "幸存或残留信息均按历史封存权限处理。"], related: ["失联人员", "执行部", "潜水组", "封存名单"], risk: "错误公开会影响学院内部纪律和历史事故审计。", directive: "人员详情维持限制访问，只向执行部审计开放。" },
      { id: "site", label: "战场坐标", level: "BATTLESPACE", status: "冰层 / 深海 / 残骸区", fileNo: "ED-GL-ICE-SITE", classification: "战场档案 / 极地水域", summary: "战场由冰面平台、冰下水域、残骸区和未知异常源构成。", report: ["冰层阻断常规救援，深海压力限制搜索时长。", "残骸区可能保留装备、血样或龙类接触痕迹。"], related: ["冰层", "深海", "残骸区", "异常源"], risk: "坐标漂移会导致回收队重复进入危险区。", directive: "极地坐标按 ICE / SEA / WRECK 三层保存。" },
      { id: "lastsignal", label: "最后信号", level: "BLACK BOX", status: "通讯中断 / 定位漂移 / 回传残缺", fileNo: "ED-GL-ICE-LASTSIGNAL", classification: "黑匣档案 / 最后回传", summary: "最后信号档案保存失联前的残缺通讯、定位漂移和生命体征异常，是判断事故性质的核心记录。", report: ["黑匣记录显示通讯并非瞬间消失，而是经历噪声升高、坐标漂移、回传中断和生命体征失真。", "最后回传不能还原完整战斗，但足以证明现场异常具有主动干扰性质。"], related: ["最后信号", "通讯噪声", "定位漂移", "生命体征", "黑匣"],
        risk: "残缺信号若被过度解读，会造成错误追责；若被忽略，则会丢失后续禁令依据。",
        directive: "黑匣音频、坐标和生命体征三类记录必须并排展示，不得抽离单独引用。" },
      { id: "evidence", label: "物证封存", level: "EVIDENCE", status: "潜水服 / 黑匣 / 残留物", fileNo: "ED-GL-ICE-EVIDENCE", classification: "物证档案 / 冰海残留", summary: "物证以潜水服、黑匣数据和水下残留为主，证明事故并非普通灾害。", report: ["潜水服残留记录是事故复盘的核心入口。", "黑匣数据不完整，但足以支撑执行部禁令。"], related: ["潜水服", "黑匣", "残留物", "极地样本"], risk: "物证可能携带精神污染或龙类接触残留。", directive: "冰海物证禁止教学展示，只可用于封闭复盘。" },
      { id: "aftereffect", label: "后效记录", level: "AFTERMATH", status: "幸存者阴影 / 纪律来源 / 长期封存", fileNo: "ED-GL-ICE-AFTERMATH", classification: "后效档案 / 心理与纪律",
        summary: "格陵兰冰海记录的后效不止于伤亡。它改变了执行部对极地、水下和失联任务的基本纪律，也在幸存者档案中留下长期阴影。",
        report: ["事故后效表现为纪律收紧、行动审计加强、深海任务权限上调和相关人员心理档案长期冻结。", "凡涉及该记录的二次引用，必须避免把事故浪漫化或英雄化；诺玛只保留可用于防止重复失联的结构性结论。"],
        related: ["幸存者档案", "心理后效", "深海禁令", "行动审计"],
        risk: "若只将该事故作为悲剧叙事保存，后续执行部仍会重复同样的链路错误。",
        directive: "后效档案与训练禁令绑定，所有 A 级以上水域任务必须调阅。" },
      { id: "assessment", label: "诺玛复盘", level: "ASSESSMENT", status: "纪律来源 / 禁令样本", fileNo: "NORMA-GL-ICE-ASSESS", classification: "诺玛复盘 / 事故结论", summary: "诺玛判定该记录为执行部极地、水下和失联任务的纪律样本。", report: ["任务失败点集中于环境低估、链路不足和撤离窗口误判。", "后续行动必须优先保证回收链，而非持续深入未知区域。"], related: ["纪律禁令", "极地行动", "失联复盘", "诺玛结论"], risk: "若训练中忽视历史事故，类似失联会重复发生。", directive: "将格陵兰冰海记录列入 A 级以上水域行动必读档案。" }
    ],
    layers: [
      { id: "ice", code: "ICE", title: "极地环境层", mapFocus: "site", summary: "记录冰面、冰下和深海环境对任务链路的压迫。", points: ["冰层限制回收。", "低温压缩行动窗口。", "深海坐标难以稳定。"], directive: "极地任务需设定硬撤离时间。" },
      { id: "loss", code: "LOSS", title: "失联记录层", mapFocus: "team", summary: "记录失联人员、信号终止和最后回传节点。", points: ["人员记录与黑匣绑定。", "失联不是普通伤亡。", "身份细节限制公开。"], directive: "失联记录不得被普通化处理。" },
      { id: "locker", code: "LOCKER", title: "潜水服封存层", mapFocus: "evidence", summary: "记录潜水服、残留物和事故物证的封存状态。", points: ["潜水服是核心残留。", "污染评估优先于展示。", "黑匣数据保持原始备份。"], directive: "物证仅限封闭复盘。" },
      { id: "ban", code: "BAN", title: "纪律禁令层", mapFocus: "assessment", summary: "记录该事故转化为执行部任务纪律的过程。", points: ["撤离窗口必须硬化。", "远程链路必须冗余。", "未知区域禁止孤线深入。"], directive: "极地禁令作为强制训练条目。" }
    ]
  },
  mission_cassell_invasion: {
    title: "卡塞尔学院入侵事件",
    subtitle: "MISSION-S / 校内战情 / 中央控制室警报",
    color: "#ff7e60",
    mapVariant: "cassell",
    mapTitle: "CASSELL / CAMPUS DEFENSE GRID",
    coordinate: "LIBRARY / CONTROL ROOM / ICE CELLAR",
    sections: [
      { id: "brief", label: "任务简报", level: "OBJECTIVE", status: "校内入侵 / 战情启动", fileNo: "ED-CSL-INV-BRIEF", classification: "执行部任务 / 校内战情", summary: "该事件记录卡塞尔学院内部遭遇武装或异常入侵时的防御流程。", report: ["警报由校内安保系统触发，中央控制室进入战情模式。", "任务目标从识别入侵者升级为保护核心设施、学生和封存物。"], related: ["卡塞尔学院", "中央控制室", "冰窖", "学生会", "狮心会"], risk: "校内战场会使学生、教授、封存物和入侵目标混杂。", directive: "校内战情必须优先隔离冰窖和中央控制室。" },
      { id: "command", label: "指挥链", level: "COMMAND", status: "诺玛 / 教授团 / 学生组织", fileNo: "ED-CSL-INV-COMMAND", classification: "指挥档案 / 校内防御", summary: "指挥链由诺玛、教授团、执行部留守力量和学生组织共同组成。", report: ["诺玛负责警报、门禁、监控和广播。", "学生会与狮心会可作为临时防御力量，但需避免越权进入封存区。"], related: ["诺玛", "教授团", "学生会", "狮心会"], risk: "多组织同时响应会造成路线冲突和火力误判。", directive: "校内战情启动后，所有行动组按区域权限接收路线。" },
      { id: "control", label: "中央控制室", level: "CONTROL",
        status: "诺玛核心 / 监控汇聚 / 广播权限",
        fileNo: "ED-CSL-INV-CONTROL",
        classification: "设施档案 / 指挥核心",
        summary: "中央控制室是校内战情的神经中枢。警报、门禁、监控、广播、教授团命令和学生组织动员均需在此汇聚。",
        report: ["诺玛在该节点完成校园态势整合：确认入侵区域、封锁高危通道、推送避难路线，并为战斗组分配权限。", "控制室失守等同于学院本部失去感知能力，因此防御优先级高于普通教学区。"],
        related: ["中央控制室", "诺玛", "门禁系统", "校园广播", "教授团"],
        risk: "若控制室被入侵者夺取，敌方可反向利用门禁和广播制造大规模混乱。",
        directive: "中央控制室列为 COMMAND-CORE，校内警报启动后自动进入双人授权。"
      },
      { id: "team", label: "行动人员", level: "FIELD TEAM", status: "学生战斗组 / 教授支援", fileNo: "ED-CSL-INV-TEAM", classification: "人员档案 / 校内动员", summary: "该任务的行动人员同时具备学生身份和战斗身份，需在档案中拆分记录。", report: ["恺撒、楚子航等高阶学生可进入临时战斗链。", "普通学生必须被导入避难路线，不得参与核心区防御。"], related: ["恺撒", "楚子航", "学生会", "狮心会", "教授团"], risk: "学生战斗力可用，但心理、权限和纪律风险高。", directive: "校内动员必须标注临时授权范围。" },
      { id: "site", label: "战场坐标", level: "BATTLESPACE", status: "校园 / 图书馆 / 中央控制室 / 冰窖", fileNo: "ED-CSL-INV-SITE", classification: "战场档案 / 校园防御图", summary: "战场由校园开放区、教学建筑、图书馆、中央控制室和冰窖构成。", report: ["图书馆与中央控制室是信息核心，冰窖是高危封存核心。", "入侵路线必须与门禁日志、监控盲区和学生避难路线叠合。"], related: ["图书馆", "中央控制室", "冰窖", "门禁", "监控"], risk: "入侵者若进入冰窖，事件等级会立即上调。", directive: "校园图必须标注 PUBLIC / COMMAND / SEALED 三层。" },
      { id: "route", label: "入侵路线", level: "ROUTE",
        status: "外围 / 教学区 / 图书馆 / 封存区",
        fileNo: "ED-CSL-INV-ROUTE",
        classification: "路线档案 / 校园动线",
        summary: "入侵路线档案用于复原敌方从外围进入核心区的移动路径，并与门禁日志、监控盲区和学生避难路线叠合。",
        report: ["路线复原不只追踪敌方，也追踪学院自身响应：哪些门禁延迟关闭，哪些楼层形成拥堵，哪些战斗组改变了入侵方向。", "图书馆、中央控制室和冰窖之间的通道必须作为一组核心线读取。"],
        related: ["入侵路线", "监控盲区", "门禁日志", "避难路线", "核心通道"],
        risk: "如果路线复盘只记录敌方位置，会遗漏学院内部防御系统的失效节点。",
        directive: "路线图必须同时显示 ENEMY / CIVILIAN / RESPONSE 三条线。"
      },
      { id: "icecellar", label: "冰窖封锁", level: "SEALED",
        status: "封存物 / 高危入口 / 权限上锁",
        fileNo: "ED-CSL-INV-ICECELLAR",
        classification: "设施档案 / 高危封存区",
        summary: "冰窖是学院本部最不允许失守的区域。校内入侵一旦接近冰窖，任务性质从校园防御升级为封存物保卫。",
        report: ["冰窖内物证、炼金物、危险档案和异常样本均可能成为入侵目标。", "任何移动封存物的建议都必须被视为二次风险，除非中央控制室确认防线已完全失效。"],
        related: ["冰窖", "封存物", "炼金物", "权限上锁", "高危样本"],
        risk: "封存物一旦脱离冰窖，学院会同时面对入侵事件和物证污染事件。",
        directive: "冰窖封锁优先级高于追击入侵者，解除封锁需校长室与诺玛双授权。"
      },
      { id: "evidence", label: "物证封存", level: "EVIDENCE", status: "监控 / 弹痕 / 门禁日志", fileNo: "ED-CSL-INV-EVIDENCE", classification: "物证档案 / 校内战情", summary: "物证以门禁日志、监控残片、弹痕轨迹、警报记录和广播数据为主。", report: ["门禁日志可还原入侵路线。", "监控残片用于确认盲区与响应延迟。"], related: ["门禁日志", "监控残片", "弹痕", "警报记录"], risk: "校内物证可能暴露学院位置与防御结构。", directive: "所有校内战情物证执行内部封存，禁止外部复写。" },
      { id: "damage", label: "损毁记录", level: "DAMAGE",
        status: "建筑 / 门禁 / 监控 / 伤亡",
        fileNo: "ED-CSL-INV-DAMAGE",
        classification: "损毁档案 / 校内后效",
        summary: "损毁记录将建筑受损、门禁故障、监控丢帧、学生伤情和封存区状态统一保存。",
        report: ["损毁不是单纯财产表，而是判断防御体系薄弱环节的依据。", "若某一区域反复出现监控丢帧、门禁延迟或疏散堵塞，应在下一轮校园防御演习中强制重演。"],
        related: ["建筑损毁", "门禁故障", "监控丢帧", "学生伤情", "演习模板"],
        risk: "忽略轻微损毁会使同一路线在下一次入侵中被重复利用。",
        directive: "损毁记录进入设施维护与执行部训练双系统，不得只归档给后勤。"
      },
      { id: "assessment", label: "诺玛复盘", level: "ASSESSMENT", status: "防御漏洞 / 学生动员 / 权限修正", fileNo: "NORMA-CSL-INV-ASSESS", classification: "诺玛复盘 / 校园防御", summary: "诺玛判定该事件为学院防御体系压力测试样本。", report: ["复盘重点包括门禁延迟、监控盲区、学生动员效率和封存区隔离。", "后续校园警报应自动区分普通入侵、龙类异常和封存区接触。"], related: ["防御漏洞", "权限修正", "学生动员", "校园警报"], risk: "学院本部被突破会造成象征性和实际性双重损失。", directive: "将校内入侵事件列为学院防御演习模板。" }
    ],
    layers: [
      { id: "campus", code: "CAMPUS", title: "校园防御层", mapFocus: "site", summary: "记录校园开放区、图书馆、控制室和冰窖的分层防御。", points: ["开放区负责疏散。", "控制室负责指挥。", "冰窖必须隔离。"], directive: "校内战场按权限层封锁。" },
      { id: "alarm", code: "ALARM", title: "诺玛警报层", mapFocus: "command", summary: "记录警报、广播、门禁和监控系统的联动。", points: ["警报需自动分级。", "门禁日志保留原始时间戳。", "广播不得暴露封存区。"], directive: "警报链路进入中央控制室复盘。" },
      { id: "student", code: "TEAM", title: "学生动员层", mapFocus: "team", summary: "记录学生组织进入战情链的权限和风险。", points: ["高阶学生可临时授权。", "普通学生进入避难路线。", "战斗身份与学生身份分开记录。"], directive: "临时授权不得延伸至封存区。" },
      { id: "sealed", code: "SEALED", title: "冰窖隔离层", mapFocus: "evidence", summary: "记录冰窖、封存物和入侵路线之间的防护关系。", points: ["冰窖是最高危节点。", "封存物不得移动。", "入侵接近即升级。"], directive: "冰窖封锁优先级高于普通追击。" }
    ]
  },
  mission_bronze_second: {
    title: "青铜计划 / 二次作战",
    subtitle: "MISSION-SS / 摩尼亚赫号 / 风暴鱼雷处置",
    color: "#e2bd64",
    mapVariant: "bronzeSecond",
    mapTitle: "BRONZE PLAN / SECOND STRIKE",
    coordinate: "RIVER SURFACE / TARGET LURE / TORPEDO WINDOW",
    sections: [
      { id: "brief", label: "任务简报", level: "OBJECTIVE", status: "二次进入 / 龙王处决", fileNo: "ED-BRZ-SECOND-BRIEF", classification: "执行部任务 / SS 级处决行动", summary: "青铜计划是夔门计划之后的二次作战，目标从确认青铜城升级为诱导并处决青铜与火之王。", report: ["行动以摩尼亚赫号为水面平台，利用诱导、定位和重武器完成单发窗口处置。", "任务必须在龙王完全恢复前完成，否则水面平台无法承受反击。"], related: ["青铜计划", "摩尼亚赫号", "风暴鱼雷", "诺顿", "七宗罪"], risk: "二次作战成败取决于单一窗口，任何延迟都会使处决失败。", directive: "青铜计划记录必须与夔门计划和 KING-01 档案互链。" },
      { id: "kuimenAfter", label: "夔门后续", level: "FOLLOW-UP",
        status: "物证确认 / 王座复苏 / 二次授权",
        fileNo: "ED-BRZ-SECOND-FOLLOWUP",
        classification: "前置档案 / 夔门后续",
        summary: "青铜计划不是独立任务，而是夔门计划伤亡、物证回收和 KING-01 复苏迹象共同逼出的二次作战。",
        report: ["夔门计划确认青铜城与王座复苏链后，执行部已不能继续停留在侦察层面。", "黄铜罐、金属匣、七宗罪线索和诺顿复苏风险共同构成二次授权依据。"],
        related: ["夔门计划", "黄铜罐", "金属匣", "王座复苏", "二次授权"],
        risk: "若二次作战延迟，诺顿可能脱离脆弱复苏阶段，进入常规武器无法处理的完全状态。",
        directive: "青铜计划所有条目必须回链夔门计划，不得作为孤立处决行动展示。"
      },
      { id: "command", label: "指挥链", level: "COMMAND", status: "摩尼亚赫号 / 装备部 / 学生行动组", fileNo: "ED-BRZ-SECOND-COMMAND", classification: "指挥档案 / 水面处决", summary: "指挥链围绕摩尼亚赫号、装备部武器、学生行动组和诺玛火控记录展开。", report: ["现场指挥需同时处理船体损伤、目标诱导、鱼雷授权和人员撤离。", "装备部方案具备高破坏力，也具备高不确定性。"], related: ["曼施坦因", "摩尼亚赫号", "装备部", "诺玛火控"], risk: "指挥延迟会导致鱼雷窗口错失或误击友方。", directive: "所有火控命令保留双确认记录。" },
      { id: "team", label: "行动人员", level: "FIELD TEAM", status: "恺撒 / 零 / 诺诺 / 路明非", fileNo: "ED-BRZ-SECOND-TEAM", classification: "人员档案 / 二次行动组", summary: "行动人员承担诱导、接触、火控协助和应急判断，风险高于普通学生任务。", report: ["恺撒、零、诺诺、路明非等节点分别进入侦测、执行和异常触发链。", "路明非相关记录需单独标注，因为其异常权限可能影响最终处置窗口。"], related: ["恺撒", "零", "诺诺", "路明非", "学生行动组"], risk: "学生行动组靠近王座目标时，战斗风险与权限风险同步升高。", directive: "行动人员记录必须连接身份档案与青铜与火之王档案。" },
      { id: "lure", label: "诱导计划", level: "LURE",
        status: "目标逼近 / 火控窗口 / 撤离线",
        fileNo: "ED-BRZ-SECOND-LURE",
        classification: "战术档案 / 诱导方案",
        summary: "诱导计划的目标不是击退诺顿，而是把王座目标逼入风暴鱼雷能够命中的短暂窗口。",
        report: ["诱导组需要在王座目标、摩尼亚赫号和鱼雷航线之间制造可计算距离。", "该方案本质上以人员暴露换取火控确定性，因此所有参与节点都必须绑定撤离线。"],
        related: ["目标诱导", "火控窗口", "撤离线", "摩尼亚赫号", "诺顿"],
        risk: "诱导距离过近会导致船体和人员被同时卷入处决范围；距离过远则鱼雷窗口失效。",
        directive: "诱导计划必须与 TORPEDO WINDOW 同步显示，不允许单独批准。"
      },
      { id: "site", label: "战场坐标", level: "BATTLESPACE", status: "水面平台 / 龙王目标 / 鱼雷航道", fileNo: "ED-BRZ-SECOND-SITE", classification: "战场档案 / 水面打击图", summary: "战场由摩尼亚赫号、龙王目标、鱼雷航道、风暴区和撤离线构成。", report: ["目标需被诱导至鱼雷可命中区域。", "风暴、水流和船体损伤都会改变打击窗口。"], related: ["水面平台", "鱼雷航道", "风暴区", "目标诱导"], risk: "战场条件不稳定会造成鱼雷偏离或船体失控。", directive: "战场图必须显示 TARGET / TORPEDO / EVAC 三线。" },
      { id: "torpedo", label: "风暴鱼雷", level: "TORPEDO",
        status: "装备部 / 单发窗口 / 高破坏力",
        fileNo: "ED-BRZ-SECOND-TORPEDO",
        classification: "武器档案 / 火控处置",
        summary: "风暴鱼雷是青铜计划的关键火力节点。它不是普通舰载武器，而是为王座目标争取的单发处决工具。",
        report: ["鱼雷发射必须满足目标位置、友方撤离、船体姿态、风暴干扰和火控授权五项条件。", "装备部方案允许极高破坏力，但不允许重复试错；一次失误足以让整场二次作战失去意义。"],
        related: ["风暴鱼雷", "装备部", "火控授权", "单发窗口", "船体姿态"],
        risk: "鱼雷若偏离目标，既可能误伤友方，也可能促使龙王脱离脆弱阶段。",
        directive: "风暴鱼雷记录需保存发射前后完整火控数据，进入装备部与执行部双封存。"
      },
      { id: "evidence", label: "物证封存", level: "EVIDENCE", status: "七宗罪 / 龙王残留 / 火控记录", fileNo: "ED-BRZ-SECOND-EVIDENCE", classification: "物证档案 / 处决证据", summary: "物证用于证明青铜与火之王处决窗口、武器效果和后续封存状态。", report: ["七宗罪与鱼雷处置记录共同构成王座级武器链。", "龙王残留、火控数据和船体损伤记录必须同步保存。"], related: ["七宗罪", "火控记录", "龙王残留", "船体损伤"], risk: "处决证据若不完整，会影响后续判断王座是否真正终止。", directive: "处决证据进入 KING-01 封存柜。" },
      { id: "sevensins", label: "七宗罪链路", level: "ARSENAL",
        status: "炼金武器 / 诺顿遗产 / 处决钥匙",
        fileNo: "ED-BRZ-SECOND-SEVENSINS",
        classification: "炼金档案 / 武器链路",
        summary: "七宗罪是青铜与火之王档案中最危险的炼金物证之一，也是青铜计划与王座处决逻辑相连的武器链路。",
        report: ["七宗罪不能只作为武器展示。它的铸造者、命名、适配目标和处决用途均指向 KING-01 的炼金权柄。", "青铜计划中所有涉及七宗罪的调动、授权和接触记录，都必须同步炼金资料库。"],
        related: ["七宗罪", "炼金术", "青铜与火之王", "诺顿", "武器授权"],
        risk: "炼金武器具备强象征和强实战价值，错误使用可能反向激活王座遗留机制。",
        directive: "七宗罪链路与 KING-01、炼金资料库、执行部武器库三方互锁。"
      },
      { id: "lumingfei", label: "异常节点",
        level: "ANOMALY",
        status: "路明非 / 权限异常 / 结果扰动",
        fileNo: "ED-BRZ-SECOND-LUMINGFEI",
        classification: "人员档案 / 异常权限",
        summary: "路明非在青铜计划中不能只按学生行动人员记录。其异常权限、临场选择和结果扰动能力需要独立标注。",
        report: ["该节点的价值不在常规战斗力，而在危机临界点对任务结果的异常改变。", "凡涉及路明非的行动报告，必须同时连接身份档案、诺玛权限记录和后续精神评估。"],
        related: ["路明非", "S 级权限", "异常节点", "结果扰动", "身份档案"],
        risk: "若忽略该节点，复盘会把异常结果误判为常规战术成功。",
        directive: "路明非相关记录按 ANOMALY-S 标记，禁止合并进普通学生行动组。"
      },
      { id: "assessment", label: "诺玛复盘", level: "ASSESSMENT", status: "单发窗口 / 二次作战模板", fileNo: "NORMA-BRZ-SECOND-ASSESS", classification: "诺玛复盘 / 王座处决", summary: "诺玛判定青铜计划为王座级二次作战模板，核心是诱导、锁定、单发处决和证据确认。", report: ["复盘重点包括诱导是否可靠、火控是否可复制、人员是否过度暴露。", "后续王座处决行动不得只依赖单一武器，必须准备失败后预案。"], related: ["二次作战", "王座处决", "火控模板", "失败预案"], risk: "单发成功会掩盖预案不足，单发失败则可能导致全队覆灭。", directive: "将青铜计划列为王座处决行动模板，同时补充备份火力要求。" }
    ],
    layers: [
      { id: "lure", code: "LURE", title: "目标诱导层", mapFocus: "team", summary: "记录如何迫使龙王进入可处决窗口。", points: ["诱导目标靠近水面平台。", "人员暴露度必须受控。", "异常权限需单独记录。"], directive: "诱导行动不得脱离撤离线。" },
      { id: "torpedo", code: "TORPEDO", title: "风暴鱼雷层", mapFocus: "site", summary: "记录鱼雷航道、火控窗口和命中判定。", points: ["鱼雷窗口极短。", "火控命令需双确认。", "水流与风暴会改变航道。"], directive: "鱼雷发射前必须锁定友方位置。" },
      { id: "weapon", code: "ARSENAL", title: "炼金武器层", mapFocus: "evidence", summary: "记录七宗罪、火控数据和龙王处决证据。", points: ["七宗罪连接 KING-01。", "处决证据必须完整。", "船体损伤同步封存。"], directive: "炼金武器记录同步炼金资料库。" },
      { id: "review", code: "REVIEW", title: "二次作战复盘层", mapFocus: "assessment", summary: "记录青铜计划作为王座级二次作战模板的复盘结论。", points: ["单发窗口不可过度依赖。", "失败预案必须前置。", "王座终止需证据闭环。"], directive: "所有王座处决任务必须包含备份方案。" }
    ]
  }
};

function getLoreModule(loreId: LoreModuleId) {
  return lore.modules.find((module) => module.id === loreId);
}

function getModuleEvidence(loreId: LoreModuleId) {
  const module = getLoreModule(loreId);
  const selectedIds = new Set(module?.top_evidence_ids ?? []);
  const preferred = lore.evidence.filter((item) => selectedIds.has(item.id));
  const fallback = lore.evidence
    .filter((item) => item.module_id === loreId)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
  return (preferred.length ? preferred : fallback).slice(0, 5);
}

function createGlowTexture(size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const center = size / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.22, "rgba(255,232,172,0.72)");
  gradient.addColorStop(0.64, "rgba(88,168,148,0.16)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

const baseWorldFeatureCollection = feature(
  worldAtlas as any,
  (worldAtlas as any).objects.countries
) as unknown as FeatureCollection;

const normaChinaRegionNames = new Set(["China", "Taiwan", "Hong Kong", "Macau", "Macao"]);

function toMultiPolygonCoordinates(geometry: any) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return [geometry.coordinates];
  if (geometry.type === "MultiPolygon") return geometry.coordinates;
  return [];
}

function mergeChinaRegionFeatures(collection: FeatureCollection): FeatureCollection {
  const features = collection.features as any[];
  const china = features.find((item) => item.properties?.name === "China");
  if (!china) return collection;

  const mergedChinaCoordinates = features
    .filter((item) => normaChinaRegionNames.has(item.properties?.name))
    .flatMap((item) => toMultiPolygonCoordinates(item.geometry));

  return {
    ...collection,
    features: [
      ...features.filter((item) => !normaChinaRegionNames.has(item.properties?.name)),
      {
        ...china,
        geometry: {
          type: "MultiPolygon",
          coordinates: mergedChinaCoordinates
        }
      }
    ]
  } as FeatureCollection;
}

const normaWorldFeatureCollection = mergeChinaRegionFeatures(baseWorldFeatureCollection);

const globeStreamDemoFlyLines = [
  { from: { id: "1", lon: -23.0075, lat: 50.4296 }, to: { id: "2", lon: 26.1223, lat: -7.8756 } },
  {
    from: { lon: 142.8123, lat: -58.9813, style: { color: "yellow" } },
    to: { lon: 157.0064, lat: 10.7816, style: { color: "yellow" } },
    style: { pathStyle: { color: "yellow" }, flyLineStyle: { color: "yellow" } }
  },
  { from: { lon: -175.6286, lat: 72.8359 }, to: { lon: -39.071, lat: -35.438 } },
  { from: { lon: 178.7439, lat: 25.8303 }, to: { lon: 137.19, lat: 17.118 } },
  { from: { lon: -162.6725, lat: 37.277 }, to: { lon: -37.1681, lat: 38.5162 } },
  { from: { lon: -7.5945, lat: 37.2754 }, to: { lon: 41.4114, lat: 41.5946 } }
];

const globeStreamDemoPoints = [{ lon: -43.0075, lat: -40.4296, style: { color: "yellow" } }];

const globeStreamDemoRoads = [
  {
    id: "7-6",
    path: [
      { lon: -23.0075, lat: 50.4296 },
      { lon: -26.1223, lat: -7.8756 },
      { lon: 115.7, lat: 39.4 },
      { lon: -23.0075, lat: 50.4296 }
    ]
  }
];

function HoloArchiveFloor() {
  const rings = useMemo(() => {
    return [1.15, 1.9, 2.75, 3.7, 4.9].map((radius, index) => {
      const curve = new THREE.EllipseCurve(0, 0, radius * 1.45, radius, 0, Math.PI * 2, false);
      const points = curve.getPoints(160).map((point) => new THREE.Vector3(point.x, 0, point.y));
      return {
        key: `${radius}`,
        geometry: new THREE.BufferGeometry().setFromPoints(points),
        color: index % 2 === 0 ? "#d9c27a" : "#5fae9a",
        opacity: index % 2 === 0 ? 0.11 : 0.08
      };
    });
  }, []);

  return (
    <group position={[0, -1.55, 0]} rotation={[0.08, 0, 0]}>
      {rings.map((ring) => (
        <line key={ring.key}>
          <primitive object={ring.geometry} attach="geometry" />
          <lineBasicMaterial color={ring.color} transparent opacity={ring.opacity} depthWrite={false} />
        </line>
      ))}
      <gridHelper args={[12, 18, "#1f5149", "#0c221f"]} />
    </group>
  );
}

function DeepField() {
  const texture = useMemo(() => createGlowTexture(96), []);
  const geometry = useMemo(() => {
    const count = 520;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = ["#d9c27a", "#6fae9a", "#8bb6ff", "#ffffff"];
    const color = new THREE.Color();

    for (let index = 0; index < count; index += 1) {
      const radius = 5 + Math.random() * 15;
      const angle = Math.random() * Math.PI * 2;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = -1.2 + Math.random() * 5.8;
      positions[index * 3 + 2] = Math.sin(angle) * radius - 4 - Math.random() * 8;

      color.set(palette[Math.floor(Math.random() * palette.length)]);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }

    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    nextGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return nextGeometry;
  }, []);

  const pointsRef = useRef<THREE.Points>(null);
  useFrame(({ clock }) => {
    if (pointsRef.current) pointsRef.current.rotation.y = clock.getElapsedTime() * 0.006;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.042}
        transparent
        opacity={0.42}
        map={texture}
        vertexColors
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function NormaCore({ activeId }: { activeId: HoloModuleId }) {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const activeColor = modules.find((module) => module.id === activeId)?.color ?? "#d9c27a";
  const coreOpacity = activeId === "overview" ? 0.62 : 0.72;

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.18;
      groupRef.current.rotation.z = Math.sin(time * 0.35) * 0.06;
    }
    if (pulseRef.current) {
      const scale = 1.15 + Math.sin(time * 1.4) * 0.08;
      pulseRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={[0, 0.08, -0.9]} scale={activeId === "overview" ? 0.72 : 0.82}>
      <mesh ref={pulseRef} scale={[1.1, 0.26, 1.1]}>
        <sphereGeometry args={[1, 64, 32]} />
        <meshBasicMaterial color={activeColor} transparent opacity={0.08 * coreOpacity} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh scale={[0.68, 0.13, 0.68]}>
        <sphereGeometry args={[1, 64, 32]} />
        <meshBasicMaterial color="#ffe8a5" transparent opacity={0.58 * coreOpacity} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <group ref={groupRef}>
        {[0.95, 1.35, 1.78].map((radius, index) => (
          <mesh key={radius} rotation={[Math.PI / 2 + index * 0.16, 0, index * 0.55]}>
            <torusGeometry args={[radius, 0.006, 8, 160, Math.PI * 1.62]} />
            <meshBasicMaterial color={index === 1 ? "#6fae9a" : "#d9c27a"} transparent opacity={0.25 * coreOpacity} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function HoloEnergyLines({ activeId }: { activeId: HoloModuleId }) {
  const geometries = useMemo(() => {
    const center = new THREE.Vector3(0, 0.1, 0);
    return modules.slice(1).map((module) => {
      const end = new THREE.Vector3(...module.position);
      const mid = center.clone().lerp(end, 0.52);
      mid.y += 0.42;
      const curve = new THREE.QuadraticBezierCurve3(center, mid, end);
      return { id: module.id, geometry: new THREE.BufferGeometry().setFromPoints(curve.getPoints(72)), color: module.color };
    });
  }, []);

  return (
    <group>
      {geometries.map((line) => (
        <line key={line.id}>
          <primitive object={line.geometry} attach="geometry" />
          <lineBasicMaterial
            color={line.color}
            transparent
            opacity={activeId === line.id ? 0.34 : activeId === "overview" ? 0.16 : 0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </line>
      ))}
    </group>
  );
}

function NodeIcon({
  id,
  color,
  opacity,
  shardOpacity,
  emissiveIntensity
}: {
  id: HoloModuleId;
  color: string;
  opacity: number;
  shardOpacity: number;
  emissiveIntensity: number;
}) {
  return (
    <>
      {id === "identity" ? (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.54, 0.012, 8, 128]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh>
            <ringGeometry args={[0.22, 0.34, 6]} />
            <meshBasicMaterial color={color} transparent opacity={opacity * 0.62} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
          </mesh>
        </>
      ) : null}
      {id === "missions" ? (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.56, 0.012, 8, 128, Math.PI * 1.58]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh position={[0, 0.02, 0]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.16, 0.74, 0.16]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissiveIntensity} transparent opacity={0.5} wireframe />
          </mesh>
        </>
      ) : null}
      {id === "kings" ? (
        <>
          {[0, 0.42, -0.42].map((rotation) => (
            <mesh key={rotation} rotation={[Math.PI / 2, rotation, 0]}>
              <torusGeometry args={[0.58, 0.01, 8, 128]} />
              <meshBasicMaterial color={color} transparent opacity={opacity * 0.72} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
          ))}
          <mesh rotation={[0.36, 0.24, 0]}>
            <icosahedronGeometry args={[0.34, 1]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissiveIntensity} transparent opacity={0.42} wireframe />
          </mesh>
        </>
      ) : null}
      {id === "academy" ? (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.38, 0.56, 96]} />
            <meshBasicMaterial color={color} transparent opacity={opacity * 0.48} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
          <mesh position={[-0.18, 0, 0]} rotation={[0, 0, -0.18]}>
            <boxGeometry args={[0.28, 0.48, 0.025]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissiveIntensity * 0.82} transparent opacity={0.42} wireframe />
          </mesh>
          <mesh position={[0.18, 0, 0]} rotation={[0, 0, 0.18]}>
            <boxGeometry args={[0.28, 0.48, 0.025]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissiveIntensity * 0.82} transparent opacity={0.42} wireframe />
          </mesh>
        </>
      ) : null}
      {id === "alchemy" ? (
        <>
          {[0.34, 0.55, 0.76].map((radius, index) => (
            <mesh key={radius} rotation={[Math.PI / 2 + index * 0.28, 0, index * 0.7]}>
              <torusGeometry args={[radius, 0.007, 8, 128, Math.PI * (index === 1 ? 1.42 : 2)]} />
              <meshBasicMaterial color={color} transparent opacity={opacity * (0.62 - index * 0.1)} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
          ))}
          <mesh rotation={[0.44, 0.22, 0]}>
            <tetrahedronGeometry args={[0.34, 0]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissiveIntensity} transparent opacity={0.48} wireframe />
          </mesh>
        </>
      ) : null}
      {id === "surveillance" ? (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.62, 0.006, 8, 128]} />
            <meshBasicMaterial color={color} transparent opacity={opacity * 0.68} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
          {[0.18, 0.34, 0.5].map((radius) => (
            <mesh key={radius} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radius, radius + 0.006, 96]} />
              <meshBasicMaterial color={color} transparent opacity={opacity * 0.28} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
            </mesh>
          ))}
          <mesh>
            <sphereGeometry args={[0.06, 16, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={opacity} blending={THREE.AdditiveBlending} />
          </mesh>
        </>
      ) : null}
      {id === "evidence" ? (
        <>
          {[0, 1, 2].map((index) => (
            <mesh key={index} position={[index * 0.16 - 0.16, index * 0.04 - 0.04, 0]} rotation={[0, 0, index * 0.1 - 0.1]}>
              <boxGeometry args={[0.36, 0.48, 0.018]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={emissiveIntensity * 0.65} transparent opacity={0.32} wireframe />
            </mesh>
          ))}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.58, 0.006, 8, 128, Math.PI * 1.35]} />
            <meshBasicMaterial color={color} transparent opacity={opacity * 0.42} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </>
      ) : null}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={18}
            array={new Float32Array(
              Array.from({ length: 54 }, (_, index) => {
                const i = Math.floor(index / 3);
                const angle = i * 2.41;
                const radius = 0.46 + ((i * 17) % 29) / 100;
                if (index % 3 === 0) return Math.cos(angle) * radius;
                if (index % 3 === 1) return Math.sin(i * 1.7) * 0.28;
                return Math.sin(angle) * radius;
              })
            )}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.045} color={color} transparent opacity={shardOpacity} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </>
  );
}

function ArchiveNode({
  module,
  active,
  onSelect
}: {
  module: HoloModule;
  active: boolean;
  onSelect: (id: HoloModuleId) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const iconRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (!groupRef.current) return;
    const lift = Math.sin(time * 1.1 + module.position[2]) * 0.055;
    groupRef.current.position.y = module.position[1] + lift;
    const scale = active ? 1.42 : hovered ? 1.05 : 0.92;
    groupRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.09);

    if (iconRef.current) {
      iconRef.current.rotation.y = time * (active ? 0.42 : 0.18);
      iconRef.current.rotation.z = Math.sin(time * 0.72 + module.position[0]) * 0.06;
    }
  });

  const opacity = active ? 0.9 : hovered ? 0.64 : 0.34;
  const shardOpacity = active ? 0.44 : hovered ? 0.32 : 0.16;
  const emissiveIntensity = active ? 1.8 : hovered ? 1.15 : 0.64;
  const labelAbove = module.id === "identity" || module.id === "surveillance" || module.id === "evidence";

  return (
    <group
      ref={groupRef}
      position={module.position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(module.id);
      }}
      onPointerEnter={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerLeave={(event) => {
        event.stopPropagation();
        setHovered(false);
      }}
    >
      <group ref={iconRef}>
        <NodeIcon id={module.id} color={module.color} opacity={opacity} shardOpacity={shardOpacity} emissiveIntensity={emissiveIntensity} />
      </group>
      <Html
        transform
        center
        position={[0, labelAbove ? 0.76 : -0.68, 0]}
        distanceFactor={5.4}
        className={`archive-node-label${active ? " is-active" : ""}`}
      >
        <span>{module.eyebrow}</span>
        <strong>{module.label}</strong>
      </Html>
    </group>
  );
}

const focusedNodePosition: [number, number, number] = [-4.85, 0.46, 0.14];

function ArchiveNodes({ activeId, onSelect }: { activeId: HoloModuleId; onSelect: (id: HoloModuleId) => void }) {
  const visibleModules =
    activeId === "overview"
      ? modules.slice(1)
      : modules
          .slice(1)
          .filter((module) => module.id === activeId)
          .map((module) => ({ ...module, position: focusedNodePosition }));

  return (
    <group>
      {visibleModules.map((module) => (
        <ArchiveNode key={module.id} module={module} active={activeId === module.id} onSelect={onSelect} />
      ))}
    </group>
  );
}

function CameraRig({
  activeModule,
  controlsRef
}: {
  activeModule: HoloModule;
  controlsRef: MutableRefObject<any>;
}) {
  const { camera } = useThree();
  const cameraTarget = useMemo(() => new THREE.Vector3(), []);
  const lookTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    cameraTarget.set(...activeModule.camera);
    lookTarget.set(...activeModule.target);
    camera.position.lerp(cameraTarget, 0.048);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(lookTarget, 0.06);
      controlsRef.current.update();
    } else {
      camera.lookAt(lookTarget);
    }
  });

  return null;
}

function HoloScene({ activeId, onSelect }: { activeId: HoloModuleId; onSelect: (id: HoloModuleId) => void }) {
  const controlsRef = useRef<any>(null);
  const rawActiveModule = modules.find((module) => module.id === activeId) ?? modules[0];
  const activeModule =
    activeId === "overview"
      ? rawActiveModule
      : {
          ...rawActiveModule,
          camera: [0.35, 1.02, 5.85] as [number, number, number],
          target: [-1.05, 0.4, 0.16] as [number, number, number]
        };

  return (
    <Canvas camera={{ position: [0, 1.55, 6.8], fov: 43 }} dpr={[1, 2]}>
      <color attach="background" args={["#020706"]} />
      <fog attach="fog" args={["#020706", 7, 23]} />
      <ambientLight intensity={0.18} />
      <pointLight position={[0, 2.4, 1.5]} color="#ffe0a0" intensity={0.9} />
      <pointLight position={[4, 3.5, -3]} color="#6fae9a" intensity={0.36} />
      <pointLight position={[-4, 2.4, -3]} color="#b44c3f" intensity={0.18} />
      <CameraRig activeModule={activeModule} controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        enablePan
        enableZoom={activeId === "overview"}
        minDistance={2.25}
        maxDistance={12}
      />
      <HoloArchiveFloor />
      <DeepField />
      <HoloEnergyLines activeId={activeId} />
      <NormaCore activeId={activeId} />
      <ArchiveNodes activeId={activeId} onSelect={onSelect} />
      <EffectComposer>
        <Bloom intensity={0.36} luminanceThreshold={0.18} luminanceSmoothing={0.86} />
        <Vignette eskil={false} offset={0.18} darkness={0.62} />
      </EffectComposer>
    </Canvas>
  );
}

function HoloTube({
  points,
  radius,
  color,
  opacity,
  segments = 64
}: {
  points: Array<[number, number, number]>;
  radius: number;
  color: string;
  opacity: number;
  segments?: number;
}) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))), [points]);

  return (
    <mesh>
      <tubeGeometry args={[curve, segments, radius, 10, false]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} wireframe />
    </mesh>
  );
}

function HoloPolyline({
  points,
  color,
  opacity = 0.7,
  lineWidth = 1
}: {
  points: Array<[number, number, number]>;
  color: string;
  opacity?: number;
  lineWidth?: number;
}) {
  const geometry = useMemo(() => {
    const nextGeometry = new THREE.BufferGeometry().setFromPoints(points.map((point) => new THREE.Vector3(...point)));
    return nextGeometry;
  }, [points]);

  return (
    <line>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color={color} transparent opacity={opacity} linewidth={lineWidth} />
    </line>
  );
}

function DragonWing({ side }: { side: -1 | 1 }) {
  const membraneGeometry = useMemo(() => {
    const vertices = new Float32Array([
      0, 0, 0,
      side * 0.48, 1.05, -0.05,
      side * 1.32, 0.86, -0.14,
      side * 1.86, 0.02, -0.08,
      side * 1.12, -0.34, 0.02,
      side * 0.34, -0.16, 0.05
    ]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex([0, 1, 5, 1, 2, 5, 2, 3, 4, 2, 4, 5]);
    geometry.computeVertexNormals();
    return geometry;
  }, [side]);

  const boneColor = "#f6d991";
  const flameColor = "#ff4238";

  return (
    <group position={[-0.04, 0.34, side * 0.08]} rotation={[0.12, side * 0.2, side * -0.14]}>
      <mesh geometry={membraneGeometry}>
        <meshBasicMaterial color="#a93435" transparent opacity={0.08} side={THREE.DoubleSide} wireframe />
      </mesh>
      <HoloPolyline points={[[0, 0, 0], [side * 0.5, 1.08, -0.05], [side * 1.38, 0.9, -0.14], [side * 1.94, 0, -0.08]]} color={boneColor} opacity={0.86} />
      <HoloPolyline points={[[side * 1.94, 0, -0.08], [side * 1.2, -0.38, 0.02], [side * 0.42, -0.18, 0.05], [0, 0, 0]]} color={boneColor} opacity={0.64} />
      <HoloPolyline points={[[0, 0, 0], [side * 0.58, 0.34, 0.02], [side * 1.86, 0.02, -0.08]]} color={boneColor} opacity={0.54} />
      <HoloPolyline points={[[0, 0, 0], [side * 0.46, -0.06, 0.04], [side * 1.12, -0.34, 0.02]]} color={boneColor} opacity={0.46} />
      <HoloPolyline points={[[side * 0.58, 0.12, 0.03], [side * 0.96, 0.34, 0], [side * 1.54, 0.09, -0.05]]} color={flameColor} opacity={0.52} />
      <HoloPolyline points={[[side * 0.88, 0.76, -0.08], [side * 0.66, 0.12, 0.01], [side * 0.72, -0.24, 0.02]]} color={flameColor} opacity={0.3} />
      <HoloPolyline points={[[side * 1.46, 0.68, -0.12], [side * 1.22, 0.04, -0.04], [side * 1.2, -0.38, 0.02]]} color={flameColor} opacity={0.32} />
      <mesh position={[side * 1.88, 0.04, -0.08]} rotation={[0, 0, side * -0.52]}>
        <coneGeometry args={[0.045, 0.24, 5, 1, true]} />
        <meshBasicMaterial color={boneColor} transparent opacity={0.62} wireframe />
      </mesh>
      <mesh position={[side * 1.1, 0.3, -0.04]}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshBasicMaterial color={flameColor} transparent opacity={0.62} />
      </mesh>
    </group>
  );
}

function DragonLeg({
  x,
  z,
  rear = false
}: {
  x: number;
  z: number;
  rear?: boolean;
}) {
  const color = rear ? "#b67955" : "#f2d28a";
  const opacity = rear ? 0.36 : 0.52;

  return (
    <group position={[x, -0.12, z]}>
      <HoloTube points={[[0, 0.08, 0], [0.04, -0.28, 0.03], [0.16, -0.54, 0.02]]} radius={0.026} color={color} opacity={opacity} segments={28} />
      <mesh position={[0.2, -0.58, 0.02]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.045, 0.22, 5, 1, true]} />
        <meshBasicMaterial color="#ffe1a2" transparent opacity={0.48} wireframe />
      </mesh>
    </group>
  );
}

function BronzeFireProjection() {
  const groupRef = useRef<THREE.Group>(null);
  const dragonRef = useRef<THREE.Group>(null);
  const cityRef = useRef<THREE.Group>(null);
  const emberRef = useRef<THREE.Points>(null);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(time * 0.22) * 0.08;
      groupRef.current.position.y = Math.sin(time * 0.9) * 0.045;
    }
    if (dragonRef.current) {
      dragonRef.current.rotation.y = time * 0.18;
      dragonRef.current.rotation.z = Math.sin(time * 0.7) * 0.035;
      dragonRef.current.scale.setScalar(1 + Math.sin(time * 1.8) * 0.012);
    }
    if (cityRef.current) cityRef.current.rotation.y = -time * 0.08;
    if (emberRef.current) {
      emberRef.current.rotation.y = time * 0.11;
      emberRef.current.rotation.x = Math.sin(time * 0.31) * 0.08;
    }
  });

  const dragonColor = "#f2d28a";
  const fireColor = "#ff7444";
  const ringGeometry = useMemo(() => new THREE.TorusGeometry(1.42, 0.012, 12, 160), []);
  const sealGeometry = useMemo(() => new THREE.TorusGeometry(0.86, 0.009, 10, 128), []);
  const emberGeometry = useMemo(() => {
    const count = 260;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.5 + Math.random() * 1.75;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = -0.58 + Math.random() * 2.45;
      positions[index * 3 + 2] = Math.sin(angle) * radius * 0.55;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);
  const dorsalSpines = [
    [-0.72, 0.34, 0],
    [-0.42, 0.46, 0],
    [-0.12, 0.38, 0],
    [0.2, 0.25, 0],
    [0.52, 0.15, 0]
  ];
  const outlineColor = "#ffe5a7";
  const hotLine = "#ff3a35";

  return (
    <group ref={groupRef} position={[0, 0.08, 0]}>
      <points ref={emberRef} geometry={emberGeometry}>
        <pointsMaterial color={fireColor} size={0.022} transparent opacity={0.42} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <group ref={cityRef} position={[0, -1.02, 0]}>
        {[-0.72, -0.36, 0, 0.36, 0.72].map((x, index) => (
          <mesh key={x} position={[x, 0.08 + index * 0.035, -0.16 + Math.abs(x) * 0.18]}>
            <boxGeometry args={[0.08, 0.52 + index * 0.08, 0.08]} />
            <meshBasicMaterial color="#66c0a8" transparent opacity={0.22} />
          </mesh>
        ))}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.72, 1.32, 96]} />
          <meshBasicMaterial color="#5fae9a" transparent opacity={0.08} side={THREE.DoubleSide} />
        </mesh>
      </group>

      <group ref={dragonRef} position={[0.08, -0.06, 0]} scale={1.08}>
        <DragonWing side={-1} />
        <DragonWing side={1} />
        <HoloTube points={[[-0.78, 0.14, 0], [-0.36, 0.24, 0.03], [0.12, 0.12, 0], [0.58, 0.02, -0.02]]} radius={0.075} color={dragonColor} opacity={0.2} segments={90} />
        <HoloTube points={[[-0.72, 0.24, 0], [-0.96, 0.64, 0.02], [-1.22, 0.88, 0.01]]} radius={0.035} color={dragonColor} opacity={0.2} segments={48} />
        <HoloTube points={[[0.48, 0.0, -0.02], [0.92, -0.08, 0.03], [1.34, 0.08, 0.08], [1.58, 0.3, 0.02], [1.18, 0.42, -0.04]]} radius={0.026} color="#c6865b" opacity={0.18} segments={72} />
        <HoloPolyline points={[[-1.26, 0.94, 0.04], [-0.96, 0.68, 0.03], [-0.78, 0.35, 0.02], [-0.42, 0.32, 0.02], [0.02, 0.2, 0.01], [0.5, 0.08, -0.01], [0.9, 0, 0.02], [1.34, 0.1, 0.07], [1.66, 0.32, 0.02]]} color={outlineColor} opacity={0.9} />
        <HoloPolyline points={[[-1.18, 0.76, -0.02], [-0.88, 0.28, -0.02], [-0.48, 0.02, -0.02], [-0.04, -0.06, -0.02], [0.4, -0.02, -0.02], [0.88, -0.12, 0.01], [1.3, -0.02, 0.05], [1.66, 0.32, 0.02]]} color={outlineColor} opacity={0.78} />
        <HoloPolyline points={[[-1.52, 0.92, 0.02], [-1.36, 1.04, 0.04], [-1.18, 0.96, 0.02], [-1.12, 0.82, 0.01], [-1.34, 0.72, 0.02], [-1.58, 0.82, 0.02], [-1.52, 0.92, 0.02]]} color={outlineColor} opacity={0.96} />
        <HoloPolyline points={[[-1.58, 0.82, 0.02], [-1.7, 0.78, 0.02], [-1.54, 0.74, 0.02]]} color={hotLine} opacity={0.68} />
        <HoloPolyline points={[[-1.42, 0.74, 0.01], [-1.3, 0.66, 0], [-1.12, 0.7, 0.01]]} color={outlineColor} opacity={0.58} />
        <HoloPolyline points={[[-1.42, 1.05, -0.05], [-1.64, 1.36, -0.08], [-1.5, 1.02, -0.04]]} color={outlineColor} opacity={0.92} />
        <HoloPolyline points={[[-1.28, 1.06, 0.07], [-1.26, 1.38, 0.12], [-1.18, 1.02, 0.06]]} color={outlineColor} opacity={0.82} />
        <mesh position={[-1.34, 0.92, 0.02]} rotation={[0, 0, -0.18]}>
          <sphereGeometry args={[0.2, 22, 14]} />
          <meshBasicMaterial color={dragonColor} transparent opacity={0.16} wireframe />
        </mesh>
        <mesh position={[-1.51, 0.88, 0.02]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.1, 0.34, 5, 1, true]} />
          <meshBasicMaterial color="#ff5a42" transparent opacity={0.22} wireframe />
        </mesh>
        {[
          [-1.4, 1.1, -0.06, -0.54],
          [-1.28, 1.12, 0.06, 0.54]
        ].map(([x, y, z, tilt]) => (
          <mesh key={`horn-${z}`} position={[x, y, z]} rotation={[0.18, tilt, -0.54]}>
            <coneGeometry args={[0.035, 0.58, 6, 1, true]} />
            <meshBasicMaterial color="#ffe9b8" transparent opacity={0.76} wireframe />
          </mesh>
        ))}
        <mesh position={[-1.5, 0.95, 0.09]}>
          <sphereGeometry args={[0.026, 8, 6]} />
          <meshBasicMaterial color="#ff2e37" transparent opacity={0.88} />
        </mesh>
        <mesh position={[-1.5, 0.95, -0.05]}>
          <sphereGeometry args={[0.02, 8, 6]} />
          <meshBasicMaterial color="#ff2e37" transparent opacity={0.7} />
        </mesh>
        {dorsalSpines.map(([x, y, z], index) => (
          <mesh key={`dorsal-${index}`} position={[x, y + 0.06, z]} rotation={[0.1, 0, -0.26]}>
            <coneGeometry args={[0.025, 0.26 + index * 0.025, 4, 1, true]} />
            <meshBasicMaterial color="#ffe1a2" transparent opacity={0.66} wireframe />
          </mesh>
        ))}
        <DragonLeg x={-0.42} z={0.14} />
        <DragonLeg x={0.2} z={0.15} />
        <DragonLeg x={-0.2} z={-0.12} rear />
        <DragonLeg x={0.52} z={-0.1} rear />
        <HoloPolyline points={[[-0.46, 0.0, 0.14], [-0.52, -0.48, 0.15], [-0.34, -0.7, 0.16], [-0.2, -0.66, 0.16]]} color={outlineColor} opacity={0.72} />
        <HoloPolyline points={[[0.2, -0.02, 0.15], [0.18, -0.5, 0.15], [0.38, -0.68, 0.16], [0.52, -0.62, 0.16]]} color={outlineColor} opacity={0.68} />
        <HoloPolyline points={[[-0.22, -0.04, -0.12], [-0.12, -0.46, -0.12], [-0.02, -0.66, -0.12], [0.12, -0.62, -0.12]]} color="#d1a36d" opacity={0.5} />
        <HoloPolyline points={[[0.5, -0.04, -0.1], [0.58, -0.5, -0.1], [0.78, -0.66, -0.1], [0.92, -0.6, -0.1]]} color="#d1a36d" opacity={0.46} />
        {[
          [-0.58, 0.26, 0.03, 0.2],
          [-0.16, 0.22, 0.05, -0.2],
          [0.24, 0.1, 0.02, 0.18]
        ].map(([x, y, z, rotation], index) => (
          <mesh key={`rift-${index}`} position={[x, y, z]} rotation={[0, 0, rotation]}>
            <boxGeometry args={[0.42, 0.018, 0.018]} />
            <meshBasicMaterial color="#ff2e37" transparent opacity={0.5} />
          </mesh>
        ))}
        <mesh position={[-0.28, 0.2, 0.04]}>
          <sphereGeometry args={[0.12, 20, 12]} />
          <meshBasicMaterial color={fireColor} transparent opacity={0.68} />
        </mesh>
        <pointLight position={[-0.28, 0.25, 0.24]} color={fireColor} intensity={1.5} distance={4.8} />
      </group>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <primitive object={ringGeometry} attach="geometry" />
        <meshBasicMaterial color="#d9c27a" transparent opacity={0.58} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, Math.PI / 4]}>
        <primitive object={sealGeometry} attach="geometry" />
        <meshBasicMaterial color="#e26f45" transparent opacity={0.36} />
      </mesh>
      <mesh rotation={[0.24, 0, 0]}>
        <torusKnotGeometry args={[0.42, 0.018, 160, 8, 2, 3]} />
        <meshBasicMaterial color="#ffe1a2" transparent opacity={0.18} />
      </mesh>
      <Html transform center position={[0, 1.7, 0]} distanceFactor={5.2} className="bronze-fire-title-object">
        <span>KING-01</span>
        <strong>青铜与火之王</strong>
      </Html>
    </group>
  );
}

function BronzeFireScene() {
  const controlsRef = useRef<any>(null);
  const activeModule = useMemo(
    () => ({
      camera: [0, 1.12, 5.2] as [number, number, number],
      target: [0, -0.05, 0] as [number, number, number]
    }),
    []
  );

  return (
    <Canvas camera={{ position: [0, 1.12, 5.2], fov: 42 }} dpr={[1, 2]}>
      <color attach="background" args={["#030504"]} />
      <fog attach="fog" args={["#030504", 6, 20]} />
      <ambientLight intensity={0.14} />
      <pointLight position={[0, 2.2, 2.2]} color="#ffd98a" intensity={0.92} />
      <pointLight position={[-2.5, 1.2, 1.8]} color="#57b49f" intensity={0.32} />
      <CameraRig activeModule={activeModule as HoloModule} controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.45}
        minDistance={3.2}
        maxDistance={7.2}
      />
      <HoloArchiveFloor />
      <DeepField />
      <BronzeFireProjection />
      <EffectComposer>
        <Bloom intensity={0.52} luminanceThreshold={0.12} luminanceSmoothing={0.82} />
        <Vignette eskil={false} offset={0.18} darkness={0.7} />
      </EffectComposer>
    </Canvas>
  );
}

function BronzeFireArchive({ onClose }: { onClose: () => void }) {
  const [activeSection, setActiveSection] = useState(bronzeFireSections[0]);

  return (
    <section className="bronze-fire-archive" style={{ "--holo-color": "#e2bd64" } as CSSProperties}>
      <div className="bronze-fire-canvas" aria-hidden="true">
        <BronzeFireScene />
      </div>
      <aside className="bronze-fire-command">
        <span>DRAGON KING ARCHIVE / DEEP NODE</span>
        <h1>青铜与火之王</h1>
        <p>
          KING-01 档案已解封。该王座关联诺顿、康斯坦丁、青铜城、三峡水下行动与七宗罪。青铜与火之王不是单纯的元素代号，而是一套完整的君王权柄：铸造、炼金、火焰、金属、宫殿、武器，以及双生之间无法切断的召唤。
        </p>
        <div className="bronze-fire-section-list">
          {bronzeFireSections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={activeSection.id === section.id ? "is-active" : ""}
              onClick={() => setActiveSection(section)}
            >
              <span>{section.level}</span>
              <strong>{section.label}</strong>
            </button>
          ))}
        </div>
      </aside>
      <aside className="bronze-fire-detail">
        <span>{activeSection.level}</span>
        <h2>{activeSection.label}</h2>
        <strong>{activeSection.status}</strong>
        <div className="bronze-fire-report-meta">
          <span>{activeSection.fileNo}</span>
          <span>{activeSection.classification}</span>
        </div>
        <p className="bronze-fire-report-summary">{activeSection.summary}</p>
        <div className="bronze-fire-report-block">
          <span>MISSION REPORT</span>
          {activeSection.report.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="bronze-fire-report-tags">
          {activeSection.related.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="bronze-fire-report-block is-risk">
          <span>RISK ASSESSMENT</span>
          <p>{activeSection.risk}</p>
        </div>
        <div className="bronze-fire-report-block is-directive">
          <span>NORMA DIRECTIVE</span>
          <p>{activeSection.directive}</p>
        </div>
      </aside>
      <button type="button" className="bronze-fire-back" onClick={onClose}>
        <span>返回</span>
        <strong>龙王档案</strong>
      </button>
    </section>
  );
}

function SkyWindProjection() {
  const groupRef = useRef<THREE.Group>(null);
  const vortexRef = useRef<THREE.Group>(null);
  const particleRef = useRef<THREE.Points>(null);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(time * 0.78) * 0.05;
      groupRef.current.rotation.z = Math.sin(time * 0.24) * 0.04;
    }
    if (vortexRef.current) {
      vortexRef.current.rotation.y = time * 0.3;
      vortexRef.current.rotation.x = Math.sin(time * 0.18) * 0.18;
    }
    if (particleRef.current) {
      particleRef.current.rotation.y = -time * 0.16;
      particleRef.current.rotation.z = time * 0.08;
    }
  });

  const particleGeometry = useMemo(() => {
    const count = 320;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const height = -1 + Math.random() * 2.4;
      const radius = 0.25 + Math.random() * 1.85;
      positions[index * 3] = Math.cos(angle + height * 1.2) * radius;
      positions[index * 3 + 1] = height;
      positions[index * 3 + 2] = Math.sin(angle + height * 1.2) * radius * 0.55;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);

  const windColor = "#8ee7ff";
  const paleGold = "#f0d88a";
  const wingLeft: Array<[number, number, number]> = [
    [-0.18, 0.28, 0],
    [-0.74, 0.9, -0.06],
    [-1.52, 1.08, -0.1],
    [-1.0, 0.38, -0.04],
    [-0.3, 0.04, 0]
  ];
  const wingRight: Array<[number, number, number]> = wingLeft.map(([x, y, z]) => [-x, y, z]);

  return (
    <group ref={groupRef} position={[0, 0.02, 0]}>
      <points ref={particleRef} geometry={particleGeometry}>
        <pointsMaterial color={windColor} size={0.018} transparent opacity={0.38} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <group ref={vortexRef}>
        {[0, 0.45, 0.9, 1.35].map((turn, index) => (
          <mesh key={turn} rotation={[Math.PI / 2.35, 0, turn]}>
            <torusGeometry args={[0.62 + index * 0.28, 0.006, 8, 128]} />
            <meshBasicMaterial color={index % 2 ? windColor : paleGold} transparent opacity={0.22 + index * 0.06} />
          </mesh>
        ))}
        {[0, 1, 2].map((index) => (
          <mesh key={`cone-${index}`} position={[0, -0.12 + index * 0.32, 0]} rotation={[0, 0, index * 0.4]}>
            <coneGeometry args={[0.32 + index * 0.22, 0.72, 5, 1, true]} />
            <meshBasicMaterial color={windColor} transparent opacity={0.08 + index * 0.03} wireframe />
          </mesh>
        ))}
      </group>
      <HoloPolyline points={[[-1.72, -0.12, 0.02], [-0.98, 0.08, 0.02], [-0.28, 0.14, 0.01], [0.42, 0.08, 0.02], [1.72, -0.1, 0.02]]} color={windColor} opacity={0.82} />
      <HoloPolyline points={wingLeft} color="#dff8ff" opacity={0.72} />
      <HoloPolyline points={wingRight} color="#dff8ff" opacity={0.72} />
      <HoloPolyline points={[[-1.52, 1.08, -0.1], [-1.28, 0.6, -0.08], [-0.82, 0.22, -0.04], [-0.3, 0.04, 0]]} color={windColor} opacity={0.46} />
      <HoloPolyline points={[[1.52, 1.08, -0.1], [1.28, 0.6, -0.08], [0.82, 0.22, -0.04], [0.3, 0.04, 0]]} color={windColor} opacity={0.46} />
      <HoloPolyline points={[[-0.1, 0.28, 0], [0, 0.58, 0.02], [0.1, 0.28, 0], [0.02, -0.42, 0], [-0.08, -0.82, 0.02]]} color={paleGold} opacity={0.8} />
      {[-1.18, -0.58, 0.58, 1.18].map((x, index) => (
        <mesh key={`blade-${x}`} position={[x, 0.62 - Math.abs(x) * 0.16, 0]} rotation={[0, 0, (index % 2 ? -1 : 1) * 0.62]}>
          <boxGeometry args={[0.52, 0.012, 0.012]} />
          <meshBasicMaterial color="#eaffff" transparent opacity={0.56} />
        </mesh>
      ))}
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.16, 24, 14]} />
        <meshBasicMaterial color={windColor} transparent opacity={0.12} wireframe />
      </mesh>
      <pointLight position={[0, 0.9, 1.8]} color={windColor} intensity={1.4} distance={5} />
      <Html transform center position={[0, 1.64, 0]} distanceFactor={5.2} className="bronze-fire-title-object sky-wind-title-object">
        <span>KING-02</span>
        <strong>天空与风之王</strong>
      </Html>
    </group>
  );
}

function SkyWindScene() {
  const controlsRef = useRef<any>(null);
  const activeModule = useMemo(
    () => ({
      camera: [0, 1.08, 5.4] as [number, number, number],
      target: [0, 0.02, 0] as [number, number, number]
    }),
    []
  );

  return (
    <Canvas camera={{ position: [0, 1.08, 5.4], fov: 42 }} dpr={[1, 2]}>
      <color attach="background" args={["#02070a"]} />
      <fog attach="fog" args={["#02070a", 5.5, 18]} />
      <ambientLight intensity={0.16} />
      <pointLight position={[0, 2.1, 2.4]} color="#8ee7ff" intensity={0.88} />
      <pointLight position={[2.4, 0.8, 1.6]} color="#f0d88a" intensity={0.28} />
      <CameraRig activeModule={activeModule as HoloModule} controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.62}
        minDistance={3.1}
        maxDistance={7.4}
      />
      <HoloArchiveFloor />
      <DeepField />
      <SkyWindProjection />
      <EffectComposer>
        <Bloom intensity={0.46} luminanceThreshold={0.1} luminanceSmoothing={0.84} />
        <Vignette eskil={false} offset={0.16} darkness={0.72} />
      </EffectComposer>
    </Canvas>
  );
}

function SkyWindArchive({ onClose }: { onClose: () => void }) {
  const [activeSection, setActiveSection] = useState(skyWindSections[0]);

  return (
    <section className="bronze-fire-archive sky-wind-archive" style={{ "--holo-color": "#8ee7ff" } as CSSProperties}>
      <div className="bronze-fire-canvas" aria-hidden="true">
        <SkyWindScene />
      </div>
      <aside className="bronze-fire-command">
        <span>DRAGON KING ARCHIVE / UNRESOLVED NODE</span>
        <h1>天空与风之王</h1>
        <p>
          KING-02 档案聚焦天空与风之王王座本身：风权柄、风系样本、言灵参照、苏醒监测与处置原则。北京尼伯龙根中的镰鼬群仅作为风系灾害案例收录，不作为王座本体判定依据。
        </p>
        <div className="bronze-fire-section-list">
          {skyWindSections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={activeSection.id === section.id ? "is-active" : ""}
              onClick={() => setActiveSection(section)}
            >
              <span>{section.level}</span>
              <strong>{section.label}</strong>
            </button>
          ))}
        </div>
      </aside>
      <aside className="bronze-fire-detail">
        <span>{activeSection.level}</span>
        <h2>{activeSection.label}</h2>
        <strong>{activeSection.status}</strong>
        <div className="bronze-fire-report-meta">
          <span>{activeSection.fileNo}</span>
          <span>{activeSection.classification}</span>
        </div>
        <p className="bronze-fire-report-summary">{activeSection.summary}</p>
        <div className="bronze-fire-report-block">
          <span>INTELLIGENCE REPORT</span>
          {activeSection.report.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="bronze-fire-report-tags">
          {activeSection.related.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="bronze-fire-report-block is-risk">
          <span>RISK ASSESSMENT</span>
          <p>{activeSection.risk}</p>
        </div>
        <div className="bronze-fire-report-block is-directive">
          <span>NORMA DIRECTIVE</span>
          <p>{activeSection.directive}</p>
        </div>
      </aside>
      <button type="button" className="bronze-fire-back" onClick={onClose}>
        <span>返回</span>
        <strong>龙王档案</strong>
      </button>
    </section>
  );
}

function DragonKingDossierArchive({
  title,
  eyebrow,
  intro,
  color,
  sections,
  scene,
  reportLabel,
  onClose
}: {
  title: string;
  eyebrow: string;
  intro: string;
  color: string;
  sections: BronzeFireSection[];
  scene: ReactNode;
  reportLabel: string;
  onClose: () => void;
}) {
  const [activeSection, setActiveSection] = useState(sections[0]);

  return (
    <section className="bronze-fire-archive" style={{ "--holo-color": color } as CSSProperties}>
      <div className="bronze-fire-canvas" aria-hidden="true">
        {scene}
      </div>
      <aside className="bronze-fire-command">
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        <p>{intro}</p>
        <div className="bronze-fire-section-list">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={activeSection.id === section.id ? "is-active" : ""}
              onClick={() => setActiveSection(section)}
            >
              <span>{section.level}</span>
              <strong>{section.label}</strong>
            </button>
          ))}
        </div>
      </aside>
      <aside className="bronze-fire-detail">
        <span>{activeSection.level}</span>
        <h2>{activeSection.label}</h2>
        <strong>{activeSection.status}</strong>
        <div className="bronze-fire-report-meta">
          <span>{activeSection.fileNo}</span>
          <span>{activeSection.classification}</span>
        </div>
        <p className="bronze-fire-report-summary">{activeSection.summary}</p>
        <div className="bronze-fire-report-block">
          <span>{reportLabel}</span>
          {activeSection.report.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="bronze-fire-report-tags">
          {activeSection.related.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <div className="bronze-fire-report-block is-risk">
          <span>RISK ASSESSMENT</span>
          <p>{activeSection.risk}</p>
        </div>
        <div className="bronze-fire-report-block is-directive">
          <span>NORMA DIRECTIVE</span>
          <p>{activeSection.directive}</p>
        </div>
      </aside>
      <button type="button" className="bronze-fire-back" onClick={onClose}>
        <span>返回</span>
        <strong>龙王档案</strong>
      </button>
    </section>
  );
}

function EarthMountainArchive({ onClose }: { onClose: () => void }) {
  return (
    <DragonKingDossierArchive
      title="大地与山之王"
      eyebrow="DRAGON KING ARCHIVE / CONFIRMED NODE"
      intro="KING-03 档案已进入确认级别：北京地铁异常、尼伯龙根入口、夏弥身份、芬里厄巢穴与双生王座共同构成大地与山之王的完整风险面。"
      color="#c7b06a"
      sections={earthMountainSections}
      scene={<BronzeFireScene />}
      reportLabel="MISSION REPORT"
      onClose={onClose}
    />
  );
}

function BlackKingArchive({ onClose }: { onClose: () => void }) {
  return (
    <DragonKingDossierArchive
      title="黑王"
      eyebrow="DRAGON KING ARCHIVE / PRIME NODE"
      intro="PRIME-00 档案已进入最高封存：尼德霍格、言灵·皇帝、黑王血裔、终末预案与龙族谱系源头均归入龙皇王座。"
      color="#d8c27a"
      sections={blackKingSections}
      scene={<BronzeFireScene />}
      reportLabel="PRIME REPORT"
      onClose={onClose}
    />
  );
}

function WhiteKingArchive({ onClose }: { onClose: () => void }) {
  return (
    <DragonKingDossierArchive
      title="白王"
      eyebrow="DRAGON KING ARCHIVE / REBELLION NODE"
      intro="PRIME-01 档案维持禁忌封存：白王叛乱、言灵·神谕、白王血裔、圣骸与日本收容链均归入独立王座风险。"
      color="#f0e8c8"
      sections={whiteKingSections}
      scene={<SkyWindScene />}
      reportLabel="SEALED REPORT"
      onClose={onClose}
    />
  );
}

function OceanWaterArchive({ onClose }: { onClose: () => void }) {
  return (
    <DragonKingDossierArchive
      title="海洋与水之王"
      eyebrow="DRAGON KING ARCHIVE / SEALED NODE"
      intro="KING-04 档案保持未解封状态。当前只记录水域权柄、深海遗迹、沉眠容器、双生空位与苏醒预警；姓名、地点和主副节点均等待后续证据确认。"
      color="#75d8ff"
      sections={oceanWaterSections}
      scene={<SkyWindScene />}
      reportLabel="SEALED REPORT"
      onClose={onClose}
    />
  );
}

function MissionOperationsPanel({
  module,
  onSelectRecord,
  onOpenDeepArchive,
  profile,
  onAccessLog
}: {
  module: HoloModule;
  onSelectRecord: (record: ArchiveRecord) => void;
  onOpenDeepArchive: (id: DeepArchiveId, record?: ArchiveRecord) => void;
  profile?: AgentProfile | null;
  onAccessLog?: (log: Omit<AccessLog, "id" | "at">) => void;
}) {
  const blueprint = archiveBlueprints.missions;
  const records = blueprint?.records ?? [];

  return (
    <section className="mission-ops-panel" style={{ "--holo-color": module.color } as CSSProperties} aria-label={module.title}>
      <div className="mission-ops-header">
        <span>EXECUTIVE DEPARTMENT / OPERATIONS DESK</span>
        <h1>执行部任务作战台</h1>
        <p>任务队列只显示行动代号、风险等级、最终状态和诺玛封存标记。点击已解封任务进入作战复盘。</p>
      </div>
      <div className="mission-ops-grid">
        {records.map((record, index) => {
          const requiredClearance = getRequiredClearance("missions", record);
          const locked = Boolean(record.deepView && (profile?.clearance ?? 1) < requiredClearance);

          return (
            <button
              key={record.title}
              type="button"
              className={`mission-card${record.deepView && !locked ? " has-deep-view" : ""}${locked ? " is-locked" : ""}`}
              onClick={() => {
                if (record.deepView) {
                  if (locked) {
                    onAccessLog?.({
                      action: "DENIED_ACCESS",
                      target: `${record.level} / ${record.title}`,
                      result: "DENIED",
                      detail: `CLEARANCE ${requiredClearance} REQUIRED`
                    });
                    onSelectRecord({
                      ...record,
                      status: `SEALED / CLEARANCE ${requiredClearance} REQUIRED`,
                      detail: `NORMA 拒绝访问。该行动复盘需要 CLEARANCE ${requiredClearance}，当前专员权限不足。`
                    });
                    return;
                  }
                  onAccessLog?.({
                    action: "ARCHIVE_ACCESS",
                    target: `${record.level} / ${record.title}`,
                    result: "ALLOWED",
                    detail: `CLEARANCE ${profile?.clearance ?? 1} VERIFIED`
                  });
                  onOpenDeepArchive(record.deepView, record);
                  return;
                }
                onSelectRecord(record);
              }}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <header>
                <strong>{record.level}</strong>
                <em>{locked ? `SEALED / C-${requiredClearance}` : record.status}</em>
              </header>
              <h2>{record.title}</h2>
            </button>
          );
        })}
      </div>
      <div className="mission-ops-footer">
        {(blueprint?.workflow ?? module.lines).map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </section>
  );
}

const kuimenStageTelemetry: Record<
  string,
  {
    code: string;
    note: string;
    tone: "stable" | "warning" | "danger";
    comm: string[];
    equipment: Array<{ label: string; value: string; state: "ok" | "warn" | "fail" }>;
  }
> = {
  brief: {
    code: "PLAN ADVANCED",
    note: "MISSION-S / SITE APPROACH",
    tone: "stable",
    comm: ["00:00 / MISSION BRIEF SEALED", "00:04 / MONIACH ON STATION", "00:09 / WEATHER WINDOW ACCEPTED"],
    equipment: [
      { label: "O2", value: "02:00:00", state: "ok" },
      { label: "SONAR", value: "STANDBY", state: "ok" },
      { label: "LIFELINE", value: "READY", state: "ok" },
      { label: "COMMS", value: "STABLE", state: "ok" }
    ]
  },
  command: {
    code: "COMMAND ONLINE",
    note: "SURFACE PLATFORM / MONIACH",
    tone: "stable",
    comm: ["00:12 / COMMAND CHAIN CONFIRMED", "00:15 / LIFE SIGN MONITOR ACTIVE", "00:18 / RECOVERY WINCH READY"],
    equipment: [
      { label: "O2", value: "01:58:41", state: "ok" },
      { label: "SONAR", value: "ACTIVE", state: "ok" },
      { label: "LIFELINE", value: "LOCKED", state: "ok" },
      { label: "COMMS", value: "CLEAR", state: "ok" }
    ]
  },
  team: {
    code: "DIVE TEAM DEPLOYED",
    note: "SNAKE SIGNAL ACTIVE",
    tone: "stable",
    comm: ["00:21 / DIVE TEAM BELOW SURFACE", "00:27 / SNAKE SIGNAL ACTIVE", "00:33 / GATE RESPONSE DETECTED"],
    equipment: [
      { label: "O2", value: "01:41:08", state: "ok" },
      { label: "SONAR", value: "ACTIVE", state: "ok" },
      { label: "LIFELINE", value: "TENSION", state: "ok" },
      { label: "COMMS", value: "STABLE", state: "ok" }
    ]
  },
  site: {
    code: "PALACE CONFIRMED",
    note: "BRONZE CITY CORE CONTACT",
    tone: "warning",
    comm: ["00:46 / BRONZE STRUCTURE CONFIRMED", "00:51 / DRAGON TEXT VISUAL", "00:57 / INTERNAL SYSTEM RESPONSE"],
    equipment: [
      { label: "O2", value: "01:09:22", state: "warn" },
      { label: "SONAR", value: "DISTORTED", state: "warn" },
      { label: "LIFELINE", value: "TENSION", state: "ok" },
      { label: "COMMS", value: "NOISE", state: "warn" }
    ]
  },
  timeline: {
    code: "ROUTE LOST",
    note: "COMM / ROPE DEGRADED",
    tone: "danger",
    comm: ["01:06 / LIFELINE TENSION LOST", "01:08 / DATA CHANNEL BROKEN", "01:12 / EXIT ROUTE INVALID"],
    equipment: [
      { label: "O2", value: "00:38:15", state: "warn" },
      { label: "SONAR", value: "BLIND", state: "fail" },
      { label: "LIFELINE", value: "LOST", state: "fail" },
      { label: "COMMS", value: "INTERRUPTED", state: "fail" }
    ]
  },
  casualty: {
    code: "CASUALTY CONFIRMED",
    note: "OXYGEN WINDOW COLLAPSING",
    tone: "danger",
    comm: ["01:21 / OXYGEN WINDOW COLLAPSING", "01:27 / YE SHENG SIGNAL LOST", "01:35 / AKI SIGNAL LOST"],
    equipment: [
      { label: "O2", value: "CRITICAL", state: "fail" },
      { label: "SONAR", value: "PARTIAL", state: "warn" },
      { label: "LIFELINE", value: "LOST", state: "fail" },
      { label: "COMMS", value: "BLACK", state: "fail" }
    ]
  },
  evidence: {
    code: "EVIDENCE SURFACED",
    note: "RECOVERY PRIORITY LOCKED",
    tone: "warning",
    comm: ["01:38 / BRASS VESSEL NEAR SURFACE", "01:41 / RECOVERY TEAM ALERTED", "01:44 / TARGET MOVEMENT BELOW HULL"],
    equipment: [
      { label: "O2", value: "FAILED", state: "fail" },
      { label: "SONAR", value: "TARGET", state: "warn" },
      { label: "LIFELINE", value: "LOST", state: "fail" },
      { label: "WINCH", value: "RECOVERY", state: "warn" }
    ]
  },
  assessment: {
    code: "SURFACE TARGET CONFIRMED",
    note: "MISSION ENTERED REVIEW",
    tone: "warning",
    comm: ["01:50 / SURFACE TARGET CONFIRMED", "01:56 / MONIACH UNDER ATTACK", "02:00 / FILE MOVED TO BLACK BOX"],
    equipment: [
      { label: "O2", value: "CLOSED", state: "fail" },
      { label: "SONAR", value: "REPLAY", state: "ok" },
      { label: "HULL", value: "DAMAGED", state: "warn" },
      { label: "ARCHIVE", value: "SEALED", state: "ok" }
    ]
  }
};

function KuimenMissionMap({ activeId }: { activeId: string }) {
  const telemetry = kuimenStageTelemetry[activeId] ?? kuimenStageTelemetry.brief;
  const focusCards: Record<string, { title: string; rows: Array<[string, string]> }> = {
    brief: {
      title: "MISSION SNAPSHOT / 任务快照",
      rows: [
        ["等级", "MISSION-S"],
        ["目标", "青铜城确认"],
        ["状态", "进入水域"]
      ]
    },
    command: {
      title: "COMMAND STATUS / 指挥状态",
      rows: [
        ["平台", "摩尼亚赫号"],
        ["指挥", "曼斯教授"],
        ["链路", "诺玛记录中"]
      ]
    },
    team: {
      title: "DIVE TEAM / 下潜组",
      rows: [
        ["叶胜", "言灵·蛇"],
        ["酒德亚纪", "拍摄 / 取样"],
        ["钥匙", "活体门禁"]
      ]
    },
    site: {
      title: "BRONZE CITY / 青铜城",
      rows: [
        ["结构", "炼金机关"],
        ["深度", "-210M / -360M"],
        ["风险", "宫殿自启动"]
      ]
    },
    timeline: {
      title: "COMM BLACK BOX / 通讯黑匣子",
      rows: telemetry.comm.map((line) => {
        const [time, status] = line.split(" / ");
        return [time, status ?? line];
      })
    },
    casualty: {
      title: "CASUALTY BLACK BOX / 伤亡黑匣子",
      rows: [
        ["叶胜", "KIA / 确认牺牲"],
        ["酒德亚纪", "KIA / 确认牺牲"],
        ["塞尔玛", "MIA-PKIA / 失踪推定牺牲"]
      ]
    },
    evidence: {
      title: "EVIDENCE LOCKER / 物证封存柜",
      rows: [
        ["黄铜罐", "SEALED / 封存"],
        ["金属匣", "RESTRICTED / 限制"],
        ["龙文影像", "DAMAGED / 受损"],
        ["结构数据", "PARTIAL / 残缺"]
      ]
    },
    assessment: {
      title: "EQUIPMENT / 装备状态",
      rows: telemetry.equipment.map((item) => [item.label, item.value])
    }
  };
  const focusCard = focusCards[activeId] ?? focusCards.brief;
  const points = [
    { id: "brief", label: "BRIEF / 简报", x: 9, y: 23 },
    { id: "command", label: "COMMAND / 指挥", x: 25, y: 31 },
    { id: "team", label: "DIVE TEAM / 下潜组", x: 26, y: 52 },
    { id: "site", label: "BRONZE CITY / 青铜城", x: 53, y: 61 },
    { id: "timeline", label: "ROUTE LOST / 路线失效", x: 63, y: 39 },
    { id: "casualty", label: "CASUALTY / 伤亡", x: 80, y: 30 },
    { id: "evidence", label: "EVIDENCE / 物证", x: 68, y: 73 },
    { id: "assessment", label: "ASSESS / 复盘", x: 88, y: 56 }
  ];

  return (
    <div className="kuimen-map" aria-hidden="true">
      <div className="kuimen-map-title">
        <span>CHANGJIANG / KUIMEN SECTOR</span>
        <strong>PLAN VIEW</strong>
      </div>
      <div className="kuimen-coordinate x-top">E 108.42 / FLOW EAST</div>
      <div className="kuimen-coordinate y-left">DEPTH GRID / SONAR MERGED</div>
      <div className="kuimen-surface-lane" />
      <div className="kuimen-underwater-zone" />
      <svg className="kuimen-terrain-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path className="terrain-bank bank-a" d="M0 26 C14 22 27 24 40 20 S68 14 100 18" />
        <path className="terrain-bank bank-b" d="M0 83 C18 78 32 81 46 75 S74 63 100 66" />
        <path className="terrain-line depth-a" d="M8 45 C22 40 35 43 48 37 S74 29 94 32" />
        <path className="terrain-line depth-b" d="M7 54 C23 50 36 51 50 46 S76 39 95 42" />
        <path className="terrain-line depth-c" d="M5 64 C20 61 35 60 52 55 S78 50 96 52" />
        <path className="terrain-line depth-d" d="M8 73 C24 70 39 69 55 64 S78 59 94 60" />
        <path className="terrain-line fault-a" d="M42 14 C46 28 44 38 49 52 S55 74 54 91" />
        <path className="terrain-line fault-b" d="M66 9 C62 24 64 38 60 49 S58 72 63 88" />
        <path className="sonar-arc arc-a" d="M24 28 A34 34 0 0 1 57 58" />
        <path className="sonar-arc arc-b" d="M24 28 A48 48 0 0 1 73 75" />
        <path className="city-contour city-a" d="M48 61 C52 52 67 50 75 56 C82 61 80 72 69 77 C58 82 45 75 48 61Z" />
        <path className="city-contour city-b" d="M53 63 C57 58 66 57 71 61 C76 65 73 71 66 73 C58 75 51 70 53 63Z" />
      </svg>
      <div className="kuimen-ship">
        <i />
        <span>MONIACH / 摩尼亚赫号</span>
        <em>SURFACE COMMAND / 水面指挥</em>
      </div>
      <div className="kuimen-sonar-sweep" />
      <svg className="kuimen-route-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path className={`kuimen-route route-dive${["team", "site", "timeline", "evidence"].includes(activeId) ? " is-active" : ""}`} d="M24 30 L27 48 L40 56 L53 61" />
        <path className={`kuimen-route route-lost${activeId === "timeline" || activeId === "casualty" ? " is-active" : ""}`} d="M53 61 L63 39 L80 30" />
        <path className={`kuimen-route route-evidence${activeId === "evidence" ? " is-active" : ""}`} d="M53 61 L68 73 L24 30" />
        <path className={`kuimen-route route-assess${activeId === "assessment" ? " is-active" : ""}`} d="M80 30 L88 56" />
      </svg>
      <div className={`kuimen-data-flow flow-dive${["team", "site", "timeline", "evidence"].includes(activeId) ? " is-active" : ""}`} />
      <div className={`kuimen-data-flow flow-lost${activeId === "timeline" || activeId === "casualty" ? " is-active" : ""}`} />
      <div className={`kuimen-data-flow flow-evidence${activeId === "evidence" ? " is-active" : ""}`} />
      <div className={`kuimen-route-label label-dive${["team", "site"].includes(activeId) ? " is-active" : ""}`}>DIVE ROUTE / 下潜路线</div>
      <div className={`kuimen-route-label label-lost${["timeline", "casualty"].includes(activeId) ? " is-active" : ""}`}>COMM LOST / 通讯失联</div>
      <div className={`kuimen-route-label label-recovery${activeId === "evidence" ? " is-active" : ""}`}>EVIDENCE RETURN / 物证回收</div>
      <div className={`kuimen-city-core${["site", "timeline", "evidence"].includes(activeId) ? " is-active" : ""}`}>
        <span>BRONZE CITY CORE / 青铜城核心</span>
      </div>
      <div className="kuimen-depth depth-120">-120M</div>
      <div className="kuimen-depth depth-210">-210M</div>
      <div className="kuimen-depth depth-360">-360M</div>
      <div className={`kuimen-threat-zone${["timeline", "casualty", "assessment"].includes(activeId) ? " is-active" : ""}`}>
        <span>SURFACE PURSUIT RISK / 水面追击风险</span>
      </div>
      <div className="kuimen-oxygen">
        <span>O2 WINDOW</span>
        <strong>02:00:00</strong>
      </div>
      <div className={`kuimen-focus-panel focus-${activeId}`}>
        <span>{focusCard.title}</span>
        {focusCard.rows.map(([label, value]) => (
          <p key={`${label}-${value}`}>
            <strong>{label}</strong>
            <em>{value}</em>
          </p>
        ))}
      </div>
      <div className={`kuimen-alert-strip tone-${telemetry.tone}`}>
        <span>MISSION-S</span>
        <strong>{telemetry.code}</strong>
        <em>{telemetry.note}</em>
      </div>
      {points.map((point) => (
        <div
          key={point.id}
          className={`kuimen-map-node${activeId === point.id ? " is-active" : ""}`}
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        >
          <i />
          <span>{point.label}</span>
        </div>
      ))}
    </div>
  );
}

function KuimenMissionArchive({ onClose }: { onClose: () => void }) {
  const [activeSection, setActiveSection] = useState(kuimenMissionSections[0]);
  const [activeLayerId, setActiveLayerId] = useState(kuimenArchiveLayers[0].id);
  const activeLayer = kuimenArchiveLayers.find((layer) => layer.id === activeLayerId) ?? kuimenArchiveLayers[0];

  return (
    <section className="mission-ops-archive" style={{ "--holo-color": "#b44c3f" } as CSSProperties}>
      <aside className="mission-phase-list">
        <span>EXECUTIVE DEPARTMENT / DEEP OPERATION</span>
        <h1>夔门计划</h1>
        <p>MISSION-S / 长江水下行动 / 青铜城接触</p>
        <div>
          {kuimenMissionSections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={activeSection.id === section.id ? "is-active" : ""}
              onClick={() => setActiveSection(section)}
            >
              <span>{section.level}</span>
              <strong>{section.label}</strong>
            </button>
          ))}
        </div>
        <MissionLayerDeck layers={kuimenArchiveLayers} activeLayerId={activeLayerId} onSelectLayer={setActiveLayerId} />
      </aside>
      <main className="mission-situation">
        <KuimenMissionMap activeId={activeLayer.mapFocus || activeSection.id} />
      </main>
      <aside className="mission-report-panel">
        <span>{activeSection.level}</span>
        <h2>{activeSection.label}</h2>
        <strong>{activeSection.status}</strong>
        <div className="bronze-fire-report-meta">
          <span>{activeSection.fileNo}</span>
          <span>{activeSection.classification}</span>
        </div>
        <p className="bronze-fire-report-summary">{activeSection.summary}</p>
        <div className="bronze-fire-report-block">
          <span>OPERATIONS REPORT</span>
          {activeSection.report.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="bronze-fire-report-tags">
          {activeSection.related.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <MissionLayerCard layer={activeLayer} />
        <div className="bronze-fire-report-block is-risk">
          <span>RISK ASSESSMENT</span>
          <p>{activeSection.risk}</p>
        </div>
        <div className="bronze-fire-report-block is-directive">
          <span>NORMA DIRECTIVE</span>
          <p>{activeSection.directive}</p>
        </div>
      </aside>
      <button type="button" className="bronze-fire-back mission-back" onClick={onClose}>
        <span>返回</span>
        <strong>执行部</strong>
      </button>
    </section>
  );
}

function BeijingNibelungMap({ activeId }: { activeId: string }) {
  const telemetry = beijingStageTelemetry[activeId] ?? beijingStageTelemetry.brief;
  const focusCards: Record<string, { title: string; rows: Array<[string, string]> }> = {
    brief: { title: "MISSION SNAPSHOT / 任务快照", rows: [["等级", "MISSION-SS"], ["目标", "地铁异常"], ["状态", "数据建模"]] },
    command: { title: "COMMAND STATUS / 指挥状态", rows: [["主节点", "楚子航"], ["支援", "诺玛"], ["链路", "不完整"]] },
    team: { title: "FIELD CHAIN / 行动链", rows: [["楚子航", "现场调查"], ["路明非", "接触链"], ["夏弥", "KING-03 锁定"]] },
    site: { title: "BATTLESPACE / 战场坐标", rows: [["现实层", "北京"], ["交通层", "地铁"], ["巢穴层", "尼伯龙根"]] },
    timeline: { title: "TIMELINE / 时间轴", rows: telemetry.comm.map((line) => { const [time, status] = line.split(" / "); return [time, status ?? line]; }) },
    casualty: { title: "CASUALTY / 伤亡后效", rows: [["失踪专员", "MIA / 关联确认"], ["夏弥", "KIA / 龙王处置"], ["楚子航", "RESIDUAL / 残留"]] },
    evidence: { title: "EVIDENCE LOCKER / 物证封存", rows: [["地铁卡", "SEALED"], ["笔记本", "RESTRICTED"], ["震动数据", "BACKUP"], ["影像残片", "DAMAGED"]] },
    assessment: { title: "NORMA ASSESS / 诺玛复盘", rows: [["案例等级", "MISSION-SS"], ["关联王座", "KING-03"], ["训练模板", "REQUIRED"]] }
  };
  const focusCard = focusCards[activeId] ?? focusCards.brief;
  const nodes = [
    { id: "brief", label: "BRIEF / 简报", x: 17, y: 28 },
    { id: "command", label: "COMMAND / 指挥", x: 34, y: 35 },
    { id: "team", label: "FIELD / 行动", x: 47, y: 48 },
    { id: "site", label: "HIDDEN STATION / 隐藏站台", x: 76, y: 36 },
    { id: "timeline", label: "NEST ENTRY / 巢穴入口", x: 67, y: 50 },
    { id: "casualty", label: "CASUALTY / 伤亡", x: 79, y: 27 },
    { id: "evidence", label: "EVIDENCE / 物证", x: 66, y: 72 },
    { id: "assessment", label: "ASSESS / 复盘", x: 86, y: 58 }
  ];

  return (
    <div className="beijing-map" aria-hidden="true">
      <div className="beijing-map-title">
        <span>BEIJING METRO / NIBELUNG OVERLAY</span>
        <strong>PLAN VIEW</strong>
      </div>
      <div className="beijing-coordinate">REAL / METRO / NEST COORDINATES</div>
      <svg className="beijing-metro-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path className="metro-line line-muted-a" d="M8 34 C24 27 38 31 50 43 S72 62 94 55" />
        <path className="metro-line line-muted-b" d="M10 72 C25 58 39 54 52 50 S74 38 92 26" />
        <path className="metro-line line-main" d="M18 27 L33 35 L47 48 L58 57 L67 50 L76 36 L83 32" />
        <path className="nest-contour nest-a" d="M46 60 C49 46 66 42 77 50 C88 58 83 75 69 81 C55 88 40 75 46 60Z" />
        <path className="nest-contour nest-b" d="M53 61 C56 54 66 52 72 57 C78 62 74 70 66 73 C57 76 49 69 53 61Z" />
        <path className="hidden-route" d="M47 48 L58 57 L67 50 L76 36" />
      </svg>
      <div className={`beijing-alert-strip tone-${telemetry.tone}`}>
        <span>MISSION-SS</span>
        <strong>{telemetry.code}</strong>
      </div>
      <div className="beijing-station station-real">REAL CITY / 现实层</div>
      <div className="beijing-station station-metro">METRO INTERFACE / 地铁接口</div>
      <div className={`beijing-nest-core${["site", "timeline", "assessment"].includes(activeId) ? " is-active" : ""}`}>NEST CORE / 地下巢穴</div>
      <div className={`beijing-train${["site", "timeline"].includes(activeId) ? " is-active" : ""}`}><span>TRAIN LINK / 列车接口</span></div>
      <div className={`beijing-hidden-station${["site", "timeline"].includes(activeId) ? " is-active" : ""}`}>HIDDEN STATION / 隐藏站台</div>
      <div className="beijing-line-stop stop-a" />
      <div className="beijing-line-stop stop-b" />
      <div className="beijing-line-stop stop-c" />
      <div className="beijing-line-stop stop-d" />
      <div className={`beijing-route-flow${["team", "site", "timeline"].includes(activeId) ? " is-active" : ""}`} />
      <div className={`beijing-focus-panel focus-${activeId}`}>
        <span>{focusCard.title}</span>
        {focusCard.rows.map(([label, value]) => (
          <p key={`${label}-${value}`}>
            <strong>{label}</strong>
            <em>{value}</em>
          </p>
        ))}
      </div>
      {nodes.map((node) => (
        <div key={node.id} className={`beijing-map-node${activeId === node.id ? " is-active" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }}>
          <i />
          <span>{node.label}</span>
        </div>
      ))}
    </div>
  );
}

function MissionLayerDeck({
  layers,
  activeLayerId,
  onSelectLayer
}: {
  layers: MissionArchiveLayer[];
  activeLayerId: string;
  onSelectLayer: (id: string) => void;
}) {
  return (
    <div className="mission-layer-deck">
      <span>ARCHIVE LAYERS / 档案层</span>
      <div className="mission-layer-tabs">
        {layers.map((layer) => (
          <button
            key={layer.id}
            type="button"
            className={activeLayerId === layer.id ? "is-active" : ""}
            onClick={() => onSelectLayer(layer.id)}
          >
            <span>{layer.code}</span>
            <strong>{layer.title}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function MissionLayerCard({ layer }: { layer: MissionArchiveLayer }) {
  return (
    <article className="mission-layer-card">
      <span>{layer.code} / ARCHIVE LAYER</span>
      <h3>{layer.title}</h3>
      <p>{layer.summary}</p>
      <div>
        {layer.points.map((point) => (
          <em key={point}>{point}</em>
        ))}
      </div>
      <strong>{layer.directive}</strong>
    </article>
  );
}

function BeijingNibelungArchive({ onClose }: { onClose: () => void }) {
  const [activeSection, setActiveSection] = useState(beijingNibelungSections[0]);
  const [activeLayerId, setActiveLayerId] = useState(beijingArchiveLayers[0].id);
  const activeLayer = beijingArchiveLayers.find((layer) => layer.id === activeLayerId) ?? beijingArchiveLayers[0];

  return (
    <section className="mission-ops-archive beijing-ops-archive" style={{ "--holo-color": "#b44c3f" } as CSSProperties}>
      <aside className="mission-phase-list">
        <span>EXECUTIVE DEPARTMENT / DEEP OPERATION</span>
        <h1>北京尼伯龙根事件</h1>
        <p>MISSION-SS / 城市级异常 / KING-03 接触</p>
        <div>
          {beijingNibelungSections.map((section) => (
            <button key={section.id} type="button" className={activeSection.id === section.id ? "is-active" : ""} onClick={() => setActiveSection(section)}>
              <span>{section.level}</span>
              <strong>{section.label}</strong>
            </button>
          ))}
        </div>
        <MissionLayerDeck layers={beijingArchiveLayers} activeLayerId={activeLayerId} onSelectLayer={setActiveLayerId} />
      </aside>
      <main className="mission-situation beijing-situation">
        <BeijingNibelungMap activeId={activeLayer.mapFocus || activeSection.id} />
      </main>
      <aside className="mission-report-panel">
        <span>{activeSection.level}</span>
        <h2>{activeSection.label}</h2>
        <strong>{activeSection.status}</strong>
        <div className="bronze-fire-report-meta">
          <span>{activeSection.fileNo}</span>
          <span>{activeSection.classification}</span>
        </div>
        <p className="bronze-fire-report-summary">{activeSection.summary}</p>
        <div className="bronze-fire-report-block">
          <span>OPERATIONS REPORT</span>
          {activeSection.report.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="bronze-fire-report-tags">
          {activeSection.related.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <MissionLayerCard layer={activeLayer} />
        <div className="bronze-fire-report-block is-risk">
          <span>RISK ASSESSMENT</span>
          <p>{activeSection.risk}</p>
        </div>
        <div className="bronze-fire-report-block is-directive">
          <span>NORMA DIRECTIVE</span>
          <p>{activeSection.directive}</p>
        </div>
      </aside>
      <button type="button" className="bronze-fire-back mission-back" onClick={onClose}>
        <span>返回</span>
        <strong>执行部</strong>
      </button>
    </section>
  );
}

function GenericMissionPlanMap({ dossier, activeId }: { dossier: MissionDeepDossier; activeId: string }) {
  const focusCards: Record<string, { title: string; rows: Array<[string, string]> }> = {
    brief: { title: "MISSION SNAPSHOT / 任务快照", rows: [["等级", dossier.subtitle.split(" / ")[0]], ["目标", dossier.title], ["状态", "建模中"]] },
    command: { title: "COMMAND / 指挥链", rows: [["链路", "多节点"], ["授权", "诺玛记录"], ["状态", "待复核"]] },
    team: { title: "FIELD TEAM / 行动人员", rows: [["人员", "高危"], ["权限", "临时"], ["状态", "接触中"]] },
    site: { title: "BATTLESPACE / 战场坐标", rows: [["坐标", "多层"], ["区域", "限制"], ["出口", "待确认"]] },
    timeline: { title: "TIMELINE / 时间轴", rows: [["阶段", "推进"], ["节点", "封存"], ["复盘", "记录中"]] },
    casualty: { title: "CASUALTY / 伤亡记录", rows: [["等级", "限制"], ["后效", "评估"], ["归档", "封存"]] },
    evidence: { title: "EVIDENCE / 物证封存", rows: [["状态", "SEALED"], ["备份", "NORMA"], ["权限", "限制"]] },
    assessment: { title: "ASSESS / 诺玛复盘", rows: [["结论", "生成"], ["模板", "可训练"], ["风险", "持续"]] }
  };
  const focusCard = focusCards[activeId] ?? focusCards.brief;
  const variantNodes: Record<MissionDeepDossier["mapVariant"], Array<{ id: string; label: string; x: number; y: number }>> = {
    japan: [
      { id: "brief", label: "TOKYO / 东京", x: 18, y: 24 },
      { id: "command", label: "GENJI / 源氏重工", x: 38, y: 36 },
      { id: "team", label: "FIELD CELL / 行动组", x: 30, y: 58 },
      { id: "site", label: "RED WELL / 红井", x: 58, y: 64 },
      { id: "timeline", label: "SEA ROUTE / 海路", x: 72, y: 45 },
      { id: "casualty", label: "BREACH / 失控", x: 82, y: 28 },
      { id: "evidence", label: "SACRED RELIC / 圣骸", x: 66, y: 76 },
      { id: "assessment", label: "CONTAIN / 收容", x: 88, y: 60 }
    ],
    greenland: [
      { id: "brief", label: "ICE SHELF / 冰层", x: 18, y: 24 },
      { id: "command", label: "SURFACE LINK / 水面链路", x: 34, y: 24 },
      { id: "team", label: "DIVE SUIT / 潜水组", x: 42, y: 52 },
      { id: "site", label: "WRECK ZONE / 残骸区", x: 58, y: 68 },
      { id: "timeline", label: "SIGNAL LOST / 信号终止", x: 70, y: 42 },
      { id: "casualty", label: "MIA / 失联", x: 82, y: 62 },
      { id: "evidence", label: "LOCKER / 潜水服", x: 68, y: 80 },
      { id: "assessment", label: "BAN / 禁令", x: 88, y: 34 }
    ],
    cassell: [
      { id: "brief", label: "GATE / 校门", x: 16, y: 52 },
      { id: "command", label: "CONTROL / 中央控制室", x: 48, y: 30 },
      { id: "team", label: "STUDENT TEAM / 学生战斗组", x: 34, y: 68 },
      { id: "site", label: "LIBRARY / 图书馆", x: 54, y: 54 },
      { id: "timeline", label: "LOCKDOWN / 封锁", x: 72, y: 38 },
      { id: "casualty", label: "BREACH / 入侵", x: 82, y: 66 },
      { id: "evidence", label: "ICE CELLAR / 冰窖", x: 68, y: 76 },
      { id: "assessment", label: "REVIEW / 复盘", x: 88, y: 22 }
    ],
    bronzeSecond: [
      { id: "brief", label: "SURFACE / 水面", x: 15, y: 30 },
      { id: "command", label: "MONIACH / 摩尼亚赫号", x: 30, y: 44 },
      { id: "team", label: "LURE TEAM / 诱导组", x: 44, y: 34 },
      { id: "site", label: "TARGET / 龙王目标", x: 62, y: 50 },
      { id: "timeline", label: "TORPEDO WINDOW / 鱼雷窗口", x: 76, y: 40 },
      { id: "casualty", label: "HULL RISK / 船体风险", x: 82, y: 64 },
      { id: "evidence", label: "ARSENAL / 七宗罪", x: 61, y: 76 },
      { id: "assessment", label: "KILL CONFIRM / 处决确认", x: 88, y: 52 }
    ]
  };
  const nodes = variantNodes[dossier.mapVariant];
  const activeSection = dossier.sections.find((section) => section.id === activeId);

  return (
    <div className={`generic-mission-map map-${dossier.mapVariant}`} aria-hidden="true">
      <div className="kuimen-map-title">
        <span>{dossier.mapTitle}</span>
        <strong>PLAN VIEW</strong>
      </div>
      <div className="kuimen-coordinate x-top">{dossier.coordinate}</div>
      <div className="kuimen-coordinate y-left">MISSION GRID / NORMA MERGED</div>
      <div className="generic-map-sector sector-a" />
      <div className="generic-map-sector sector-b" />
      <svg className="kuimen-terrain-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
        <path className="terrain-bank bank-a" d="M3 30 C18 18 32 29 46 22 S76 13 98 23" />
        <path className="terrain-bank bank-b" d="M4 78 C20 72 36 80 52 70 S78 58 96 64" />
        <path className="terrain-line depth-a" d="M8 42 C24 35 42 38 58 32 S78 28 94 36" />
        <path className="terrain-line depth-b" d="M9 57 C25 51 42 54 58 48 S79 40 93 46" />
        <path className="terrain-line fault-a" d="M28 18 L42 51 L34 82" />
        <path className="terrain-line fault-b" d="M74 16 L60 49 L79 82" />
        <path className="city-contour city-a" d="M48 59 C53 48 70 48 78 57 C85 65 78 78 64 80 C51 82 42 70 48 59Z" />
        <path className="city-contour city-b" d="M55 61 C59 56 67 55 72 60 C76 65 71 71 63 72 C56 73 51 67 55 61Z" />
      </svg>
      <div className="variant-map-mark mark-a" />
      <div className="variant-map-mark mark-b" />
      <div className="variant-map-label label-a" />
      <div className="variant-map-label label-b" />
      <svg className="kuimen-route-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
        {dossier.mapVariant === "japan" ? (
          <>
            <path className={`kuimen-route route-dive${["team", "site", "timeline", "evidence"].includes(activeId) ? " is-active" : ""}`} d="M18 24 C30 28 34 36 38 36 S52 48 58 64" />
            <path className={`kuimen-route route-lost${activeId === "timeline" || activeId === "casualty" ? " is-active" : ""}`} d="M58 64 C68 58 78 46 82 28" />
            <path className={`kuimen-route route-evidence${activeId === "evidence" || activeId === "assessment" ? " is-active" : ""}`} d="M58 64 C63 70 68 76 88 60" />
          </>
        ) : dossier.mapVariant === "greenland" ? (
          <>
            <path className={`kuimen-route route-dive${["team", "site", "timeline", "evidence"].includes(activeId) ? " is-active" : ""}`} d="M34 24 L42 52 L58 68 L68 80" />
            <path className={`kuimen-route route-lost${activeId === "timeline" || activeId === "casualty" ? " is-active" : ""}`} d="M42 52 C54 40 62 38 70 42 S79 54 82 62" />
            <path className={`kuimen-route route-evidence${activeId === "evidence" || activeId === "assessment" ? " is-active" : ""}`} d="M58 68 L68 80 L88 34" />
          </>
        ) : dossier.mapVariant === "cassell" ? (
          <>
            <path className={`kuimen-route route-dive${["team", "site", "timeline", "evidence"].includes(activeId) ? " is-active" : ""}`} d="M16 52 L34 68 L54 54 L68 76" />
            <path className={`kuimen-route route-lost${activeId === "timeline" || activeId === "casualty" ? " is-active" : ""}`} d="M48 30 L72 38 L82 66" />
            <path className={`kuimen-route route-evidence${activeId === "evidence" || activeId === "assessment" ? " is-active" : ""}`} d="M68 76 L54 54 L88 22" />
          </>
        ) : (
          <>
            <path className={`kuimen-route route-dive${["team", "site", "timeline", "evidence"].includes(activeId) ? " is-active" : ""}`} d="M30 44 C42 40 48 34 62 50" />
            <path className={`kuimen-route route-lost${activeId === "timeline" || activeId === "casualty" ? " is-active" : ""}`} d="M62 50 L76 40 L82 64" />
            <path className={`kuimen-route route-evidence${activeId === "evidence" || activeId === "assessment" ? " is-active" : ""}`} d="M62 50 L61 76 L88 52" />
          </>
        )}
      </svg>
      <div className={`generic-map-core${["site", "timeline", "evidence", "assessment"].includes(activeId) ? " is-active" : ""}`}>
        <span>{activeSection?.label ?? dossier.title}</span>
      </div>
      <div className={`generic-map-risk${["casualty", "assessment"].includes(activeId) ? " is-active" : ""}`}>
        <span>{activeSection?.status ?? "RISK NODE"}</span>
      </div>
      <div className={`kuimen-focus-panel focus-${activeId}`}>
        <span>{focusCard.title}</span>
        {focusCard.rows.map(([label, value]) => (
          <p key={`${label}-${value}`}>
            <strong>{label}</strong>
            <em>{value}</em>
          </p>
        ))}
      </div>
      {nodes.map((node) => (
        <div key={node.id} className={`kuimen-map-node${activeId === node.id ? " is-active" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }}>
          <i />
          <span>{node.label}</span>
        </div>
      ))}
    </div>
  );
}

function MissionDeepArchive({ dossier, onClose }: { dossier: MissionDeepDossier; onClose: () => void }) {
  const [activeSection, setActiveSection] = useState(dossier.sections[0]);
  const [activeLayerId, setActiveLayerId] = useState(dossier.layers[0].id);
  const activeLayer = dossier.layers.find((layer) => layer.id === activeLayerId) ?? dossier.layers[0];

  return (
    <section className="mission-ops-archive generic-ops-archive" style={{ "--holo-color": dossier.color } as CSSProperties}>
      <aside className="mission-phase-list">
        <span>EXECUTIVE DEPARTMENT / DEEP OPERATION</span>
        <h1>{dossier.title}</h1>
        <p>{dossier.subtitle}</p>
        <div>
          {dossier.sections.map((section) => (
            <button key={section.id} type="button" className={activeSection.id === section.id ? "is-active" : ""} onClick={() => setActiveSection(section)}>
              <span>{section.level}</span>
              <strong>{section.label}</strong>
            </button>
          ))}
        </div>
        <MissionLayerDeck layers={dossier.layers} activeLayerId={activeLayerId} onSelectLayer={setActiveLayerId} />
      </aside>
      <main className="mission-situation">
        <GenericMissionPlanMap dossier={dossier} activeId={activeLayer.mapFocus || activeSection.id} />
      </main>
      <aside className="mission-report-panel">
        <span>{activeSection.level}</span>
        <h2>{activeSection.label}</h2>
        <strong>{activeSection.status}</strong>
        <div className="bronze-fire-report-meta">
          <span>{activeSection.fileNo}</span>
          <span>{activeSection.classification}</span>
        </div>
        <p className="bronze-fire-report-summary">{activeSection.summary}</p>
        <div className="bronze-fire-report-block">
          <span>OPERATIONS REPORT</span>
          {activeSection.report.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="bronze-fire-report-tags">
          {activeSection.related.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <MissionLayerCard layer={activeLayer} />
        <div className="bronze-fire-report-block is-risk">
          <span>RISK ASSESSMENT</span>
          <p>{activeSection.risk}</p>
        </div>
        <div className="bronze-fire-report-block is-directive">
          <span>NORMA DIRECTIVE</span>
          <p>{activeSection.directive}</p>
        </div>
      </aside>
      <button type="button" className="bronze-fire-back mission-back" onClick={onClose}>
        <span>返回</span>
        <strong>执行部</strong>
      </button>
    </section>
  );
}

function SurveillanceGlobePanel({
  module,
  profile,
  onSelectRecord,
  onAccessLog
}: {
  module: HoloModule;
  profile?: AgentProfile | null;
  onSelectRecord: (record: ArchiveRecord) => void;
  onAccessLog?: (log: Omit<AccessLog, "id" | "at">) => void;
}) {
  const clearance = profile?.clearance ?? 1;
  const [forecastSignals, setForecastSignals] = useState<SurveillanceAnomaly[]>(fallbackNormaForecastSignals);
  const [forecastSourceStatus, setForecastSourceStatus] = useState<NormaForecastResponse["sourceStatus"]>("FALLBACK");
  const [forecastUpdatedAt, setForecastUpdatedAt] = useState<string | null>(null);
  const [selectedAnomalyCode, setSelectedAnomalyCode] = useState("");
  const [reviewState, setReviewState] = useState<Record<string, AnomalyReviewState>>({});
  const activeCount = forecastSignals.filter((item) => item.status !== "RESOLVED").length;
  const forecastSourceLabel =
    forecastSourceStatus === "LIVE" ? "实时接入" : forecastSourceStatus === "DEGRADED" ? "部分降级" : "本地缓存";
  const selectedAnomaly = forecastSignals.find((item) => item.code === selectedAnomalyCode) ?? null;
  const selectedLocked = selectedAnomaly ? clearance < selectedAnomaly.clearance : false;
  const selectedReviewStatus = selectedAnomaly ? reviewState[selectedAnomaly.code] ?? selectedAnomaly.status : "OFFLINE";
  const selectedReviewLog =
    selectedReviewStatus === "EXECUTIVE REVIEW"
      ? "执行部旁路监听已加入该异常。NORMA 将等待二次证据交叉验证。"
      : selectedReviewStatus === "ARCHIVE LINKED"
        ? "证据库与相关龙王档案索引已建立。受限内容仍遵循当前专员权限。"
        : selectedReviewStatus === "WATCH"
          ? "异常已转入持续观察。系统不会生成强制任务，仅保留态势记录。"
          : "等待专员复核。该异常不会被视为主线任务。";
  const signalSources = selectedAnomaly
    ? [
        `SAT-07 / ${selectedAnomaly.coordinate}`,
        `CITY NODE / ${selectedAnomaly.signal}`,
        `ARCHIVE CROSSREF / ${selectedAnomaly.level}`
      ]
    : [];
  const reviewActions: Array<{ id: AnomalyReviewState; label: string; detail: string }> = [
    { id: "EXECUTIVE REVIEW", label: "请求执行部复核", detail: "把异常交给执行部旁路监听，但不生成强制行动。" },
    { id: "ARCHIVE LINKED", label: "关联档案索引", detail: "建立证据库、龙王档案与该异常的交叉引用。" },
    { id: "WATCH", label: "标记持续观察", detail: "维持低频采样，等待新的信号进入队列。" }
  ];

  const selectedForecastStatus =
    selectedReviewStatus === "ELEVATE FORECAST" || selectedReviewStatus === "LINK ARCHIVE" || selectedReviewStatus === "KEEP WATCH"
      ? selectedReviewStatus
      : selectedAnomaly?.status ?? "OFFLINE";
  const selectedForecastLog =
    selectedForecastStatus === "ELEVATE FORECAST"
      ? "该灾害信号已被上调为龙王复苏预测，NORMA 将扩大采样范围并等待第二组自然灾害数据交叉验证。"
      : selectedForecastStatus === "LINK ARCHIVE"
        ? "相关龙王档案与灾害信号已建立索引。受限内容仍遵循当前专员权限。"
        : selectedForecastStatus === "KEEP WATCH"
          ? "该信号保留为持续监听状态。系统不会生成强制任务，仅更新复苏概率曲线。"
          : "等待专员判读。该记录代表自然灾害征兆，不代表事件已经发生。";
  const forecastSources = selectedAnomaly
    ? [
        `OBSERVED / ${formatForecastTime(selectedAnomaly.observedAt)}`,
        `DISASTER FEED / ${selectedAnomaly.disasterType ?? selectedAnomaly.level}`,
        `SAT-07 / ${selectedAnomaly.coordinate}`,
        `SIGNAL / ${selectedAnomaly.signal}`,
        `KING INDEX / ${selectedAnomaly.predictedKing ?? "UNKNOWN"} ${selectedAnomaly.probability ?? 0}%`
      ]
    : [];
  const forecastActions: Array<{ id: AnomalyReviewState; label: string; detail: string }> = [
    { id: "ELEVATE FORECAST", label: "上调复苏预测", detail: "扩大灾害采样范围，提高对应龙王复苏概率权重。" },
    { id: "LINK ARCHIVE", label: "关联龙王档案", detail: "建立自然灾害、龙王档案与证据库之间的索引。" },
    { id: "KEEP WATCH", label: "持续监听", detail: "不派遣执行部，仅追踪灾害链和概率曲线。" }
  ];

  useEffect(() => {
    let cancelled = false;
    let refreshTimeout: number | null = null;
    let refreshInterval: number | null = null;

    function applyForecast(forecast: NormaForecastResponse) {
      if (cancelled || !forecast.signals.length) return;

      setForecastSignals(forecast.signals);
      setForecastSourceStatus(forecast.sourceStatus);
      setForecastUpdatedAt(forecast.updatedAt);
      setSelectedAnomalyCode((current) => {
        return forecast.signals.some((signal) => signal.code === current) ? current : "";
      });
    }

    async function loadForecast() {
      try {
        const response = await fetch("/api/norma/forecast", { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const forecast = (await response.json()) as NormaForecastResponse;
        if (!forecast.signals.length) return;
        applyForecast(forecast);
        window.localStorage.setItem(
          normaForecastCacheKey,
          JSON.stringify({
            forecast,
            nextRefreshAt: getNextLocalMidnight()
          } satisfies CachedNormaForecast)
        );
      } catch {
        if (cancelled) return;
        setForecastSignals(fallbackNormaForecastSignals);
        setForecastSourceStatus("FALLBACK");
        setForecastUpdatedAt(new Date().toISOString());
      }
    }

    const cachedRaw = window.localStorage.getItem(normaForecastCacheKey);
    let nextRefreshAt = getNextLocalMidnight();

    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw) as CachedNormaForecast;
        if (cached.forecast?.signals?.length) {
          applyForecast(cached.forecast);
          nextRefreshAt = cached.nextRefreshAt;
        }
        if (!cached.nextRefreshAt || Date.now() >= cached.nextRefreshAt) {
          loadForecast();
          nextRefreshAt = getNextLocalMidnight();
        }
      } catch {
        loadForecast();
      }
    } else {
      loadForecast();
    }

    refreshTimeout = window.setTimeout(
      () => {
        loadForecast();
        refreshInterval = window.setInterval(loadForecast, oneDayMs);
      },
      Math.max(1000, nextRefreshAt - Date.now())
    );

    return () => {
      cancelled = true;
      if (refreshTimeout !== null) window.clearTimeout(refreshTimeout);
      if (refreshInterval !== null) window.clearInterval(refreshInterval);
    };
  }, []);

  const openAnomaly = (item: SurveillanceAnomaly) => {
    const alreadyOpen = selectedAnomalyCode === item.code;
    setSelectedAnomalyCode(alreadyOpen ? "" : item.code);
    if (alreadyOpen) return;

    const locked = clearance < item.clearance;

    if (locked) {
      onAccessLog?.({
        action: "DENIED_ACCESS",
        target: `SURVEILLANCE / ${item.code}`,
        result: "DENIED",
        detail: `CLEARANCE ${item.clearance} REQUIRED`
      });
      onSelectRecord({
        title: `${item.code} / ${item.title}`,
        level: item.level,
        status: `SEALED / CLEARANCE ${item.clearance} REQUIRED`,
        detail: `NORMA 拒绝访问完整异常记录。${item.title} 需要 CLEARANCE ${item.clearance}，当前专员仅可读取预警索引。`
      });
      return;
    }

    onAccessLog?.({
      action: "EVIDENCE_QUERY",
      target: `SURVEILLANCE / ${item.code}`,
      result: "ALLOWED",
      detail: `CLEARANCE ${clearance} VERIFIED`
    });
    onSelectRecord({
      title: `${item.code} / ${item.title}`,
      level: item.level,
      status: item.status,
      detail: `${item.location} / ${item.coordinate}。${item.summary} NORMA 判断：${item.norma} 建议：${item.recommendation}`
    });
  };

  const applyReviewAction = (item: SurveillanceAnomaly, action: AnomalyReviewState) => {
    const locked = clearance < item.clearance;

    if (locked) {
      onAccessLog?.({
        action: "DENIED_ACCESS",
        target: `SURVEILLANCE REVIEW / ${item.code}`,
        result: "DENIED",
        detail: `CLEARANCE ${item.clearance} REQUIRED`
      });
      return;
    }

    setReviewState((current) => ({ ...current, [item.code]: action }));
    onAccessLog?.({
      action: "EVIDENCE_QUERY",
      target: `SURVEILLANCE REVIEW / ${item.code}`,
      result: "ALLOWED",
      detail: action
    });
    onSelectRecord({
      title: `${item.code} / ${item.title}`,
      level: item.level,
      status: action,
      detail: `${item.location} / ${selectedForecastLog} NORMA 建议：${item.recommendation}`
    });
  };

  const renderForecastDesk = () => {
    if (!selectedAnomaly) return null;

    return (
      <article className={`surveillance-review-desk${selectedLocked ? " is-locked" : ""}`}>
        <header>
          <span>NORMA FORECAST DESK</span>
          <strong>{selectedLocked ? `CLEARANCE ${selectedAnomaly.clearance} REQUIRED` : selectedForecastStatus}</strong>
        </header>
        <h3>{selectedAnomaly.code} / {localizeForecastText(selectedAnomaly.title)}</h3>
        <p>{selectedLocked ? "该信号已转入受限序列。当前专员仅可读取坐标、标题和风险索引。" : selectedAnomaly.summary}</p>
        <div className="surveillance-review-grid">
          <div>
            <span>RISK LEVEL</span>
            <strong>{selectedAnomaly.level}</strong>
          </div>
          <div>
            <span>LOCATION</span>
            <strong>{localizeForecastText(selectedAnomaly.location)}</strong>
          </div>
          <div>
            <span>PREDICTED KING</span>
            <strong>{selectedAnomaly.predictedKing}</strong>
          </div>
          <div>
            <span>PROBABILITY</span>
            <strong>{selectedAnomaly.probability}%</strong>
          </div>
        </div>
        <div className="surveillance-probability-meter" aria-hidden="true">
          <span style={{ width: `${selectedAnomaly.probability ?? 0}%` }} />
        </div>
        <div className="surveillance-indicator-list">
          {(selectedAnomaly.indicators ?? []).map((indicator) => (
            <em key={indicator}>{indicator}</em>
          ))}
        </div>
        <div className="surveillance-source-list">
          {forecastSources.map((source) => (
            <em key={source}>{source}</em>
          ))}
        </div>
        <div className="surveillance-norma-note">
          <span>NORMA JUDGEMENT</span>
          <p>{selectedLocked ? `需要 CLEARANCE ${selectedAnomaly.clearance} 后读取完整判断。` : selectedAnomaly.norma}</p>
        </div>
        <div className="surveillance-norma-note">
          <span>REVIEW RESULT</span>
          <p>{selectedForecastLog}</p>
        </div>
      </article>
    );
  };

  return (
    <section
      className="surveillance-globe-panel"
      style={{ "--holo-color": module.color } as CSSProperties}
      aria-label="全球预警与异常投影"
    >
      <header className="surveillance-globe-header">
        <span>SURVEILLANCE GRID / DRAGON KING FORECAST</span>
        <strong>ACTIVE {activeCount} / {forecastSourceLabel} / CLEARANCE {clearance}</strong>
      </header>
      <div className="surveillance-globe-layout">
        <div className="surveillance-earth-wrap" aria-label="可拖动旋转的地球投影">
          <div
            className="surveillance-earth-canvas"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerMove={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
          >
            <GlobeStreamEarth
              anomalies={forecastSignals}
              clearance={clearance}
              onOpenAnomaly={openAnomaly}
            />
          </div>
          <div className="surveillance-scanline" aria-hidden="true" />
          <div className="surveillance-link-status">
            <span>NORMA-SAT-07</span>
            <strong>{forecastSourceLabel} / {forecastUpdatedAt ? new Date(forecastUpdatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "同步中"}</strong>
          </div>
        </div>
        <div className="surveillance-anomaly-list">
          <span>GLOBAL DISASTER FEED / KING PROBABILITY</span>
          <h2>灾害征兆预测</h2>
          {forecastSignals.map((item) => {
            const locked = clearance < item.clearance;
            const active = selectedAnomaly?.code === item.code;
            return (
              <div key={item.code} className="surveillance-forecast-row">
                <button
                type="button"
                className={`surveillance-anomaly-card${locked ? " is-locked" : ""}${active ? " is-active" : ""}`}
                onClick={() => openAnomaly(item)}
              >
                <header>
                  <span>{item.code}</span>
                  <strong>{locked ? `C-${item.clearance} REQUIRED` : reviewState[item.code] ?? `${item.predictedKing} ${item.probability}%`}</strong>
                  </header>
                  <h3>{localizeForecastText(item.title)}</h3>
                  <em className="surveillance-card-time">{formatForecastTime(item.observedAt)}</em>
                  <p>{locked ? "权限不足，仅显示灾害索引。" : `${item.disasterType} / ${item.signal}`}</p>
                </button>
                {active ? renderForecastDesk() : null}
              </div>
            );
          })}
          {selectedAnomaly ? (
            <article className={`surveillance-review-desk${selectedLocked ? " is-locked" : ""}`}>
              <header>
                <span>NORMA FORECAST DESK</span>
                <strong>{selectedLocked ? `CLEARANCE ${selectedAnomaly.clearance} REQUIRED` : selectedForecastStatus}</strong>
              </header>
              <h3>{selectedAnomaly.code} / {localizeForecastText(selectedAnomaly.title)}</h3>
              <p>{selectedLocked ? "该异常已转入受限序列。当前专员仅可读取坐标、标题和风险索引。" : selectedAnomaly.summary}</p>
              <div className="surveillance-review-grid">
                <div>
                  <span>RISK LEVEL</span>
                  <strong>{selectedAnomaly.level}</strong>
                </div>
                <div>
                  <span>LOCATION</span>
                  <strong>{localizeForecastText(selectedAnomaly.location)}</strong>
                </div>
                <div>
                  <span>PREDICTED KING</span>
                  <strong>{selectedAnomaly.predictedKing}</strong>
                </div>
                <div>
                  <span>PROBABILITY</span>
                  <strong>{selectedAnomaly.probability}%</strong>
                </div>
              </div>
              <div className="surveillance-probability-meter" aria-hidden="true">
                <span style={{ width: `${selectedAnomaly.probability ?? 0}%` }} />
              </div>
              <div className="surveillance-indicator-list">
                {(selectedAnomaly.indicators ?? []).map((indicator) => (
                  <em key={indicator}>{indicator}</em>
                ))}
              </div>
              <div className="surveillance-source-list">
                {forecastSources.map((source) => (
                  <em key={source}>{source}</em>
                ))}
              </div>
              <div className="surveillance-norma-note">
                <span>NORMA JUDGEMENT</span>
                <p>{selectedLocked ? `需要 CLEARANCE ${selectedAnomaly.clearance} 后读取完整判断。` : selectedAnomaly.norma}</p>
              </div>
              <div className="surveillance-norma-note">
                <span>REVIEW RESULT</span>
                <p>{selectedForecastLog}</p>
              </div>
              <div className="surveillance-review-actions">
                {forecastActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    disabled={selectedLocked}
                    className={selectedForecastStatus === action.id ? "is-active" : ""}
                    title={action.detail}
                    onClick={() => applyReviewAction(selectedAnomaly, action.id)}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </article>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function GlobeStreamEarth({
  anomalies,
  clearance,
  onOpenAnomaly
}: {
  anomalies: SurveillanceAnomaly[];
  clearance: number;
  onOpenAnomaly: (item: SurveillanceAnomaly) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onOpenRef = useRef(onOpenAnomaly);
  const draggingRef = useRef(false);
  const globeControlsRef = useRef<any>(null);
  const globeChartRef = useRef<any>(null);
  const lastDragXRef = useRef(0);

  useEffect(() => {
    onOpenRef.current = onOpenAnomaly;
  }, [onOpenAnomaly]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let chart: any = null;
    let cancelled = false;
    let rotationFrame: number | null = null;
    const cleanupHandlers: Array<() => void> = [];

    async function mountGlobe() {
      const earthFlyLine = (await import("earth-flyline")).default;
      if (cancelled || !containerRef.current) return;

      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (cancelled || !containerRef.current) return;

      earthFlyLine.registerMap("norma-world", normaWorldFeatureCollection as any);
      const globe = earthFlyLine.init({
        dom: containerRef.current,
        map: "norma-world",
        mode: "3d",
        cameraType: "OrthographicCamera",
        controls: "custom",
        autoRotate: false,
        rotateSpeed: 0,
        config: {
          R: 160,
          enableZoom: false,
          zoom: 1,
          bgStyle: {
            color: "#16181d",
            opacity: 0
          },
          earth: {
            color: "#070914",
            material: "MeshPhongMaterial",
            dragConfig: {
              rotationSpeed: 1,
              inertiaFactor: 0.95,
              disableX: true,
              disableY: true
            }
          },
          mapStyle: {
            areaColor: "#1d63c8",
            lineColor: "#f4f7ff"
          },
          spriteStyle: {
            color: "#16181d",
            show: false
          },
          pathStyle: {
            color: "#cd79ff"
          },
          flyLineStyle: {
            color: "#cd79ff"
          },
          roadStyle: {
            flyLineStyle: {
              color: "#cd79ff"
            },
            pathStyle: {
              color: "#cd79ff"
            }
          },
          scatterStyle: {
            color: "#cd79ff"
          },
          wallStyle: {
            color: "#cd79ff",
            opacity: 0.5
          }
        }
      } as any);
      chart = globe;
      globeChartRef.current = globe;

      if (globe.mainContainer) {
        globe.mainContainer.rotation.x = 0;
        globe.mainContainer.rotation.z = 0;
      }
      if (globe.controls?.options) {
        globe.controls.options.inertiaFactor = 0;
        globe.controls.options.disableX = true;
        globe.controls.options.disableY = true;
      }
      const originalUpdate = globe.controls?.update?.bind(globe.controls);
      if (originalUpdate && globe.mainContainer) {
        globeControlsRef.current = globe.controls;
        globe.controls.update = () => {
          if (globe.controls.rotationVelocity) {
            globe.controls.rotationVelocity.x = 0;
            globe.controls.rotationVelocity.y = 0;
          }
          globe.controls.isDragging = false;
          globe.mainContainer.rotation.x = 0;
          globe.mainContainer.rotation.z = 0;
        };
      }

      const clearDragState = () => {
        draggingRef.current = false;
        if (globe.controls) {
          globe.controls.isDragging = false;
        }
        if (globe.controls?.rotationVelocity) {
          globe.controls.rotationVelocity.x = 0;
          globe.controls.rotationVelocity.y = 0;
        }
      };
      const canvas = globe.renderer?.domElement as HTMLCanvasElement | undefined;
      window.addEventListener("mouseup", clearDragState);
      window.addEventListener("blur", clearDragState);
      cleanupHandlers.push(() => {
        window.removeEventListener("mouseup", clearDragState);
        window.removeEventListener("blur", clearDragState);
      });

      const rotateGlobe = () => {
        if (cancelled) return;
        if (globe.mainContainer && !draggingRef.current && !globe.controls?.isDragging) {
          globe.mainContainer.rotation.y += 0.0042;
          globe.mainContainer.rotation.x = 0;
          globe.mainContainer.rotation.z = 0;
        }
        rotationFrame = requestAnimationFrame(rotateGlobe);
      };
      rotateGlobe();

      globe.renderer?.setClearColor?.("#16181d", 1);
      await globe.addData?.("point", globeStreamDemoPoints);
      await globe.addData?.("road", globeStreamDemoRoads);
      await globe.addData?.("flyLine", globeStreamDemoFlyLines);

      const chinaRegions = (normaWorldFeatureCollection.features as any[]).filter((item) => item.properties?.name === "China");
      for (const region of chinaRegions) {
        const regionCoordinates = region?.geometry?.coordinates ?? [];
        for (const coordinates of regionCoordinates) {
          await globe.addData?.("mapStreamLine", { data: coordinates, style: { opacity: 1 } });
        }
      }

      await globe.addData?.(
        "point",
        anomalies.map((item) => ({
          id: item.code,
          code: item.code,
          lon: item.lon,
          lat: item.lat,
          style: {
            color: clearance < item.clearance ? "#776f68" : "#cd79ff"
          }
        }))
      );

      globe.on?.("click", (_event: Event, mesh?: { userData?: Record<string, unknown> }) => {
        const code = mesh?.userData?.code ?? mesh?.userData?.id;
        if (typeof code !== "string") return;
        const anomaly = anomalies.find((item) => item.code === code);
        if (anomaly) onOpenRef.current(anomaly);
      });
    }

    mountGlobe();

    return () => {
      cancelled = true;
      if (rotationFrame !== null) cancelAnimationFrame(rotationFrame);
      cleanupHandlers.forEach((cleanup) => cleanup());
      globeControlsRef.current = null;
      globeChartRef.current = null;
      chart?.destroy?.();
      if (container) container.innerHTML = "";
    };
  }, [anomalies, clearance]);

  return (
    <div
      ref={containerRef}
      className="surveillance-globestream-stage"
      onPointerDown={(event) => {
        draggingRef.current = true;
        lastDragXRef.current = event.clientX;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        if (globeControlsRef.current) {
          globeControlsRef.current.isDragging = false;
        }
        event.stopPropagation();
      }}
      onPointerMove={(event) => {
        const globe = globeChartRef.current;
        if (draggingRef.current && globe?.mainContainer) {
          const deltaX = event.clientX - lastDragXRef.current;
          lastDragXRef.current = event.clientX;
          globe.mainContainer.rotation.y += deltaX * 0.0055;
          globe.mainContainer.rotation.x = 0;
          globe.mainContainer.rotation.z = 0;
        }
        event.stopPropagation();
      }}
      onPointerUp={(event) => {
        draggingRef.current = false;
        if (globeControlsRef.current) {
          globeControlsRef.current.isDragging = false;
        }
        if (globeControlsRef.current?.rotationVelocity) {
          globeControlsRef.current.rotationVelocity.x = 0;
          globeControlsRef.current.rotationVelocity.y = 0;
        }
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        event.stopPropagation();
      }}
      onPointerCancel={(event) => {
        draggingRef.current = false;
        if (globeControlsRef.current) {
          globeControlsRef.current.isDragging = false;
        }
        if (globeControlsRef.current?.rotationVelocity) {
          globeControlsRef.current.rotationVelocity.x = 0;
          globeControlsRef.current.rotationVelocity.y = 0;
        }
        event.currentTarget.releasePointerCapture?.(event.pointerId);
        event.stopPropagation();
      }}
      onPointerLeave={(event) => {
        if (event.buttons === 0) {
          draggingRef.current = false;
          if (globeControlsRef.current) {
            globeControlsRef.current.isDragging = false;
          }
          if (globeControlsRef.current?.rotationVelocity) {
            globeControlsRef.current.rotationVelocity.x = 0;
            globeControlsRef.current.rotationVelocity.y = 0;
          }
        }
      }}
      onMouseUp={(event) => {
        draggingRef.current = false;
        if (globeControlsRef.current) {
          globeControlsRef.current.isDragging = false;
        }
        if (globeControlsRef.current?.rotationVelocity) {
          globeControlsRef.current.rotationVelocity.x = 0;
          globeControlsRef.current.rotationVelocity.y = 0;
        }
        event.stopPropagation();
      }}
      onMouseLeave={(event) => {
        if (event.buttons === 0) {
          draggingRef.current = false;
          if (globeControlsRef.current) {
            globeControlsRef.current.isDragging = false;
          }
        }
      }}
      onWheel={(event) => event.stopPropagation()}
    />
  );
}

function ArchivePanel({
  module,
  selectedRecord,
  onSelectRecord,
  onOpenDeepArchive,
  profile,
  onAccessLog
}: {
  module: HoloModule;
  selectedRecord: ArchiveRecord | null;
  onSelectRecord: (record: ArchiveRecord) => void;
  onOpenDeepArchive: (id: DeepArchiveId, record?: ArchiveRecord) => void;
  profile?: AgentProfile | null;
  onAccessLog?: (log: Omit<AccessLog, "id" | "at">) => void;
}) {
  const loreModule = getLoreModule(module.loreId);
  const blueprint = archiveBlueprints[module.id];
  const evidenceCount = loreModule?.evidence_count ?? 0;
  const books = loreModule?.books.join(" / ") ?? "1 / 2 / 3";
  const capabilities = blueprint?.workflow ?? loreModule?.capabilities.slice(0, 3) ?? module.lines;

  if (module.id === "missions") {
    return (
      <MissionOperationsPanel
        module={module}
        onSelectRecord={onSelectRecord}
        onOpenDeepArchive={onOpenDeepArchive}
        profile={profile}
        onAccessLog={onAccessLog}
      />
    );
  }

  if (module.id === "surveillance") {
    return (
      <SurveillanceGlobePanel
        module={module}
        profile={profile}
        onSelectRecord={onSelectRecord}
        onAccessLog={onAccessLog}
      />
    );
  }

  if (module.id === "identity" && profile) {
    const missionScores = Object.values(profile.missionScores);
    const reviewedArchives = profile.reviewedArchives ?? [];
    const accessLogs = profile.accessLogs ?? [];

    return (
      <section
        className="identity-stage domain-stage domain-identity agent-dossier-inline"
        style={{ "--holo-color": module.color } as CSSProperties}
        aria-label="专员履历"
      >
        <div className="identity-light" aria-hidden="true" />
        <span>AGENT DOSSIER / NORMA INTERNAL</span>
        <strong>{profile.bloodRank}</strong>
        <h1>{profile.name}</h1>
        <p>{profile.agentId} / {profile.department} / CLEARANCE {profile.clearance}</p>
        <div className="archive-metrics">
          <span>{profile.completedMissions.length} MISSION RECORDED</span>
          <span>{reviewedArchives.length} ARCHIVE REVIEWED</span>
          <span>BLOOD RANK {profile.bloodRank}</span>
        </div>
        <div className="agent-inline-records">
          <article>
            <span>MISSION RECORDS</span>
            {missionScores.length ? (
              missionScores.map((score) => (
                <em key={score.missionId}>MISSION-S / 夔门计划复盘 / RATING {score.rating} / SCORE {score.total}</em>
              ))
            ) : (
              <em>暂无执行部复盘记录</em>
            )}
          </article>
          <article>
            <span>ARCHIVE REVIEWS</span>
            {reviewedArchives.length ? (
              reviewedArchives.map((archiveId) => (
                <em key={archiveId}>{archiveId === "archive-bronze-fire" ? "KING-01 / 青铜与火之王初级档案" : archiveId} / REVIEWED</em>
              ))
            ) : (
              <em>暂无档案审阅记录</em>
            )}
          </article>
          <article>
            <span>NORMA NOTE</span>
            <em>该专员已完成基础王座级风险复盘。当前无强制派遣指令。</em>
          </article>
          <article>
            <span>ACCESS LOG</span>
            {accessLogs.length ? (
              accessLogs.slice(0, 5).map((log) => (
                <em key={log.id}>{log.action} / {log.target} / {log.result}</em>
              ))
            ) : (
              <em>暂无档案访问审计记录</em>
            )}
          </article>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`identity-stage domain-stage domain-${module.id}`}
      style={{ "--holo-color": module.color } as CSSProperties}
      aria-label={module.title}
    >
      <div className="identity-light" aria-hidden="true" />
      <span>{module.eyebrow}</span>
      {module.id === "academy" ? (
        <div className="domain-emblem">
          <img src="/cassell-emblem.png" alt="" />
        </div>
      ) : (
        <strong>{module.mark}</strong>
      )}
      <h1>{module.title}</h1>
      <p>{blueprint?.summary ?? module.subtitle}</p>
      <div className="domain-line-list">
        {capabilities.map((line) => (
          <em key={line}>{line}</em>
        ))}
      </div>
      <div className="archive-metrics">
        <span>BOOKS {books}</span>
        <span>{evidenceCount} INDEXED FILES</span>
        <span>{module.lines[0]}</span>
      </div>
      {blueprint ? (
        <div className="archive-record-grid">
          {blueprint.records.map((record) => {
            const requiredArchiveId = getRequiredArchiveId(module.id, record);
            const requiredClearance = getRequiredClearance(module.id, record);
            const hasClearance = (profile?.clearance ?? 1) >= requiredClearance;
            const unlocked = !requiredArchiveId || Boolean(profile?.unlockedArchives.includes(requiredArchiveId));
            const locked = Boolean(record.deepView && (!unlocked || !hasClearance));

            return (
              <button
                key={record.title}
                type="button"
                className={`archive-record-card${record.deepView && unlocked ? " has-deep-view" : ""}${locked ? " is-locked" : ""}`}
                onClick={() => {
                  if (locked) {
                    onAccessLog?.({
                      action: "DENIED_ACCESS",
                      target: `${record.level} / ${record.title}`,
                      result: "DENIED",
                      detail: `CLEARANCE ${requiredClearance} REQUIRED`
                    });
                    onSelectRecord({
                      ...record,
                      status: `SEALED / CLEARANCE ${requiredClearance} REQUIRED`,
                      detail:
                        requiredArchiveId === "archive-bronze-fire" && !unlocked
                          ? "NORMA 拒绝访问。完成 MISSION-S / 夔门计划复盘后，KING-01 初级档案将开放。"
                          : `NORMA 拒绝访问。该档案需要 CLEARANCE ${requiredClearance}，当前专员权限不足。`
                    });
                    return;
                  }
                  if (record.deepView) {
                    onAccessLog?.({
                      action: "ARCHIVE_ACCESS",
                      target: `${record.level} / ${record.title}`,
                      result: "ALLOWED",
                      detail: `CLEARANCE ${profile?.clearance ?? 1} VERIFIED`
                    });
                    onOpenDeepArchive(record.deepView, record);
                    return;
                  }
                  onSelectRecord(record);
                }}
              >
                <header>
                  <span>{record.level}</span>
                  <strong>{locked ? "SEALED" : record.status}</strong>
                </header>
                <h2>{record.title}</h2>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function ArchiveDetailDrawer({ module, record }: { module: HoloModule; record: ArchiveRecord }) {
  const blueprint = archiveBlueprints[module.id];

  return (
    <aside className="archive-detail-drawer" style={{ "--holo-color": module.color } as CSSProperties}>
      <span>{record.level}</span>
      <h2>{record.title}</h2>
      <strong>{record.status}</strong>
      <p>{record.detail}</p>
      <em>{blueprint?.workflow.join(" / ")}</em>
    </aside>
  );
}

function OverviewPanel({
  agentName,
  interfaceName,
  profile,
  operationCompleted,
  onStartOperation,
  onOpenKingArchive,
  onOpenDossier,
  workdeskOpen,
  onToggleWorkdesk
}: {
  agentName: string;
  interfaceName: string;
  profile?: AgentProfile | null;
  operationCompleted?: boolean;
  onStartOperation?: () => void;
  onOpenKingArchive?: () => void;
  onOpenDossier?: () => void;
  workdeskOpen?: boolean;
  onToggleWorkdesk?: () => void;
}) {
  const totalEvidence = lore.evidence.length;
  const booksLabel = lore.books.map((book) => `ⅠⅡⅢⅣⅤ`[book.book_index - 1] ?? String(book.book_index)).join(" / ");
  const missionCount = profile?.completedMissions.length ?? 0;
  const latestScore = profile ? Object.values(profile.missionScores).at(-1) : null;
  const kingReviewed = Boolean(profile?.reviewedArchives?.includes("archive-bronze-fire"));
  const directiveTitle = !operationCompleted
    ? "MISSION-S / 夔门计划复盘"
    : kingReviewed
      ? "NORMA WORK DESK / 当前无强制任务"
      : "KING-01 初级档案已开放";
  const directiveCopy = !operationCompleted
    ? "执行部下发复盘任务。审阅证据链，提交专员判断报告。"
    : kingReviewed
      ? "KING-01 初级审阅已记录。系统存在若干可复核事项，但当前没有强制派遣指令。"
      : "夔门计划复盘已写入专员履历。建议审阅青铜与火之王档案。";
  const primaryAction = kingReviewed && onOpenDossier ? onOpenDossier : operationCompleted && !kingReviewed && onOpenKingArchive ? onOpenKingArchive : onStartOperation;
  const primaryLabel = !operationCompleted ? "审阅任务包" : kingReviewed ? "打开专员履历" : "进入 KING-01 档案";

  return (
    <>
      <section className="identity-stage domain-stage domain-overview" style={{ "--holo-color": "#d9c27a" } as CSSProperties}>
        <div className="identity-light" aria-hidden="true" />
        <strong>S</strong>
        <h1>{agentName}</h1>
        <p>专员 · 执行部 · {interfaceName} 接口</p>
        <div className="archive-metrics overview-metrics">
          <span>{booksLabel} 已接入</span>
          <span>{totalEvidence} 条证据</span>
          <span>ACCESS LEVEL {profile?.clearance ?? "S"}</span>
          {profile ? <span>{profile.agentId}</span> : null}
          {profile ? <span>{missionCount} MISSION RECORDED</span> : null}
          {latestScore ? <span>LAST RATING {latestScore.rating}</span> : null}
        </div>
        {onStartOperation && !kingReviewed ? (
          <div className={`overview-operation-directive${operationCompleted ? " is-archived" : ""}`}>
            <span>NORMA DIRECTIVE</span>
            <h2>{directiveTitle}</h2>
            <p>{directiveCopy}</p>
            {operationCompleted && profile ? (
              <em className="overview-system-log">[NORMA] {profile.agentId} / CLEARANCE {profile.clearance} / KING-01 OPEN</em>
            ) : null}
            <button type="button" onClick={primaryAction}>
              {primaryLabel}
            </button>
          </div>
        ) : null}
      </section>
      {onStartOperation && kingReviewed ? (
        <aside className={`overview-workdesk-panel${workdeskOpen ? " is-open" : " is-collapsed"}`} aria-label="NORMA 工作台">
          <button type="button" className="overview-workdesk-toggle" onClick={onToggleWorkdesk} aria-expanded={workdeskOpen}>
            <span>WORK DESK</span>
            <strong>{workdeskOpen ? "收起" : "3 项"}</strong>
          </button>
          {workdeskOpen ? (
            <div className="overview-workdesk-body">
              <span>NORMA WORK DESK</span>
              <h2>通讯频道已建立</h2>
              {profile ? (
                <em className="overview-system-log">[NORMA] {profile.agentId} / CLEARANCE {profile.clearance} / WORK DESK STABLE</em>
              ) : null}
              <div className="norma-dialogue" aria-label="NORMA 通讯">
                <p>
                  <strong>NORMA</strong>
                  <span>专员，当前没有强制派遣指令。你可以保持在线，或进入履历复核已归档任务。</span>
                </p>
                <p>
                  <strong>NORMA</strong>
                  <span>KING-01 初级审阅已记录。相关访问权限将保留在你的专员档案中。</span>
                </p>
                <p className="is-muted">
                  <strong>SYSTEM</strong>
                  <span>BJ-METRO-07 被标记为城市异常记录。该事项尚未生成执行部任务。</span>
                </p>
              </div>
              <button type="button" onClick={primaryAction}>
                {primaryLabel}
              </button>
            </div>
          ) : null}
        </aside>
      ) : null}
    </>
  );
}

function MissionLaunchOverlay({ launch }: { launch: MissionLaunchState }) {
  return (
    <div className="mission-launch-overlay" aria-hidden="true">
      <div className="mission-launch-grid" />
      <div className="mission-launch-reticle">
        <i />
        <i />
        <i />
      </div>
      <div className="mission-launch-panel">
        <span>EXECUTIVE DEPARTMENT / OPERATION PACKAGE</span>
        <h2>{launch.title}</h2>
        <strong>{launch.level} / {launch.status}</strong>
        <div>
          <em>AUTHORIZING NORMA CHANNEL</em>
          <em>LOCKING BATTLESPACE COORDINATES</em>
          <em>LOADING FIELD ARCHIVE LAYERS</em>
          <em>DEPLOYMENT VIEW READY</em>
        </div>
      </div>
      <div className="mission-launch-strip">
        <span>MISSION FILE</span>
        <strong>{launch.id.toUpperCase().replaceAll("_", "-")}</strong>
      </div>
    </div>
  );
}

export default function HoloTerminal3D({
  agentName = "未知专员",
  profile,
  operationCompleted = false,
  onStartOperation,
  onOpenDossier,
  onArchiveReviewed,
  onAccessLog
}: {
  agentName?: string;
  profile?: AgentProfile | null;
  operationCompleted?: boolean;
  onStartOperation?: () => void;
  onOpenDossier?: () => void;
  onArchiveReviewed?: (archiveId: string) => void;
  onAccessLog?: (log: Omit<AccessLog, "id" | "at">) => void;
}) {
  const [activePreset, setActivePreset] = useState<HoloModuleId>("overview");
  const [selectedRecord, setSelectedRecord] = useState<ArchiveRecord | null>(null);
  const [activeDeepArchive, setActiveDeepArchive] = useState<DeepArchiveId | null>(null);
  const [missionLaunch, setMissionLaunch] = useState<MissionLaunchState | null>(null);
  const [workdeskOpen, setWorkdeskOpen] = useState(false);
  const detailDrawerRef = useRef<HTMLDivElement>(null);
  const activeModule = modules.find((module) => module.id === activePreset) ?? modules[0];
  const isFinger = agentName.trim() === "芬格尔";
  const interfaceName = isFinger ? "EVA" : "NORMA";
  const coreName = isFinger ? "EVA CORE" : "NORMA CORE";
  const terminalMode = isFinger ? "eva" : "norma";
  const inDeepArchive = activeDeepArchive !== null;
  const openKingArchive = () => {
    setSelectedRecord(null);
    setActivePreset("kings");
    setActiveDeepArchive("bronze_fire");
  };
  const openIdentityDossier = () => {
    setSelectedRecord(null);
    setActiveDeepArchive(null);
    setActivePreset("identity");
  };
  const openDeepArchive = (id: DeepArchiveId, record?: ArchiveRecord) => {
    setSelectedRecord(null);
    if (id.startsWith("mission_") && record) {
      setMissionLaunch({ id, title: record.title, level: record.level, status: record.status });
      return;
    }
    setActiveDeepArchive(id);
  };

  useEffect(() => {
    if (!missionLaunch) return;
    const timer = window.setTimeout(() => {
      setActiveDeepArchive(missionLaunch.id);
      setMissionLaunch(null);
    }, 4600);

    return () => window.clearTimeout(timer);
  }, [missionLaunch]);

  useEffect(() => {
    if (!selectedRecord || activeModule.id === "overview" || inDeepArchive) return;

    const closeDetailOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && detailDrawerRef.current?.contains(target)) return;
      setSelectedRecord(null);
    };

    document.addEventListener("pointerdown", closeDetailOnOutsidePointerDown, true);
    return () => document.removeEventListener("pointerdown", closeDetailOnOutsidePointerDown, true);
  }, [activeModule.id, inDeepArchive, selectedRecord]);

  return (
    <main
      className={`pure-holo-terminal terminal-${terminalMode} is-${activePreset}${activePreset === "overview" ? " is-overview" : ""}${
        inDeepArchive ? " is-deep-archive" : ""
      }`}
    >
      <div className="terminal-temple-aura" aria-hidden="true" />
      <div className="terminal-domain-atmosphere" aria-hidden="true" />
      <div className="eva-presence" aria-hidden="true" />
      <div className="eva-background-word" aria-hidden="true">
        {isFinger ? "EVA" : "CASSELL"}
      </div>
      <div className="norma-corner-mark" aria-hidden="true">
        <span>{interfaceName}</span>
        <small>卡塞尔全息终端</small>
      </div>
      {missionLaunch ? <MissionLaunchOverlay launch={missionLaunch} /> : null}
      {activeDeepArchive === "bronze_fire" ? (
        <BronzeFireArchive
          onClose={() => {
            onArchiveReviewed?.("archive-bronze-fire");
            setActiveDeepArchive(null);
            setActivePreset("kings");
            setSelectedRecord(null);
          }}
        />
      ) : activeDeepArchive === "mission_kuimen" ? (
        <KuimenMissionArchive
          onClose={() => {
            setActiveDeepArchive(null);
            setActivePreset("missions");
            setSelectedRecord(null);
          }}
        />
      ) : activeDeepArchive === "mission_beijing_nibelung" ? (
        <BeijingNibelungArchive
          onClose={() => {
            setActiveDeepArchive(null);
            setActivePreset("missions");
            setSelectedRecord(null);
          }}
        />
      ) : activeDeepArchive === "mission_japan_containment" ||
        activeDeepArchive === "mission_greenland_ice" ||
        activeDeepArchive === "mission_cassell_invasion" ||
        activeDeepArchive === "mission_bronze_second" ? (
        <MissionDeepArchive
          dossier={missionDeepDossiers[activeDeepArchive]}
          onClose={() => {
            setActiveDeepArchive(null);
            setActivePreset("missions");
            setSelectedRecord(null);
          }}
        />
      ) : activeDeepArchive === "black_king" ? (
        <BlackKingArchive
          onClose={() => {
            setActiveDeepArchive(null);
            setActivePreset("kings");
            setSelectedRecord(null);
          }}
        />
      ) : activeDeepArchive === "white_king" ? (
        <WhiteKingArchive
          onClose={() => {
            setActiveDeepArchive(null);
            setActivePreset("kings");
            setSelectedRecord(null);
          }}
        />
      ) : activeDeepArchive === "sky_wind" ? (
        <SkyWindArchive
          onClose={() => {
            setActiveDeepArchive(null);
            setActivePreset("kings");
            setSelectedRecord(null);
          }}
        />
      ) : activeDeepArchive === "earth_mountain" ? (
        <EarthMountainArchive
          onClose={() => {
            setActiveDeepArchive(null);
            setActivePreset("kings");
            setSelectedRecord(null);
          }}
        />
      ) : activeDeepArchive === "ocean_water" ? (
        <OceanWaterArchive
          onClose={() => {
            setActiveDeepArchive(null);
            setActivePreset("kings");
            setSelectedRecord(null);
          }}
        />
      ) : (
        <>
          {activeModule.id === "overview" ? (
            <OverviewPanel
              agentName={agentName}
              interfaceName={interfaceName}
              profile={profile}
              operationCompleted={operationCompleted}
              onStartOperation={onStartOperation}
              onOpenKingArchive={openKingArchive}
              onOpenDossier={onOpenDossier ?? openIdentityDossier}
              workdeskOpen={workdeskOpen}
              onToggleWorkdesk={() => setWorkdeskOpen((open) => !open)}
            />
          ) : (
            <ArchivePanel
              module={activeModule}
              selectedRecord={selectedRecord}
              onSelectRecord={setSelectedRecord}
              onOpenDeepArchive={openDeepArchive}
              profile={profile}
              onAccessLog={onAccessLog}
            />
          )}
          {activeModule.id !== "overview" && activeModule.id !== "surveillance" && selectedRecord ? (
            <div ref={detailDrawerRef}>
              <ArchiveDetailDrawer module={activeModule} record={selectedRecord} />
            </div>
          ) : null}
          <div className="holo-preset-bar">
            {modules.map((module) => (
              <button
                type="button"
                key={module.id}
                className={activePreset === module.id ? "is-active" : ""}
                onClick={() => {
                  setActivePreset(module.id);
                  setSelectedRecord(null);
                  setActiveDeepArchive(null);
                }}
              >
                {module.label}
              </button>
            ))}
          </div>
        </>
      )}
      {activePreset !== "overview" && !inDeepArchive ? (
        <button
          type="button"
          className="holo-return-rune"
          onClick={() => {
            setActivePreset("overview");
            setSelectedRecord(null);
            setActiveDeepArchive(null);
          }}
        >
          <span>回溯至</span>
          <strong>{coreName}</strong>
        </button>
      ) : null}
      <div className="holo-whisper" aria-hidden="true">
        卡塞尔学院 · {interfaceName} 终端 · 连接协议 4.2.7
      </div>
      <div className="terminal-vignette" aria-hidden="true" />
      {!inDeepArchive ? <HoloScene activeId={activePreset} onSelect={setActivePreset} /> : null}
    </main>
  );
}

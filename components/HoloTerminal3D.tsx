"use client";

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { CSSProperties } from "react";
import { MutableRefObject, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import normaLoreData from "@/data/norma-lore.json";

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
    subtitle: "黑王、白王、四大君王、苏醒记录与疑似身份。",
    position: [4.55, 1.02, -1.72],
    color: "#e2bd64",
    camera: [4.2, 1.65, 2.95],
    target: [4.55, 0.84, -1.72],
    mark: "王",
    lines: ["四王座：封存", "危险等级：不可直视", "证据链：可解封"]
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
};

type ArchiveBlueprint = {
  summary: string;
  records: ArchiveRecord[];
  workflow: string[];
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
    summary: "这一区域是执行部战情室，存放任务等级、人员、通讯和行动路线。",
    records: [
      { title: "青铜计划", level: "S", status: "已封存", detail: "长江水下行动，关联青铜城、龙王苏醒和七宗罪。" },
      { title: "北京尼伯龙根事件", level: "SS", status: "高危", detail: "城市级异常空间，关联楚子航、夏弥与大地与山之王。" },
      { title: "日本任务", level: "SS", status: "待解封", detail: "第三部核心行动，可作为后续执行部二级空间重点制作。" },
      { title: "格陵兰冰海记录", level: "封存", status: "历史事故", detail: "执行部纪律与水下配合禁令的重要来源。" },
      { title: "救援请求链路", level: "A", status: "在线", detail: "诺玛接收任务说明、行动回报和总部救援信号。" }
    ],
    workflow: ["接收任务", "分配专员", "锁定坐标", "同步通讯", "生成撤离路线"]
  },
  kings: {
    summary: "这一区域是禁忌档案，不以资料页呈现，而像被层层封印的王座。",
    records: [
      { title: "青铜与火之王", level: "极高危", status: "已苏醒记录", detail: "关联诺顿、康斯坦丁、青铜城与七宗罪。" },
      { title: "大地与山之王", level: "极高危", status: "身份解封", detail: "关联耶梦加得、芬里厄和北京尼伯龙根。" },
      { title: "天空与风之王", level: "封存", status: "资料不足", detail: "保留王座位置，只显示低亮度封印环。" },
      { title: "海洋与水之王", level: "封存", status: "资料不足", detail: "保留王座位置，等待后续原文证据补强。" },
      { title: "黑王 / 白王谱系", level: "禁忌", status: "不可直视", detail: "作为龙族世界观最高层级档案，仅以碎片形式显示。" }
    ],
    workflow: ["验证权限", "解除第一封印", "显示谱系关系", "展开原文证据链"]
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
      <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.06} enablePan minDistance={2.25} maxDistance={12} />
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

function ArchivePanel({
  module,
  selectedRecord,
  onSelectRecord
}: {
  module: HoloModule;
  selectedRecord: ArchiveRecord | null;
  onSelectRecord: (record: ArchiveRecord) => void;
}) {
  const loreModule = getLoreModule(module.loreId);
  const evidence = getModuleEvidence(module.loreId);
  const blueprint = archiveBlueprints[module.id];
  const evidenceCount = loreModule?.evidence_count ?? 0;
  const books = loreModule?.books.join(" / ") ?? "1 / 2 / 3";
  const capabilities = blueprint?.workflow ?? loreModule?.capabilities.slice(0, 3) ?? module.lines;

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
        <span>{evidenceCount} EVIDENCE</span>
        <span>{module.lines[0]}</span>
      </div>
      {blueprint ? (
        <div className="archive-record-grid">
          {blueprint.records.map((record) => (
            <button key={record.title} type="button" className="archive-record-card" onClick={() => onSelectRecord(record)}>
              <header>
                <span>{record.level}</span>
                <strong>{record.status}</strong>
              </header>
              <h2>{record.title}</h2>
              <p>{record.detail}</p>
            </button>
          ))}
        </div>
      ) : null}
      <div className="archive-evidence-list">
        {evidence.map((item) => (
          <article key={item.id}>
            <header>
              <span>{item.id}</span>
              <strong>{item.book_title}</strong>
            </header>
            <p>{item.excerpt}</p>
          </article>
        ))}
      </div>
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

function OverviewPanel({ agentName, interfaceName }: { agentName: string; interfaceName: string }) {
  const totalEvidence = lore.evidence.length;
  const booksLabel = lore.books.map((book) => `ⅠⅡⅢⅣⅤ`[book.book_index - 1] ?? String(book.book_index)).join(" / ");

  return (
    <section className="identity-stage domain-stage domain-overview" style={{ "--holo-color": "#d9c27a" } as CSSProperties}>
      <div className="identity-light" aria-hidden="true" />
      <strong>S</strong>
      <h1>{agentName}</h1>
      <p>专员 · 执行部 · {interfaceName} 接口</p>
      <div className="archive-metrics overview-metrics">
        <span>{booksLabel} 已接入</span>
        <span>{totalEvidence} 条证据</span>
        <span>ACCESS LEVEL S</span>
      </div>
    </section>
  );
}

export default function HoloTerminal3D({ agentName = "未知专员" }: { agentName?: string }) {
  const [activePreset, setActivePreset] = useState<HoloModuleId>("overview");
  const [selectedRecord, setSelectedRecord] = useState<ArchiveRecord | null>(null);
  const activeModule = modules.find((module) => module.id === activePreset) ?? modules[0];
  const isFinger = agentName.trim() === "芬格尔";
  const interfaceName = isFinger ? "EVA" : "NORMA";
  const coreName = isFinger ? "EVA CORE" : "NORMA CORE";
  const terminalMode = isFinger ? "eva" : "norma";

  return (
    <main className={`pure-holo-terminal terminal-${terminalMode} is-${activePreset}${activePreset === "overview" ? " is-overview" : ""}`}>
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
      {activeModule.id === "overview" ? (
        <OverviewPanel agentName={agentName} interfaceName={interfaceName} />
      ) : (
        <ArchivePanel module={activeModule} selectedRecord={selectedRecord} onSelectRecord={setSelectedRecord} />
      )}
      {activeModule.id !== "overview" && selectedRecord ? <ArchiveDetailDrawer module={activeModule} record={selectedRecord} /> : null}
      <div className="holo-preset-bar">
        {modules.map((module) => (
          <button
            type="button"
            key={module.id}
            className={activePreset === module.id ? "is-active" : ""}
            onClick={() => {
              setActivePreset(module.id);
              setSelectedRecord(null);
            }}
          >
            {module.label}
          </button>
        ))}
      </div>
      {activePreset !== "overview" ? (
        <button
          type="button"
          className="holo-return-rune"
          onClick={() => {
            setActivePreset("overview");
            setSelectedRecord(null);
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
      <HoloScene activeId={activePreset} onSelect={setActivePreset} />
    </main>
  );
}

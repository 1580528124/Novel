"use client";

import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { OrbitControls } from "@react-three/drei";
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import * as THREE from "three";
import { createGalaxyStars, GalaxyStar } from "@/lib/galaxyData";

const baseColor = new THREE.Color();
const fadedColor = new THREE.Color("#8d93a3");
const highlightColor = new THREE.Color("#fff7d6");
const INTRO_DURATION = 14200;
const dragonPalette = {
  goldenEye: "#ffd36b",
  blood: "#c24a35",
  bronze: "#8f7650",
  cyan: "#5fa99a",
  cold: "#6e8fb8",
  shadow: "#425063",
  warm: "#d2a867"
};
const introChapters = [
  "卡塞尔之门",
  "黄金瞳",
  "恺撒",
  "青铜城",
  "龙影",
  "星与花",
  "弟弟",
  "哥哥",
  "龙墓",
  "七宗罪"
];
const introChapterPositions = [
  ["-34vw", "-24vh", "-8deg"],
  ["-8vw", "-30vh", "6deg"],
  ["25vw", "-25vh", "-5deg"],
  ["38vw", "-8vh", "9deg"],
  ["26vw", "18vh", "-7deg"],
  ["4vw", "29vh", "5deg"],
  ["-24vw", "22vh", "-10deg"],
  ["-39vw", "4vh", "8deg"],
  ["-18vw", "-5vh", "4deg"],
  ["15vw", "3vh", "-6deg"]
];

type ArchiveZone = {
  id: string;
  title: string;
  code: string;
  category: string;
  riskLevel: string;
  accessLevel: string;
  summary: string;
  color: string;
  position: [number, number, number];
  nodeCount: number;
};

type ArchiveViewMode = "overview" | "zone";

const archiveZones: ArchiveZone[] = [
  {
    id: "dragon-kings",
    title: "龙王档案区",
    code: "DRAGON KING ARCHIVE",
    category: "君王 / 古龙",
    riskLevel: "S",
    accessLevel: "A",
    summary: "四大君王、黑王、白王与高危龙类实体的封存资料。",
    color: "#c24a35",
    position: [-15, 2.8, -5],
    nodeCount: 18
  },
  {
    id: "cassell",
    title: "卡塞尔学院区",
    code: "CASSELL COLLEGE",
    category: "学院 / 组织",
    riskLevel: "B",
    accessLevel: "B",
    summary: "校长、执行部、学生会、狮心会与 Norma 系统资料。",
    color: "#6e8fb8",
    position: [0, 4.2, -8],
    nodeCount: 16
  },
  {
    id: "characters",
    title: "人物档案区",
    code: "PERSONNEL FILES",
    category: "混血种 / 关键人物",
    riskLevel: "A",
    accessLevel: "A",
    summary: "路明非、诺诺、楚子航、恺撒等关键人物档案与关系线。",
    color: "#d2a867",
    position: [15, 1.8, -4],
    nodeCount: 22
  },
  {
    id: "missions",
    title: "任务记录区",
    code: "MISSION LOGS",
    category: "执行部 / 事件",
    riskLevel: "A",
    accessLevel: "B",
    summary: "青铜城、三峡水下行动、尼伯龙根与高危任务记录。",
    color: "#5fa99a",
    position: [-12, -4.4, 2],
    nodeCount: 20
  },
  {
    id: "bloodline",
    title: "言灵与血统区",
    code: "WORD SPIRIT LAB",
    category: "言灵 / 血统 / 炼金",
    riskLevel: "S",
    accessLevel: "A",
    summary: "血统评级、黄金瞳、暴血、言灵响应与炼金矩阵。",
    color: "#ffd36b",
    position: [0, -2.8, 1],
    nodeCount: 24
  },
  {
    id: "text-emotions",
    title: "原文情绪样本库",
    code: "TEXT EMOTION LIBRARY",
    category: "文本 / 情绪样本",
    riskLevel: "C",
    accessLevel: "C",
    summary: "当前已解析的小说原文片段，作为 Norma 的情绪训练样本。",
    color: "#8f7650",
    position: [17, -5.2, 4],
    nodeCount: 793
  }
];

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function scaleCssLength(value: string, factor: number) {
  const match = value.match(/^(-?\d+(?:\.\d+)?)([a-z%]+)$/i);
  if (!match) return value;
  return `${Number(match[1]) * factor}${match[2]}`;
}

function getIntroProgress(t: number, start: number | null) {
  if (start === null) return 0;
  return easeOutCubic(clamp01((t - start - 10.5) / 2.8));
}

function archiveFocusScale(viewMode: ArchiveViewMode, activeZone?: ArchiveZone) {
  if (viewMode !== "zone") return 1;
  return activeZone?.id === "text-emotions" ? 1.28 : 1.85;
}

function archiveFocusTarget(activeZone: ArchiveZone, viewMode: ArchiveViewMode) {
  const scale = archiveFocusScale(viewMode, activeZone);
  return viewMode === "zone"
    ? new THREE.Vector3(
        -activeZone.position[0] * scale,
        -activeZone.position[1] * scale,
        -activeZone.position[2] * scale
      )
    : new THREE.Vector3(0, 0, 0);
}

function displayColorForStar(star: GalaxyStar) {
  const intensity = Math.max(Math.abs(star.score), star.intensity ?? 0);
  if (star.isGoldenEye) return dragonPalette.goldenEye;
  if (star.motifs.length > 1) return intensity > 0.62 ? dragonPalette.blood : dragonPalette.bronze;
  if (star.score > 0.45) return intensity > 0.68 ? "#d48845" : dragonPalette.warm;
  if (star.score < -0.45) return intensity > 0.68 ? "#536f9e" : dragonPalette.cold;
  if (star.motifs.length > 0) return dragonPalette.cyan;
  return intensity > 0.58 ? "#a47c52" : dragonPalette.shadow;
}

function resonanceForStar(star: GalaxyStar) {
  const motifWeight = Math.min(0.45, star.motifs.length * 0.12);
  const goldenWeight = star.isGoldenEye ? 0.28 : 0;
  return Math.round(clamp01(Math.abs(star.score) * 0.48 + star.intensity * 0.34 + motifWeight + goldenWeight) * 100);
}

function riskLevelForResonance(resonance: number) {
  if (resonance >= 88) return "S";
  if (resonance >= 72) return "A";
  if (resonance >= 56) return "B";
  if (resonance >= 38) return "C";
  return "D";
}

function hash(seed: number) {
  const value = Math.sin(seed * 812.71) * 10000;
  return value - Math.floor(value);
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
  gradient.addColorStop(0.1, "rgba(255,255,255,0.92)");
  gradient.addColorStop(0.28, "rgba(255,255,255,0.5)");
  gradient.addColorStop(0.58, "rgba(255,255,255,0.16)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createRingTexture(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const center = size / 2;
  const gradient = context.createRadialGradient(center, center, size * 0.18, center, center, center);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.48, "rgba(255,255,255,0)");
  gradient.addColorStop(0.58, "rgba(255,255,255,0.78)");
  gradient.addColorStop(0.68, "rgba(255,255,255,0.16)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createGoldenEyeTexture(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const center = size / 2;
  context.clearRect(0, 0, size, size);
  context.save();
  context.translate(center, center);
  context.scale(1.58, 0.72);
  context.beginPath();
  context.arc(0, 0, size * 0.28, 0, Math.PI * 2);
  context.clip();

  const iris = context.createRadialGradient(0, 0, size * 0.02, 0, 0, size * 0.28);
  iris.addColorStop(0, "rgba(255,246,202,0.98)");
  iris.addColorStop(0.18, "rgba(255,218,113,0.94)");
  iris.addColorStop(0.46, "rgba(176,115,38,0.88)");
  iris.addColorStop(0.78, "rgba(73,45,21,0.84)");
  iris.addColorStop(1, "rgba(10,7,5,0)");
  context.fillStyle = iris;
  context.fillRect(-center, -center, size, size);

  context.globalCompositeOperation = "lighter";
  for (let index = 0; index < 52; index += 1) {
    const angle = (index / 52) * Math.PI * 2;
    const inner = size * (0.045 + hash(index + 5100) * 0.04);
    const outer = size * (0.18 + hash(index + 5200) * 0.08);
    context.beginPath();
    context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    context.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    context.strokeStyle = `rgba(255,222,128,${0.12 + hash(index + 5300) * 0.22})`;
    context.lineWidth = 0.7 + hash(index + 5400) * 1.4;
    context.stroke();
  }

  context.globalCompositeOperation = "source-over";
  context.strokeStyle = "rgba(255,230,155,0.54)";
  context.lineWidth = 2.2;
  context.beginPath();
  context.arc(0, 0, size * 0.205, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = "rgba(53,32,14,0.62)";
  context.lineWidth = 7;
  context.beginPath();
  context.arc(0, 0, size * 0.255, 0, Math.PI * 2);
  context.stroke();

  context.fillStyle = "rgba(4,2,1,0.92)";
  context.beginPath();
  context.ellipse(0, 0, size * 0.012, size * 0.2, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = "rgba(255,226,142,0.28)";
  context.lineWidth = 1.2;
  context.beginPath();
  context.moveTo(0, -size * 0.18);
  context.lineTo(0, size * 0.18);
  context.stroke();

  context.fillStyle = "rgba(255,248,206,0.58)";
  context.beginPath();
  context.ellipse(-size * 0.055, -size * 0.085, size * 0.032, size * 0.012, -0.45, 0, Math.PI * 2);
  context.fill();
  context.restore();

  const glow = context.createRadialGradient(center, center, size * 0.08, center, center, size * 0.48);
  glow.addColorStop(0, "rgba(255,213,107,0.2)");
  glow.addColorStop(0.46, "rgba(255,148,62,0.1)");
  glow.addColorStop(1, "rgba(255,213,107,0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, size, size);

  context.save();
  context.globalCompositeOperation = "destination-in";
  context.translate(center, center);
  context.scale(1.58, 0.72);
  const mask = context.createRadialGradient(0, 0, size * 0.02, 0, 0, size * 0.34);
  mask.addColorStop(0, "rgba(255,255,255,1)");
  mask.addColorStop(0.72, "rgba(255,255,255,0.96)");
  mask.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = mask;
  context.fillRect(-center, -center, size, size);
  context.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function DeepSpaceBackdrop() {
  const glowTexture = useMemo(() => createGlowTexture(128), []);
  const nearStarsRef = useRef<THREE.Points>(null);
  const farStarsRef = useRef<THREE.Points>(null);

  const farStars = useMemo(() => {
    const count = 70;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const blue = new THREE.Color("#7fa5c8");
    const pink = new THREE.Color("#c58b58");
    const white = new THREE.Color("#f4e6c1");
    const color = new THREE.Color();

    for (let index = 0; index < count; index += 1) {
      const angle = hash(index + 1800) * Math.PI * 2;
      const radius = 42 + hash(index + 1900) * 42;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = (hash(index + 2000) - 0.5) * 42;
      positions[index * 3 + 2] = Math.sin(angle) * radius - 24 - hash(index + 2100) * 36;

      color.copy(white);
      color.lerp(hash(index + 2200) > 0.62 ? pink : blue, hash(index + 2300) * 0.36);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, []);

  const nearStars = useMemo(() => {
    const count = 20;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let index = 0; index < count; index += 1) {
      const angle = hash(index + 2400) * Math.PI * 2;
      const radius = 24 + hash(index + 2500) * 34;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = (hash(index + 2600) - 0.5) * 30;
      positions[index * 3 + 2] = Math.sin(angle) * radius - 10 - hash(index + 2700) * 18;

      color.set(hash(index + 2800) > 0.5 ? "#f4d58a" : "#7fb0a6");
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, []);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (farStarsRef.current) farStarsRef.current.rotation.y = elapsed * 0.002;
    if (nearStarsRef.current) nearStarsRef.current.rotation.y = -elapsed * 0.004;
  });

  return (
    <group renderOrder={-10}>
      <points ref={farStarsRef} geometry={farStars}>
        <pointsMaterial
          size={0.16}
          sizeAttenuation
          transparent
          opacity={0.54}
          map={glowTexture}
          vertexColors
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <points ref={nearStarsRef} geometry={nearStars}>
        <pointsMaterial
          size={0.28}
          sizeAttenuation
          transparent
          opacity={0.42}
          map={glowTexture}
          vertexColors
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

function GalaxyField({
  stars,
  query,
  selectedId,
  onSelect,
  introActive,
  activeZone,
  viewMode
}: {
  stars: GalaxyStar[];
  query: string;
  selectedId: number;
  onSelect: (star: GalaxyStar) => void;
  introActive: boolean;
  activeZone: ArchiveZone;
  viewMode: ArchiveViewMode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const introStartRef = useRef<number | null>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const glowRef = useRef<THREE.Points>(null);
  const selectedGlowRef = useRef<THREE.Sprite>(null);
  const selectedRippleRef = useRef<THREE.Sprite>(null);
  const normalizedQuery = query.trim().toLowerCase();
  const isTextZoneFocused = viewMode === "zone" && activeZone.id === "text-emotions";
  const isOtherZoneFocused = viewMode === "zone" && activeZone.id !== "text-emotions";

  const starTexture = useMemo(() => createGlowTexture(128), []);
  const ringTexture = useMemo(() => createRingTexture(256), []);

  const geometry = useMemo(() => {
    const positions = new Float32Array(stars.length * 3);
    const colors = new Float32Array(stars.length * 3);

    stars.forEach((star, index) => {
      positions[index * 3] = star.x;
      positions[index * 3 + 1] = star.y;
      positions[index * 3 + 2] = star.z;

      const color = new THREE.Color(displayColorForStar(star));
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    });

    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    nextGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return nextGeometry;
  }, [stars]);

  const glowGeometry = useMemo(() => geometry.clone(), [geometry]);

  const colorArray = useMemo(
    () => stars.map((star) => new THREE.Color(displayColorForStar(star))),
    [stars]
  );

  useLayoutEffect(() => {
    const glow = glowRef.current;
    const points = pointsRef.current;
    const colorAttribute = geometry.getAttribute("color") as THREE.BufferAttribute;
    const glowColorAttribute = glowGeometry.getAttribute("color") as THREE.BufferAttribute;
    if (!points || !glow || !colorAttribute || !glowColorAttribute) return;

    stars.forEach((star, index) => {
      const isSelected = star.id === selectedId;
      const isMatched =
        normalizedQuery.length > 0 && star.text.toLowerCase().includes(normalizedQuery);
      const isRepresentative =
        index % 18 === 0 || star.intensity > 0.82 || star.isGoldenEye || isSelected || isMatched;

      baseColor.copy(colorArray[index]);
      if (isTextZoneFocused && !isRepresentative) baseColor.lerp(fadedColor, 0.86);
      if (normalizedQuery && !isMatched && !isSelected) baseColor.lerp(fadedColor, 0.78);
      if (isSelected || isMatched) baseColor.lerp(highlightColor, 0.32);
      colorAttribute.setXYZ(index, baseColor.r, baseColor.g, baseColor.b);
      glowColorAttribute.setXYZ(index, baseColor.r, baseColor.g, baseColor.b);
    });

    colorAttribute.needsUpdate = true;
    glowColorAttribute.needsUpdate = true;
  }, [colorArray, geometry, glowGeometry, normalizedQuery, selectedId, stars]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    const selectedGlow = selectedGlowRef.current;
    const t = clock.getElapsedTime();
    if (introStartRef.current === null) introStartRef.current = t;
    const introProgress = introActive ? getIntroProgress(t, introStartRef.current) : 1;
    if (group) {
      const focusScale = archiveFocusScale(viewMode, activeZone);
      const introScale = 0.08 + introProgress * 0.92;
      const targetPosition = archiveFocusTarget(activeZone, viewMode);
      const targetRotationY = viewMode === "zone" ? 0 : t * 0.012 + (1 - introProgress) * 1.3;
      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetRotationY, 0.08);
      group.position.lerp(targetPosition, 0.08);
      group.scale.lerp(new THREE.Vector3(introScale * focusScale, introScale * focusScale, introScale * focusScale), 0.08);
    }
    if (selectedGlow) {
      const pulse = 1 + Math.sin(t * 4.2) * 0.14;
      selectedGlow.scale.setScalar(1.95 * pulse);
    }
    if (selectedRippleRef.current) {
      const ripple = 2.4 + ((t * 0.9) % 1) * 3.2;
      selectedRippleRef.current.scale.setScalar(ripple);
      selectedRippleRef.current.material.opacity = 0.5 * (1 - ((t * 0.9) % 1));
    }
  });

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    if (typeof event.index === "number") onSelect(stars[event.index]);
  }

  return (
    <group ref={groupRef}>
      <points ref={glowRef} geometry={glowGeometry} renderOrder={0}>
        <pointsMaterial
          size={isTextZoneFocused ? 0.5 : 1.08}
          sizeAttenuation
          transparent
          opacity={isOtherZoneFocused ? 0.06 : isTextZoneFocused ? 0.035 : 0.46}
          map={starTexture}
          vertexColors
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <points
        ref={pointsRef}
        geometry={geometry}
        onClick={handleClick}
        renderOrder={1}
      >
        <pointsMaterial
          size={isTextZoneFocused ? 0.16 : 0.26}
          sizeAttenuation
          transparent
          opacity={isOtherZoneFocused ? 0.08 : isTextZoneFocused ? 0.34 : 1}
          alphaTest={0.02}
          map={starTexture}
          vertexColors
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {stars[selectedId] ? (
        <>
          <sprite
            ref={selectedGlowRef}
            position={[stars[selectedId].x, stars[selectedId].y, stars[selectedId].z]}
            renderOrder={4}
          >
            <spriteMaterial
              map={starTexture}
              color="#fff6cf"
              transparent
              opacity={0.95}
              depthWrite={false}
              depthTest={false}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
          <sprite
            ref={selectedRippleRef}
            position={[stars[selectedId].x, stars[selectedId].y, stars[selectedId].z]}
            renderOrder={3}
          >
            <spriteMaterial
              map={ringTexture}
              color={displayColorForStar(stars[selectedId])}
              transparent
              opacity={0.42}
              depthWrite={false}
              depthTest={false}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        </>
      ) : null}
    </group>
  );
}

function SignatureStars({
  stars,
  selectedId,
  onSelect,
  introActive,
  activeZone,
  viewMode
}: {
  stars: GalaxyStar[];
  selectedId: number;
  onSelect: (star: GalaxyStar) => void;
  introActive: boolean;
  activeZone: ArchiveZone;
  viewMode: ArchiveViewMode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const introStartRef = useRef<number | null>(null);
  const texture = useMemo(() => createGlowTexture(192), []);
  const signatureStars = useMemo(
    () =>
      stars.filter(
        (star) =>
          star.intensity > 0.62 ||
          Math.abs(star.score) > 0.68 ||
          star.isGoldenEye
      ),
    [stars]
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    if (introStartRef.current === null) introStartRef.current = t;
    const introProgress = introActive ? getIntroProgress(t, introStartRef.current) : 1;
    const focusScale = archiveFocusScale(viewMode, activeZone);
    const introScale = 0.08 + introProgress * 0.92;
    const targetPosition = archiveFocusTarget(activeZone, viewMode);
    const targetRotationY = viewMode === "zone" ? 0 : t * 0.012 + (1 - introProgress) * 1.3;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotationY, 0.08);
    groupRef.current.position.lerp(targetPosition, 0.08);
    groupRef.current.scale.lerp(new THREE.Vector3(introScale * focusScale, introScale * focusScale, introScale * focusScale), 0.08);
  });

  const isTextZoneFocused = viewMode === "zone" && activeZone.id === "text-emotions";

  return (
    <group ref={groupRef}>
      {signatureStars.map((star) => {
        const baseScale =
          0.62 +
          star.intensity * 0.95 +
          (star.isGoldenEye ? 0.38 : 0) +
          (star.id === selectedId ? 0.55 : 0);
        const scale = isTextZoneFocused ? baseScale * 0.38 : baseScale;
        return (
          <sprite
            key={star.id}
            position={[star.x, star.y, star.z]}
            scale={[scale, scale, 1]}
            renderOrder={2}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(star);
            }}
          >
            <spriteMaterial
              map={texture}
              color={star.isGoldenEye ? dragonPalette.goldenEye : displayColorForStar(star)}
              transparent
              opacity={
                viewMode === "zone" && activeZone.id !== "text-emotions"
                  ? 0.06
                  : isTextZoneFocused
                    ? star.id === selectedId
                      ? 0.66
                      : star.isGoldenEye
                        ? 0.3
                        : 0.22
                  : star.id === selectedId
                    ? 0.95
                    : star.isGoldenEye
                      ? 0.68
                      : 0.5
              }
              depthWrite={false}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        );
      })}
    </group>
  );
}

function ArchiveZoneField({
  zones,
  activeZoneId,
  onSelect,
  viewMode
}: {
  zones: ArchiveZone[];
  activeZoneId: string;
  onSelect: (zone: ArchiveZone) => void;
  viewMode: ArchiveViewMode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useMemo(() => createGlowTexture(192), []);
  const zoneNodeGeometry = useMemo(() => {
    return zones.map((zone, zoneIndex) => {
      const positions = new Float32Array(zone.nodeCount * 3);
      const colors = new Float32Array(zone.nodeCount * 3);
      const color = new THREE.Color(zone.color);

      for (let index = 0; index < zone.nodeCount; index += 1) {
        const angle = (index / zone.nodeCount) * Math.PI * 2 + hash(zoneIndex * 100 + index) * 0.55;
        const radius = 1.2 + hash(zoneIndex * 200 + index) * 2.4;
        const height = (hash(zoneIndex * 300 + index) - 0.5) * 1.6;
        positions[index * 3] = zone.position[0] + Math.cos(angle) * radius;
        positions[index * 3 + 1] = zone.position[1] + height;
        positions[index * 3 + 2] = zone.position[2] + Math.sin(angle) * radius * 0.72;
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      return geometry;
    });
  }, [zones]);

  const connectionGeometry = useMemo(() => {
    const points = zones.map((zone) => new THREE.Vector3(...zone.position));
    const curve = new THREE.CatmullRomCurve3(points.concat(points[0]), true, "centripetal", 0.36);
    return new THREE.BufferGeometry().setFromPoints(curve.getPoints(160));
  }, [zones]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const elapsed = clock.getElapsedTime();
    const activeZone = zones.find((zone) => zone.id === activeZoneId) ?? zones[0];
    const focusScale = archiveFocusScale(viewMode, activeZone);
    const targetPosition = archiveFocusTarget(activeZone, viewMode);
    const targetRotationY = viewMode === "zone" ? 0 : elapsed * 0.004;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotationY, 0.08);
    groupRef.current.position.lerp(targetPosition, 0.08);
    groupRef.current.scale.lerp(new THREE.Vector3(focusScale, focusScale, focusScale), 0.08);
  });

  return (
    <group ref={groupRef}>
      <line>
        <primitive object={connectionGeometry} attach="geometry" />
        <lineBasicMaterial
          color="#5fa99a"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </line>
      {zones.map((zone, index) => {
        const isActive = zone.id === activeZoneId;
        const isDimmed = viewMode === "zone" && !isActive;
        const scale = isActive ? 2.4 : 1.75;
        return (
          <group key={zone.id}>
            <points geometry={zoneNodeGeometry[index]} renderOrder={1}>
              <pointsMaterial
                size={isActive ? 0.36 : 0.24}
                sizeAttenuation
                transparent
                opacity={isDimmed ? 0.08 : isActive ? 0.82 : 0.44}
                map={texture}
                vertexColors
                depthWrite={false}
                toneMapped={false}
                blending={THREE.AdditiveBlending}
              />
            </points>
            <sprite
              position={zone.position}
              scale={[scale, scale, 1]}
              renderOrder={3}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(zone);
              }}
            >
              <spriteMaterial
                map={texture}
                color={zone.color}
                transparent
                opacity={isDimmed ? 0.12 : isActive ? 0.95 : 0.68}
                depthWrite={false}
                toneMapped={false}
                blending={THREE.AdditiveBlending}
              />
            </sprite>
          </group>
        );
      })}
    </group>
  );
}

function ReadingPath({ stars }: { stars: GalaxyStar[] }) {
  const lineObject = useMemo(() => {
    if (stars.length < 2) return null;
    const sampled = stars.filter((_, index) => {
      const step = Math.max(1, Math.floor(stars.length / 90));
      return index % step === 0 || index === stars.length - 1;
    });
    const points = sampled.map((star) => new THREE.Vector3(star.x, star.y, star.z));
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.45);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(Math.max(40, sampled.length * 4)));
    const material = new THREE.LineBasicMaterial({
      color: "#ffe6a3",
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 1;
    return line;
  }, [stars]);

  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = clock.getElapsedTime() * 0.012;
  });

  if (!lineObject) return null;

  return (
    <group ref={groupRef}>
      <primitive object={lineObject} />
    </group>
  );
}

function NebulaCloud({
  introActive,
  activeZone,
  viewMode
}: {
  introActive: boolean;
  activeZone: ArchiveZone;
  viewMode: ArchiveViewMode;
}) {
  const texture = useMemo(() => createGlowTexture(128), []);
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const introStartRef = useRef<number | null>(null);
  const geometry = useMemo(() => {
    const count = 260;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const pink = new THREE.Color("#b4533f");
    const violet = new THREE.Color("#8f7650");
    const blue = new THREE.Color("#5fa99a");
    const whiteBlue = new THREE.Color("#f0d08a");
    const color = new THREE.Color();
    const knots = [0.1, 0.2, 0.34, 0.52, 0.68, 0.83, 0.94];

    for (let index = 0; index < count; index += 1) {
      const knot = knots[Math.floor(hash(index + 11) * knots.length)];
      const useKnot = hash(index + 13) > 0.34;
      const rawT = useKnot ? knot + (hash(index + 10) - 0.5) * 0.1 : hash(index + 10);
      const t = Math.max(0.02, Math.min(0.98, rawT));
      const arm = Math.floor(hash(index + 17) * 3);
      const armOffset = arm * ((Math.PI * 2) / 3);
      const cluster = knots.reduce((sum, center) => {
        const distance = Math.abs(t - center);
        return sum + Math.exp(-(distance * distance) / 0.0026);
      }, 0);
      const angle =
        t * Math.PI * 2 * 1.85 +
        armOffset +
        Math.sin(t * Math.PI * 6.5 + arm) * 0.38 +
        (hash(index + 20) - 0.5) * (0.42 + cluster * 0.12);
      const radius = 14.6 + (1.8 - 14.6) * Math.pow(t, 0.92);
      const armWidth = (0.5 + hash(index + 40) * 3.6) * (cluster > 0.7 ? 0.9 : 1.45);
      const side = hash(index + 30) > 0.5 ? 1 : -1;
      const lane = Math.sin(t * Math.PI * 9 + armOffset) * 0.72;
      const ellipseX = 1.18 - t * 0.18;
      const ellipseZ = 0.72 + t * 0.22;
      const x =
        Math.cos(angle) * (radius + lane) * ellipseX +
        Math.cos(angle + Math.PI / 2) * armWidth * side;
      const z =
        Math.sin(angle) * (radius + lane) * ellipseZ +
        Math.sin(angle + Math.PI / 2) * armWidth * side;
      const y = Math.sin(angle * 0.42) * 1.0 + (hash(index + 50) - 0.5) * (1.1 + armWidth * 0.18);

      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;

      color.copy(pink);
      color.lerp(hash(index + 60) > 0.5 ? violet : blue, hash(index + 70) * 0.58);
      if (t > 0.72 || t < 0.16 || cluster > 1.5) color.lerp(whiteBlue, 0.18);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }

    const nextGeometry = new THREE.BufferGeometry();
    nextGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    nextGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return nextGeometry;
  }, []);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (introStartRef.current === null) introStartRef.current = elapsed;
    const introProgress = introActive ? getIntroProgress(elapsed, introStartRef.current) : 1;
    if (groupRef.current) {
      const focusScale = archiveFocusScale(viewMode, activeZone);
      const introScale = 0.12 + introProgress * 0.88;
      const targetPosition = archiveFocusTarget(activeZone, viewMode);
      const targetRotationY = viewMode === "zone" ? 0 : elapsed * 0.006 + (1 - introProgress) * 0.8;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotationY, 0.08);
      groupRef.current.position.lerp(targetPosition, 0.08);
      groupRef.current.scale.lerp(new THREE.Vector3(introScale * focusScale, introScale * focusScale, introScale * focusScale), 0.08);
    }
    if (materialRef.current) materialRef.current.opacity = 0.045 * introProgress;
  });

  return (
    <group ref={groupRef}>
      <points geometry={geometry} renderOrder={-1}>
        <pointsMaterial
          ref={materialRef}
          size={0.56}
          sizeAttenuation
          transparent
          opacity={0.045}
          map={texture}
          vertexColors
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

function CoreGlow({
  activeZone,
  viewMode
}: {
  activeZone: ArchiveZone;
  viewMode: ArchiveViewMode;
}) {
  const texture = useMemo(() => createGlowTexture(256), []);
  const eyeTexture = useMemo(() => createGoldenEyeTexture(512), []);
  const groupRef = useRef<THREE.Group>(null);
  const eyeRef = useRef<THREE.Sprite>(null);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (groupRef.current) {
      const focusScale = archiveFocusScale(viewMode, activeZone);
      const targetPosition = archiveFocusTarget(activeZone, viewMode);
      groupRef.current.position.lerp(targetPosition, 0.08);
      groupRef.current.scale.lerp(new THREE.Vector3(focusScale, focusScale, focusScale), 0.08);
    }
    if (!eyeRef.current) return;
    const pulse = 1 + Math.sin(elapsed * 1.35) * 0.035;
    eyeRef.current.scale.set(5.35 * pulse, 2.1 * pulse, 1);
    eyeRef.current.material.rotation = Math.sin(elapsed * 0.28) * 0.025;
  });

  return (
    <group ref={groupRef}>
      <sprite position={[0, 0, 0]} scale={[10.8, 7.2, 1]}>
        <spriteMaterial
          map={texture}
          color="#7d5c32"
          transparent
          opacity={0.28}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite position={[0, 0, 0]} scale={[6.2, 3.2, 1]}>
        <spriteMaterial
          map={texture}
          color="#ffd36b"
          transparent
          opacity={0.56}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite ref={eyeRef} position={[0, 0, 0.12]} scale={[5.35, 2.1, 1]} renderOrder={2}>
        <spriteMaterial
          map={eyeTexture}
          color="#ffffff"
          transparent
          opacity={0.82}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  );
}

function AlchemyMatrix({
  introActive,
  activeZone,
  viewMode
}: {
  introActive: boolean;
  activeZone: ArchiveZone;
  viewMode: ArchiveViewMode;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const introStartRef = useRef<number | null>(null);
  const { arcs, ticks } = useMemo(() => {
    const ringRadii = [4.2, 7.1, 10.4, 13.5, 16.2];
    const nextArcs = ringRadii.flatMap((radius, ring) =>
      Array.from({ length: ring === 0 ? 3 : 5 }, (_, segment) => {
        const start = segment * ((Math.PI * 2) / 5) + ring * 0.18 + hash(ring * 20 + segment) * 0.26;
        const length = 0.54 + hash(ring * 50 + segment) * 0.62;
        const points = Array.from({ length: 72 }, (_, index) => {
          const angle = start + length * (index / 71);
          const wobble = Math.sin(angle * 3 + ring) * 0.08;
          return new THREE.Vector3(
            Math.cos(angle) * (radius + wobble) * 1.22,
            Math.sin(angle * 0.33) * 0.18,
            Math.sin(angle) * (radius + wobble) * 0.72
          );
        });
        return {
          geometry: new THREE.BufferGeometry().setFromPoints(points),
          color: ring % 2 === 0 ? "#b08b4f" : "#4d8c82",
          opacity: ring % 2 === 0 ? 0.2 : 0.14
        };
      })
    );

    const nextTicks = Array.from({ length: 54 }, (_, index) => {
      const angle = (index / 54) * Math.PI * 2;
      const radius = index % 3 === 0 ? 16.8 : index % 3 === 1 ? 10.8 : 7.4;
      const length = index % 4 === 0 ? 0.58 : 0.32;
      const inner = radius - length;
      const outer = radius + length;
      const points = [
        new THREE.Vector3(Math.cos(angle) * inner * 1.22, 0.03, Math.sin(angle) * inner * 0.72),
        new THREE.Vector3(Math.cos(angle) * outer * 1.22, 0.03, Math.sin(angle) * outer * 0.72)
      ];
      return new THREE.BufferGeometry().setFromPoints(points);
    });

    return { arcs: nextArcs, ticks: nextTicks };
  }, []);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (introStartRef.current === null) introStartRef.current = elapsed;
    const introProgress = introActive ? getIntroProgress(elapsed, introStartRef.current) : 1;
    if (groupRef.current) {
      const focusScale = archiveFocusScale(viewMode, activeZone);
      const introScale = 0.12 + introProgress * 0.88;
      const targetPosition = archiveFocusTarget(activeZone, viewMode);
      const targetRotationY = viewMode === "zone" ? 0 : elapsed * 0.002 + (1 - introProgress) * 0.5;
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetRotationY, 0.08);
      groupRef.current.position.lerp(targetPosition, 0.08);
      groupRef.current.scale.lerp(new THREE.Vector3(introScale * focusScale, introScale * focusScale, introScale * focusScale), 0.08);
    }
  });

  return (
    <group ref={groupRef}>
      {arcs.map(({ geometry, color, opacity }, index) => (
        <line key={index}>
          <primitive object={geometry} attach="geometry" />
          <lineBasicMaterial
            color={color}
            transparent
            opacity={opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </line>
      ))}
      {ticks.map((geometry, index) => (
        <line key={`tick-${index}`}>
          <primitive object={geometry} attach="geometry" />
          <lineBasicMaterial
            color={index % 4 === 0 ? "#d2a867" : "#5fa99a"}
            transparent
            opacity={index % 4 === 0 ? 0.24 : 0.12}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </line>
      ))}
    </group>
  );
}

export default function EmotionGalaxy3D() {
  const stars = useMemo(() => createGalaxyStars(), []);
  const archiveStars = useMemo(() => {
    const textZone = archiveZones.find((zone) => zone.id === "text-emotions") ?? archiveZones[5];
    const columns = 46;
    return stars.map((star, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const page = Math.floor(row / 8);
      const rowInPage = row % 8;
      return {
        ...star,
        x: textZone.position[0] + (column - columns / 2) * 0.28 + (hash(index + 7000) - 0.5) * 0.08,
        y: textZone.position[1] + (rowInPage - 3.5) * 0.42 + (hash(index + 7200) - 0.5) * 0.08,
        z: textZone.position[2] + (page - 1.2) * 1.15 + (hash(index + 7100) - 0.5) * 0.12
      };
    });
  }, [stars]);
  const [selected, setSelected] = useState(stars[0]);
  const [activeZoneId, setActiveZoneId] = useState("bloodline");
  const [viewMode, setViewMode] = useState<ArchiveViewMode>("overview");
  const [detailOpen, setDetailOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [autoRotate, setAutoRotate] = useState(true);
  const [introActive, setIntroActive] = useState(true);
  const normalizedQuery = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      normalizedQuery
        ? archiveStars.filter((star) => star.text.toLowerCase().includes(normalizedQuery))
        : [],
    [archiveStars, normalizedQuery]
  );
  const intensity = Math.round((Math.abs(selected.score) * 0.76 + 0.24) * 100);
  const selectedColor = displayColorForStar(selected);
  const resonance = resonanceForStar(selected);
  const riskLevel = riskLevelForResonance(resonance);
  const activeZone = archiveZones.find((zone) => zone.id === activeZoneId) ?? archiveZones[0];
  const selectStar = (star: GalaxyStar) => {
    setSelected(star);
    setActiveZoneId("text-emotions");
    setViewMode("zone");
    setDetailOpen(true);
  };
  const selectZone = (zone: ArchiveZone) => {
    setActiveZoneId(zone.id);
    setViewMode("zone");
    if (zone.id !== "text-emotions") setDetailOpen(false);
  };
  const returnOverview = () => {
    setViewMode("overview");
  };
  const selectedMatchIndex = matches.findIndex((star) => star.id === selected.id);
  const jumpToFirstMatch = () => {
    if (matches[0]) selectStar(matches[0]);
  };
  const jumpMatch = (direction: -1 | 1) => {
    if (!matches.length) return;
    const currentIndex = selectedMatchIndex >= 0 ? selectedMatchIndex : direction > 0 ? -1 : 0;
    const nextIndex = (currentIndex + direction + matches.length) % matches.length;
    selectStar(matches[nextIndex]);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroActive(false), INTRO_DURATION);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className={`galaxy-page${introActive ? " is-intro" : ""}`}>
      <section className="hud" aria-label="卡塞尔档案控制台">
        <div className="brand">
          <span className="brand-light" />
          <div>
            <h1>龙族 火之晨曦</h1>
            <p>NORMA / BLOODLINE EMOTION ARCHIVE</p>
          </div>
        </div>

        <div className="system-status" aria-hidden="true">
          <span>NORMA ACCESS</span>
          <strong>GRANTED</strong>
          <span>BLOODLINE TRACE</span>
          <strong>{resonance}%</strong>
        </div>

        <div className="controls">
          {viewMode === "zone" ? (
            <button type="button" className="overview-button" onClick={returnOverview}>
              返回总览
            </button>
          ) : null}
          <label className="search">
            <span>档案检索</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              placeholder="路明非、黄金瞳、言灵..."
            />
          </label>
          <button
            type="button"
            className="search-count"
            onClick={jumpToFirstMatch}
            disabled={!matches.length}
            title="跳到第一条档案"
          >
            {normalizedQuery ? `${matches.length} 条` : "0 条"}
          </button>
          <button
            type="button"
            className="search-step"
            onClick={() => jumpMatch(-1)}
            disabled={!matches.length}
            title="前一条档案"
          >
            前一记录
          </button>
          <button
            type="button"
            className="search-step"
            onClick={() => jumpMatch(1)}
            disabled={!matches.length}
            title="后一条档案"
          >
            后一记录
          </button>
          <button type="button" onClick={() => setAutoRotate((value) => !value)}>
            {autoRotate ? "暂停解析" : "继续解析"}
          </button>
        </div>
      </section>

      <nav className="zone-nav" aria-label="资料星域">
        {archiveZones.map((zone) => (
          <button
            type="button"
            key={zone.id}
            className={zone.id === activeZoneId ? "is-active" : ""}
            onClick={() => selectZone(zone)}
            style={{ "--zone-color": zone.color } as CSSProperties}
          >
            <span>{zone.code}</span>
            <strong>{zone.title}</strong>
          </button>
        ))}
      </nav>

      <div className="scene">
        <Canvas
          camera={{ position: [0, 9, 26], fov: 48 }}
          dpr={[1, 2]}
          onPointerMissed={() => setDetailOpen(false)}
        >
          <color attach="background" args={["#05070a"]} />
          <fog attach="fog" args={["#07100f", 32, 70]} />
          <ambientLight intensity={0.58} />
          <pointLight position={[10, 14, 12]} intensity={2.6} color="#ffd36b" />
          <pointLight position={[-12, -6, -14]} intensity={1.7} color="#5fa99a" />
          <DeepSpaceBackdrop />
          <CoreGlow activeZone={activeZone} viewMode={viewMode} />
          <NebulaCloud introActive={introActive} activeZone={activeZone} viewMode={viewMode} />
          <AlchemyMatrix introActive={introActive} activeZone={activeZone} viewMode={viewMode} />
          <ArchiveZoneField
            zones={archiveZones}
            activeZoneId={activeZoneId}
            onSelect={selectZone}
            viewMode={viewMode}
          />
          <GalaxyField
            stars={archiveStars}
            query={query}
            selectedId={selected.id}
            onSelect={selectStar}
            introActive={introActive}
            activeZone={activeZone}
            viewMode={viewMode}
          />
          <SignatureStars
            stars={archiveStars}
            selectedId={selected.id}
            onSelect={selectStar}
            introActive={introActive}
            activeZone={activeZone}
            viewMode={viewMode}
          />
          <OrbitControls
            autoRotate={autoRotate}
            autoRotateSpeed={0.45}
            enableDamping
            dampingFactor={0.08}
            minDistance={7}
            maxDistance={38}
          />
          <EffectComposer>
            <Bloom intensity={1.18} luminanceThreshold={0.08} luminanceSmoothing={0.66} />
          </EffectComposer>
        </Canvas>
      </div>

      <aside className="readout" aria-label="档案数据">
        <div>
          <span>档案节点</span>
          <strong>{archiveStars.length + archiveZones.reduce((sum, zone) => sum + zone.nodeCount, 0)}</strong>
        </div>
        <div>
          <span>章节</span>
          <strong>第 {selected.chapterIndex} 章</strong>
        </div>
        <div>
          <span>章节名</span>
          <strong>{selected.chapterTitle}</strong>
        </div>
        <div>
          <span>谱系区域</span>
          <strong>{selected.domain}</strong>
        </div>
        <div>
          <span>龙血共鸣</span>
          <strong>{resonance}%</strong>
        </div>
        <div>
          <span>危险等级</span>
          <strong>{riskLevel}</strong>
        </div>
        <div>
          <span>情绪强度</span>
          <strong>{intensity}%</strong>
        </div>
      </aside>

      <aside className="zone-panel" aria-label="当前资料星域">
        <div className="zone-panel-kicker">{activeZone.code}</div>
        <h2>{activeZone.title}</h2>
        <p>{activeZone.summary}</p>
        <div>
          <span>分类</span>
          <strong>{activeZone.category}</strong>
        </div>
        <div>
          <span>权限等级</span>
          <strong>{activeZone.accessLevel}</strong>
        </div>
        <div>
          <span>危险等级</span>
          <strong>{activeZone.riskLevel}</strong>
        </div>
        <div>
          <span>档案节点</span>
          <strong>{activeZone.id === "text-emotions" ? archiveStars.length : activeZone.nodeCount}</strong>
        </div>
      </aside>

      <article
        className={`detail${detailOpen && activeZoneId === "text-emotions" ? "" : " is-collapsed"}`}
        aria-live="polite"
      >
        <div className="detail-meta">
          <span>档案 #{String(selected.id + 1).padStart(4, "0")}</span>
          <span>
            {selected.emotion} · {selected.score.toFixed(2)}
          </span>
        </div>
        <div className="motifs">
          {(selected.motifs.length ? selected.motifs : ["普通情绪样本"]).map((motif) => (
            <span key={motif}>{motif}</span>
          ))}
          <span>共鸣 {resonance}%</span>
          <span>等级 {riskLevel}</span>
        </div>
        <p>{selected.text}</p>
        <div className="meter">
          <span
            style={{
              width: `${intensity}%`,
              background: selectedColor,
              boxShadow: `0 0 18px ${selectedColor}`
            }}
          />
        </div>
      </article>

      <div className="hint">拖拽解析 · 滚轮缩放 · 点击档案节点</div>
      <section className="intro" aria-hidden={!introActive}>
        <div className="intro-scrim" />
        <div className="intro-system">
          <span>NORMA ACCESS GRANTED</span>
          <span>BLOODLINE TRACE DETECTED</span>
          <span>LOADING CHAPTER ARCHIVES</span>
        </div>
        <div className="intro-chapters" aria-hidden="true">
          {introChapters.map((chapter, index) => {
            const [x, y, rotation] = introChapterPositions[index];
            const style = {
              "--x": x,
              "--y": y,
              "--mx": scaleCssLength(x, 0.32),
              "--my": scaleCssLength(y, 0.32),
              "--r": rotation,
              "--delay": `${0.3 + index * 0.48}s`
            } as CSSProperties;

            return (
              <span className="intro-chapter" key={chapter} style={style}>
                <small>CHAPTER {String(index + 1).padStart(2, "0")}</small>
                {chapter}
              </span>
            );
          })}
        </div>
        <div className="intro-orbit"></div>
        <p>火之晨曦</p>
        <h2>龙族</h2>
        <span>你年少的时候，是否有过孤独而热血的梦</span>
      </section>
    </main>
  );
}

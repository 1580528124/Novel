"use client";

import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import * as THREE from "three";
import { createGalaxyStars, GalaxyStar } from "@/lib/galaxyData";

const baseColor = new THREE.Color();
const fadedColor = new THREE.Color("#8d93a3");
const highlightColor = new THREE.Color("#fff7d6");
const INTRO_DURATION = 14200;
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

function DeepSpaceBackdrop() {
  const glowTexture = useMemo(() => createGlowTexture(128), []);
  const nearStarsRef = useRef<THREE.Points>(null);
  const farStarsRef = useRef<THREE.Points>(null);

  const farStars = useMemo(() => {
    const count = 180;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const blue = new THREE.Color("#9bb7ff");
    const pink = new THREE.Color("#ffc1f1");
    const white = new THREE.Color("#fff9df");
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
    const count = 45;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color();

    for (let index = 0; index < count; index += 1) {
      const angle = hash(index + 2400) * Math.PI * 2;
      const radius = 24 + hash(index + 2500) * 34;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = (hash(index + 2600) - 0.5) * 30;
      positions[index * 3 + 2] = Math.sin(angle) * radius - 10 - hash(index + 2700) * 18;

      color.set(hash(index + 2800) > 0.5 ? "#fff7d8" : "#b8c8ff");
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
  introActive
}: {
  stars: GalaxyStar[];
  query: string;
  selectedId: number;
  onSelect: (star: GalaxyStar) => void;
  introActive: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const introStartRef = useRef<number | null>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const glowRef = useRef<THREE.Points>(null);
  const selectedGlowRef = useRef<THREE.Sprite>(null);
  const selectedRippleRef = useRef<THREE.Sprite>(null);
  const normalizedQuery = query.trim().toLowerCase();

  const starTexture = useMemo(() => createGlowTexture(128), []);
  const ringTexture = useMemo(() => createRingTexture(256), []);

  const geometry = useMemo(() => {
    const positions = new Float32Array(stars.length * 3);
    const colors = new Float32Array(stars.length * 3);

    stars.forEach((star, index) => {
      positions[index * 3] = star.x;
      positions[index * 3 + 1] = star.y;
      positions[index * 3 + 2] = star.z;

      const color = new THREE.Color(star.color);
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
    () => stars.map((star) => new THREE.Color(star.color)),
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

      baseColor.copy(colorArray[index]);
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
      group.rotation.y = t * 0.012 + (1 - introProgress) * 1.3;
      group.scale.setScalar(0.08 + introProgress * 0.92);
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
          size={1.08}
          sizeAttenuation
          transparent
          opacity={0.46}
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
          size={0.26}
          sizeAttenuation
          transparent
          opacity={1}
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
              color={stars[selectedId].color}
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
  introActive
}: {
  stars: GalaxyStar[];
  selectedId: number;
  onSelect: (star: GalaxyStar) => void;
  introActive: boolean;
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
    groupRef.current.rotation.y = t * 0.012 + (1 - introProgress) * 1.3;
    groupRef.current.scale.setScalar(0.08 + introProgress * 0.92);
  });

  return (
    <group ref={groupRef}>
      {signatureStars.map((star) => {
        const scale =
          0.62 +
          star.intensity * 0.95 +
          (star.isGoldenEye ? 0.38 : 0) +
          (star.id === selectedId ? 0.55 : 0);
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
              color={star.isGoldenEye ? "#ffd56a" : star.color}
              transparent
              opacity={star.id === selectedId ? 0.95 : star.isGoldenEye ? 0.68 : 0.5}
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

function NebulaCloud({ introActive }: { introActive: boolean }) {
  const texture = useMemo(() => createGlowTexture(128), []);
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const introStartRef = useRef<number | null>(null);
  const geometry = useMemo(() => {
    const count = 260;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const pink = new THREE.Color("#ff79d7");
    const violet = new THREE.Color("#9b6cff");
    const blue = new THREE.Color("#79a8ff");
    const whiteBlue = new THREE.Color("#d9e2ff");
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
      groupRef.current.rotation.y = elapsed * 0.006 + (1 - introProgress) * 0.8;
      groupRef.current.scale.setScalar(0.12 + introProgress * 0.88);
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

function CoreGlow() {
  const texture = useMemo(() => createGlowTexture(256), []);

  return (
    <group>
      <sprite position={[0, 0, 0]} scale={[10.8, 7.2, 1]}>
        <spriteMaterial
          map={texture}
          color="#a9b9ff"
          transparent
          opacity={0.34}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <sprite position={[0, 0, 0]} scale={[5.2, 3.8, 1]}>
        <spriteMaterial
          map={texture}
          color="#ffe4ff"
          transparent
          opacity={0.48}
          depthWrite={false}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  );
}

function SpiralGuide({ introActive }: { introActive: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const introStartRef = useRef<number | null>(null);
  const lines = useMemo(() => {
    return Array.from({ length: 3 }, (_, arm) => {
      const start = [0.08, 0.18, 0.3][arm];
      const end = [0.92, 0.98, 0.84][arm];
      const points = Array.from({ length: 190 }, (_, index) => {
        const progress = index / 189;
        const t = start + (end - start) * progress;
        const armOffset = (arm % 3) * ((Math.PI * 2) / 3) + (arm > 2 ? 0.36 : 0);
        const angle =
          t * Math.PI * 2 * 1.85 +
          armOffset +
          Math.sin(t * Math.PI * 6.5 + arm) * 0.34;
        const radius = 14.8 + (1.7 - 14.8) * Math.pow(t, 0.92) + Math.sin(t * Math.PI * 8 + arm) * 0.62;
        const ellipseX = 1.2 - t * 0.18;
        const ellipseZ = 0.7 + t * 0.24;
        return new THREE.Vector3(
          Math.cos(angle) * radius * ellipseX,
          Math.sin(angle * 0.42) * 1.1,
          Math.sin(angle) * radius * ellipseZ
        );
      });
      return new THREE.BufferGeometry().setFromPoints(points);
    });
  }, []);

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();
    if (introStartRef.current === null) introStartRef.current = elapsed;
    const introProgress = introActive ? getIntroProgress(elapsed, introStartRef.current) : 1;
    if (groupRef.current) {
      groupRef.current.rotation.y = elapsed * 0.006 + (1 - introProgress) * 0.8;
      groupRef.current.scale.setScalar(0.12 + introProgress * 0.88);
    }
  });

  return (
    <group ref={groupRef}>
      {lines.map((geometry, index) => (
        <line key={index}>
          <primitive object={geometry} attach="geometry" />
          <lineBasicMaterial
            color={index % 2 === 0 ? "#ff8be4" : "#8ea8ff"}
            transparent
            opacity={0.11}
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
  const [selected, setSelected] = useState(stars[0]);
  const [detailOpen, setDetailOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [autoRotate, setAutoRotate] = useState(true);
  const [introActive, setIntroActive] = useState(true);
  const normalizedQuery = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      normalizedQuery
        ? stars.filter((star) => star.text.toLowerCase().includes(normalizedQuery))
        : [],
    [normalizedQuery, stars]
  );
  const intensity = Math.round((Math.abs(selected.score) * 0.76 + 0.24) * 100);
  const selectStar = (star: GalaxyStar) => {
    setSelected(star);
    setDetailOpen(true);
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
      <section className="hud" aria-label="控制面板">
        <div className="brand">
          <span className="brand-light" />
          <div>
            <h1>龙族 火之晨曦</h1>
            <p>3D 星河中的每一颗光，都是一句原文。</p>
          </div>
        </div>

        <div className="controls">
          <label className="search">
            <span>搜索</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              type="search"
              placeholder="爱、夜、离别..."
            />
          </label>
          <button
            type="button"
            className="search-count"
            onClick={jumpToFirstMatch}
            disabled={!matches.length}
            title="跳到第一个匹配"
          >
            {normalizedQuery ? `${matches.length} 个` : "0 个"}
          </button>
          <button
            type="button"
            className="search-step"
            onClick={() => jumpMatch(-1)}
            disabled={!matches.length}
            title="上一个匹配"
          >
            上一个
          </button>
          <button
            type="button"
            className="search-step"
            onClick={() => jumpMatch(1)}
            disabled={!matches.length}
            title="下一个匹配"
          >
            下一个
          </button>
          <button type="button" onClick={() => setAutoRotate((value) => !value)}>
            {autoRotate ? "暂停" : "旋转"}
          </button>
        </div>
      </section>

      <div className="scene">
        <Canvas
          camera={{ position: [0, 9, 26], fov: 48 }}
          dpr={[1, 2]}
          onPointerMissed={() => setDetailOpen(false)}
        >
          <color attach="background" args={["#060611"]} />
          <fog attach="fog" args={["#090817", 34, 72]} />
          <ambientLight intensity={0.7} />
          <pointLight position={[10, 14, 12]} intensity={2.4} color="#ffe6f4" />
          <pointLight position={[-12, -6, -14]} intensity={2.1} color="#8eb0ff" />
          <Stars radius={80} depth={40} count={2600} factor={5} saturation={0.4} fade speed={0.22} />
          <DeepSpaceBackdrop />
          <CoreGlow />
          <NebulaCloud introActive={introActive} />
          <SpiralGuide introActive={introActive} />
          <GalaxyField
            stars={stars}
            query={query}
            selectedId={selected.id}
            onSelect={selectStar}
            introActive={introActive}
          />
          <SignatureStars
            stars={stars}
            selectedId={selected.id}
            onSelect={selectStar}
            introActive={introActive}
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

      <aside className="readout" aria-label="银河数据">
        <div>
          <span>星体数量</span>
          <strong>{stars.length}</strong>
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
          <span>星域</span>
          <strong>{selected.domain}</strong>
        </div>
        <div>
          <span>情绪强度</span>
          <strong>{intensity}%</strong>
        </div>
      </aside>

      <article className={`detail${detailOpen ? "" : " is-collapsed"}`} aria-live="polite">
        <div className="detail-meta">
          <span>第 {selected.id + 1} 句</span>
          <span>
            {selected.emotion} · {selected.score.toFixed(2)}
          </span>
        </div>
        <div className="motifs">
          {(selected.motifs.length ? selected.motifs : ["普通文本星"]).map((motif) => (
            <span key={motif}>{motif}</span>
          ))}
        </div>
        <p>{selected.text}</p>
        <div className="meter">
          <span
            style={{
              width: `${intensity}%`,
              background: selected.color,
              boxShadow: `0 0 18px ${selected.color}`
            }}
          />
        </div>
      </article>

      <div className="hint">拖拽旋转 · 滚轮缩放 · 点击星星</div>
      <section className="intro" aria-hidden={!introActive}>
        <div className="intro-scrim" />
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

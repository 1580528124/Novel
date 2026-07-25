"use client";

import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { createGalaxyStars, GalaxyStar } from "@/lib/galaxyData";

const baseColor = new THREE.Color();
const fadedColor = new THREE.Color("#8d93a3");
const highlightColor = new THREE.Color("#fff7d6");

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

function DeepSpaceBackdrop() {
  const glowTexture = useMemo(() => createGlowTexture(128), []);
  const nearStarsRef = useRef<THREE.Points>(null);
  const farStarsRef = useRef<THREE.Points>(null);

  const farStars = useMemo(() => {
    const count = 520;
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
    const count = 130;
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
  onSelect
}: {
  stars: GalaxyStar[];
  query: string;
  selectedId: number;
  onSelect: (star: GalaxyStar) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const glowRef = useRef<THREE.Points>(null);
  const selectedGlowRef = useRef<THREE.Sprite>(null);
  const normalizedQuery = query.trim().toLowerCase();

  const starTexture = useMemo(() => createGlowTexture(128), []);

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
    if (group) group.rotation.y = t * 0.012;
    if (selectedGlow) {
      const pulse = 1 + Math.sin(t * 4.2) * 0.14;
      selectedGlow.scale.setScalar(1.95 * pulse);
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
        <sprite
          ref={selectedGlowRef}
          position={[stars[selectedId].x, stars[selectedId].y, stars[selectedId].z]}
          renderOrder={3}
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
      ) : null}
    </group>
  );
}

function NebulaCloud() {
  const texture = useMemo(() => createGlowTexture(128), []);
  const geometry = useMemo(() => {
    const count = 2200;
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
    geometry.rotateY(0.00008 + Math.sin(elapsed * 0.3) * 0.00002);
  });

  return (
    <points geometry={geometry} renderOrder={-1}>
      <pointsMaterial
        size={0.78}
        sizeAttenuation
        transparent
        opacity={0.12}
        map={texture}
        vertexColors
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
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

function SpiralGuide() {
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

  return (
    <group>
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
  const stars = useMemo(() => createGalaxyStars(420), []);
  const [selected, setSelected] = useState(stars[0]);
  const [query, setQuery] = useState("");
  const [autoRotate, setAutoRotate] = useState(true);
  const intensity = Math.round((Math.abs(selected.score) * 0.76 + 0.24) * 100);

  return (
    <main className="galaxy-page">
      <section className="hud" aria-label="控制面板">
        <div className="brand">
          <span className="brand-light" />
          <div>
            <h1>书名 情绪银河</h1>
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
          <button type="button" onClick={() => setAutoRotate((value) => !value)}>
            {autoRotate ? "暂停" : "旋转"}
          </button>
        </div>
      </section>

      <div className="scene">
        <Canvas camera={{ position: [0, 9, 26], fov: 48 }} dpr={[1, 2]}>
          <color attach="background" args={["#060611"]} />
          <fog attach="fog" args={["#090817", 34, 72]} />
          <ambientLight intensity={0.7} />
          <pointLight position={[10, 14, 12]} intensity={2.4} color="#ffe6f4" />
          <pointLight position={[-12, -6, -14]} intensity={2.1} color="#8eb0ff" />
          <Stars radius={80} depth={40} count={2600} factor={5} saturation={0.4} fade speed={0.22} />
          <DeepSpaceBackdrop />
          <CoreGlow />
          <NebulaCloud />
          <SpiralGuide />
          <GalaxyField
            stars={stars}
            query={query}
            selectedId={selected.id}
            onSelect={setSelected}
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
          <span>章节位置</span>
          <strong>第 {selected.chapter} 章</strong>
        </div>
        <div>
          <span>情绪强度</span>
          <strong>{intensity}%</strong>
        </div>
      </aside>

      <article className="detail" aria-live="polite">
        <div className="detail-meta">
          <span>第 {selected.id + 1} 句</span>
          <span>
            {selected.emotion} · {selected.score.toFixed(2)}
          </span>
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
    </main>
  );
}

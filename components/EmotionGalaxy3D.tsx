"use client";

import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { createGalaxyStars, GalaxyStar } from "@/lib/galaxyData";

const tempObject = new THREE.Object3D();
const baseColor = new THREE.Color("#ffffff");
const fadedColor = new THREE.Color("#8d93a3");
const highlightColor = new THREE.Color("#ffffff");

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
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.InstancedMesh>(null);
  const normalizedQuery = query.trim().toLowerCase();

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    const glow = glowRef.current;
    if (!mesh || !glow) return;

    stars.forEach((star, index) => {
      const isSelected = star.id === selectedId;
      const isMatched =
        normalizedQuery.length > 0 && star.text.toLowerCase().includes(normalizedQuery);
      const scale = star.radius * (isSelected ? 2.75 : isMatched ? 2.15 : 1);
      tempObject.position.set(star.x, star.y, star.z);
      tempObject.scale.setScalar(scale);
      tempObject.updateMatrix();
      mesh.setMatrixAt(index, tempObject.matrix);

      tempObject.scale.setScalar(scale * (isSelected || isMatched ? 7.8 : 4.6));
      tempObject.updateMatrix();
      glow.setMatrixAt(index, tempObject.matrix);

      baseColor.set("#ffffff");
      if (normalizedQuery && !isMatched && !isSelected) baseColor.lerp(fadedColor, 0.78);
      if (isSelected || isMatched) baseColor.lerp(highlightColor, 0.24);
      mesh.setColorAt(index, baseColor);
      glow.setColorAt(index, baseColor);
    });

    mesh.instanceMatrix.needsUpdate = true;
    glow.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (glow.instanceColor) glow.instanceColor.needsUpdate = true;
  }, [normalizedQuery, selectedId, stars]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    const glow = glowRef.current;
    if (!mesh || !glow) return;
    const t = clock.getElapsedTime();
    mesh.rotation.y = t * 0.012;
    glow.rotation.y = t * 0.012;
  });

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    if (typeof event.instanceId === "number") onSelect(stars[event.instanceId]);
  }

  return (
    <group>
      <instancedMesh ref={glowRef} args={[undefined, undefined, stars.length]} renderOrder={0}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          transparent
          opacity={0.18}
          vertexColors
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </instancedMesh>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, stars.length]}
        onClick={handleClick}
        renderOrder={1}
      >
        <sphereGeometry args={[1, 18, 18]} />
        <meshStandardMaterial
          vertexColors
          emissive="#ffffff"
          emissiveIntensity={1.15}
          roughness={0.45}
          metalness={0.08}
        />
      </instancedMesh>
    </group>
  );
}

function SpiralGuide() {
  const geometry = useMemo(() => {
    const points = Array.from({ length: 260 }, (_, index) => {
      const t = index / 259;
      const angle = t * Math.PI * 2 * 4.7;
      const radius = 13.8 + (2.4 - 13.8) * t;
      return new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(angle * 0.42) * 1.6,
        Math.sin(angle) * radius
      );
    });
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  return (
    <line>
      <primitive object={geometry} attach="geometry" />
      <lineBasicMaterial color="#94a9ff" transparent opacity={0.18} />
    </line>
  );
}

export default function EmotionGalaxy3D() {
  const stars = useMemo(() => createGalaxyStars(), []);
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
          <color attach="background" args={["#02030a"]} />
          <fog attach="fog" args={["#02030a", 22, 48]} />
          <ambientLight intensity={0.45} />
          <pointLight position={[10, 14, 12]} intensity={1.9} color="#ffe6a7" />
          <pointLight position={[-12, -6, -14]} intensity={1.4} color="#80a8ff" />
          <Stars radius={80} depth={40} count={2200} factor={4} saturation={0.4} fade speed={0.22} />
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
            <Bloom intensity={1.3} luminanceThreshold={0.08} luminanceSmoothing={0.6} />
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

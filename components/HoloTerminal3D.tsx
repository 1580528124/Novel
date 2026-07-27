"use client";

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Html, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { CSSProperties } from "react";
import { MutableRefObject, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type HoloModuleId = "overview" | "missions" | "kings" | "academy" | "alchemy" | "settings";

type HoloModule = {
  id: HoloModuleId;
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

const modules: HoloModule[] = [
  {
    id: "overview",
    label: "主控",
    eyebrow: "NORMA CONSCIOUSNESS CORE",
    title: "诺玛 · 卡塞尔全息终端",
    subtitle: "S 级权限已接入，学院档案室处于全息展开状态。",
    position: [0, 0.38, 0],
    color: "#d9c27a",
    camera: [0, 1.55, 6.4],
    target: [0, 0.18, 0],
    mark: "S",
    lines: ["身份认证：已通过", "卡塞尔接口：在线", "档案完整度：91.8%"]
  },
  {
    id: "missions",
    label: "执行部",
    eyebrow: "EXECUTIVE DEPARTMENT",
    title: "执行部 · 任务档案",
    subtitle: "高危任务、现场报告与紧急调度记录。",
    position: [-4.55, 1.06, -1.75],
    color: "#b44c3f",
    camera: [-4.18, 1.68, 2.92],
    target: [-4.55, 0.86, -1.75],
    mark: "S-021",
    lines: ["格陵兰海异常回波", "青铜城水下档案复核", "芝加哥站接触记录"]
  },
  {
    id: "kings",
    label: "龙王",
    eyebrow: "DRAGON KING ARCHIVE",
    title: "四大君王 · 封印索引",
    subtitle: "黑王血裔、龙王谱系与危险等级。",
    position: [4.55, 1.06, -1.75],
    color: "#e2bd64",
    camera: [4.18, 1.68, 2.92],
    target: [4.55, 0.86, -1.75],
    mark: "王",
    lines: ["青铜与火之王：高危", "大地与山之王：未确认", "天空与风之王：档案封存"]
  },
  {
    id: "academy",
    label: "学院",
    eyebrow: "CASSELL COLLEGE",
    title: "卡塞尔学院 · 校园档案",
    subtitle: "学院权限、校徽、人物档案与训练记录。",
    position: [-3.35, -0.34, 1.08],
    color: "#6fae9a",
    camera: [-3.34, 0.04, 4.2],
    target: [-3.35, -0.34, 1.08],
    mark: "CC",
    lines: ["校董会记录：限制访问", "学生档案：127 份", "诺玛维护状态：稳定"]
  },
  {
    id: "alchemy",
    label: "炼金",
    eyebrow: "ALCHEMY VAULT",
    title: "炼金库 · 禁忌知识",
    subtitle: "言灵、龙文、青铜器物与七宗罪资料。",
    position: [3.35, -0.34, 1.08],
    color: "#8bb6ff",
    camera: [3.34, 0.04, 4.2],
    target: [3.35, -0.34, 1.08],
    mark: "VII",
    lines: ["七宗罪：锻造秘档", "言灵目录：1247 条", "龙文释读：5%"]
  },
  {
    id: "settings",
    label: "系统",
    eyebrow: "TERMINAL SETTINGS",
    title: "终端设置 · 权限校准",
    subtitle: "用户、主题、接口状态与安全协议。",
    position: [0, 1.72, 0.32],
    color: "#d9c27a",
    camera: [0, 1.98, 4.38],
    target: [0, 1.72, 0.32],
    mark: "S",
    lines: ["加密协议：AES-256-GCM", "终端主题：深水 / 炼金 / 龙血", "连接质量：98.7%"]
  }
];

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
    if (pointsRef.current) {
      pointsRef.current.rotation.y = clock.getElapsedTime() * 0.006;
    }
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
      <mesh scale={[1.45, 0.05, 1.45]}>
        <ringGeometry args={[0.56, 0.64, 128]} />
        <meshBasicMaterial color="#d9c27a" transparent opacity={0.24 * coreOpacity} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
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
            opacity={activeId === line.id ? 0.34 : activeId === "overview" ? 0.16 : 0.035}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </line>
      ))}
    </group>
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
    const scale = active ? 1.18 : hovered ? 1.05 : 0.92;
    groupRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.09);

    if (iconRef.current) {
      iconRef.current.rotation.y = time * (active ? 0.42 : 0.18);
      iconRef.current.rotation.z = Math.sin(time * 0.72 + module.position[0]) * 0.06;
    }
  });

  const opacity = active ? 0.9 : hovered ? 0.64 : 0.34;
  const shardOpacity = active ? 0.44 : hovered ? 0.32 : 0.16;
  const emissiveIntensity = active ? 1.8 : hovered ? 1.15 : 0.64;

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
        {module.id === "missions" ? (
          <>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.56, 0.012, 8, 128, Math.PI * 1.58]} />
              <meshBasicMaterial color={module.color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <mesh position={[0, 0.02, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.16, 0.74, 0.16]} />
              <meshStandardMaterial color={module.color} emissive={module.color} emissiveIntensity={emissiveIntensity} transparent opacity={0.5} wireframe />
            </mesh>
            <mesh position={[0, 0.38, 0]}>
              <coneGeometry args={[0.16, 0.36, 4]} />
              <meshBasicMaterial color={module.color} transparent opacity={opacity * 0.68} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
          </>
        ) : null}
        {module.id === "kings" ? (
          <>
            {[0, 0.42, -0.42].map((rotation) => (
              <mesh key={rotation} rotation={[Math.PI / 2, rotation, 0]}>
                <torusGeometry args={[0.58, 0.01, 8, 128]} />
                <meshBasicMaterial color={module.color} transparent opacity={opacity * 0.72} blending={THREE.AdditiveBlending} depthWrite={false} />
              </mesh>
            ))}
            <mesh rotation={[0.36, 0.24, 0]}>
              <icosahedronGeometry args={[0.34, 1]} />
              <meshStandardMaterial color={module.color} emissive={module.color} emissiveIntensity={emissiveIntensity} transparent opacity={0.42} wireframe />
            </mesh>
            {[0, 1, 2, 3].map((index) => (
              <mesh key={index} position={[Math.cos(index * Math.PI * 0.5) * 0.43, 0.26, Math.sin(index * Math.PI * 0.5) * 0.43]}>
                <coneGeometry args={[0.075, 0.24, 3]} />
                <meshBasicMaterial color={module.color} transparent opacity={opacity * 0.58} blending={THREE.AdditiveBlending} depthWrite={false} />
              </mesh>
            ))}
          </>
        ) : null}
        {module.id === "academy" ? (
          <>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.38, 0.56, 96]} />
              <meshBasicMaterial color={module.color} transparent opacity={opacity * 0.48} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh position={[-0.18, 0, 0]} rotation={[0, 0, -0.18]}>
              <boxGeometry args={[0.28, 0.48, 0.025]} />
              <meshStandardMaterial color={module.color} emissive={module.color} emissiveIntensity={emissiveIntensity * 0.82} transparent opacity={0.42} wireframe />
            </mesh>
            <mesh position={[0.18, 0, 0]} rotation={[0, 0, 0.18]}>
              <boxGeometry args={[0.28, 0.48, 0.025]} />
              <meshStandardMaterial color={module.color} emissive={module.color} emissiveIntensity={emissiveIntensity * 0.82} transparent opacity={0.42} wireframe />
            </mesh>
            <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.2, 0.008, 8, 72]} />
              <meshBasicMaterial color="#d9c27a" transparent opacity={opacity * 0.46} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
          </>
        ) : null}
        {module.id === "alchemy" ? (
          <>
            {[0.34, 0.55, 0.76].map((radius, index) => (
              <mesh key={radius} rotation={[Math.PI / 2 + index * 0.28, 0, index * 0.7]}>
                <torusGeometry args={[radius, 0.007, 8, 128, Math.PI * (index === 1 ? 1.42 : 2)]} />
                <meshBasicMaterial color={module.color} transparent opacity={opacity * (0.62 - index * 0.1)} blending={THREE.AdditiveBlending} depthWrite={false} />
              </mesh>
            ))}
            <mesh rotation={[0.44, 0.22, 0]}>
              <tetrahedronGeometry args={[0.34, 0]} />
              <meshStandardMaterial color={module.color} emissive={module.color} emissiveIntensity={emissiveIntensity} transparent opacity={0.48} wireframe />
            </mesh>
          </>
        ) : null}
        {module.id === "settings" ? (
          <>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.5, 0.012, 6, 96]} />
              <meshBasicMaterial color={module.color} transparent opacity={opacity * 0.72} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 6]}>
              <cylinderGeometry args={[0.32, 0.32, 0.18, 6, 1, true]} />
              <meshStandardMaterial color={module.color} emissive={module.color} emissiveIntensity={emissiveIntensity} transparent opacity={0.44} wireframe />
            </mesh>
            {[0, 1, 2].map((index) => (
              <mesh key={index} rotation={[index * Math.PI * 0.33, index * Math.PI * 0.42, 0]}>
                <torusGeometry args={[0.72, 0.004, 6, 96, Math.PI * 1.15]} />
                <meshBasicMaterial color={index === 1 ? "#6fae9a" : module.color} transparent opacity={opacity * 0.3} blending={THREE.AdditiveBlending} depthWrite={false} />
              </mesh>
            ))}
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
          <pointsMaterial size={0.045} color={module.color} transparent opacity={shardOpacity} depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
      </group>
      <Html
        transform
        center
        position={[0, module.id === "settings" ? 0.82 : -0.68, 0]}
        distanceFactor={5.4}
        className={`archive-node-label${active ? " is-active" : ""}`}
      >
        <span>{module.eyebrow}</span>
        <strong>{module.label}</strong>
      </Html>
    </group>
  );
}

function ArchiveNodes({
  activeId,
  onSelect
}: {
  activeId: HoloModuleId;
  onSelect: (id: HoloModuleId) => void;
}) {
  return (
    <group>
      {modules.slice(1).map((module) => (
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

function HoloScene({
  activeId,
  onSelect
}: {
  activeId: HoloModuleId;
  onSelect: (id: HoloModuleId) => void;
}) {
  const controlsRef = useRef<any>(null);
  const activeModule = modules.find((module) => module.id === activeId) ?? modules[0];

  return (
    <Canvas camera={{ position: [0, 1.55, 6.4], fov: 43 }} dpr={[1, 2]}>
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

export default function HoloTerminal3D({ agentName = "未知专员" }: { agentName?: string }) {
  const [activePreset, setActivePreset] = useState<HoloModuleId>("overview");
  const activeModule = modules.find((module) => module.id === activePreset) ?? modules[0];

  return (
    <main className={`pure-holo-terminal${activePreset === "overview" ? " is-overview" : ""}`}>
      <div className="eva-presence" aria-hidden="true" />
      <div className="eva-background-word" aria-hidden="true">CASSELL</div>
      <div className="norma-corner-mark" aria-hidden="true">
        <span>NORMA</span>
        <small>卡塞尔全息终端</small>
      </div>
      <section
        className={`identity-stage domain-stage domain-${activeModule.id}`}
        style={{ "--holo-color": activeModule.color } as CSSProperties}
        aria-label={activeModule.title}
      >
        {activeModule.id === "overview" ? (
          <>
            <div className="identity-light" aria-hidden="true" />
            <strong>S</strong>
            <h1>{agentName}</h1>
            <p>专员 · 执行部</p>
          </>
        ) : (
          <>
            <div className="identity-light" aria-hidden="true" />
            <span>{activeModule.eyebrow}</span>
            {activeModule.id === "academy" ? (
              <div className="domain-emblem">
                <img src="/cassell-emblem.png" alt="" />
              </div>
            ) : (
              <strong>{activeModule.mark}</strong>
            )}
            <h1>{activeModule.title}</h1>
            <p>{activeModule.subtitle}</p>
            <div className="domain-line-list">
              {activeModule.lines.map((line) => (
                <em key={line}>{line}</em>
              ))}
            </div>
          </>
        )}
      </section>
      <div className="holo-preset-bar">
        {modules.map((module) => (
          <button
            type="button"
            key={module.id}
            className={activePreset === module.id ? "is-active" : ""}
            onClick={() => setActivePreset(module.id)}
          >
            {module.label}
          </button>
        ))}
      </div>
      {activePreset !== "overview" ? (
        <button type="button" className="holo-return-rune" onClick={() => setActivePreset("overview")}>
          <span>回溯至</span>
          <strong>NORMA CORE</strong>
        </button>
      ) : null}
      <div className="holo-whisper" aria-hidden="true">
        卡塞尔学院 · 诺玛终端 · 连接协议 4.2.7
      </div>
      <div className="terminal-vignette" aria-hidden="true" />
      <HoloScene activeId={activePreset} onSelect={setActivePreset} />
    </main>
  );
}

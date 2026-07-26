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
  code: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  position: [number, number, number];
  color: string;
  camera: [number, number, number];
  target: [number, number, number];
  danger: string;
  lines: string[];
};

const moduleMarks: Record<HoloModuleId, string> = {
  overview: "S",
  missions: "S-021",
  kings: "王",
  academy: "CC",
  alchemy: "VII",
  settings: "S"
};

const modules: HoloModule[] = [
  {
    id: "overview",
    label: "主控",
    code: "CORE",
    eyebrow: "NORMA CONSCIOUSNESS CORE",
    title: "诺玛 · 卡塞尔全息终端",
    subtitle: "S 级权限已接入，学院档案室处于全息展开状态。",
    position: [0, 0.38, 0],
    color: "#d9c27a",
    camera: [0, 1.55, 6.4],
    target: [0, 0.28, 0],
    danger: "ACCESS S",
    lines: ["血统认证：路明非 / S20240001", "EVA 接口：在线", "档案完整度：91.8%"]
  },
  {
    id: "missions",
    label: "执行部",
    code: "EXD",
    eyebrow: "EXECUTIVE DEPARTMENT",
    title: "执行部 · 任务档案",
    subtitle: "高危任务、现场报告与紧急调度记录。",
    position: [-3.9, 1.08, -1.4],
    color: "#b44c3f",
    camera: [-3.95, 1.55, 3.25],
    target: [-3.9, 0.98, -1.4],
    danger: "RED",
    lines: ["S-021：格陵兰海异常回波", "A-117：青铜城水下档案复核", "B-044：芝加哥站接触记录"]
  },
  {
    id: "kings",
    label: "龙王",
    code: "KING",
    eyebrow: "DRAGON KING ARCHIVE",
    title: "四大君王 · 封印索引",
    subtitle: "黑王血裔、龙王谱系与危险等级。",
    position: [3.95, 1.08, -1.4],
    color: "#e2bd64",
    camera: [3.95, 1.55, 3.25],
    target: [3.95, 0.98, -1.4],
    danger: "OMEGA",
    lines: ["青铜与火之王：高危", "大地与山之王：未确认", "天空与风之王：档案封存"]
  },
  {
    id: "academy",
    label: "学院",
    code: "CC",
    eyebrow: "CASSELL COLLEGE",
    title: "卡塞尔学院 · 校园档案",
    subtitle: "学院权限、校徽、人物档案与训练记录。",
    position: [-3.4, -0.92, 0.95],
    color: "#6fae9a",
    camera: [-3.55, -0.38, 4.15],
    target: [-3.4, -0.78, 0.95],
    danger: "SECURE",
    lines: ["校董会记录：限制访问", "学生档案：1127 份", "诺玛维护状态：稳定"]
  },
  {
    id: "alchemy",
    label: "炼金",
    code: "ALC",
    eyebrow: "ALCHEMY VAULT",
    title: "炼金库 · 禁忌知识",
    subtitle: "言灵、龙文、青铜器物与七宗罪资料。",
    position: [3.4, -0.92, 0.95],
    color: "#8bb6ff",
    camera: [3.55, -0.38, 4.15],
    target: [3.4, -0.78, 0.95],
    danger: "SEALED",
    lines: ["七宗罪：锻造秘档", "言灵目录：1247 条", "龙文释读：85%"]
  },
  {
    id: "settings",
    label: "系统",
    code: "SYS",
    eyebrow: "TERMINAL SETTINGS",
    title: "终端设置 · 权限校准",
    subtitle: "用户、主题、接口状态与安全协议。",
    position: [0, -1.2, 1.9],
    color: "#d9c27a",
    camera: [0, -0.55, 4.45],
    target: [0, -1.05, 1.9],
    danger: "LOCKED",
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
  gradient.addColorStop(0.18, "rgba(255,232,172,0.72)");
  gradient.addColorStop(0.58, "rgba(88,168,148,0.18)");
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
        opacity: index % 2 === 0 ? 0.2 : 0.16
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
      <gridHelper args={[12, 18, "#2a5d54", "#102824"]} />
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
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.getElapsedTime() * 0.006;
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

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = time * 0.22;
      groupRef.current.rotation.z = Math.sin(time * 0.35) * 0.06;
    }
    if (pulseRef.current) {
      const scale = 1.15 + Math.sin(time * 1.4) * 0.08;
      pulseRef.current.scale.set(scale, scale, scale);
    }
  });

  const coreOpacity = activeId === "overview" ? 0.18 : 1;

  return (
    <group position={[0, 0.08, -0.9]} scale={activeId === "overview" ? 0.72 : 1}>
      <mesh ref={pulseRef} scale={[1.1, 0.26, 1.1]}>
        <sphereGeometry args={[1, 64, 32]} />
        <meshBasicMaterial color={activeColor} transparent opacity={0.08 * coreOpacity} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh scale={[0.68, 0.13, 0.68]}>
        <sphereGeometry args={[1, 64, 32]} />
        <meshBasicMaterial color="#ffe8a5" transparent opacity={0.82 * coreOpacity} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh scale={[1.45, 0.05, 1.45]}>
        <ringGeometry args={[0.56, 0.64, 128]} />
        <meshBasicMaterial color="#d9c27a" transparent opacity={0.38 * coreOpacity} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <group ref={groupRef}>
        {[0.95, 1.35, 1.78].map((radius, index) => (
          <mesh key={radius} rotation={[Math.PI / 2 + index * 0.16, 0, index * 0.55]}>
            <torusGeometry args={[radius, 0.006, 8, 160, Math.PI * 1.62]} />
            <meshBasicMaterial color={index === 1 ? "#6fae9a" : "#d9c27a"} transparent opacity={0.42 * coreOpacity} blending={THREE.AdditiveBlending} />
          </mesh>
        ))}
      </group>
      {activeId === "overview" ? null : (
      <Html transform center distanceFactor={3.6} position={[0, 0.72, 0.02]} className="norma-core-label">
        <div>
          <span>NORMA</span>
          <strong>EVA ONLINE</strong>
        </div>
      </Html>
      )}
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
            opacity={activeId === line.id || activeId === "overview" ? 0.26 : 0.055}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </line>
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

function HoloTitle() {
  return (
    <group position={[0, 3.2, -2.2]}>
      <Html transform center distanceFactor={5.3} className="holo-title-object">
        <div>CASSELL COLLEGE</div>
        <span>NORMA / EVA HOLOGRAPHIC ARCHIVE</span>
      </Html>
    </group>
  );
}

function PanelContent({ module }: { module: HoloModule }) {
  if (module.id === "overview") {
    return (
      <>
        <div className="identity-declaration">
          <span>NORMA · CASSELL COLLEGE</span>
          <strong>S</strong>
          <h2>路明非 · 专员</h2>
          <p>执行部 · S 级权限 · 言灵：未知 · 状态：在线</p>
        </div>
        <div className="identity-summary">
          <span>当前任务：1 项</span>
          <span>未读通告：3 项</span>
          <span>系统状态：正常</span>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="holo-panel-copy">{module.subtitle}</p>
      <div className="holo-data-list">
        {module.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      {module.id === "kings" ? (
        <div className="dragon-seal" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : null}
      {module.id === "academy" ? (
        <div className="academy-emblem-small" aria-hidden="true">
          <img src="/cassell-emblem.png" alt="" />
        </div>
      ) : null}
    </>
  );
}

function HoloPanel({
  module,
  active,
  onSelect
}: {
  module: HoloModule;
  active: boolean;
  onSelect: (id: HoloModuleId) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const lift = hovered ? 0.1 : 0;
    const pulse = Math.sin(clock.getElapsedTime() * 1.5 + module.position[0]) * 0.018;
    const targetZ = active ? module.position[2] + 0.42 : module.position[2] - 0.82;
    const targetY = active ? module.position[1] + 0.16 : module.position[1] - 0.18;
    const targetScale = active ? 1.24 : hovered ? 0.82 : 0.72;
    groupRef.current.position.lerp(
      new THREE.Vector3(module.position[0], targetY + lift + pulse, targetZ),
      0.08
    );
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, 1), 0.08);
  });

  return (
    <group
      ref={groupRef}
      position={module.position}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(module.id);
      }}
    >
      <Html transform center distanceFactor={1.18} className="holo-panel">
        <article
          className={`holo-panel-inner${module.id === "overview" ? " is-identity" : ""}${active ? " is-active" : " is-dimmed"}`}
          style={{ "--holo-color": module.color } as CSSProperties}
        >
          {module.id !== "overview" ? (
            <>
              <div className="holo-panel-head">
                <span>{module.eyebrow}</span>
                <strong>{module.danger}</strong>
              </div>
              <h2>{module.title}</h2>
            </>
          ) : null}
          <PanelContent module={module} />
          {module.id !== "overview" ? (
            <div className="holo-panel-foot">
              <span>{module.danger}</span>
              <i>v4.2.7</i>
            </div>
          ) : null}
          <div className="holo-scanline" />
        </article>
      </Html>
    </group>
  );
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
      <EffectComposer>
        <Bloom intensity={0.34} luminanceThreshold={0.18} luminanceSmoothing={0.86} />
        <Vignette eskil={false} offset={0.18} darkness={0.62} />
      </EffectComposer>
    </Canvas>
  );
}

export default function HoloTerminal3D() {
  const [activePreset, setActivePreset] = useState<HoloModuleId>("overview");
  const activeModule = modules.find((module) => module.id === activePreset) ?? modules[0];

  return (
    <main className={`pure-holo-terminal${activePreset === "overview" ? " is-overview" : ""}`}>
      <div className="eva-presence" aria-hidden="true" />
      <div className="eva-background-word" aria-hidden="true">EVA</div>
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
          <h1>路明非</h1>
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
              <strong>{moduleMarks[activeModule.id]}</strong>
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
      <div className="holo-whisper" aria-hidden="true">
        卡塞尔学院 · 诺玛终端 · 连接协议 4.2.7
      </div>
      <div className="terminal-vignette" aria-hidden="true" />
      <HoloScene activeId={activePreset} onSelect={setActivePreset} />
    </main>
  );
}

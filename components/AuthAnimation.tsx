"use client";

import { useEffect, useMemo, useState } from "react";
import DragonScaleBackground from "@/components/DragonScaleBackground";
import type { BloodRank } from "@/lib/agentProfile";

type Phase = 0 | 1 | 2 | 3 | 4;

const bloodLevels = ["E", "D", "C", "B", "A", "S"] as const;

export default function AuthAnimation({
  userName = "未知",
  userId = "ED-2026-000",
  targetBloodRank = "C",
  ready = true,
  scanLabel = "执行部档案编号",
  scanStatus = "正在读取身份签名",
  onComplete
}: {
  userName?: string;
  userId?: string;
  targetBloodRank?: BloodRank;
  ready?: boolean;
  scanLabel?: string;
  scanStatus?: string;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [powerLevel, setPowerLevel] = useState(0);

  const targetBloodIndex = Math.max(0, bloodLevels.indexOf(targetBloodRank));
  const targetMeter = (targetBloodIndex + 1) / bloodLevels.length;

  useEffect(() => {
    if (phase !== 0) return;

    const start = performance.now();
    const duration = ready ? 3000 : 3600;
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = now - start;

      if (ready) {
        const progress = Math.min(elapsed / duration, 1);
        setScanProgress(progress);

        if (progress >= 1) {
          setPhase(1);
          return;
        }
      } else {
        const cycle = (elapsed % duration) / duration;
        const progress = cycle < 0.5 ? cycle * 2 : 2 - cycle * 2;
        setScanProgress(progress);
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, ready]);

  useEffect(() => {
    if (phase !== 1) return;
    const start = performance.now();
    const duration = 2100;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      setPowerLevel(eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setPowerLevel(1);
        setPhase(2);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, targetMeter]);

  useEffect(() => {
    if (phase !== 2) return;
    const timer = window.setTimeout(() => setPhase(3), 1250);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 3) return;
    const timer = window.setTimeout(() => {
      setPhase(4);
      onComplete();
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [phase, onComplete]);

  const bloodLevel = useMemo(() => {
    const rawIndex = Math.floor(powerLevel * (targetBloodIndex + 1));
    const index = Math.min(targetBloodIndex, Math.max(0, rawIndex));
    return bloodLevels[index];
  }, [powerLevel, targetBloodIndex]);

  return (
    <main className={`auth-animation phase-${phase}`}>
      <DragonScaleBackground />
      <div className="auth-animation-word" aria-hidden="true">
        CASSELL
      </div>
      <div className="auth-corner-mark" aria-hidden="true">
        <span>NORMA</span>
        <small>授权认证序列</small>
      </div>

      {phase === 0 ? (
        <section className="scan-phase">
          <svg className="scan-ring" viewBox="0 0 400 400" aria-hidden="true">
            <circle cx="200" cy="200" r="142" />
            <circle
              className="scan-ring-active"
              cx="200"
              cy="200"
              r="142"
              strokeDasharray={`${scanProgress * 892} 892`}
            />
            <line x1="70" x2="330" y1={340 - scanProgress * 280} y2={340 - scanProgress * 280} />
          </svg>
          <div className="scan-identity" style={{ opacity: Math.max(0.45, Math.min(scanProgress * 1.45, 1)) }}>
            <span>{scanLabel}</span>
            <strong>{userId}</strong>
            <em>{ready ? "写入完成 / 即将接入" : scanStatus}</em>
          </div>
        </section>
      ) : null}

      {phase === 1 ? (
        <section className="blood-phase">
          <span>血统验证</span>
          <strong className={bloodLevel === "S" ? "is-s" : ""}>{bloodLevel}</strong>
          <div className="blood-meter">
            <i style={{ width: `${powerLevel * 100}%` }} />
          </div>
          <p>权限阶梯正在同步</p>
        </section>
      ) : null}

      {phase === 2 ? (
        <section className="awakening-phase">
          <div className="awakening-ripple" aria-hidden="true" />
          <strong>SYSTEM AWAKENING</strong>
        </section>
      ) : null}

      {phase === 3 ? (
        <section className="welcome-phase">
          <span>欢迎回来</span>
          <strong>{userName} · 专员</strong>
          <p>NORMA 全息终端已开放</p>
          <div className="welcome-particles" aria-hidden="true">
            {Array.from({ length: 10 }).map((_, index) => (
              <i key={index} />
            ))}
          </div>
        </section>
      ) : null}

      <button type="button" className="auth-skip" onClick={onComplete}>
        跳过
      </button>
    </main>
  );
}

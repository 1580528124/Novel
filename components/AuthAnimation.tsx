"use client";

import { useEffect, useMemo, useState } from "react";
import DragonScaleBackground from "@/components/DragonScaleBackground";

type Phase = 0 | 1 | 2 | 3 | 4;

export default function AuthAnimation({
  userName = "路明非",
  userId = "S20240001",
  onComplete
}: {
  userName?: string;
  userId?: string;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(0);
  const [scanProgress, setScanProgress] = useState(0);
  const [powerLevel, setPowerLevel] = useState(0);

  useEffect(() => {
    if (phase !== 0) return;
    const start = performance.now();
    const duration = 1900;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setScanProgress(progress);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setPhase(1);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

  useEffect(() => {
    if (phase !== 1) return;
    const start = performance.now();
    const duration = 2100;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setPowerLevel(1 - Math.pow(1 - progress, 2));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setPhase(2);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);

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
    const levels = ["E", "D", "C", "B", "A", "S"];
    return levels[Math.min(Math.floor(powerLevel * levels.length), levels.length - 1)];
  }, [powerLevel]);

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
          <div className="scan-identity" style={{ opacity: Math.min(scanProgress * 1.45, 1) }}>
            <span>IDENTITY SIGNATURE</span>
            <strong>{userId}</strong>
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
          <p>权限阶梯正在上升</p>
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
          <p>诺玛全息终端已开放</p>
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

"use client";

import { useState } from "react";
import AuthAnimation from "@/components/AuthAnimation";
import DragonScaleBackground from "@/components/DragonScaleBackground";
import GoldenRippleButton from "@/components/GoldenRippleButton";
import HoloTerminal3D from "@/components/HoloTerminal3D";
import SGradeBadge from "@/components/SGradeBadge";

function AuthScreen({ onEnter }: { onEnter: (agentName: string) => void }) {
  const [connecting, setConnecting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [agentName, setAgentName] = useState("");
  const displayName = agentName.trim() || "未知专员";

  if (connecting) {
    return <AuthAnimation userName={displayName} userId={displayName} onComplete={() => onEnter(displayName)} />;
  }

  return (
    <main className={`norma-auth auth-ritual-screen${focused ? " is-gold-glow" : ""}`}>
      <DragonScaleBackground />
      <div className="auth-eva-word" aria-hidden="true">
        CASSELL
      </div>
      <div className="auth-corner-mark" aria-hidden="true">
        <span>NORMA</span>
        <small>卡塞尔全息终端</small>
      </div>
      <div className="auth-college-sigil" aria-hidden="true">
        <span />
      </div>
      <section className="auth-identity-gate">
        <div className="auth-ritual-light" aria-hidden="true" />
        <div className="auth-protocol">身份验证协议已启动</div>
        <p className="auth-waiting">正在等待专员身份签名</p>
        <SGradeBadge variant="emblem" />
        <div className="auth-credential auth-input-row">
          <label htmlFor="agent-name">专员</label>
          <input
            id="agent-name"
            value={agentName}
            onChange={(event) => setAgentName(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          <span className="auth-focus-shock" aria-hidden="true" />
        </div>
        <div className="auth-grade-row">
          <div>
            <span>血统等级</span>
            <strong>未知</strong>
          </div>
          <GoldenRippleButton onClick={() => setConnecting(true)}>进入卡塞尔</GoldenRippleButton>
        </div>
        <div className="auth-pending">ACCESS PENDING · 等待授权</div>
      </section>
      <div className="auth-protocol-mark" aria-hidden="true">
        CASSELL COLLEGE · TERMINAL PROTOCOL v4.2.7
      </div>
      <div className="auth-latin-mark" aria-hidden="true">
        IN SOMNIS VERITAS
      </div>
      <div className="auth-meta">
        <span>
          <i />
          CONNECTION · STABLE
        </span>
        <span>12ms · AES-256-GCM</span>
        <span>ACCESS PENDING · 权限未知</span>
      </div>
    </main>
  );
}

export default function NormaTerminal() {
  const [authenticated, setAuthenticated] = useState(false);
  const [agentName, setAgentName] = useState("未知专员");
  const interfaceName = agentName.trim() === "芬格尔" ? "EVA" : "CASSELL";

  if (!authenticated) {
    return (
      <AuthScreen
        onEnter={(name) => {
          setAgentName(name);
          setAuthenticated(true);
        }}
      />
    );
  }

  return (
    <main className="hologram-stage">
      <div className="hologram-secondary-status" aria-hidden="true">
        <span>v4.2.7</span>
        <span>{interfaceName} ONLINE</span>
        <span>12ms</span>
      </div>
      <HoloTerminal3D agentName={agentName} />
    </main>
  );
}

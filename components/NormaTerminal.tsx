"use client";

import { useState } from "react";
import DragonScaleBackground from "@/components/DragonScaleBackground";
import GoldenRippleButton from "@/components/GoldenRippleButton";
import HoloTerminal3D from "@/components/HoloTerminal3D";
import SGradeBadge from "@/components/SGradeBadge";

function AuthSequence({ onComplete }: { onComplete: () => void }) {
  return (
    <main className="auth-sequence auth-ritual-screen is-gold-glow">
      <DragonScaleBackground />
      <div className="auth-eva-word" aria-hidden="true">
        EVA
      </div>
      <div className="auth-corner-mark" aria-hidden="true">
        <span>NORMA</span>
        <small>身份验证协议</small>
      </div>
      <section className="auth-ritual">
        <div className="auth-ritual-light" aria-hidden="true" />
        <div className="auth-ritual-status">ACCESS REQUEST RECEIVED</div>
        <div className="auth-school-emblem is-orbital" aria-hidden="true">
          <img src="/cassell-emblem.png" alt="" />
          <span />
          <span />
          <span />
        </div>
        <h1>路明非</h1>
        <p>血统签名读取中 · 执行部专员 · 言灵未知</p>
        <div className="auth-ritual-steps">
          <span>连接卡塞尔中央数据库</span>
          <span>校验 S 级血统权限</span>
          <span>唤醒 EVA 全息接口</span>
        </div>
      </section>
      <button type="button" className="auth-skip" onClick={onComplete}>
        跳过
      </button>
      <div className="auth-complete" onAnimationEnd={onComplete} />
    </main>
  );
}

function AuthScreen({ onEnter }: { onEnter: () => void }) {
  const [connecting, setConnecting] = useState(false);
  const [focused, setFocused] = useState(false);

  if (connecting) {
    return <AuthSequence onComplete={onEnter} />;
  }

  return (
    <main className={`norma-auth auth-ritual-screen${focused ? " is-gold-glow" : ""}`}>
      <DragonScaleBackground />
      <div className="auth-eva-word" aria-hidden="true">
        EVA
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
        <p className="auth-waiting">正在等待 S 级血统签名</p>
        <SGradeBadge variant="emblem" />
        <div className="auth-credential auth-input-row">
          <label htmlFor="student-id">学员编号</label>
          <input
            id="student-id"
            defaultValue="S20240001"
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
          <GoldenRippleButton onClick={() => setConnecting(true)}>建立连接</GoldenRippleButton>
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
        <span>ACCESS PENDING · S 级权限</span>
      </div>
    </main>
  );
}

export default function NormaTerminal() {
  const [authenticated, setAuthenticated] = useState(false);

  if (!authenticated) {
    return <AuthScreen onEnter={() => setAuthenticated(true)} />;
  }

  return (
    <main className="hologram-stage">
      <div className="hologram-secondary-status" aria-hidden="true">
        <span>v4.2.7</span>
        <span>EVA ONLINE</span>
        <span>12ms</span>
      </div>
      <HoloTerminal3D />
    </main>
  );
}

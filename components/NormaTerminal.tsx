"use client";

import { useEffect, useState } from "react";
import AuthAnimation from "@/components/AuthAnimation";
import DragonScaleBackground from "@/components/DragonScaleBackground";
import GoldenRippleButton from "@/components/GoldenRippleButton";
import HoloTerminal3D from "@/components/HoloTerminal3D";
import InternalCommsPanel from "@/components/InternalCommsPanel";
import OperationBriefing, { type Operation } from "@/components/OperationBriefing";
import SGradeBadge from "@/components/SGradeBadge";
import evidencePacketsData from "@/data/evidence-packets.json";
import operationsData from "@/data/operations.json";
import {
  validateAgentName,
  validateCredentials,
  validatePasscodeConfirmation
} from "@/lib/authValidation";
import {
  clearAuthSession,
  completeMission,
  recordAccessLog,
  reviewArchive,
  type AgentAccountSession,
  type AgentProfile,
  type MissionScore
} from "@/lib/agentProfile";
import {
  identifyRemoteAccount,
  loadRemoteSession,
  logoutRemoteAccount,
  registerRemoteAccount,
  resendVerificationEmail,
  updateRemoteProfile,
  warmupRemoteAuth
} from "@/lib/remoteAgentAuth";
import type { EvidencePacket } from "@/components/EvidencePacketViewer";

type AuthMessageTone = "idle" | "error" | "success";

function AuthScreen({ onEnter }: { onEnter: (account: AgentAccountSession) => void }) {
  const [connecting, setConnecting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authStep, setAuthStep] = useState<"credentials" | "dossier" | "verify-email">("credentials");
  const [loginId, setLoginId] = useState("");
  const [passcode, setPasscode] = useState("");
  const [passcodeConfirmation, setPasscodeConfirmation] = useState("");
  const [agentName, setAgentName] = useState("");
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");
  const [pendingVerificationUrl, setPendingVerificationUrl] = useState("");
  const [pendingAccount, setPendingAccount] = useState<AgentAccountSession | null>(null);
  const [authTransition, setAuthTransition] = useState<"idle" | "logging-in" | "registering">("idle");
  const [authMessage, setAuthMessage] = useState("");
  const [authMessageTone, setAuthMessageTone] = useState<AuthMessageTone>("idle");
  const [authBusy, setAuthBusy] = useState(false);
  const displayName = agentName.trim() || loginId.trim() || "未知专员";

  const setFeedback = (message: string, tone: AuthMessageTone = "idle") => {
    setAuthMessage(message);
    setAuthMessageTone(tone);
  };

  useEffect(() => {
    void warmupRemoteAuth();
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError) setFeedback(authError, "error");
  }, []);

  const authPending = authTransition !== "idle";
  const isRegistering = authTransition === "registering";

  if (connecting) {
    return (
      <AuthAnimation
        userName={pendingAccount?.profile.name ?? displayName}
        userId={pendingAccount?.profile.agentId ?? displayName}
        targetBloodRank={pendingAccount?.profile.bloodRank ?? "C"}
        ready={!authPending || Boolean(pendingAccount)}
        scanLabel={isRegistering ? "专员档案写入" : "身份签名读取"}
        scanStatus={
          isRegistering
            ? "正在建立数据库索引 / 等待 NORMA 写入确认"
            : "正在连接专员档案 / 等待 NORMA 回执"
        }
        onComplete={() => {
          if (pendingAccount) onEnter(pendingAccount);
        }}
      />
    );
  }

  const submitCredentials = async () => {
    if (authBusy) return;

    const validationError =
      authMode === "register"
        ? validateCredentials(loginId, passcode) ?? validatePasscodeConfirmation(passcode, passcodeConfirmation)
        : validateCredentials(loginId, passcode);
    if (validationError) {
      setFeedback(validationError, "error");
      return;
    }

    if (authMode === "register") {
      setFeedback("本地校验通过。请填写专员名称，完成卡塞尔建档。", "success");
      setAuthStep("dossier");
      return;
    }

    setAuthTransition("logging-in");
    setPendingAccount(null);
    setConnecting(true);
    setAuthBusy(true);
    setFeedback("正在校验身份密钥");
    const result = await (async () => {
      try {
        return await identifyRemoteAccount(loginId, passcode);
      } catch (error) {
        return {
          ok: false as const,
          reason:
            error instanceof DOMException && error.name === "AbortError"
              ? "NORMA 数据库响应超时，请确认服务仍在线。"
              : "NORMA 数据库连接失败，请确认 Postgres 与 DATABASE_URL。"
        };
      }
    })();
    setAuthBusy(false);

    if (!result.ok) {
      setConnecting(false);
      setAuthTransition("idle");
      if ("requiresEmailVerification" in result && result.requiresEmailVerification) {
        setPendingVerificationEmail(loginId.trim().toLowerCase());
        setAuthStep("verify-email");
      }
      setFeedback(result.reason, "error");
      return;
    }

    if (!result.exists) {
      setConnecting(false);
      setAuthTransition("idle");
      setFeedback("未检索到该登录代号，请切换至专员建档。", "error");
      return;
    }

    setAuthTransition("idle");
    setPendingAccount(result.account);
  };

  const submitDossier = async () => {
    if (authBusy) return;

    const validationError = validateCredentials(loginId, passcode) ?? validateAgentName(agentName);
    if (validationError) {
      setFeedback(validationError, "error");
      return;
    }

    setAuthTransition("registering");
    setPendingAccount(null);
    setAuthBusy(true);
    setFeedback("正在建立专员档案");
    const result = await (async () => {
      try {
        return await registerRemoteAccount(loginId, passcode, agentName);
      } catch (error) {
        return {
          ok: false as const,
          reason:
            error instanceof DOMException && error.name === "AbortError"
              ? "NORMA 数据库响应超时，请确认服务仍在线。"
              : "NORMA 数据库连接失败，请确认 Postgres 与 DATABASE_URL。"
        };
      }
    })();
    setAuthBusy(false);

    if (!result.ok) {
      setAuthTransition("idle");
      setFeedback(result.reason, "error");
      return;
    }

    setAuthTransition("idle");
    setPendingVerificationEmail(result.email ?? loginId.trim().toLowerCase());
    setPendingVerificationUrl(result.devVerifyUrl ?? "");
    setFeedback("验证邮件已发送，请完成邮箱验证。", "success");
    setAuthStep("verify-email");
  };

  const resendVerification = async () => {
    if (authBusy) return;

    const email = pendingVerificationEmail || loginId.trim().toLowerCase();
    if (!email) {
      setFeedback("请输入邮箱后再重发验证邮件。", "error");
      return;
    }

    setAuthBusy(true);
    setFeedback("正在重发验证邮件");
    const result = await (async () => {
      try {
        return await resendVerificationEmail(email);
      } catch {
        return { ok: false as const, reason: "验证邮件重发失败，请确认认证服务仍在线。" };
      }
    })();
    setAuthBusy(false);

    if (!result.ok) {
      setFeedback(result.reason, "error");
      return;
    }

    if (result.devVerifyUrl) setPendingVerificationUrl(result.devVerifyUrl);
    setFeedback(result.alreadyVerified ? "邮箱已完成验证，请返回身份校验。" : "新的验证邮件已发送。", "success");
  };

  if (authStep === "verify-email") {
    return (
      <main className={`norma-auth auth-ritual-screen is-auth-entering${focused ? " is-gold-glow" : ""}`}>
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
        <section className="auth-identity-gate auth-dossier-gate">
          <div className="auth-ritual-light" aria-hidden="true" />
          <div className="auth-protocol">邮箱验证协议已发送</div>
          <p className="auth-waiting">{pendingVerificationEmail || loginId.trim().toLowerCase()}</p>
          <SGradeBadge variant="emblem" />
          {authMessage ? <div className={`auth-feedback is-${authMessageTone}`}>{authMessage}</div> : null}
          {pendingVerificationUrl ? (
            <a className="auth-back-button" href={pendingVerificationUrl}>
              打开验证链接
            </a>
          ) : null}
          <div className="auth-grade-row">
            <GoldenRippleButton disabled={authBusy} onClick={() => void resendVerification()}>
              {authBusy ? "发送中" : "重发验证"}
            </GoldenRippleButton>
          </div>
          <button
            type="button"
            className="auth-back-button"
            onClick={() => {
              setAuthMode("login");
              setAuthStep("credentials");
              setFeedback("");
            }}
          >
            返回身份入口
          </button>
          <div className="auth-pending">MAIL PENDING · 等待验证</div>
        </section>
        <div className="auth-protocol-mark" aria-hidden="true">
          CASSELL COLLEGE · TERMINAL PROTOCOL v4.2.7
        </div>
        <div className="auth-latin-mark" aria-hidden="true">
          IN SOMNIS VERITAS
        </div>
      </main>
    );
  }

  if (authStep === "dossier") {
    return (
      <main className={`norma-auth auth-ritual-screen is-auth-entering${focused ? " is-gold-glow" : ""}`}>
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
        <section className="auth-identity-gate auth-dossier-gate">
          <div className="auth-ritual-light" aria-hidden="true" />
          <div className="auth-protocol">专员建档协议已启动</div>
          <SGradeBadge variant="emblem" />
          <div className="auth-credential auth-input-row">
            <label htmlFor="agent-name">专员</label>
            <input
              id="agent-name"
              value={agentName}
              onChange={(event) => setAgentName(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submitDossier();
              }}
            />
            <span className="auth-focus-shock" aria-hidden="true" />
          </div>
          {authMessage ? <div className={`auth-feedback is-${authMessageTone}`}>{authMessage}</div> : null}
          <div className="auth-grade-row">
            <GoldenRippleButton disabled={authBusy} onClick={() => void submitDossier()}>
              {authBusy ? "建档中" : "进入卡塞尔"}
            </GoldenRippleButton>
          </div>
          <button
            type="button"
            className="auth-back-button"
            onClick={() => {
              setAuthStep("credentials");
              setFeedback("");
            }}
          >
            返回身份入口
          </button>
          <div className="auth-pending">REGISTRY PENDING · 等待建档</div>
        </section>
        <div className="auth-protocol-mark" aria-hidden="true">
          CASSELL COLLEGE · TERMINAL PROTOCOL v4.2.7
        </div>
        <div className="auth-latin-mark" aria-hidden="true">
          IN SOMNIS VERITAS
        </div>
      </main>
    );
  }

  return (
    <main className={`norma-auth auth-ritual-screen is-auth-entering${focused ? " is-gold-glow" : ""}`}>
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
        {authMode === "register" ? <p className="auth-waiting">请使用可接收验证邮件的邮箱。</p> : null}
        <SGradeBadge variant="emblem" />
        <div className="auth-credential auth-input-row">
          <label htmlFor="login-id">邮箱</label>
          <input
            id="login-id"
            type={authMode === "register" || loginId.includes("@") ? "email" : "text"}
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          <span className="auth-focus-shock" aria-hidden="true" />
        </div>
        <div className="auth-credential auth-input-row">
          <label htmlFor="passcode">密钥</label>
          <input
            id="passcode"
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submitCredentials();
            }}
          />
          <span className="auth-focus-shock" aria-hidden="true" />
        </div>
        {authMode === "register" ? (
          <div className="auth-credential auth-input-row">
            <label htmlFor="passcode-confirmation">确认密钥</label>
            <input
              id="passcode-confirmation"
              type="password"
              value={passcodeConfirmation}
              onChange={(event) => setPasscodeConfirmation(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submitCredentials();
              }}
            />
            <span className="auth-focus-shock" aria-hidden="true" />
          </div>
        ) : null}
        <div className="auth-mode-switch" aria-label="认证阶段">
          <button
            type="button"
            className={authMode === "login" ? "is-active" : ""}
            onClick={() => {
              setAuthMode("login");
              setPasscodeConfirmation("");
              setAuthStep("credentials");
              setFeedback("");
            }}
          >
            身份校验
          </button>
          <button
            type="button"
            className={authMode === "register" ? "is-active" : ""}
            onClick={() => {
              setAuthMode("register");
              setPasscodeConfirmation("");
              setAuthStep("credentials");
              setFeedback("");
            }}
          >
            专员建档
          </button>
        </div>
        <div className="auth-grade-row">
          <GoldenRippleButton disabled={authBusy} onClick={() => void submitCredentials()}>
            {authBusy ? "校验中" : authMode === "register" ? "继续建档" : "校验身份"}
          </GoldenRippleButton>
        </div>
        {authMessage ? <div className={`auth-feedback is-${authMessageTone}`}>{authMessage}</div> : null}
        <div className="auth-pending">{authMode === "register" ? "REGISTRY PENDING · 等待建档" : "ACCESS PENDING · 等待授权"}</div>
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
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [activeView, setActiveView] = useState<"terminal" | "operation">("terminal");
  const interfaceName = agentName.trim() === "芬格尔" ? "EVA" : "CASSELL";
  const operation = (operationsData as Operation[])[0];
  const evidencePackets = evidencePacketsData as EvidencePacket[];
  const operationCompleted = profile?.completedMissions.includes(operation.id) ?? false;

  const activateAccount = (account: AgentAccountSession) => {
    setProfile(account.profile);
    setAgentName(account.profile.name);
    setAuthenticated(true);
    setActiveView("terminal");
  };

  const handleMissionComplete = (score: MissionScore) => {
    if (!profile) return;
    const nextProfile = completeMission(profile, operation.id, score, operation.unlocks);
    void updateRemoteProfile(nextProfile);
    setProfile(nextProfile);
  };

  const handleArchiveReviewed = (archiveId: string) => {
    if (!profile) return;
    const nextProfile = reviewArchive(profile, archiveId);
    void updateRemoteProfile(nextProfile);
    setProfile(nextProfile);
  };

  const handleAccessLog = (log: Parameters<typeof recordAccessLog>[1]) => {
    if (!profile) return;
    const nextProfile = recordAccessLog(profile, log);
    void updateRemoteProfile(nextProfile);
    setProfile(nextProfile);
  };

  useEffect(() => {
    void loadRemoteSession().then((result) => {
      if (result.ok) {
        activateAccount(result.account);
        return;
      }

      clearAuthSession();
    });
  }, []);

  if (!authenticated) {
    return (
      <AuthScreen
        onEnter={(account) => {
          activateAccount(account);
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
      <button
        type="button"
        className="terminal-logout"
        onClick={() => {
          void logoutRemoteAccount();
          clearAuthSession();
          setAuthenticated(false);
          setProfile(null);
          setAgentName("未知专员");
        }}
      >
        断开
      </button>
      <InternalCommsPanel profile={profile} />
      <div className={activeView === "operation" ? "terminal-input-suspended" : ""}>
        <HoloTerminal3D
          agentName={agentName}
          profile={profile}
          operationCompleted={operationCompleted}
          onStartOperation={() => setActiveView("operation")}
          onArchiveReviewed={handleArchiveReviewed}
          onAccessLog={handleAccessLog}
        />
      </div>
      {activeView === "operation" && profile ? (
        <OperationBriefing
          profile={profile}
          operation={operation}
          evidencePackets={evidencePackets}
          onComplete={handleMissionComplete}
          onClose={() => setActiveView("terminal")}
        />
      ) : null}
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";
import EvidencePacketViewer, { type EvidencePacket } from "@/components/EvidencePacketViewer";
import type { AgentProfile, MissionScore } from "@/lib/agentProfile";

export type Operation = {
  id: string;
  title: string;
  code: string;
  level: string;
  briefing: string;
  objectives: string[];
  evidenceIds: string[];
  questions: Array<{
    id: string;
    prompt: string;
    options: Array<{
      id: string;
      label: string;
      consequence: string;
      score: number;
    }>;
  }>;
  unlocks: string[];
};

type Step = "briefing" | "evidence" | "judgement" | "report";

function getRating(total: number): MissionScore["rating"] {
  if (total >= 88) return "S";
  if (total >= 68) return "A";
  return "B";
}

export default function OperationBriefing({
  profile,
  operation,
  evidencePackets,
  onComplete,
  onClose
}: {
  profile: AgentProfile;
  operation: Operation;
  evidencePackets: EvidencePacket[];
  onComplete: (score: MissionScore) => void;
  onClose: () => void;
}) {
  const savedScore = profile.missionScores[operation.id] ?? null;
  const [step, setStep] = useState<Step>(savedScore ? "report" : "briefing");
  const [activeEvidenceId, setActiveEvidenceId] = useState(operation.evidenceIds[0]);
  const [choices, setChoices] = useState<Record<string, string>>(savedScore?.choices ?? {});
  const [submittedScore, setSubmittedScore] = useState<MissionScore | null>(savedScore);

  const packets = useMemo(
    () => operation.evidenceIds.map((id) => evidencePackets.find((packet) => packet.id === id)).filter(Boolean) as EvidencePacket[],
    [evidencePackets, operation.evidenceIds]
  );
  const activePacket = packets.find((packet) => packet.id === activeEvidenceId) ?? packets[0];
  const complete = operation.questions.every((question) => Boolean(choices[question.id]));

  const selectedConsequences = operation.questions
    .map((question) => {
      const selectedId = choices[question.id];
      return question.options.find((option) => option.id === selectedId)?.consequence;
    })
    .filter(Boolean) as string[];

  const submitReport = () => {
    const finalChoices = operation.questions.reduce<Record<string, string>>((nextChoices, question) => {
      nextChoices[question.id] = choices[question.id] ?? question.options[0]?.id ?? "";
      return nextChoices;
    }, {});
    const total = operation.questions.reduce((sum, question) => {
      const selected = question.options.find((option) => option.id === finalChoices[question.id]);
      return sum + (selected?.score ?? 0);
    }, 0);
    const rating = getRating(total);
    const score: MissionScore = {
      missionId: operation.id,
      accuracy: Math.min(100, Math.round(total * 0.98)),
      discipline: choices.action === "continue-objective" ? 52 : 86,
      evidence: 92,
      total,
      rating,
      choices: finalChoices,
      completedAt: new Date().toISOString()
    };
    setChoices(finalChoices);
    setSubmittedScore(score);
    setStep("report");
    onComplete(score);
  };

  return (
    <section
      className={`operation-briefing operation-step-${step}`}
      aria-label={`${operation.title} 任务流程`}
      style={{ position: "fixed", zIndex: 2147483647, pointerEvents: "auto" }}
    >
      <div className="operation-topline">
        <span>{operation.code}</span>
        <strong>CLEARANCE {profile.clearance} / {profile.agentId}</strong>
        <button type="button" onClick={onClose}>返回终端</button>
      </div>

      <div className="operation-tabs" aria-label="任务阶段">
        {(["briefing", "evidence", "judgement", "report"] as Step[]).map((item) => (
          <button
            key={item}
            type="button"
            className={step === item ? "is-active" : ""}
            disabled={item === "report" && !submittedScore}
            onClick={() => setStep(item)}
          >
            {item === "briefing" ? "简报" : item === "evidence" ? "证据" : item === "judgement" ? "判断" : "报告"}
          </button>
        ))}
      </div>

      {step === "briefing" ? (
        <div className="operation-briefing-grid">
          <div className="operation-primary">
            <span>EXECUTIVE DEPARTMENT / OPERATION BRIEF</span>
            <h1>{operation.title}</h1>
            <p>{operation.briefing}</p>
            <div className="operation-objectives">
              {operation.objectives.map((objective, index) => (
                <em key={objective}>{String(index + 1).padStart(2, "0")} / {objective}</em>
              ))}
            </div>
          </div>
          <aside className="operation-norma-panel">
            <span>NORMA DIRECTIVE</span>
            <p>专员 {profile.name}，该任务将写入你的执行部履历。所有判断均会被记录。</p>
            <button type="button" onClick={() => setStep("evidence")}>审阅证据链</button>
          </aside>
        </div>
      ) : null}

      {step === "evidence" ? (
        <div className="operation-evidence-layout">
          <nav className="evidence-index" aria-label="证据列表">
            {packets.map((packet, index) => (
              <button
                key={packet.id}
                type="button"
                className={activePacket.id === packet.id ? "is-active" : ""}
                onClick={() => setActiveEvidenceId(packet.id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{packet.title}</strong>
              </button>
            ))}
          </nav>
          <EvidencePacketViewer packet={activePacket} />
          <button type="button" className="operation-next" onClick={() => setStep("judgement")}>提交判断</button>
        </div>
      ) : null}

      {step === "judgement" ? (
        <form
          className="operation-judgement"
          onSubmit={(event) => {
            event.preventDefault();
            submitReport();
          }}
        >
          <header>
            <span>FIELD REPORT / JUDGEMENT REQUIRED</span>
            <h1>提交执行部判断</h1>
          </header>
          <div className="judgement-grid">
            {operation.questions.map((question) => (
              <fieldset key={question.id} className="judgement-fieldset">
                <legend>{question.prompt}</legend>
                {question.options.map((option) => (
                  <label key={option.id} className={choices[question.id] === option.id ? "is-selected" : ""}>
                    <input
                      type="radio"
                      name={question.id}
                      checked={choices[question.id] === option.id}
                      onChange={() => setChoices((current) => ({ ...current, [question.id]: option.id }))}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          <div
            className="operation-action-bar"
            role="button"
            tabIndex={0}
            style={{ position: "sticky", zIndex: 2147483647, pointerEvents: "auto" }}
            onClick={submitReport}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                submitReport();
              }
            }}
          >
            <span>{complete ? "JUDGEMENT PACKAGE READY" : "WAITING FOR ALL FIELDS"}</span>
            <button
              type="submit"
              className={complete ? "is-ready" : "is-waiting"}
              style={{ position: "relative", zIndex: 2147483647, pointerEvents: "auto" }}
              onClick={submitReport}
            >
              上传判断报告
            </button>
          </div>
        </form>
      ) : null}

      {step === "report" && submittedScore ? (
        <div className="operation-report">
          <span>NORMA ASSESSMENT / RECORDED</span>
          <h1>任务评估完成</h1>
          <div className="report-score">
            <strong>{submittedScore.rating}</strong>
            <em>{submittedScore.total} / 100</em>
          </div>
          <div className="report-metrics">
            <span>判断准确度 {submittedScore.accuracy}</span>
            <span>执行部纪律 {submittedScore.discipline}</span>
            <span>证据引用 {submittedScore.evidence}</span>
          </div>
          <div className="report-consequences">
            {selectedConsequences.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <strong className="archive-unlock">权限更新：CLEARANCE 2 / KING-01 初级档案已开放</strong>
          <button type="button" onClick={onClose}>返回全息终端</button>
        </div>
      ) : null}
    </section>
  );
}

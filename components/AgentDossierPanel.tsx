"use client";

import type { AgentProfile } from "@/lib/agentProfile";

const archiveLabels: Record<string, string> = {
  "archive-bronze-fire": "KING-01 / 青铜与火之王初级档案",
  "archive-seven-sins": "炼金武器链 / 七宗罪摘要",
  "archive-moniach-second-strike": "摩尼亚赫号 / 二次作战记录"
};

const missionLabels: Record<string, string> = {
  "op-kuimen-review": "MISSION-S / 夔门计划复盘"
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "UNKNOWN";
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function AgentDossierPanel({ profile, onClose }: { profile: AgentProfile; onClose: () => void }) {
  const missionScores = Object.values(profile.missionScores);
  const reviewedArchives = profile.reviewedArchives ?? [];
  const unlockedArchives = profile.unlockedArchives ?? [];

  return (
    <section className="agent-dossier-panel" aria-label="专员履历">
      <div className="agent-dossier-topline">
        <span>AGENT DOSSIER / NORMA INTERNAL</span>
        <button type="button" onClick={onClose}>返回终端</button>
      </div>

      <header className="agent-dossier-identity">
        <span>{profile.agentId}</span>
        <h1>{profile.name}</h1>
        <p>{profile.department} / CLEARANCE {profile.clearance} / BLOOD RANK {profile.bloodRank}</p>
      </header>

      <div className="agent-dossier-grid">
        <article>
          <span>PROFILE</span>
          <dl>
            <div>
              <dt>专员编号</dt>
              <dd>{profile.agentId}</dd>
            </div>
            <div>
              <dt>所属部门</dt>
              <dd>{profile.department}</dd>
            </div>
            <div>
              <dt>最近登录</dt>
              <dd>{formatDate(profile.lastLoginAt)}</dd>
            </div>
          </dl>
        </article>

        <article>
          <span>ACCESS</span>
          <dl>
            <div>
              <dt>当前权限</dt>
              <dd>CLEARANCE {profile.clearance}</dd>
            </div>
            <div>
              <dt>已开放档案</dt>
              <dd>{unlockedArchives.length}</dd>
            </div>
            <div>
              <dt>已审阅档案</dt>
              <dd>{reviewedArchives.length}</dd>
            </div>
          </dl>
        </article>
      </div>

      <div className="agent-dossier-records">
        <article>
          <span>MISSION RECORDS</span>
          {missionScores.length ? (
            missionScores.map((score) => (
              <div key={score.missionId} className="dossier-record">
                <strong>{missionLabels[score.missionId] ?? score.missionId}</strong>
                <em>RATING {score.rating} / SCORE {score.total} / {formatDate(score.completedAt)}</em>
              </div>
            ))
          ) : (
            <p>暂无执行部复盘记录。</p>
          )}
        </article>

        <article>
          <span>ARCHIVE REVIEWS</span>
          {reviewedArchives.length ? (
            reviewedArchives.map((archiveId) => (
              <div key={archiveId} className="dossier-record">
                <strong>{archiveLabels[archiveId] ?? archiveId}</strong>
                <em>REVIEWED / NORMA ACCESS LOGGED</em>
              </div>
            ))
          ) : (
            <p>暂无档案审阅记录。</p>
          )}
        </article>
      </div>

      <aside className="agent-dossier-note">
        <span>NORMA NOTE</span>
        <p>
          该专员已完成基础王座级风险复盘，并具备 KING-01 初级档案访问记录。建议保持观察，暂不生成强制派遣指令。
        </p>
      </aside>
    </section>
  );
}


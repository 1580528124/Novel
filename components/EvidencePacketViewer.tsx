"use client";

import type { CSSProperties } from "react";

export type EvidencePacket = {
  id: string;
  operationId: string;
  title: string;
  type: "通讯" | "声呐" | "生命体征" | "火控" | "档案" | "监控";
  classification: string;
  summary: string;
  readings: Array<{ label: string; value: string; state: "ok" | "warn" | "danger" }>;
  normaNotes: string[];
  sourceEvidenceIds: string[];
};

const evidenceTone: Record<EvidencePacket["type"], string> = {
  通讯: "#6fb7d8",
  声呐: "#5fa99a",
  生命体征: "#d95d50",
  火控: "#d9a84f",
  档案: "#c9c2a0",
  监控: "#9db6ff"
};

export default function EvidencePacketViewer({ packet }: { packet: EvidencePacket }) {
  return (
    <article
      className={`evidence-packet evidence-${packet.type}`}
      style={{ "--evidence-color": evidenceTone[packet.type] } as CSSProperties}
    >
      <header className="evidence-packet-header">
        <span>{packet.classification}</span>
        <strong>{packet.type}</strong>
      </header>
      <h2>{packet.title}</h2>
      <p>{packet.summary}</p>
      <div className="evidence-readings" aria-label="证据读数">
        {packet.readings.map((reading) => (
          <div key={reading.label} className={`reading-state is-${reading.state}`}>
            <span>{reading.label}</span>
            <strong>{reading.value}</strong>
          </div>
        ))}
      </div>
      <div className="norma-notes">
        <span>NORMA AUTO MARK</span>
        {packet.normaNotes.map((note) => (
          <em key={note}>{note}</em>
        ))}
      </div>
    </article>
  );
}


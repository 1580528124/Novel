"use client";

import { useMemo, useState } from "react";
import type { AgentProfile } from "@/lib/agentProfile";

type ContactId = "lu" | "chu" | "caesar" | "finger" | "norma";

type Contact = {
  id: ContactId;
  name: string;
  title: string;
  status: string;
  channel: string;
  messages: Array<{
    from: string;
    time: string;
    text: string;
  }>;
};

const contacts: Contact[] = [
  {
    id: "norma",
    name: "NORMA",
    title: "中央控制系统",
    status: "ONLINE",
    channel: "SYS-000",
    messages: [
      { from: "NORMA", time: "14:02", text: "专员身份已确认。当前通讯将写入学院内部日志。" },
      { from: "NORMA", time: "14:03", text: "你可以联系学院登记人员，但高危任务细节仍受权限限制。" }
    ]
  },
  {
    id: "lu",
    name: "路明非",
    title: "S 级学员",
    status: "IDLE",
    channel: "STU-S-001",
    messages: [
      { from: "路明非", time: "13:48", text: "喂，能看到吗？如果这是执行部频道，我是不是应该装得专业一点？" },
      { from: "路明非", time: "13:49", text: "诺玛说你刚完成夔门复盘。那个档案最好别在晚上一个人看。" }
    ]
  },
  {
    id: "chu",
    name: "楚子航",
    title: "狮心会 / 执行部候补",
    status: "AVAILABLE",
    channel: "LION-CH-07",
    messages: [
      { from: "楚子航", time: "13:52", text: "收到你的访问记录。KING-01 档案不要只看结论，注意双生关系。" },
      { from: "楚子航", time: "13:53", text: "如果出现城市级异常，优先确认入口是否稳定，再判断是否申请封锁。" }
    ]
  },
  {
    id: "caesar",
    name: "恺撒",
    title: "学生会主席",
    status: "ONLINE",
    channel: "STU-CG-01",
    messages: [
      { from: "恺撒", time: "13:56", text: "新人专员？很好。学院需要能把报告写清楚的人，比只会开枪的人稀有。" },
      { from: "恺撒", time: "13:57", text: "如果你要调取学生会资源，先把理由写得像样一点。" }
    ]
  },
  {
    id: "finger",
    name: "芬格尔",
    title: "新闻部 / 临时情报源",
    status: "UNVERIFIED",
    channel: "NEWS-F-13",
    messages: [
      { from: "芬格尔", time: "14:00", text: "兄弟，内部通讯可不是白用的。你要是查北京地铁，我这里有点小道消息。" },
      { from: "NORMA", time: "14:00", text: "警告：该联系人情报可信度需要二次验证。" }
    ]
  }
];

export default function InternalCommsPanel({ profile }: { profile: AgentProfile | null }) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<ContactId>("norma");
  const activeContact = useMemo(() => contacts.find((contact) => contact.id === activeId) ?? contacts[0], [activeId]);

  return (
    <section className={`internal-comms${open ? " is-open" : " is-collapsed"}`} aria-label="学院内部通讯">
      <button type="button" className="internal-comms-toggle" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
        <span>学院通讯</span>
        <strong>{open ? "收起" : "5"}</strong>
      </button>

      {open ? (
        <div className="internal-comms-body">
          <header>
            <span>CASSELL INTERNAL COMMS</span>
            <strong>{profile?.agentId ?? "ED-UNKNOWN"}</strong>
          </header>
          <div className="internal-comms-layout">
            <nav aria-label="通讯联系人">
              {contacts.map((contact) => (
                <button key={contact.id} type="button" className={activeContact.id === contact.id ? "is-active" : ""} onClick={() => setActiveId(contact.id)}>
                  <strong>{contact.name}</strong>
                  <span>{contact.status}</span>
                </button>
              ))}
            </nav>
            <article className="internal-thread">
              <div className="internal-thread-head">
                <span>{activeContact.channel}</span>
                <h2>{activeContact.name}</h2>
                <p>{activeContact.title} / {activeContact.status}</p>
              </div>
              <div className="internal-messages">
                {activeContact.messages.map((message) => (
                  <p key={`${message.from}-${message.time}-${message.text}`}>
                    <strong>{message.from}</strong>
                    <em>{message.time}</em>
                    <span>{message.text}</span>
                  </p>
                ))}
              </div>
              <div className="internal-reply">
                <input value="当前频道为只读记录模式" readOnly aria-label="通讯输入" />
                <button type="button">发送申请</button>
              </div>
            </article>
          </div>
        </div>
      ) : null}
    </section>
  );
}


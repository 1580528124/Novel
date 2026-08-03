"use client";

import { useMemo, useState } from "react";
import type { AgentProfile } from "@/lib/agentProfile";

type CommChannelId = "norma" | "executive" | "news" | "student_union" | "private";
type CommMessageType = "system" | "permission" | "intel" | "ops" | "personal";
type CommPriority = "常规" | "高" | "待核验";

type CommMessage = {
  id: string;
  from: string;
  time: string;
  type: CommMessageType;
  meta: string;
  text: string;
};

type CommChannel = {
  id: CommChannelId;
  name: string;
  shortName: string;
  subtitle: string;
  status: string;
  channel: string;
  priority: CommPriority;
  clearance: string;
  cipher: string;
  members: string[];
  unread: number;
  messages: CommMessage[];
};

const channels: CommChannel[] = [
  {
    id: "norma",
    name: "NORMA 系统频道",
    shortName: "NORMA",
    subtitle: "中央控制系统 / 权限与日志",
    status: "在线",
    channel: "SYS-000",
    priority: "高",
    clearance: "C-2 可读",
    cipher: "AES-256 / 校内节点",
    members: ["NORMA", "权限审计", "专员接口"],
    unread: 2,
    messages: [
      {
        id: "norma-1",
        from: "NORMA",
        time: "13:42",
        type: "system",
        meta: "身份确认",
        text: "专员身份已确认。当前通讯记录将写入学院内部日志。"
      },
      {
        id: "norma-2",
        from: "NORMA",
        time: "13:44",
        type: "permission",
        meta: "权限提示",
        text: "高危任务细节仍受权限限制。当前专员可读取索引、摘要与授权范围内的复核记录。"
      },
      {
        id: "norma-3",
        from: "NORMA",
        time: "13:46",
        type: "system",
        meta: "通讯策略",
        text: "通讯频道已切换为只读记录模式。自由回复功能暂未开放。"
      }
    ]
  },
  {
    id: "executive",
    name: "执行部频道",
    shortName: "执行部",
    subtitle: "任务协调 / 异常复核",
    status: "监听中",
    channel: "EXD-017",
    priority: "高",
    clearance: "C-2 摘要",
    cipher: "AES-256 / 执行部中继",
    members: ["执行部值班官", "NORMA", "区域专员"],
    unread: 1,
    messages: [
      {
        id: "exec-1",
        from: "执行部值班官",
        time: "13:49",
        type: "ops",
        meta: "行动准则",
        text: "城市级异常优先确认入口稳定性，再判断是否申请封锁。不要把自然灾害记录直接等同于龙王现身。"
      },
      {
        id: "exec-2",
        from: "NORMA",
        time: "13:51",
        type: "intel",
        meta: "档案提醒",
        text: "KING 档案不要只看结论。先确认双生节点，再看执行部建议。"
      },
      {
        id: "exec-3",
        from: "行动秘书",
        time: "13:53",
        type: "permission",
        meta: "复核要求",
        text: "C-3 以上复核请求需附带坐标、证据来源与风险摘要。"
      }
    ]
  },
  {
    id: "news",
    name: "新闻部频道",
    shortName: "新闻部",
    subtitle: "校内传闻 / 外部舆情",
    status: "延迟 3ms",
    channel: "NBD-021",
    priority: "待核验",
    clearance: "C-1 开放",
    cipher: "校内加密 / 可追溯",
    members: ["新闻部编辑", "匿名线人", "NORMA 过滤器"],
    unread: 3,
    messages: [
      {
        id: "news-1",
        from: "芬格尔",
        time: "13:55",
        type: "intel",
        meta: "校内情报",
        text: "内部通讯不是白用的。权限不够的时候，摘要、传闻和校内匿名帖有时比封存档案更先到。"
      },
      {
        id: "news-2",
        from: "NORMA",
        time: "13:56",
        type: "system",
        meta: "可信度警告",
        text: "新闻部情报可信度需要二次验证，不可作为执行部行动依据。"
      },
      {
        id: "news-3",
        from: "芬格尔",
        time: "13:58",
        type: "personal",
        meta: "补充",
        text: "当然，二次验证归二次验证，先知道哪里有坑总不是坏事。"
      }
    ]
  },
  {
    id: "student_union",
    name: "学生会频道",
    shortName: "学生会",
    subtitle: "资源申请 / 行动支援",
    status: "在线",
    channel: "STU-CG-01",
    priority: "常规",
    clearance: "C-2 可读",
    cipher: "学院内网 / 受控转发",
    members: ["恺撒", "学生会秘书处", "支援组"],
    unread: 1,
    messages: [
      {
        id: "stu-1",
        from: "恺撒",
        time: "13:56",
        type: "personal",
        meta: "学生会留言",
        text: "新人专员？很好。学院需要能把报告写清楚的人，比只会开枪的人稀有。"
      },
      {
        id: "stu-2",
        from: "学生会秘书处",
        time: "13:57",
        type: "permission",
        meta: "资源规则",
        text: "装备、路线和临时支援申请需提交理由。未归档任务不开放资源调度。"
      },
      {
        id: "stu-3",
        from: "恺撒",
        time: "13:58",
        type: "ops",
        meta: "行动建议",
        text: "如果你要调学生会资源，理由写得像样一点。"
      }
    ]
  },
  {
    id: "private",
    name: "私人联系人",
    shortName: "联系人",
    subtitle: "专员私线 / 只读留痕",
    status: "在线",
    channel: "PRI-ED-02",
    priority: "常规",
    clearance: "本人可读",
    cipher: "端到端 / NORMA 留痕",
    members: ["路明非", "楚子航", "恺撒", "芬格尔"],
    unread: 2,
    messages: [
      {
        id: "private-1",
        from: "路明非",
        time: "14:01",
        type: "personal",
        meta: "私人消息",
        text: "喂，能看到吗？如果这是执行部频道，我是不是应该装得专业一点？"
      },
      {
        id: "private-2",
        from: "楚子航",
        time: "14:03",
        type: "ops",
        meta: "任务提醒",
        text: "诺玛说你刚完成夔门复盘。那个档案最好别在晚上一个人看。"
      },
      {
        id: "private-3",
        from: "NORMA",
        time: "14:04",
        type: "system",
        meta: "通讯标识",
        text: "已确认你的通讯标识。保持在线。"
      }
    ]
  }
];

const messageTypeLabel: Record<CommMessageType, string> = {
  system: "系统",
  permission: "权限",
  intel: "情报",
  ops: "行动",
  personal: "私人"
};

function priorityText(priority: CommPriority) {
  if (priority === "高") return "高优先级";
  if (priority === "待核验") return "待核验";
  return "常规优先级";
}

export default function InternalCommsPanel({ profile }: { profile: AgentProfile | null }) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<CommChannelId>("norma");
  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeId) ?? channels[0],
    [activeId]
  );
  const unreadTotal = channels.reduce((sum, channel) => sum + channel.unread, 0);
  const agentId = profile?.agentId ?? "ED-UNKNOWN";

  return (
    <section className={`internal-comms ${open ? "is-open" : "is-collapsed"}`} aria-label="学院内部通讯">
      <button className="internal-comms-toggle" type="button" onClick={() => setOpen((value) => !value)}>
        <span>学院通讯</span>
        <strong>{open ? "收起" : `${unreadTotal} 新`}</strong>
      </button>

      {open ? (
        <div className="internal-comms-body">
          <header className="internal-comms-command">
            <div>
              <span>CASSELL CHANNEL CENTER</span>
              <strong>{agentId} / 只读记录</strong>
            </div>
            <em>{activeChannel.cipher}</em>
          </header>

          <div className="internal-comms-status-grid" aria-label="通讯状态">
            <div>
              <span>频道</span>
              <strong>{activeChannel.channel}</strong>
            </div>
            <div>
              <span>权限</span>
              <strong>{activeChannel.clearance}</strong>
            </div>
            <div>
              <span>优先级</span>
              <strong>{priorityText(activeChannel.priority)}</strong>
            </div>
          </div>

          <div className="internal-comms-layout">
            <nav aria-label="通讯频道">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  className={channel.id === activeChannel.id ? "is-active" : ""}
                  type="button"
                  onClick={() => setActiveId(channel.id)}
                >
                  <span className="internal-channel-code">{channel.channel}</span>
                  <strong>{channel.shortName}</strong>
                  <em>{channel.status}</em>
                  <small>{channel.unread > 0 ? `${channel.unread} 条未读` : "已同步"}</small>
                </button>
              ))}
            </nav>

            <article className="internal-thread">
              <div className="internal-thread-head">
                <div>
                  <span>{activeChannel.channel}</span>
                  <h2>{activeChannel.name}</h2>
                  <p>{activeChannel.subtitle}</p>
                </div>
                <strong>{activeChannel.clearance}</strong>
              </div>

              <div className="internal-thread-meta" aria-label="在线成员">
                {activeChannel.members.map((member) => (
                  <span key={member}>{member}</span>
                ))}
              </div>

              <div className="internal-messages">
                {activeChannel.messages.map((message) => (
                  <article key={message.id} className={`internal-message is-${message.type}`}>
                    <header>
                      <strong>{message.from}</strong>
                      <span>{message.time}</span>
                      <em>
                        {messageTypeLabel[message.type]} / {message.meta}
                      </em>
                    </header>
                    <p>{message.text}</p>
                  </article>
                ))}
              </div>

              <footer className="internal-transmission-audit">
                <span>通讯审计</span>
                <strong>只读模式 / 不生成外发通讯</strong>
              </footer>
            </article>
          </div>
        </div>
      ) : null}
    </section>
  );
}

import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme, agents } from "../theme";
import { ChatMessage } from "../components/ChatMessage";
import { AnimatedBg } from "../components/AnimatedBg";
import { Icon } from "../components/Icon";
import { easeOutExpo, easeInExpo, easeOutBack } from "../utils/easing";

const denis = agents.find(a => a.id === "denis")!;
const tim = agents.find(a => a.id === "tim")!;
const ada = agents.find(a => a.id === "ada")!;
const alan = agents.find(a => a.id === "alan")!;

type Task = { label: string; tool: string; duration: number };

const tasksByAgent: Record<string, Task[]> = {
  tim: [
    { label: "Identifier le fournisseur comptable", tool: "providers.search('odoo')", duration: 28 },
    { label: "Lister les templates de factures", tool: "templates.list('invoice.*')", duration: 28 },
    { label: "Retourner le schéma de données", tool: "schema.get()", duration: 22 },
  ],
  ada: [
    { label: "Extraire les factures en retard", tool: "odoo.list_invoices({status: 'overdue'})", duration: 34 },
    { label: "Croiser avec les contacts", tool: "odoo.get_partners({role: 'accountant'})", duration: 26 },
    { label: "Structurer en CSV", tool: "format.csv(rows)", duration: 20 },
  ],
  alan: [
    { label: "Composer le message personnalisé", tool: "donald.draft('relance_fr')", duration: 28 },
    { label: "Envoyer sur Slack à chaque comptable", tool: "slack.send_direct(contact)", duration: 30 },
    { label: "Archiver en mémoire projet", tool: "save_project_memory()", duration: 18 },
  ],
};

export const S04_MultiAgent: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const inProgress = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp", easing: easeOutExpo });
  const inScale = interpolate(inProgress, [0, 1], [1.06, 1]);
  const inBlur = interpolate(inProgress, [0, 1], [14, 0]);
  const outProgress = interpolate(frame, [durationInFrames - 22, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInExpo });
  const outOpacity = 1 - outProgress;
  const outScale = 1 - outProgress * 0.04;

  const titleSpring = spring({ frame: frame - 5, fps, config: { damping: 18, stiffness: 110 } });

  return (
    <AbsoluteFill style={{ opacity: inProgress * outOpacity, transform: `scale(${inScale * outScale})`, filter: `blur(${inBlur}px)` }}>
      <AnimatedBg variant="light" intensity={0.7} />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 52,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [-18, 0])}px)`,
        }}
      >
        <div style={{ fontSize: 13, color: theme.color.brand, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
          Orchestration multi-agent
        </div>
        <div style={{ fontSize: 46, fontWeight: 800, color: theme.color.text, marginTop: 8, letterSpacing: -1 }}>
          Un agent qui en dirige plusieurs.
        </div>
      </div>

      {/* Layout */}
      <div
        style={{
          position: "absolute",
          top: 170,
          left: 64,
          right: 64,
          bottom: 40,
          display: "flex",
          gap: 36,
          perspective: 1800,
        }}
      >
        {/* Conversation */}
        <div style={{ flex: "0 0 560px", display: "flex", flexDirection: "column" }}>
          <ConversationCard frame={frame} fps={fps} />
        </div>

        {/* Subagent stack */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18, transformStyle: "preserve-3d" }}>
          <SubagentPanel agent={tim} tasks={tasksByAgent.tim} index={0} frame={frame} fps={fps} />
          <SubagentPanel agent={ada} tasks={tasksByAgent.ada} index={1} frame={frame} fps={fps} />
          <SubagentPanel agent={alan} tasks={tasksByAgent.alan} index={2} frame={frame} fps={fps} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ═══ CONVERSATION ═══════════════════════════════════════
const ConversationCard: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const userIn = spring({ frame: frame - 8, fps, config: { damping: 18 } });
  const d1 = spring({ frame: frame - 40, fps, config: { damping: 18 } });
  const d2 = spring({ frame: frame - 78, fps, config: { damping: 18 } });
  const d3 = spring({ frame: frame - 250, fps, config: { damping: 18 } });

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 22,
        border: "1px solid rgba(0,0,0,0.04)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)",
        padding: 28,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${theme.color.borderSoft}` }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: theme.color.brandLight, color: theme.color.brand, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="sparkle" size={14} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.color.text }}>Conversation principale</div>
          <div style={{ fontSize: 11, color: theme.color.textMuted }}>3 sous-agents actifs</div>
        </div>
        <StatusDot color={theme.color.brand} pulse />
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        <ChatMessage kind="user" opacity={userIn} translateY={(1 - userIn) * 14} maxWidth={460}>
          Relance les factures impayées et préviens les comptables sur Slack
        </ChatMessage>

        <ChatMessage
          kind="assistant"
          agentColor={denis.color}
          agentName={`${denis.name} · Généraliste`}
          agentEmoji={denis.emoji}
          opacity={d1}
          translateY={(1 - d1) * 14}
          maxWidth={460}
        >
          Je découpe la tâche et délègue à 3 experts spécialisés.
        </ChatMessage>

        <ChatMessage
          kind="assistant"
          agentColor={denis.color}
          agentName={denis.name}
          agentEmoji={denis.emoji}
          opacity={d2}
          translateY={(1 - d2) * 14}
          maxWidth={460}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "2px 0" }}>
            <DelegateRow agent={tim} label="Rechercher les outils Odoo disponibles" />
            <DelegateRow agent={ada} label="Extraire les factures en retard" />
            <DelegateRow agent={alan} label="Composer et envoyer les relances" />
          </div>
        </ChatMessage>

        <ChatMessage
          kind="assistant"
          agentColor={denis.color}
          agentName={denis.name}
          agentEmoji={denis.emoji}
          opacity={d3}
          translateY={(1 - d3) * 14}
          maxWidth={460}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <ResultLine label="12 factures en retard identifiées" />
            <ResultLine label="Relances personnalisées envoyées" />
            <ResultLine label="3 comptables notifiés sur Slack" />
          </div>
        </ChatMessage>
      </div>
    </div>
  );
};

const DelegateRow: React.FC<{ agent: typeof agents[number]; label: string }> = ({ agent, label }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "8px 12px",
      background: agent.color + "10",
      borderRadius: 10,
      border: `1px solid ${agent.color}22`,
    }}
  >
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: 8,
        background: agent.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        flexShrink: 0,
      }}
    >
      {agent.emoji}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: theme.color.text, lineHeight: 1.2 }}>→ {agent.name}</div>
      <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 2, lineHeight: 1.3 }}>{label}</div>
    </div>
  </div>
);

const ResultLine: React.FC<{ label: string }> = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: theme.color.text }}>
    <span
      style={{
        width: 18,
        height: 18,
        borderRadius: 999,
        background: theme.color.success,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      ✓
    </span>
    {label}
  </div>
);

// ═══ SUBAGENT PANEL ══════════════════════════════════════
const SubagentPanel: React.FC<{
  agent: typeof agents[number];
  tasks: Task[];
  index: number;
  frame: number;
  fps: number;
}> = ({ agent, tasks, index, frame, fps }) => {
  const startFrame = 105 + index * 14;
  const panelSpring = spring({ frame: frame - startFrame, fps, config: { damping: 14, stiffness: 110, mass: 0.9 } });
  const opacity = interpolate(panelSpring, [0, 1], [0, 1]);
  const rotY = interpolate(panelSpring, [0, 1], [-28, 0]);
  const tx = interpolate(panelSpring, [0, 1], [70, 0]);
  const scale = interpolate(panelSpring, [0, 1], [0.92, 1]);

  // Compute task timeline
  const taskStart = startFrame + 14;
  let cursor = taskStart;
  const timed = tasks.map((t) => {
    const s = cursor;
    const e = cursor + t.duration;
    cursor = e;
    return { ...t, start: s, end: e };
  });
  const overallEnd = cursor + 6;
  const progress = interpolate(frame, [taskStart, overallEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const done = frame >= overallEnd;

  // Subtle continuous breathing
  const t = frame / 30;
  const breathe = 1 + Math.sin(t * 1.5 + index) * 0.003;

  return (
    <div
      style={{
        opacity,
        transformStyle: "preserve-3d",
        transform: `translateX(${tx}px) scale(${scale * breathe}) rotateY(${rotY}deg)`,
        background: "#ffffff",
        borderRadius: 18,
        border: `1px solid ${done ? theme.color.success + "55" : agent.color + "33"}`,
        boxShadow: done
          ? `0 12px 32px ${theme.color.success}1a`
          : `0 12px 32px ${agent.color}1f, 0 2px 8px rgba(0,0,0,0.04)`,
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${theme.color.borderSoft}`,
          background: `linear-gradient(90deg, ${agent.color}10, ${agent.color}02 60%, transparent)`,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${agent.color}, ${agent.color}cc)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            boxShadow: `0 6px 18px ${agent.color}55`,
            flexShrink: 0,
          }}
        >
          {agent.emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: theme.color.text, letterSpacing: -0.2 }}>{agent.name}</div>
            <span style={{ fontSize: 10, color: theme.color.textSubtle, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>
              · {agent.role}
            </span>
          </div>
          <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 2 }}>
            Sous-agent délégué par Denis
          </div>
        </div>
        <StatusBadge done={done} color={agent.color} />
      </div>

      {/* Tasks */}
      <div style={{ flex: 1, padding: "12px 18px 14px", display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
        {timed.map((task, i) => {
          const isActive = frame >= task.start && frame < task.end;
          const isDone = frame >= task.end;
          const appear = interpolate(frame, [task.start - 6, task.start + 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const taskProgress = isActive
            ? interpolate(frame, [task.start, task.end], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
            : isDone
            ? 1
            : 0;

          return (
            <TaskRow
              key={i}
              label={task.label}
              tool={task.tool}
              status={isDone ? "done" : isActive ? "active" : "pending"}
              color={agent.color}
              opacity={appear}
              translateY={(1 - appear) * 6}
              progress={taskProgress}
              frame={frame}
            />
          );
        })}
      </div>

      {/* Overall progress */}
      <div style={{ padding: "0 18px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: theme.color.textSubtle, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>
            Avancement
          </div>
          <div style={{ fontSize: 11, color: done ? theme.color.success : agent.color, fontWeight: 700 }}>
            {Math.round(progress * 100)}%
          </div>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: theme.color.borderSoft, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${progress * 100}%`,
              background: done
                ? `linear-gradient(90deg, ${theme.color.success}, #22c55e)`
                : `linear-gradient(90deg, ${agent.color}, ${agent.color}bb)`,
              borderRadius: 2,
              boxShadow: `0 0 10px ${done ? theme.color.success : agent.color}88`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

// ═══ TASK ROW ════════════════════════════════════════════
const TaskRow: React.FC<{
  label: string;
  tool: string;
  status: "pending" | "active" | "done";
  color: string;
  opacity: number;
  translateY: number;
  progress: number;
  frame: number;
}> = ({ label, tool, status, color, opacity, translateY, progress, frame }) => {
  const isDone = status === "done";
  const isActive = status === "active";
  const shimmerX = ((frame * 4) % 300) - 100;

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        padding: "10px 12px",
        borderRadius: 12,
        background: isActive ? color + "0D" : "transparent",
        border: `1px solid ${isActive ? color + "33" : "transparent"}`,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        position: "relative",
        overflow: "hidden",
        transition: "all 0.2s",
      }}
    >
      {/* Shimmer on active */}
      {isActive && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: shimmerX,
            width: 80,
            height: "100%",
            background: `linear-gradient(90deg, transparent, ${color}22, transparent)`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Status icon */}
      <div
        style={{
          width: 20,
          height: 20,
          minWidth: 20,
          borderRadius: 999,
          background: isDone ? theme.color.success : isActive ? color + "22" : theme.color.borderSoft,
          color: isDone ? "#fff" : isActive ? color : theme.color.textSubtle,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          marginTop: 1,
          flexShrink: 0,
          transition: "all 0.3s",
        }}
      >
        {isDone ? "✓" : isActive ? <ActiveSpinner color={color} /> : ""}
      </div>

      {/* Label + tool */}
      <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: isDone ? theme.color.textMuted : theme.color.text,
            textDecoration: isDone ? "line-through" : "none",
            lineHeight: 1.3,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 11,
            color: isActive ? color : theme.color.textSubtle,
            fontFamily: "'SF Mono', Menlo, monospace",
            marginTop: 3,
            opacity: 0.85,
          }}
        >
          {tool}
        </div>
        {isActive && (
          <div style={{ marginTop: 6, height: 2, borderRadius: 1, background: color + "18", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${progress * 100}%`,
                background: color,
                borderRadius: 1,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const ActiveSpinner: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const rot = (frame * 10) % 360;
  return (
    <svg width={11} height={11} viewBox="0 0 24 24" style={{ transform: `rotate(${rot}deg)` }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke={color + "33"} strokeWidth="3" />
      <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

const StatusBadge: React.FC<{ done: boolean; color: string }> = ({ done, color }) => {
  const frame = useCurrentFrame();
  const pulse = 0.85 + (Math.sin(frame / 6) + 1) * 0.075;
  if (done) {
    return (
      <div
        style={{
          padding: "4px 10px",
          borderRadius: 999,
          background: theme.color.success + "18",
          color: theme.color.success,
          fontSize: 11,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 5,
          letterSpacing: 0.3,
        }}
      >
        <span style={{ fontSize: 10 }}>✓</span>
        Terminé
      </div>
    );
  }
  return (
    <div
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        background: color + "18",
        color,
        fontSize: 11,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        gap: 6,
        letterSpacing: 0.3,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          background: color,
          opacity: pulse,
          boxShadow: `0 0 8px ${color}`,
        }}
      />
      En cours
    </div>
  );
};

const StatusDot: React.FC<{ color: string; pulse?: boolean }> = ({ color, pulse }) => {
  const frame = useCurrentFrame();
  const p = pulse ? 0.7 + (Math.sin(frame / 7) + 1) * 0.15 : 1;
  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        background: color,
        opacity: p,
        boxShadow: `0 0 10px ${color}`,
      }}
    />
  );
};

import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { AnimatedBg } from "../components/AnimatedBg";
import { Icon } from "../components/Icon";
import { easeOutExpo, easeInExpo } from "../utils/easing";

type TodoStatus = "pending" | "in_progress" | "completed";

const todos: { label: string; toolCall: string }[] = [
  { label: "Identifier les factures impayées", toolCall: "odoo.list_invoices(status: overdue, limit: 50)" },
  { label: "Extraire les contacts comptables", toolCall: "odoo.get_partners(role: accountant)" },
  { label: "Composer la relance personnalisée", toolCall: "donald.draft(template: 'relance_fr')" },
  { label: "Envoyer sur Slack à chaque contact", toolCall: "slack.send_direct(to: contact.id)" },
  { label: "Archiver en mémoire projet", toolCall: "save_project_memory(flowId: ...)" },
];

export const S05_TodoList: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const inProgress = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp", easing: easeOutExpo });
  const outProgress = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInExpo });
  const outOpacity = 1 - outProgress;
  const outScale = 1 - outProgress * 0.04;

  const titleSpring = spring({ frame: frame - 3, fps, config: { damping: 16, stiffness: 130 } });

  // Each todo: animated timeline
  const perTodo = 26;
  const startOffset = 20;
  const statuses: TodoStatus[] = todos.map((_, i) => {
    const activeAt = startOffset + i * perTodo;
    const doneAt = activeAt + perTodo - 6;
    if (frame < activeAt) return "pending";
    if (frame < doneAt) return "in_progress";
    return "completed";
  });

  const completedCount = statuses.filter(s => s === "completed").length;
  const progressPct = (completedCount / todos.length) * 100;

  const t = frame / 30;

  return (
    <AbsoluteFill style={{ opacity: inProgress * outOpacity, transform: `scale(${outScale})` }}>
      <AnimatedBg variant="light" intensity={0.7} />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 72,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [-22, 0])}px)`,
        }}
      >
        <div style={{ fontSize: 13, color: theme.color.brand, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
          Progression en temps réel
        </div>
        <div style={{ fontSize: 46, fontWeight: 800, color: theme.color.text, marginTop: 8, letterSpacing: -1 }}>
          Vous voyez <span style={{ color: theme.color.brand }}>tout</span> ce qu'il fait.
        </div>
      </div>

      {/* Card with 3D perspective */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 230,
          transform: `translateX(-50%) rotateX(${Math.sin(t * 0.4) * 1.5}deg) rotateY(${Math.cos(t * 0.3) * 1}deg)`,
          transformOrigin: "center top",
          perspective: 1500,
          width: 900,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: 22,
            border: "1px solid rgba(0,0,0,0.04)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.08), 0 6px 24px rgba(0,0,0,0.04)",
            padding: 28,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  background: `linear-gradient(135deg, ${theme.color.brand}, #7c3aed)`,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 8px 22px ${theme.color.brand}55`,
                }}
              >
                <Icon name="check" size={17} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: theme.color.text, letterSpacing: -0.3 }}>Plan d'exécution</div>
                <div style={{ fontSize: 12, color: theme.color.textMuted }}>Ada · Analyste données</div>
              </div>
            </div>
            <div
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                background: completedCount === todos.length ? theme.color.success + "18" : theme.color.brandLight,
                color: completedCount === todos.length ? theme.color.success : theme.color.brand,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {completedCount}/{todos.length} étapes
            </div>
          </div>

          {/* Progress bar with shimmer */}
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: theme.color.borderSoft,
              marginBottom: 24,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${theme.color.brand}, #7c3aed)`,
                borderRadius: 3,
                boxShadow: `0 0 14px ${theme.color.brand}88`,
                transition: "width 0.3s ease",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: `${Math.max(0, progressPct - 8)}%`,
                width: 20,
                height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Todos */}
          {todos.map((todo, i) => {
            const appear = interpolate(frame, [6 + i * 4, 20 + i * 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const ty = interpolate(appear, [0, 1], [14, 0]);
            return (
              <TodoCard
                key={i}
                status={statuses[i]}
                label={todo.label}
                toolCall={todo.toolCall}
                opacity={appear}
                translateY={ty}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const TodoCard: React.FC<{
  status: TodoStatus;
  label: string;
  toolCall: string;
  opacity: number;
  translateY: number;
}> = ({ status, label, toolCall, opacity, translateY }) => {
  const frame = useCurrentFrame();
  const isDone = status === "completed";
  const isActive = status === "in_progress";

  // Shimmer position
  const shimmerX = ((frame * 4) % 600) - 200;

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        marginBottom: 10,
        position: "relative",
        overflow: "hidden",
        borderRadius: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "13px 16px",
          borderRadius: 14,
          background: isActive ? theme.color.brandLight + "aa" : "#ffffff",
          border: `1px solid ${isActive ? theme.color.brand + "44" : theme.color.borderSoft}`,
          boxShadow: isActive ? `0 8px 24px ${theme.color.brand}18` : "0 1px 3px rgba(0,0,0,0.03)",
          position: "relative",
          overflow: "hidden",
          transition: "all 0.25s",
        }}
      >
        {/* Shimmer on active */}
        {isActive && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: shimmerX,
              width: 120,
              height: "100%",
              background: `linear-gradient(90deg, transparent, ${theme.color.brand}18, transparent)`,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Status marker */}
        <div
          style={{
            width: 22,
            height: 22,
            minWidth: 22,
            borderRadius: 999,
            background: isDone ? theme.color.success : isActive ? theme.color.brand + "22" : "transparent",
            border: `2px solid ${isDone ? theme.color.success : isActive ? theme.color.brand : "#d1d5db"}`,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
            marginTop: 1,
            transition: "all 0.3s",
          }}
        >
          {isDone && <Icon name="check" size={12} color="#fff" strokeWidth={3} />}
          {isActive && <ActiveSpinner />}
        </div>

        <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: isDone ? theme.color.textMuted : theme.color.text,
              textDecoration: isDone ? "line-through" : "none",
              lineHeight: 1.35,
            }}
          >
            {label}
          </div>
          <div
            style={{
              marginTop: 5,
              padding: "5px 10px",
              borderRadius: 7,
              background: isActive ? "#0b0b12" : "#f5f5f7",
              color: isActive ? "#a5f3fc" : theme.color.textMuted,
              fontFamily: "'SF Mono', Menlo, monospace",
              fontSize: 11,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: isActive ? "none" : `1px solid ${theme.color.borderSoft}`,
            }}
          >
            <span style={{ color: isActive ? "#fb7185" : theme.color.textSubtle }}>▸</span>
            {toolCall}
          </div>
        </div>

        {isActive && (
          <div
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: theme.color.brand,
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.5,
              marginTop: 2,
              display: "flex",
              alignItems: "center",
              gap: 4,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: 3,
                background: "#fff",
                opacity: 0.5 + (Math.sin(frame / 5) + 1) * 0.25,
              }}
            />
            En cours
          </div>
        )}
        {isDone && (
          <div
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: theme.color.success + "18",
              color: theme.color.success,
              fontSize: 10,
              fontWeight: 700,
              marginTop: 2,
              flexShrink: 0,
            }}
          >
            ✓ Terminé
          </div>
        )}
      </div>
    </div>
  );
};

const ActiveSpinner: React.FC = () => {
  const frame = useCurrentFrame();
  const rot = (frame * 10) % 360;
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" style={{ transform: `rotate(${rot}deg)` }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke={theme.color.brand + "33"} strokeWidth="3" />
      <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke={theme.color.brand} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

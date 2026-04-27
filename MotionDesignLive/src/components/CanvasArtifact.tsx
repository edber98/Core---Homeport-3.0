import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { Icon } from "./Icon";
import { LucideIcon, IconName } from "./AgentIcon";

// Interactive canvas artifact shown by sub-agents (e.g., Tim research canvas with cards).
export const CanvasArtifact: React.FC<{
  title: string;
  agent: { name: string; iconName: IconName; color: string };
  items: { title: string; tag: string; excerpt: string }[];
  revealProgress?: number;
}> = ({ title, agent, items, revealProgress = 1 }) => {
  const frame = useCurrentFrame();
  const visibleCount = Math.ceil(items.length * revealProgress);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#ffffff",
        borderRadius: 20,
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 20px 48px rgba(0,0,0,0.08), 0 4px 14px rgba(0,0,0,0.04)",
        padding: 22,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${theme.color.borderSoft}` }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${agent.color}, ${agent.color}cc)`,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 6px 18px ${agent.color}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
          }}
        >
          <LucideIcon name={agent.iconName} size={18} color="#fff" strokeWidth={2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: theme.color.textSubtle, fontWeight: 700, letterSpacing: 1.3, textTransform: "uppercase" }}>
            Canvas — {agent.name}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: theme.color.text, marginTop: 2, letterSpacing: -0.2 }}>
            {title}
          </div>
        </div>
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            background: agent.color + "18",
            color: agent.color,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.5,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <span style={{ width: 5, height: 5, borderRadius: 3, background: agent.color, opacity: 0.6 + (Math.sin(frame / 5) + 1) * 0.2 }} />
          LIVE
        </div>
      </div>

      {/* Items grid */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, overflow: "hidden" }}>
        {items.slice(0, visibleCount).map((item, i) => (
          <div
            key={i}
            style={{
              padding: 12,
              background: "#f8fafc",
              borderRadius: 12,
              border: `1px solid ${theme.color.borderSoft}`,
              display: "flex",
              flexDirection: "column",
              gap: 5,
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: agent.color,
                fontWeight: 700,
                letterSpacing: 0.8,
                textTransform: "uppercase",
              }}
            >
              {item.tag}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.color.text, lineHeight: 1.3 }}>
              {item.title}
            </div>
            <div style={{ fontSize: 10, color: theme.color.textMuted, lineHeight: 1.4 }}>
              {item.excerpt}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

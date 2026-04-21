import React from "react";
import { theme } from "../theme";
import type { Agent } from "../theme";

export const AgentCard: React.FC<{
  agent: Agent;
  scale?: number;
  opacity?: number;
  highlighted?: boolean;
  size?: "sm" | "md" | "lg";
}> = ({ agent, scale = 1, opacity = 1, highlighted = false, size = "md" }) => {
  const sizes = {
    sm: { w: 140, h: 72, emoji: 22, name: 13, role: 10 },
    md: { w: 200, h: 96, emoji: 28, name: 15, role: 11 },
    lg: { w: 260, h: 120, emoji: 36, name: 18, role: 13 },
  }[size];

  return (
    <div
      style={{
        width: sizes.w,
        height: sizes.h,
        borderRadius: 16,
        background: "#ffffff",
        border: `1px solid ${highlighted ? agent.color : theme.color.borderSoft}`,
        boxShadow: highlighted
          ? `0 12px 32px ${agent.color}33, 0 0 0 2px ${agent.color}22`
          : theme.shadow.card,
        padding: 14,
        display: "flex",
        alignItems: "center",
        gap: 12,
        transform: `scale(${scale})`,
        opacity,
        transition: "all 0.3s",
      }}
    >
      <div
        style={{
          width: sizes.h - 32,
          height: sizes.h - 32,
          minWidth: sizes.h - 32,
          borderRadius: 12,
          background: `linear-gradient(135deg, ${agent.color}, ${agent.color}dd)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: sizes.emoji,
          boxShadow: `0 6px 18px ${agent.color}40`,
        }}
      >
        {agent.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: sizes.name, fontWeight: 600, color: theme.color.text }}>{agent.name}</div>
        <div style={{ fontSize: sizes.role, color: theme.color.textMuted, marginTop: 2 }}>{agent.role}</div>
      </div>
    </div>
  );
};

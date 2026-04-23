import React from "react";
import type { Agent } from "../theme";
import { LucideIcon, IconName } from "./AgentIcon";

// Reusable avatar for an agent: colored gradient background + lucide icon.
export const AgentAvatar: React.FC<{
  agent: Agent;
  size?: number;
  glow?: boolean;
  rounded?: number;
}> = ({ agent, size = 40, glow = true, rounded }) => {
  const r = rounded ?? Math.round(size * 0.28);
  const iconSize = Math.round(size * 0.52);

  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: r,
        background: `linear-gradient(135deg, ${agent.color}, ${agent.color}cc)`,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: glow
          ? `0 ${Math.round(size * 0.15)}px ${Math.round(size * 0.3)}px ${agent.color}55, inset 0 1px 0 rgba(255,255,255,0.25)`
          : "none",
        flexShrink: 0,
      }}
    >
      <LucideIcon name={agent.iconName as IconName} size={iconSize} color="#fff" strokeWidth={2} />
    </div>
  );
};

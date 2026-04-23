import React from "react";
import { theme } from "../theme";
import { LucideIcon, IconName } from "./AgentIcon";

export const ChatMessage: React.FC<{
  kind: "user" | "assistant";
  agentColor?: string;
  agentName?: string;
  agentIcon?: IconName;
  children: React.ReactNode;
  opacity?: number;
  translateY?: number;
  maxWidth?: number;
}> = ({ kind, agentColor, agentName, agentIcon, children, opacity = 1, translateY = 0, maxWidth = 540 }) => {
  const isUser = kind === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        opacity,
        transform: `translateY(${translateY}px)`,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          flexDirection: isUser ? "row-reverse" : "row",
          maxWidth,
        }}
      >
        {!isUser && agentColor && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${agentColor}, ${agentColor}cc)`,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 4px 14px ${agentColor}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
              flexShrink: 0,
            }}
          >
            {agentIcon && <LucideIcon name={agentIcon} size={18} color="#fff" />}
          </div>
        )}
        <div>
          {!isUser && agentName && (
            <div style={{ fontSize: 12, color: theme.color.textMuted, marginBottom: 4, fontWeight: 600 }}>
              {agentName}
            </div>
          )}
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 14,
              background: isUser ? theme.color.brand : "#ffffff",
              color: isUser ? "#fff" : theme.color.text,
              fontSize: 14,
              lineHeight: 1.55,
              boxShadow: isUser ? theme.shadow.brand : theme.shadow.card,
              border: isUser ? "none" : `1px solid ${theme.color.borderSoft}`,
              fontWeight: isUser ? 500 : 400,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

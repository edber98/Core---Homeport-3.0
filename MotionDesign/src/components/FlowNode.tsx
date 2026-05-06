import React from "react";
import { theme } from "../theme";

export type NodeKind = "start" | "function" | "condition" | "loop" | "agent" | "end";

export const FlowNode: React.FC<{
  kind: NodeKind;
  title: string;
  subtitle?: string;
  icon?: string;
  accent?: string;
  x: number;
  y: number;
  selected?: boolean;
  opacity?: number;
  scale?: number;
  width?: number;
}> = ({ kind, title, subtitle, icon, accent, x, y, selected = false, opacity = 1, scale = 1, width = 223 }) => {
  const color =
    accent ??
    ({
      start: theme.color.success,
      function: theme.color.brand,
      condition: theme.color.warning,
      loop: theme.color.info,
      agent: "#722ed1",
      end: theme.color.textMuted,
    }[kind]);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          border: `1px solid ${selected ? theme.color.brand : theme.color.grid}`,
          borderRadius: 14,
          padding: 14,
          boxShadow: selected
            ? `0 0 0 2px ${theme.color.brand}26, 0 12px 32px rgba(0,0,0,0.08)`
            : theme.shadow.card,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: `${color}18`,
            color: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          {icon ?? "●"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.color.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {/* Handles */}
      {kind !== "start" && (
        <div
          style={{
            position: "absolute",
            left: -5,
            top: "50%",
            width: 10,
            height: 10,
            borderRadius: 5,
            background: "#ffffff",
            border: `2px solid ${theme.color.nodeConnection}`,
            transform: "translateY(-50%)",
          }}
        />
      )}
      {kind !== "end" && (
        <div
          style={{
            position: "absolute",
            right: -5,
            top: "50%",
            width: 10,
            height: 10,
            borderRadius: 5,
            background: "#ffffff",
            border: `2px solid ${theme.color.nodeConnection}`,
            transform: "translateY(-50%)",
          }}
        />
      )}
    </div>
  );
};

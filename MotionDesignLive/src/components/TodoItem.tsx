import React from "react";
import { theme } from "../theme";

export type TodoStatus = "pending" | "in_progress" | "completed";

export const TodoItem: React.FC<{
  status: TodoStatus;
  label: string;
  toolCall?: string;
  opacity?: number;
  translateY?: number;
}> = ({ status, label, toolCall, opacity = 1, translateY = 0 }) => {
  const isDone = status === "completed";
  const isActive = status === "in_progress";

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderRadius: 12,
          background: isActive ? theme.color.brandLight : "#ffffff",
          border: `1px solid ${isActive ? theme.color.brand + "55" : theme.color.borderSoft}`,
          boxShadow: isActive ? `0 4px 16px ${theme.color.brand}20` : theme.shadow.card,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            border: `2px solid ${isDone ? theme.color.success : isActive ? theme.color.brand : "#d1d5db"}`,
            background: isDone ? theme.color.success : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {isDone && "✓"}
          {isActive && (
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: theme.color.brand,
              }}
            />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: isDone ? theme.color.textMuted : theme.color.text,
              textDecoration: isDone ? "line-through" : "none",
            }}
          >
            {label}
          </div>
        </div>
        {isActive && (
          <div style={{ display: "flex", gap: 4 }}>
            <div style={dotStyle(0)} />
            <div style={dotStyle(1)} />
            <div style={dotStyle(2)} />
          </div>
        )}
      </div>
      {isActive && toolCall && (
        <div
          style={{
            marginTop: 6,
            marginLeft: 40,
            padding: "8px 12px",
            borderRadius: 8,
            background: "#0b0b12",
            color: "#a5f3fc",
            fontSize: 12,
            fontFamily: "'SF Mono', Menlo, monospace",
          }}
        >
          <span style={{ color: "#fb7185" }}>▸</span> {toolCall}
        </div>
      )}
    </div>
  );
};

const dotStyle = (i: number): React.CSSProperties => ({
  width: 5,
  height: 5,
  borderRadius: 3,
  background: theme.color.brand,
  opacity: 0.3 + ((i + 1) % 3) * 0.3,
});

import React from "react";
import { theme } from "../theme";

export const EmailCard: React.FC<{
  from: string;
  subject: string;
  preview: string;
  time?: string;
  unread?: boolean;
  highlight?: boolean;
  scale?: number;
  opacity?: number;
}> = ({ from, subject, preview, time = "09:14", unread = true, highlight = false, scale = 1, opacity = 1 }) => (
  <div
    style={{
      background: "#ffffff",
      borderRadius: 14,
      border: `1px solid ${highlight ? theme.color.brand : theme.color.borderSoft}`,
      boxShadow: highlight
        ? `0 0 0 2px ${theme.color.brand}26, 0 18px 40px rgba(230,25,130,0.2)`
        : "0 8px 24px rgba(0,0,0,0.05), 0 1px 4px rgba(0,0,0,0.03)",
      padding: 16,
      display: "flex",
      gap: 14,
      width: "100%",
      opacity,
      transform: `scale(${scale})`,
      transition: "box-shadow 0.2s, border 0.2s",
      position: "relative",
    }}
  >
    {unread && (
      <span
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          width: 8,
          height: 8,
          borderRadius: 4,
          background: theme.color.brand,
        }}
      />
    )}
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 12,
        background: `linear-gradient(135deg, #0ea5e9, #0284c7)`,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 15,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {from.charAt(0).toUpperCase()}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: theme.color.text }}>{from}</div>
        <div style={{ fontSize: 11, color: theme.color.textMuted, flexShrink: 0, marginLeft: 8 }}>{time}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: theme.color.text, marginBottom: 3, lineHeight: 1.3 }}>
        {subject}
      </div>
      <div style={{ fontSize: 11, color: theme.color.textMuted, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {preview}
      </div>
    </div>
  </div>
);

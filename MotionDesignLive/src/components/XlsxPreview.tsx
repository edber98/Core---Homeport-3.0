import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { C4rbonLogo, c4rbonPalette } from "./C4rbonLogo";
import { Icon } from "./Icon";

type Row = { rank: number; name: string; country: string; pricing: string; focus: string };

const rows: Row[] = [
  { rank: 1, name: "Zapier", country: "🇺🇸 US", pricing: "$19–$799", focus: "Grand public, 5000+ apps" },
  { rank: 2, name: "Make", country: "🇨🇿 CZ", pricing: "$9–$29", focus: "Visuel, scenario-based" },
  { rank: 3, name: "n8n", country: "🇩🇪 DE", pricing: "Open-source", focus: "Self-hosted, dev-friendly" },
  { rank: 4, name: "Workato", country: "🇺🇸 US", pricing: "Enterprise", focus: "Finance & HR" },
  { rank: 5, name: "Tray.io", country: "🇺🇸 US", pricing: "Enterprise", focus: "API-first, low-code" },
  { rank: 6, name: "Mulesoft", country: "🇺🇸 US", pricing: "Enterprise", focus: "iPaaS B2B historique" },
  { rank: 7, name: "Pipedream", country: "🇺🇸 US", pricing: "$0–$49", focus: "Event-driven, code" },
  { rank: 8, name: "Kinn", country: "🇫🇷 FR", pricing: "Sur mesure", focus: "Agents IA + workflows" },
];

// Replica of the xlsx file opened inline, themed with c4rbon.group palette.
export const XlsxPreview: React.FC<{ progress?: number; filename?: string }> = ({
  progress = 1,
  filename = "etude-marche-2026-3.0.xlsx",
}) => {
  const frame = useCurrentFrame();
  const rowsVisible = Math.floor(progress * rows.length);
  const cellFade = (i: number) => interpolate(i, [rowsVisible - 2, rowsVisible], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#ffffff",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 24px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)",
        border: "1px solid rgba(0,0,0,0.06)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          padding: "14px 20px",
          background: "#1D6F42", // Excel green
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            background: "#fff",
            color: "#1D6F42",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          X
        </div>
        <div style={{ flex: 1 }}>{filename}</div>
        <div style={{ fontSize: 11, opacity: 0.8 }}>Microsoft Excel</div>
      </div>

      {/* Branded header with c4rbon */}
      <div
        style={{
          padding: "18px 24px",
          background: c4rbonPalette.primary,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <C4rbonLogo size={36} variant="light" />
        <div style={{ flex: 1, color: "#fff" }}>
          <div style={{ fontSize: 12, color: c4rbonPalette.accent, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
            C4RBON.GROUP · Market Intelligence
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
            Étude iPaaS Europe — 2026
          </div>
        </div>
        <div
          style={{
            padding: "6px 12px",
            borderRadius: 999,
            background: c4rbonPalette.accent,
            color: "#052e16",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          v3.0
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, padding: "0 12px", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
        {["Concurrents", "Tendances tech", "Synthèse"].map((t, i) => (
          <div
            key={t}
            style={{
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: i === 0 ? 700 : 500,
              color: i === 0 ? c4rbonPalette.accent : c4rbonPalette.muted,
              borderBottom: i === 0 ? `2px solid ${c4rbonPalette.accent}` : "2px solid transparent",
            }}
          >
            {t}
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "60px 1.5fr 0.8fr 1.2fr 2fr",
            background: c4rbonPalette.primary,
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {["#", "Concurrent", "Pays", "Tarification", "Positionnement"].map((h) => (
            <div key={h} style={{ padding: "10px 14px", borderRight: "1px solid rgba(255,255,255,0.1)" }}>
              {h}
            </div>
          ))}
        </div>

        {rows.map((r, i) => {
          const visible = i < rowsVisible;
          const isOurs = r.name === "Kinn";
          return (
            <div
              key={r.name}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1.5fr 0.8fr 1.2fr 2fr",
                background: isOurs ? c4rbonPalette.accentSoft + "66" : i % 2 === 0 ? "#ffffff" : "#f8fafc",
                fontSize: 12,
                color: c4rbonPalette.primary,
                opacity: visible ? 1 : 0,
                transform: `translateY(${visible ? 0 : 8}px)`,
                transition: "opacity 0.2s, transform 0.2s",
                borderLeft: isOurs ? `3px solid ${c4rbonPalette.accent}` : "none",
                fontWeight: isOurs ? 700 : 400,
              }}
            >
              <div style={{ padding: "10px 14px", color: c4rbonPalette.muted, fontWeight: 600 }}>{r.rank}</div>
              <div style={{ padding: "10px 14px" }}>{r.name}</div>
              <div style={{ padding: "10px 14px" }}>{r.country}</div>
              <div style={{ padding: "10px 14px", fontFamily: "'SF Mono', Menlo, monospace", fontSize: 11 }}>{r.pricing}</div>
              <div style={{ padding: "10px 14px", color: c4rbonPalette.muted }}>{r.focus}</div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "10px 20px",
          background: "#f1f5f9",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          fontSize: 11,
          color: c4rbonPalette.muted,
        }}
      >
        <span>Feuille 1 / 3</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 4, background: c4rbonPalette.accent }} />
          Généré par Kinn · {rows.length} lignes
        </span>
      </div>
    </div>
  );
};

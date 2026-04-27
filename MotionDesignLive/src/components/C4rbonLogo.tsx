import React from "react";
import { Img, staticFile } from "remotion";

// Real C4RBON GROUP logo, downloaded from https://c4rbon.group/img/logo_noir.png
// Stored as /public/c4rbon-logo.png. The original mark is black on transparent.
// For dark backgrounds we invert it with a CSS filter.

export const C4rbonLogo: React.FC<{ size?: number; variant?: "dark" | "light"; compact?: boolean }> = ({
  size = 40,
  variant = "dark",
  compact = false,
}) => {
  const invert = variant === "light" ? "invert(1) brightness(2)" : "none";

  if (compact) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Img
          src={staticFile("c4rbon-logo.png")}
          style={{
            height: size,
            width: size,
            objectFit: "contain",
            filter: invert,
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
      <Img
        src={staticFile("c4rbon-logo.png")}
        style={{
          height: size,
          width: "auto",
          objectFit: "contain",
          filter: invert,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          lineHeight: 1,
        }}
      >
        <div
          style={{
            fontSize: size * 0.52,
            fontWeight: 800,
            color: variant === "light" ? "#ffffff" : "#0f172a",
            letterSpacing: -1,
            fontFamily: "Poppins, sans-serif",
          }}
        >
          C4RBON
        </div>
        <div
          style={{
            fontSize: size * 0.2,
            fontWeight: 600,
            color: variant === "light" ? "rgba(255,255,255,0.7)" : "rgba(15,23,42,0.55)",
            letterSpacing: 2,
            marginTop: 3,
            fontFamily: "Poppins, sans-serif",
          }}
        >
          GROUP
        </div>
      </div>
    </div>
  );
};

export const c4rbonPalette = {
  primary: "#0f172a",
  accent: "#0f172a", // c4rbon uses mostly black/white, no green
  accentSoft: "#e2e8f0",
  surface: "#f8fafc",
  muted: "#64748b",
  highlight: "#0ea5e9", // blue highlight for their "intelligent" branding
};

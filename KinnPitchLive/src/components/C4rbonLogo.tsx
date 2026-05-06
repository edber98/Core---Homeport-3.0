import React from "react";

export const C4rbonLogo: React.FC<{
  size?: number;
  variant?: "dark" | "light";
  compact?: boolean;
  withWordmark?: boolean;
}> = ({ size = 40, variant = "dark", compact = false, withWordmark = true }) => {
  const invert = variant === "light" ? "invert(1) brightness(2)" : "none";

  if (compact || !withWordmark) {
    return (
      <img
        src="/c4rbon-logo.png"
        alt="C4RBON GROUP"
        style={{
          height: size,
          width: size,
          objectFit: "contain",
          filter: invert,
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
      <img
        src="/c4rbon-logo.png"
        alt="C4RBON"
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
          }}
        >
          GROUP
        </div>
      </div>
    </div>
  );
};

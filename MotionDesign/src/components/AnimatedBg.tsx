import React from "react";
import { useCurrentFrame } from "remotion";
import { theme } from "../theme";

// Animated mesh gradient + subtle grid + noise — the "alive" layer behind scenes.
export const AnimatedBg: React.FC<{
  variant?: "light" | "dark";
  intensity?: number;
  showGrid?: boolean;
}> = ({ variant = "light", intensity = 1, showGrid = true }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;

  const isDark = variant === "dark";
  const base = isDark ? theme.color.bgDeep : theme.color.bg;

  const orb1X = 50 + Math.sin(t * 0.4) * 18;
  const orb1Y = 50 + Math.cos(t * 0.3) * 14;
  const orb2X = 50 + Math.sin(t * 0.25 + 2) * 22;
  const orb2Y = 50 + Math.cos(t * 0.35 + 1) * 18;
  const orb3X = 50 + Math.cos(t * 0.3 + 4) * 25;
  const orb3Y = 50 + Math.sin(t * 0.22 + 3) * 22;

  const color1 = isDark ? "rgba(230,25,130,0.45)" : `rgba(230,25,130,${0.12 * intensity})`;
  const color2 = isDark ? "rgba(114,46,209,0.4)" : `rgba(114,46,209,${0.10 * intensity})`;
  const color3 = isDark ? "rgba(24,144,255,0.35)" : `rgba(24,144,255,${0.08 * intensity})`;

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: base,
          zIndex: -3,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `
            radial-gradient(circle at ${orb1X}% ${orb1Y}%, ${color1} 0%, transparent 35%),
            radial-gradient(circle at ${orb2X}% ${orb2Y}%, ${color2} 0%, transparent 40%),
            radial-gradient(circle at ${orb3X}% ${orb3Y}%, ${color3} 0%, transparent 45%)
          `,
          filter: "blur(40px)",
          zIndex: -2,
        }}
      />
      {showGrid && (
        <div
          style={{
            position: "absolute",
            inset: -20,
            backgroundImage: `radial-gradient(circle, ${isDark ? "rgba(255,255,255,0.04)" : theme.color.grid} 1.2px, transparent 1.2px)`,
            backgroundSize: "28px 28px",
            backgroundPosition: `${Math.sin(t * 0.1) * 8}px ${Math.cos(t * 0.08) * 8}px`,
            opacity: isDark ? 0.5 : 0.5,
            zIndex: -1,
          }}
        />
      )}
      {/* Grain overlay via SVG noise */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: isDark ? 0.06 : 0.035,
          pointerEvents: "none",
          mixBlendMode: "overlay",
          zIndex: -1,
        }}
      >
        <filter id="bg-noise">
          <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" stitchTiles="stitch" seed="5" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#bg-noise)" />
      </svg>
    </>
  );
};

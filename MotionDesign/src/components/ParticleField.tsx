import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { theme } from "../theme";

// Deterministic pseudo-random (stable across renders)
function rnd(i: number, salt = 1) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export const ParticleField: React.FC<{
  count?: number;
  color?: string;
  speed?: number;
  minSize?: number;
  maxSize?: number;
  opacity?: number;
  depth?: boolean;
}> = ({ count = 40, color = theme.color.brand, speed = 1, minSize = 2, maxSize = 5, opacity = 1, depth = true }) => {
  const frame = useCurrentFrame();

  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        baseX: rnd(i, 1) * 1920,
        baseY: rnd(i, 2) * 1080,
        size: minSize + rnd(i, 3) * (maxSize - minSize),
        amp: 30 + rnd(i, 4) * 80,
        freq: 0.3 + rnd(i, 5) * 0.9,
        phase: rnd(i, 6) * Math.PI * 2,
        z: depth ? rnd(i, 7) : 1,
      })),
    [count, minSize, maxSize, depth]
  );

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {particles.map((p, i) => {
        const t = (frame / 30) * speed;
        const dx = Math.sin(t * p.freq + p.phase) * p.amp;
        const dy = Math.cos(t * p.freq * 0.7 + p.phase) * p.amp * 0.6;
        const scale = 0.6 + p.z * 0.8;
        const pOpac = (0.3 + p.z * 0.7) * opacity;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.baseX + dx,
              top: p.baseY + dy,
              width: p.size * scale,
              height: p.size * scale,
              borderRadius: "50%",
              background: color,
              boxShadow: `0 0 ${p.size * 4}px ${color}`,
              opacity: pOpac,
              filter: `blur(${(1 - p.z) * 1.5}px)`,
            }}
          />
        );
      })}
    </div>
  );
};

import React, { useEffect, useRef, useState } from "react";

// Lightweight always-on animated background — mesh gradient with 3 orbs
// drifting continuously (via requestAnimationFrame, not step-bound).
export const AnimatedBg: React.FC<{
  variant?: "light" | "dark";
  intensity?: number;
  showGrid?: boolean;
}> = ({ variant = "light", intensity = 1, showGrid = true }) => {
  const [t, setT] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      setT((now - start) / 1000);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, []);

  const isDark = variant === "dark";
  const base = isDark ? "#05050a" : "#f8f8f8";

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
            backgroundImage: `radial-gradient(circle, ${
              isDark ? "rgba(255,255,255,0.04)" : "#e8e8e8"
            } 1.2px, transparent 1.2px)`,
            backgroundSize: "28px 28px",
            backgroundPosition: `${Math.sin(t * 0.1) * 8}px ${Math.cos(t * 0.08) * 8}px`,
            opacity: 0.5,
            zIndex: -1,
          }}
        />
      )}
    </>
  );
};

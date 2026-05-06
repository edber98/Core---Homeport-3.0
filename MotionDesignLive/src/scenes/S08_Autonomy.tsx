import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { AnimatedBg } from "../components/AnimatedBg";
import { easeOutExpo, easeInExpo } from "../utils/easing";

type Level = {
  key: string;
  label: string;
  desc: string;
  icon: string;
  color: string;
  accent: string;
};

const levels: Level[] = [
  { key: "prudent", label: "Prudent", desc: "Chaque action critique demande votre accord.", icon: "🛡️", color: "#10b981", accent: "#059669" },
  { key: "balanced", label: "Équilibré", desc: "L'agent agit, vous confirmez suppressions & déploiements.", icon: "⚖️", color: "#f59e0b", accent: "#d97706" },
  { key: "autonomous", label: "Autonome", desc: "Liberté totale. L'agent décide. Vous supervisez.", icon: "🚀", color: theme.color.brand, accent: theme.color.brandHover },
];

export const S08_Autonomy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const inProgress = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp", easing: easeOutExpo });
  const outProgress = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInExpo });
  const outOpacity = 1 - outProgress;
  const outScale = 1 - outProgress * 0.04;

  const titleSpring = spring({ frame: frame - 2, fps, config: { damping: 16, stiffness: 130 } });

  // Active level progresses over time
  const activeFloat = interpolate(frame, [40, durationInFrames - 10], [0, levels.length - 0.001], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const activeIdx = Math.min(levels.length - 1, Math.floor(activeFloat));

  const t = frame / 30;

  return (
    <AbsoluteFill style={{ opacity: inProgress * outOpacity, transform: `scale(${outScale})` }}>
      <AnimatedBg variant="light" intensity={0.8} />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [-22, 0])}px)`,
        }}
      >
        <div style={{ fontSize: 13, color: theme.color.brand, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
          Contrôle progressif
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: theme.color.text, marginTop: 8, letterSpacing: -1 }}>
          Vous choisissez le niveau d'autonomie.
        </div>
      </div>

      {/* Cards centered with 3D perspective */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) translateY(30px)`,
          perspective: 2000,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 32,
            transformStyle: "preserve-3d",
            transform: `rotateX(${Math.sin(t * 0.4) * 2}deg) rotateY(${Math.cos(t * 0.3) * 2}deg)`,
          }}
        >
          {levels.map((lvl, i) => {
            const startFrame = 14 + i * 12;
            const appear = spring({ frame: frame - startFrame, fps, config: { damping: 14, stiffness: 120, mass: 0.8 } });
            const opacity = interpolate(appear, [0, 1], [0, 1]);
            const scale = interpolate(appear, [0, 1], [0.7, 1]);
            const rotY = interpolate(appear, [0, 1], [-40, 0]);
            const tz = interpolate(appear, [0, 1], [-120, 0]);
            const active = activeIdx === i;

            // Floating continuous motion
            const float = Math.sin(t * 1.1 + i * 2) * 6;
            const tilt = Math.sin(t * 0.7 + i) * 2;

            return (
              <div
                key={lvl.key}
                style={{
                  opacity,
                  transformStyle: "preserve-3d",
                  transform: `translateY(${float}px) translateZ(${tz + (active ? 40 : 0)}px) rotateY(${rotY + tilt}deg) scale(${scale * (active ? 1.04 : 1)})`,
                  transition: "transform 0.3s",
                }}
              >
                <LevelCard level={lvl} active={active} index={i} frame={frame} />
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const LevelCard: React.FC<{
  level: Level;
  active: boolean;
  index: number;
  frame: number;
}> = ({ level, active, index, frame }) => {
  const pulse = active ? 0.6 + (Math.sin(frame / 5) + 1) * 0.2 : 0;

  return (
    <div
      style={{
        width: 360,
        borderRadius: 26,
        background: "#ffffff",
        border: `2px solid ${active ? level.color : theme.color.borderSoft}`,
        boxShadow: active
          ? `0 0 0 ${2 + pulse * 3}px ${level.color}${Math.round(20 + pulse * 30).toString(16)}, 0 32px 72px ${level.color}40`
          : "0 12px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)",
        padding: 36,
        textAlign: "center",
        transition: "box-shadow 0.3s",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Color wash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 0%, ${level.color}18 0%, transparent 60%)`,
          opacity: active ? 1 : 0.6,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          width: 92,
          height: 92,
          borderRadius: 24,
          background: `linear-gradient(135deg, ${level.color}, ${level.accent})`,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 42,
          margin: "0 auto 22px",
          boxShadow: `0 14px 38px ${level.color}60, inset 0 1px 0 rgba(255,255,255,0.3)`,
          position: "relative",
        }}
      >
        {level.icon}
      </div>

      <div style={{ fontSize: 30, fontWeight: 800, color: theme.color.text, marginBottom: 10, letterSpacing: -0.6 }}>
        {level.label}
      </div>
      <div style={{ fontSize: 14, color: theme.color.textMuted, lineHeight: 1.55, minHeight: 44 }}>
        {level.desc}
      </div>

      {/* Level indicator */}
      <div
        style={{
          height: 5,
          borderRadius: 3,
          background: theme.color.borderSoft,
          marginTop: 28,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${((index + 1) / 3) * 100}%`,
            background: `linear-gradient(90deg, ${level.color}, ${level.accent})`,
            borderRadius: 3,
            boxShadow: active ? `0 0 12px ${level.color}` : "none",
          }}
        />
      </div>
      <div
        style={{
          fontSize: 11,
          color: active ? level.color : theme.color.textSubtle,
          marginTop: 10,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        Niveau {index + 1} / 3
      </div>
    </div>
  );
};

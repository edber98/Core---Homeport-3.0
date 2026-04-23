import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../../theme";
import { AnimatedBg } from "../../components/AnimatedBg";
import { ProviderIcon, allProviders } from "../../components/ProviderIcon";
import { easeOutExpo, easeInExpo } from "../../utils/easing";

// The pain point: disconnected systems, manual copy-paste, wasted time.
export const P01_Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const inP = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp", easing: easeOutExpo });
  const outP = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInExpo });
  const out = 1 - outP;

  const titleSpring = spring({ frame: frame - 4, fps, config: { damping: 16, stiffness: 130 } });
  const subSpring = spring({ frame: frame - 30, fps, config: { damping: 18 } });
  const statsSpring = spring({ frame: frame - 70, fps, config: { damping: 18 } });

  const providers = allProviders.slice(0, 6);
  const t = frame / 30;

  return (
    <AbsoluteFill style={{ opacity: inP * out }}>
      <AnimatedBg variant="light" intensity={0.8} />

      {/* Top area: chaotic copy-paste visualization */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 0,
          right: 0,
          height: 280,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          perspective: 1600,
        }}
      >
        <div style={{ position: "relative", width: 1400, height: 260, transformStyle: "preserve-3d", transform: `rotateX(15deg)` }}>
          {providers.map((p, i) => {
            const baseAngle = (i / providers.length) * Math.PI * 2;
            const angle = baseAngle + t * 0.15;
            const x = Math.cos(angle) * 460;
            const y = Math.sin(angle) * 80;
            const z = Math.sin(angle) * 60;
            const appearAt = 10 + i * 5;
            const appear = spring({ frame: frame - appearAt, fps, config: { damping: 14, stiffness: 110 } });
            return (
              <div
                key={p}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: `translate(-50%, -50%) translate3d(${x}px, ${y}px, ${z}px) scale(${appear})`,
                  opacity: appear * (0.7 + Math.sin(t * 1.5 + i) * 0.15),
                }}
              >
                <ProviderIcon provider={p} size={78} />
              </div>
            );
          })}

          {/* Clipboard visual: manual copy-paste */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
            {Array.from({ length: 8 }).map((_, i) => {
              const a1 = ((i / 8) * Math.PI * 2) + t * 0.2;
              const a2 = (((i + 3) / 8) * Math.PI * 2) + t * 0.2;
              const dash = (t * 30) % 10;
              return (
                <path
                  key={i}
                  d={`M ${Math.cos(a1) * 460 + 700} ${Math.sin(a1) * 100 + 130} Q 700 130 ${Math.cos(a2) * 460 + 700} ${Math.sin(a2) * 100 + 130}`}
                  stroke={theme.color.error}
                  strokeWidth={1.5}
                  fill="none"
                  strokeDasharray="5 6"
                  strokeDashoffset={dash}
                  opacity={0.35}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 440,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [-24, 0])}px)`,
        }}
      >
        <div style={{ fontSize: 14, color: theme.color.brand, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
          Le quotidien aujourd'hui
        </div>
        <div style={{ fontSize: 58, fontWeight: 800, color: theme.color.text, marginTop: 10, letterSpacing: -1.2, lineHeight: 1.1 }}>
          Vos logiciels ne se <span style={{ color: theme.color.brand }}>parlent pas</span>.
        </div>
        <div
          style={{
            fontSize: 20,
            color: theme.color.textMuted,
            marginTop: 18,
            maxWidth: 900,
            margin: "18px auto 0",
            lineHeight: 1.55,
            opacity: subSpring,
            transform: `translateY(${interpolate(subSpring, [0, 1], [14, 0])}px)`,
          }}
        >
          Vos équipes <strong style={{ color: theme.color.text }}>copient-collent</strong>, ressaisissent,
          oublient. Chaque information change de main <em>cinq fois</em> avant d'arriver au bon endroit.
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          position: "absolute",
          bottom: 90,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: 80,
          opacity: statsSpring,
          transform: `translateY(${interpolate(statsSpring, [0, 1], [20, 0])}px)`,
        }}
      >
        <Stat value="30 %" label="du temps de travail gaspillé" />
        <Stat value="11 h" label="par semaine sans valeur ajoutée" />
        <Stat value="62 %" label="d'entreprises aux outils déconnectés" />
      </div>

      {/* Source citation */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 11,
          color: theme.color.textSubtle,
          opacity: interpolate(frame, [110, 140], [0, 0.85], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          letterSpacing: 0.5,
          fontStyle: "italic",
        }}
      >
        Source · ABBYY · ProcessMaker · études 2025
      </div>
    </AbsoluteFill>
  );
};

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div style={{ textAlign: "center", minWidth: 280 }}>
    <div style={{ fontSize: 52, fontWeight: 800, color: theme.color.brand, letterSpacing: -1.5, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 14, color: theme.color.textMuted, marginTop: 8, whiteSpace: "nowrap" }}>{label}</div>
  </div>
);

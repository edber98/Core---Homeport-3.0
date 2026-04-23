import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme, agents } from "../theme";
import { AnimatedBg } from "../components/AnimatedBg";
import { LucideIcon, IconName } from "../components/AgentIcon";
import { easeOutExpo, easeInExpo, easeOutBack } from "../utils/easing";

export const S07_AgentGallery: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const inProgress = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp", easing: easeOutExpo });
  const outProgress = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInExpo });
  const outOpacity = 1 - outProgress;
  const outScale = 1 - outProgress * 0.04;

  const titleSpring = spring({ frame: frame - 2, fps, config: { damping: 16, stiffness: 130 } });

  // Rotating spotlight — faster highlight travel across cards
  const spotFloat = interpolate(frame, [50, durationInFrames - 20], [0, agents.length * 1.8], { extrapolateRight: "clamp" });
  const spotIndex = Math.floor(spotFloat) % agents.length;

  // Subtle global camera tilt
  const t = frame / 30;
  const camRotY = Math.sin(t * 0.5) * 2;
  const camRotX = Math.cos(t * 0.4) * 1.5;
  const camZoom = 1 + Math.sin(t * 0.3) * 0.015;

  // Grid sizing — 7 cols × 2 rows perfectly centered
  const cols = 7;
  const cardW = 220;
  const cardH = 108;
  const gap = 18;
  const gridW = cols * cardW + (cols - 1) * gap;
  const gridH = 2 * cardH + gap;

  return (
    <AbsoluteFill style={{ opacity: inProgress * outOpacity, transform: `scale(${outScale})` }}>
      <AnimatedBg variant="light" intensity={0.8} />

      {/* Title — perfectly centered */}
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
          Votre équipe IA
        </div>
        <div style={{ fontSize: 50, fontWeight: 800, color: theme.color.text, marginTop: 10, letterSpacing: -1 }}>
          14 spécialistes. <span style={{ color: theme.color.brand }}>Un seul chef d'orchestre.</span>
        </div>
      </div>

      {/* Grid — absolutely centered */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) translateY(40px)`,
          perspective: 2000,
        }}
      >
        <div
          style={{
            width: gridW,
            height: gridH,
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, ${cardW}px)`,
            gridTemplateRows: `repeat(2, ${cardH}px)`,
            gap,
            transformStyle: "preserve-3d",
            transform: `rotateX(${camRotX}deg) rotateY(${camRotY}deg) scale(${camZoom})`,
          }}
        >
          {agents.map((a, i) => {
            const startFrame = 14 + i * 4;
            const appear = spring({ frame: frame - startFrame, fps, config: { damping: 11, stiffness: 150, mass: 0.7 } });
            const opacity = interpolate(appear, [0, 1], [0, 1]);
            const scale = interpolate(appear, [0, 1], [0.4, 1]);
            const rotY = interpolate(appear, [0, 1], [-65, 0]);
            const rotX = interpolate(appear, [0, 1], [35, 0]);
            const tz = interpolate(appear, [0, 1], [-120, 0]);

            const isSpot = spotIndex === i && frame > 60;
            // Per-card continuous float
            const float = Math.sin(t * 1.3 + i * 0.7) * 3;
            const tilt = Math.sin(t * 0.8 + i) * 1.5;

            return (
              <div
                key={a.id}
                style={{
                  opacity,
                  transformStyle: "preserve-3d",
                  transform: `translateY(${float}px) translateZ(${tz + (isSpot ? 20 : 0)}px) rotateY(${rotY + tilt}deg) rotateX(${rotX}deg) scale(${scale * (isSpot ? 1.06 : 1)})`,
                  transition: "transform 0.25s",
                }}
              >
                <DynamicAgentCard
                  agent={a}
                  highlighted={isSpot}
                  cardW={cardW}
                  cardH={cardH}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom caption */}
      <div
        style={{
          position: "absolute",
          bottom: 70,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 18,
          color: theme.color.textMuted,
          opacity: interpolate(frame, [90, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          fontWeight: 400,
        }}
      >
        Chacun a son expertise. Tous collaborent pour vous.
      </div>
    </AbsoluteFill>
  );
};

const DynamicAgentCard: React.FC<{
  agent: typeof agents[number];
  highlighted: boolean;
  cardW: number;
  cardH: number;
}> = ({ agent, highlighted, cardW, cardH }) => {
  const frame = useCurrentFrame();
  const pulse = highlighted ? 0.6 + (Math.sin(frame / 4) + 1) * 0.2 : 0;

  return (
    <div
      style={{
        width: cardW,
        height: cardH,
        borderRadius: 18,
        background: "#ffffff",
        border: `1px solid ${highlighted ? agent.color : theme.color.borderSoft}`,
        boxShadow: highlighted
          ? `0 0 0 ${2 + pulse * 2}px ${agent.color}${Math.round(30 + pulse * 40).toString(16)}, 0 20px 48px ${agent.color}40`
          : "0 4px 14px rgba(0,0,0,0.04), 0 1px 4px rgba(0,0,0,0.04)",
        padding: 14,
        display: "flex",
        alignItems: "center",
        gap: 14,
        position: "relative",
        overflow: "hidden",
        transition: "box-shadow 0.25s",
      }}
    >
      {/* Card glow gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 0% 100%, ${agent.color}10 0%, transparent 60%)`,
          opacity: highlighted ? 1 : 0.6,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          width: cardH - 32,
          height: cardH - 32,
          minWidth: cardH - 32,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${agent.color}, ${agent.color}cc)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: `0 8px 22px ${agent.color}55, inset 0 1px 0 rgba(255,255,255,0.3)`,
          position: "relative",
          zIndex: 1,
        }}
      >
        <LucideIcon name={agent.iconName as IconName} size={30} color="#fff" strokeWidth={2} />
      </div>
      <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: theme.color.text, letterSpacing: -0.3 }}>{agent.name}</div>
        <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 3, lineHeight: 1.3 }}>{agent.role}</div>
        {highlighted && (
          <div
            style={{
              marginTop: 6,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 7px",
              borderRadius: 999,
              background: agent.color + "15",
              color: agent.color,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: 3, background: agent.color }} />
            Actif
          </div>
        )}
      </div>
    </div>
  );
};

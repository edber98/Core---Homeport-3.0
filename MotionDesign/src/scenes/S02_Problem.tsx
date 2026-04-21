import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { ProviderIcon, allProviders } from "../components/ProviderIcon";
import { AnimatedBg } from "../components/AnimatedBg";
import { easeOutExpo, easeInExpo } from "../utils/easing";

export const S02_Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const inOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp", easing: easeOutExpo });
  const outProgress = interpolate(frame, [durationInFrames - 20, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInExpo });
  const outOpacity = 1 - outProgress;
  const outScale = 1 - outProgress * 0.05;

  const titleSpring = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 110 } });
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);

  const providers = allProviders.slice(0, 8);
  const t = frame / 30;

  return (
    <AbsoluteFill style={{ opacity: inOpacity * outOpacity, transform: `scale(${outScale})` }}>
      <AnimatedBg variant="light" intensity={0.8} />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 120,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleSpring,
          transform: `translateY(${titleY}px)`,
        }}
      >
        <div style={{ fontSize: 56, fontWeight: 800, color: theme.color.text, letterSpacing: -1.5 }}>
          Trop d'outils. Trop de tâches.
        </div>
        <div style={{ fontSize: 22, color: theme.color.textMuted, marginTop: 14, fontWeight: 400 }}>
          Chaque jour, des heures perdues entre les applications.
        </div>
      </div>

      {/* 3D perspective orbit */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          perspective: 1600,
          marginTop: 160,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 1100,
            height: 420,
            transformStyle: "preserve-3d",
            transform: `rotateX(18deg) rotateY(${Math.sin(t * 0.3) * 4}deg)`,
          }}
        >
          {providers.map((p, i) => {
            const angle = (i / providers.length) * Math.PI * 2 + t * 0.25;
            const r = 400;
            const baseX = Math.cos(angle) * r;
            const baseY = Math.sin(angle) * r * 0.45;
            const z = Math.sin(angle) * 140;
            const scale = interpolate(z, [-140, 140], [0.72, 1.15]);
            const blink = Math.floor(t * 3) % providers.length === i ? 1 : 0.8;

            const startFrame = 20 + i * 3;
            const appear = spring({ frame: frame - startFrame, fps, config: { damping: 15, stiffness: 110 } });
            const appearScale = interpolate(appear, [0, 1], [0.3, 1]);

            return (
              <div
                key={p}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  transform: `translate(-50%, -50%) translate3d(${baseX}px, ${baseY}px, ${z}px) scale(${scale * appearScale})`,
                  opacity: blink * appear,
                  filter: `blur(${Math.max(0, -z / 40)}px)`,
                }}
              >
                <ProviderIcon provider={p} size={88} />
              </div>
            );
          })}

          {/* Chaotic lines */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", opacity: 0.3, pointerEvents: "none" }}>
            {Array.from({ length: 14 }).map((_, i) => {
              const a1 = (i / 14) * Math.PI * 2 + t * 0.2;
              const a2 = ((i + 5) / 14) * Math.PI * 2 + t * 0.2;
              const dash = (t * 20) % 8;
              return (
                <path
                  key={i}
                  d={`M ${Math.cos(a1) * 400 + 550} ${Math.sin(a1) * 180 + 210} Q ${550 + Math.sin(t + i) * 80} ${210 + Math.cos(t + i) * 40} ${Math.cos(a2) * 400 + 550} ${Math.sin(a2) * 180 + 210}`}
                  stroke={theme.color.brand}
                  strokeWidth={1.8}
                  fill="none"
                  strokeDasharray="4 6"
                  strokeDashoffset={dash}
                  opacity={0.6}
                />
              );
            })}
          </svg>
        </div>
      </div>
    </AbsoluteFill>
  );
};

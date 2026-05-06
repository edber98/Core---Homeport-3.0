import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { AnimatedBg } from "../components/AnimatedBg";
import { ParticleField } from "../components/ParticleField";
import { easeOutExpo, easeOutBack, easeInExpo } from "../utils/easing";

export const S01_ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Particles convergent sur logo (0-35)
  const conv = interpolate(frame, [0, 35], [1, 0], { extrapolateRight: "clamp", easing: easeOutExpo });

  // Logo flip in (rotateY from -90 to 0, scale up)
  const logoSpring = spring({ frame: frame - 22, fps, config: { damping: 13, stiffness: 100, mass: 0.8 } });
  const logoRotateY = interpolate(logoSpring, [0, 1], [-75, 0]);
  const logoScale = interpolate(logoSpring, [0, 1], [0.5, 1]);
  const logoOpacity = interpolate(frame, [22, 38], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Subtle continuous idle float/rotation
  const t = frame / 30;
  const floatY = Math.sin(t * 1.2) * 6;
  const idleRotX = Math.sin(t * 0.8) * 3;
  const idleRotY = Math.cos(t * 0.6) * 4;

  // Light sweep
  const sweepX = interpolate(frame, [30, 75], [-40, 140], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutExpo });

  // Tagline char-by-char
  const tagline = "YOUR AI WORKFORCE";
  const tagReveal = interpolate(frame, [42, 72], [0, tagline.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutExpo });

  // Exit
  const outProgress = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInExpo });
  const outScale = 1 + outProgress * 0.15;
  const outBlur = outProgress * 12;
  const outOpacity = 1 - outProgress;

  const glowScale = 0.9 + Math.sin(frame / 8) * 0.1;

  return (
    <AbsoluteFill style={{ background: theme.color.bgDeep, opacity: outOpacity, filter: `blur(${outBlur}px)`, transform: `scale(${outScale})` }}>
      <AnimatedBg variant="dark" intensity={1.2} showGrid={false} />
      <ParticleField count={60} color={theme.color.brand} opacity={0.6} minSize={2} maxSize={5} />

      {/* Converging points */}
      {Array.from({ length: 36 }).map((_, i) => {
        const angle = (i / 36) * Math.PI * 2;
        const r0 = 420 + (i % 6) * 22;
        const r = r0 * conv;
        const op = interpolate(frame, [0, 10, 32], [0, 1, 0], { extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 5,
              height: 5,
              borderRadius: 3,
              background: theme.color.brand,
              transform: `translate(-50%, -50%) translate(${Math.cos(angle) * r}px, ${Math.sin(angle) * r}px)`,
              opacity: op,
              boxShadow: `0 0 14px ${theme.color.brand}`,
            }}
          />
        );
      })}

      {/* Scene content with 3D perspective */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          perspective: 1400,
        }}
      >
        {/* Glow behind logo */}
        <div
          style={{
            position: "absolute",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${theme.color.brand}55 0%, transparent 60%)`,
            transform: `scale(${glowScale * logoOpacity})`,
            filter: "blur(30px)",
          }}
        />

        {/* Logo 3D */}
        <div
          style={{
            transform: `translateY(${floatY}px) rotateY(${logoRotateY + idleRotY}deg) rotateX(${idleRotX}deg) scale(${logoScale})`,
            opacity: logoOpacity,
            transformStyle: "preserve-3d",
            padding: "28px 52px",
            background: "rgba(255,255,255,0.035)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 26,
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            boxShadow: `0 30px 80px ${theme.color.brand}55, inset 0 1px 0 rgba(255,255,255,0.2)`,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Img src={staticFile("logo-kinn.svg")} style={{ height: 92, filter: "brightness(1.1) drop-shadow(0 4px 24px rgba(230,25,130,0.6))" }} />
          {/* Light sweep overlay */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: `${sweepX}%`,
              width: "30%",
              height: "100%",
              background: "linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
              transform: "skewX(-20deg)",
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 36,
            fontSize: 22,
            fontWeight: 500,
            color: "rgba(255,255,255,0.9)",
            letterSpacing: 8,
            textTransform: "uppercase",
            display: "flex",
            gap: 0,
          }}
        >
          {tagline.split("").map((char, i) => {
            const reveal = tagReveal - i;
            const op = Math.max(0, Math.min(1, reveal));
            const y = interpolate(op, [0, 1], [14, 0]);
            return (
              <span
                key={i}
                style={{
                  opacity: op,
                  transform: `translateY(${y}px)`,
                  display: "inline-block",
                  width: char === " " ? 10 : "auto",
                  textShadow: `0 0 24px ${theme.color.brand}77`,
                }}
              >
                {char === " " ? " " : char}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

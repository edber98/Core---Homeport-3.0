import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { ProviderIcon, allProviders } from "../components/ProviderIcon";

export const S09_IntegrationsCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const inOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const outOpacity = interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const logoAppear = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const orbitRotate = frame * 0.9;

  const tagOpacity = interpolate(frame, [50, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagY = interpolate(frame, [50, 80], [20, 0]);

  const ctaOpacity = interpolate(frame, [80, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const pulse = 0.9 + Math.sin(frame / 8) * 0.1;

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(circle at 50% 50%, #1a0a14 0%, ${theme.color.bgDeep} 70%)`,
      opacity: inOpacity * outOpacity,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{ position: "relative", width: 900, height: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Outer orbits */}
        <div style={{
          position: "absolute",
          width: 780,
          height: 780,
          borderRadius: "50%",
          border: "1px dashed rgba(255,255,255,0.08)",
        }} />
        <div style={{
          position: "absolute",
          width: 540,
          height: 540,
          borderRadius: "50%",
          border: "1px dashed rgba(255,255,255,0.12)",
        }} />

        {/* Orbiting providers — outer ring */}
        {allProviders.map((p, i) => {
          const angle = (i / allProviders.length) * Math.PI * 2 + (orbitRotate * Math.PI) / 180;
          const r = 390;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          const appear = interpolate(frame, [20 + i * 3, 50 + i * 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={p} style={{
              position: "absolute",
              transform: `translate(${x}px, ${y}px)`,
              opacity: appear,
            }}>
              <ProviderIcon provider={p} size={58} />
            </div>
          );
        })}

        {/* Orbiting providers — inner ring (selection) */}
        {["odoo", "slack", "hubspot", "stripe", "github"].map((p, i) => {
          const angle = (i / 5) * Math.PI * 2 - (orbitRotate * Math.PI) / 180;
          const r = 270;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          const appear = interpolate(frame, [15 + i * 2, 40 + i * 2], [0, 0.6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={p} style={{
              position: "absolute",
              transform: `translate(${x}px, ${y}px)`,
              opacity: appear,
            }}>
              <ProviderIcon provider={p as any} size={44} />
            </div>
          );
        })}

        {/* Center glow */}
        <div style={{
          position: "absolute",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${theme.color.brand}66 0%, ${theme.color.brand}00 60%)`,
          transform: `scale(${pulse})`,
          filter: "blur(20px)",
        }} />

        {/* Center logo */}
        <div style={{
          position: "relative",
          opacity: logoAppear,
          transform: `scale(${interpolate(logoAppear, [0, 1], [0.6, 1])})`,
          padding: "24px 36px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 22,
          backdropFilter: "blur(14px)",
          boxShadow: `0 30px 80px ${theme.color.brand}50`,
          zIndex: 10,
        }}>
          <Img src={staticFile("logo-kinn.svg")} style={{ height: 72 }} />
        </div>
      </div>

      {/* Bottom caption */}
      <div style={{
        position: "absolute",
        bottom: 130,
        left: 0,
        right: 0,
        textAlign: "center",
      }}>
        <div style={{
          fontSize: 34,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: -0.5,
          opacity: tagOpacity,
          transform: `translateY(${tagY}px)`,
        }}>
          L'équipe IA qui travaille <span style={{ color: theme.color.brand }}>avec vous</span>.
        </div>
        <div style={{
          fontSize: 16,
          color: "rgba(255,255,255,0.55)",
          marginTop: 12,
          letterSpacing: 3,
          textTransform: "uppercase",
          opacity: ctaOpacity,
        }}>
          kinn.ai · Demandez une démo
        </div>
      </div>
    </AbsoluteFill>
  );
};

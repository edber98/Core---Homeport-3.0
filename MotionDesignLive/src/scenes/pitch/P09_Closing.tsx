import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../../theme";
import { easeOutExpo, easeInExpo } from "../../utils/easing";
import { LucideIcon } from "../../components/AgentIcon";

// Closing scene: quick recap pillars + logo + new tagline focused on
// automation and AI integration (not "AI workforce" which was the older line).
export const P09_Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const inP = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp", easing: easeOutExpo });
  const outP = interpolate(frame, [durationInFrames - 16, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInExpo,
  });
  const out = 1 - outP;

  // Pillars recap timing
  const pillarsStart = 20;
  const logoStart = 180;

  const logoSpring = spring({ frame: frame - logoStart, fps, config: { damping: 14, stiffness: 100 } });
  const logoOp = interpolate(logoSpring, [0, 1], [0, 1]);
  const logoScale = interpolate(logoSpring, [0, 1], [0.72, 1]);
  const pulse = 0.9 + Math.sin(frame / 8) * 0.1;

  const taglineSpring = spring({ frame: frame - logoStart - 30, fps, config: { damping: 16 } });
  const ctaSpring = spring({ frame: frame - logoStart - 55, fps, config: { damping: 16 } });

  // Pillars fade out as we land on logo
  const pillarsFade = interpolate(frame, [logoStart + 10, logoStart + 60], [1, 0.12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pillarsScale = interpolate(frame, [logoStart + 10, logoStart + 80], [1, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pillars: { icon: "arrowRight" | "bot" | "layers"; title: string; desc: string }[] = [
    { icon: "layers", title: "Connecter", desc: "60+ logiciels unifiés" },
    { icon: "arrowRight", title: "Automatiser", desc: "workflows sans code" },
    { icon: "bot", title: "Déléguer", desc: "agents IA spécialisés" },
  ];

  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse at 50% 40%, #fdf2f8 0%, #f5f5f7 70%)",
        opacity: inP * out,
        overflow: "hidden",
      }}
    >
      {/* Pillars recap */}
      <div
        style={{
          position: "absolute",
          top: 180,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 48,
          opacity: pillarsFade,
          transform: `scale(${pillarsScale})`,
        }}
      >
        {pillars.map((p, i) => {
          const sp = spring({
            frame: frame - (pillarsStart + i * 18),
            fps,
            config: { damping: 14, stiffness: 130 },
          });
          const op = interpolate(sp, [0, 1], [0, 1]);
          const ty = interpolate(sp, [0, 1], [20, 0]);
          return (
            <div
              key={p.title}
              style={{
                opacity: op,
                transform: `translateY(${ty}px)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                padding: 24,
                background: "rgba(255,255,255,0.6)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.8)",
                boxShadow: "0 20px 48px rgba(0,0,0,0.06)",
                minWidth: 220,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  background: `linear-gradient(135deg, ${theme.color.brand}, #7c3aed)`,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                  boxShadow: `0 10px 28px ${theme.color.brand}55`,
                }}
              >
                <LucideIcon name={p.icon} size={28} color="#fff" strokeWidth={2} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: theme.color.text, letterSpacing: -0.3 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 4 }}>{p.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Background glow behind logo */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) scale(${pulse * logoSpring})`,
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${theme.color.brand}55 0%, transparent 60%)`,
          filter: "blur(40px)",
          opacity: logoSpring,
        }}
      />

      {/* Logo */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "45%",
          transform: `translate(-50%, -50%) scale(${logoScale})`,
          opacity: logoOp,
          padding: "30px 56px",
          background: "#ffffff",
          border: "1px solid rgba(0,0,0,0.06)",
          borderRadius: 28,
          boxShadow: `0 40px 80px ${theme.color.brand}33, 0 8px 24px rgba(0,0,0,0.08)`,
        }}
      >
        <Img src={staticFile("logo-kinn.svg")} style={{ height: 82 }} />
      </div>

      {/* Tagline */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "70%",
          transform: `translate(-50%, ${interpolate(taglineSpring, [0, 1], [20, 0])}px)`,
          opacity: taglineSpring,
          textAlign: "center",
          maxWidth: 1200,
          padding: "0 40px",
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            color: theme.color.text,
            letterSpacing: -0.8,
            lineHeight: 1.2,
          }}
        >
          Automatisation assistée.{" "}
          <span
            style={{
              background: `linear-gradient(135deg, ${theme.color.brand}, #7c3aed)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Intelligence intégrée.
          </span>
        </div>
        <div style={{ fontSize: 16, color: theme.color.textMuted, marginTop: 12, fontWeight: 500 }}>
          La plateforme française d'automatisation et d'agents IA — souveraine, interopérable, gouvernée.
        </div>
      </div>

      {/* URL + CTA */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 60,
          transform: `translate(-50%, ${interpolate(ctaSpring, [0, 1], [16, 0])}px)`,
          opacity: ctaSpring,
          display: "flex",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div
          style={{
            fontSize: 16,
            color: theme.color.text,
            letterSpacing: 6,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          kinn.fr
        </div>
        <div style={{ width: 1, height: 18, background: theme.color.border }} />
        <div
          style={{
            padding: "12px 24px",
            borderRadius: 999,
            background: theme.color.brand,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            boxShadow: `0 14px 34px ${theme.color.brand}66`,
          }}
        >
          Demandez votre démo →
        </div>
      </div>
    </AbsoluteFill>
  );
};

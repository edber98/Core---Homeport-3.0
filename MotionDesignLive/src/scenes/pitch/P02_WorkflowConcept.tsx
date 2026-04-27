import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../../theme";
import { AnimatedBg } from "../../components/AnimatedBg";
import { ProviderIcon, ProviderKey } from "../../components/ProviderIcon";
import { Icon } from "../../components/Icon";
import { easeOutExpo, easeInExpo } from "../../utils/easing";

// Solution 1 — Workflows. Shows a real prompt typed at the top,
// then a pipeline lights up step by step with visible activation glow.
export const P02_WorkflowConcept: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const inP = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp", easing: easeOutExpo });
  const outP = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInExpo,
  });
  const out = 1 - outP;

  const titleSpring = spring({ frame: frame - 4, fps, config: { damping: 16, stiffness: 130 } });

  // Typed prompt (appears first)
  const prompt = "Quand une facture arrive dans Gmail, extrais les données, crée-la dans Odoo, encaisse avec Stripe, et préviens l'équipe sur Slack.";
  const typeStart = 30;
  const typeEnd = 230;
  const chars = Math.floor(
    interpolate(frame, [typeStart, typeEnd], [0, prompt.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const typed = prompt.slice(0, chars);
  const blink = Math.floor(frame / 12) % 2 === 0;
  const promptDone = chars === prompt.length;

  // Sequential activation of pipeline steps
  const buildStart = 260;
  const stepGap = 36;

  type Step = {
    provider: ProviderKey | "ai";
    label: string;
    subtitle: string;
  };
  const steps: Step[] = [
    { provider: "gmail", label: "Gmail", subtitle: "Trigger · email entrant" },
    { provider: "ai", label: "Kinn AI", subtitle: "Extrait & structure" },
    { provider: "odoo", label: "Odoo", subtitle: "Facture créée" },
    { provider: "stripe", label: "Stripe", subtitle: "Paiement encaissé" },
    { provider: "slack", label: "Slack", subtitle: "Équipe notifiée" },
  ];

  const totalSteps = steps.length;
  const stepActiveAt = (i: number) => buildStart + i * stepGap;

  const t = frame / 30;

  return (
    <AbsoluteFill style={{ opacity: inP * out }}>
      <AnimatedBg variant="light" intensity={0.8} />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [-22, 0])}px)`,
        }}
      >
        <div style={{ fontSize: 14, color: theme.color.brand, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
          Solution 1 · Workflows
        </div>
        <div style={{ fontSize: 50, fontWeight: 800, color: theme.color.text, marginTop: 10, letterSpacing: -1 }}>
          Vos logiciels enfin <span style={{ color: theme.color.brand }}>connectés</span>.
        </div>
      </div>

      {/* Prompt bubble */}
      <div
        style={{
          position: "absolute",
          top: 216,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1040,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 22px",
          background: "#ffffff",
          borderRadius: 18,
          border: `2px solid ${promptDone ? theme.color.brand + "33" : theme.color.brand}`,
          boxShadow: promptDone
            ? "0 16px 40px rgba(0,0,0,0.06)"
            : `0 0 0 4px ${theme.color.brand}14, 0 16px 40px rgba(230,25,130,0.18)`,
          opacity: interpolate(frame, [10, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transition: "box-shadow 0.2s, border 0.2s",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${theme.color.brand}, #7c3aed)`,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: `0 6px 18px ${theme.color.brand}55`,
          }}
        >
          <Icon name="sparkle" size={18} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: theme.color.textSubtle, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>
            Ce que vous demandez à Kinn
          </div>
          <div style={{ fontSize: 16, color: theme.color.text, lineHeight: 1.45, fontWeight: 500 }}>
            {typed || "Demandez à Kinn..."}
            {blink && typed && !promptDone && (
              <span style={{ borderRight: `2px solid ${theme.color.brand}`, marginLeft: 1 }}>&nbsp;</span>
            )}
          </div>
        </div>
        {promptDone && (
          <div
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              background: theme.color.success + "18",
              color: theme.color.success,
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            ✓ Interprété
          </div>
        )}
      </div>

      {/* Pipeline */}
      <div style={{ position: "absolute", top: 460, left: 0, right: 0, height: 320 }}>
        <svg
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "visible",
            pointerEvents: "none",
          }}
        >
          <defs>
            <filter id="p2-node-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="p2-edge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={theme.color.brand} stopOpacity="0.3" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.5" />
            </linearGradient>
          </defs>

          {/* Connection lines */}
          {steps.slice(0, -1).map((_, i) => {
            const edgeDoneAt = stepActiveAt(i + 1) - 4;
            const progress = interpolate(frame, [stepActiveAt(i) + 6, edgeDoneAt], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: easeOutExpo,
            });
            const totalW = 1600;
            const startX = 160 + (totalW / (totalSteps - 1)) * i;
            const endX = 160 + (totalW / (totalSteps - 1)) * (i + 1);
            return (
              <line
                key={i}
                x1={startX + 56}
                y1={100}
                x2={endX - 56}
                y2={100}
                stroke="url(#p2-edge)"
                strokeWidth={3.5}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - progress}
              />
            );
          })}

          {/* Flowing data packets on edges — frame-based so the MP4 render
              captures them properly (SMIL / CSS animations are skipped in
              Remotion's frame-by-frame capture). */}
          {steps.slice(0, -1).map((_, i) => {
            const edgeReady = frame > stepActiveAt(i + 1);
            if (!edgeReady) return null;
            const totalW = 1600;
            const startX = 160 + (totalW / (totalSteps - 1)) * i;
            const endX = 160 + (totalW / (totalSteps - 1)) * (i + 1);
            return Array.from({ length: 2 }).map((_, k) => {
              const cycle = 48; // 1.6s @ 30fps
              const phase = ((frame - stepActiveAt(i + 1) + k * 24) % cycle) / cycle;
              const x = startX + 56 + ((endX - 56) - (startX + 56)) * phase;
              // Fade in at start (0→0.15), fade out at end (0.85→1)
              const op =
                phase < 0.15
                  ? phase / 0.15
                  : phase > 0.85
                    ? (1 - phase) / 0.15
                    : 1;
              return (
                <circle
                  key={`p-${i}-${k}`}
                  cx={x}
                  cy={100}
                  r={6}
                  fill={theme.color.brand}
                  filter="url(#p2-node-glow)"
                  opacity={Math.max(0, op)}
                />
              );
            });
          })}
        </svg>

        {/* Step nodes */}
        {steps.map((step, i) => {
          const totalW = 1600;
          const startLeft = (1920 - totalW) / 2;
          const x = startLeft + (totalW / (totalSteps - 1)) * i;
          const activeAt = stepActiveAt(i);
          const visible = frame >= activeAt - 8;
          const sp = spring({ frame: frame - activeAt, fps, config: { damping: 13, stiffness: 140 } });
          const scale = interpolate(sp, [0, 1], [0.4, 1]);
          const opacity = interpolate(sp, [0, 1], [0, 1]);
          // Active if frame within [activeAt, activeAt + stepGap*2] — stays lit after
          const lit = frame >= activeAt + 6;
          const pulse = lit ? 0.75 + (Math.sin((frame - activeAt) / 5 + i) + 1) * 0.125 : 0;

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x - 56,
                top: 44,
                width: 112,
                opacity,
                transform: `scale(${scale})`,
                transformOrigin: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              {/* Badge ring when lit — frame-based pulse for the MP4 render. */}
              {lit && (
                <div
                  style={{
                    position: "absolute",
                    top: -4,
                    left: 18 - 4,
                    width: 120,
                    height: 120,
                    borderRadius: 26,
                    boxShadow: `0 0 0 ${3 + pulse * 3}px ${theme.color.brand}${Math.round(26 + pulse * 40).toString(16).padStart(2, "0")}`,
                    transform: "scale(0.72)",
                    transformOrigin: "center 40%",
                    pointerEvents: "none",
                  }}
                />
              )}

              {step.provider === "ai" ? (
                <div
                  style={{
                    width: 86,
                    height: 86,
                    borderRadius: 22,
                    background: `linear-gradient(135deg, ${theme.color.brand}, #7c3aed)`,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: lit
                      ? `0 18px 40px ${theme.color.brand}80, 0 0 60px ${theme.color.brand}44`
                      : `0 8px 20px ${theme.color.brand}33`,
                    transform: `scale(${lit ? 1 + pulse * 0.02 : 1})`,
                    transition: "box-shadow 0.3s",
                  }}
                >
                  <Icon name="sparkle" size={38} color="#fff" />
                </div>
              ) : (
                <div
                  style={{
                    filter: lit ? "saturate(1.1) brightness(1.04)" : "saturate(0.7) brightness(0.92)",
                    transform: `scale(${lit ? 1 + pulse * 0.015 : 1})`,
                    transition: "filter 0.3s",
                  }}
                >
                  <ProviderIcon provider={step.provider} size={86} />
                </div>
              )}

              <div style={{ textAlign: "center", marginTop: 4 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: lit ? theme.color.text : theme.color.textMuted,
                    letterSpacing: -0.2,
                  }}
                >
                  {step.label}
                </div>
                <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 2 }}>{step.subtitle}</div>
              </div>

              {/* Status pill */}
              {lit && (
                <div
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: theme.color.success + "18",
                    color: theme.color.success,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}
                >
                  ✓ ACTIF
                </div>
              )}

              {step.provider === "ai" && (
                <div
                  style={{
                    marginTop: 2,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: theme.color.brandLight,
                    color: theme.color.brand,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}
                >
                  ✨ NŒUD IA
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom caption */}
      <div
        style={{
          position: "absolute",
          bottom: 56,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 16,
          color: theme.color.textMuted,
          opacity: interpolate(frame, [stepActiveAt(totalSteps - 1) + 20, stepActiveAt(totalSteps - 1) + 50], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <span style={{ color: theme.color.text, fontWeight: 600 }}>1 prompt</span> → Kinn construit le workflow ·
        <span style={{ color: theme.color.brand, fontWeight: 600 }}> aucune action humaine </span>
        à chaque exécution.
      </div>
    </AbsoluteFill>
  );
};

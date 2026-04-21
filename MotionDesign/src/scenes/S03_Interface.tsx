import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme, agents } from "../theme";
import { AppShell } from "../components/AppShell";
import { Icon } from "../components/Icon";
import { easeOutExpo, easeInExpo } from "../utils/easing";

export const S03_Interface: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Zoom in from afar
  const inProgress = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: "clamp", easing: easeOutExpo });
  const inScale = interpolate(inProgress, [0, 1], [1.12, 1]);
  const inBlur = interpolate(inProgress, [0, 1], [18, 0]);

  const outProgress = interpolate(frame, [durationInFrames - 20, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInExpo });
  const outOpacity = 1 - outProgress;
  const outScale = 1 - outProgress * 0.03;

  // Typed prompt
  const prompt = "Relance les factures impayées et préviens les comptables sur Slack";
  const charCount = Math.floor(
    interpolate(frame, [36, 120], [0, prompt.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: easeOutExpo,
    })
  );
  const typedText = prompt.slice(0, charCount);
  const showCursor = Math.floor(frame / 10) % 2 === 0;
  const sendReady = charCount === prompt.length;

  return (
    <AbsoluteFill style={{ opacity: inProgress * outOpacity, transform: `scale(${inScale * outScale})`, filter: `blur(${inBlur}px)`, transformOrigin: "center center" }}>
      <AppShell searchValue="">
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            padding: "32px 64px",
          }}
        >
          {/* Greeting */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 20 }}>
            <div
              style={{
                opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" }),
                transform: `translateY(${interpolate(frame, [20, 40], [14, 0], { extrapolateRight: "clamp" })}px)`,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 16,
                  background: `linear-gradient(135deg, ${theme.color.brand}, #7c3aed)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  boxShadow: `0 12px 32px ${theme.color.brand}55`,
                  color: "#fff",
                }}
              >
                <Icon name="sparkle" size={26} />
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: theme.color.text, letterSpacing: -0.8 }}>
                Bonjour Édouard — que souhaitez-vous automatiser ?
              </div>
              <div style={{ fontSize: 15, color: theme.color.textMuted, marginTop: 10 }}>
                Décrivez votre besoin, Kinn mobilise les bons agents.
              </div>
            </div>
          </div>

          {/* Input bar */}
          <div style={{ maxWidth: 900, margin: "0 auto", width: "100%", paddingBottom: 20 }}>
            <div
              style={{
                background: "#ffffff",
                border: `1px solid ${theme.color.borderSoft}`,
                borderRadius: 18,
                padding: "16px 20px",
                boxShadow: "0 16px 48px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: theme.color.brandLight,
                  color: theme.color.brand,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="sparkle" size={16} />
              </div>
              <div style={{ flex: 1, fontSize: 16, color: typedText ? theme.color.text : "#c4c4c4", fontWeight: 400 }}>
                {typedText || "Demandez à Kinn..."}
                {showCursor && typedText && (
                  <span style={{ borderRight: `2px solid ${theme.color.brand}`, marginLeft: 2, fontSize: 16 }}>&nbsp;</span>
                )}
              </div>
              <div
                style={{
                  padding: "9px 14px",
                  borderRadius: 12,
                  background: sendReady ? theme.color.brand : theme.color.bg,
                  color: sendReady ? "#fff" : theme.color.textMuted,
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: sendReady ? "0 6px 20px rgba(230,25,130,0.35)" : "none",
                }}
              >
                <Icon name="send" size={13} color={sendReady ? "#fff" : theme.color.textMuted} />
                Envoyer
              </div>
            </div>

            {/* Suggestion pills */}
            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap", justifyContent: "center" }}>
              {agents.slice(0, 6).map((a, i) => {
                const op = interpolate(frame, [50 + i * 4, 68 + i * 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                const ty = interpolate(op, [0, 1], [8, 0]);
                return (
                  <div
                    key={a.id}
                    style={{
                      padding: "6px 12px 6px 7px",
                      borderRadius: 999,
                      background: "#fff",
                      border: `1px solid ${theme.color.borderSoft}`,
                      fontSize: 12,
                      color: theme.color.text,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      opacity: op,
                      transform: `translateY(${ty}px)`,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                    }}
                  >
                    <span
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        background: a.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                      }}
                    >
                      {a.emoji}
                    </span>
                    <span style={{ fontWeight: 500 }}>{a.name}</span>
                    <span style={{ color: theme.color.textMuted, fontSize: 11 }}>· {a.role}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AppShell>
    </AbsoluteFill>
  );
};

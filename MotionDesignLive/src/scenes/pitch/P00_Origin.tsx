import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../../theme";
import { AnimatedBg } from "../../components/AnimatedBg";
import { LucideIcon, IconName } from "../../components/AgentIcon";
import { C4rbonLogo } from "../../components/C4rbonLogo";
import { easeOutExpo, easeInExpo } from "../../utils/easing";

// Origin story : who is C4RBON GROUP, 4-year journey from i55 (custom
// integrations for industrial clients) to Kinn (unified platform).
// Content drawn from PITCH DECK 1.0.pptx slides 1-2.

type Milestone = {
  year: string;
  title: string;
  desc: string;
  icon: IconName;
  color: string;
};

const milestones: Milestone[] = [
  {
    year: "2021",
    title: "Création i55",
    desc: "Résoudre un problème réel : machines, ERP, CRM et outils métiers ne communiquent pas.",
    icon: "flask",
    color: "#3b82f6",
  },
  {
    year: "2022",
    title: "Application terrain",
    desc: "Solutions sur mesure pour supprimer les doublons, interconnecter et automatiser les flux industriels.",
    icon: "settings",
    color: "#10b981",
  },
  {
    year: "2023",
    title: "Intégration de l'IA",
    desc: "Pour comprendre, générer et optimiser les processus métiers.",
    icon: "sparkles",
    color: "#7c3aed",
  },
  {
    year: "2024",
    title: "i55 devient C4RBON GROUP",
    desc: "Fournisseur d'écosystème numérique intégré pour toutes les entreprises.",
    icon: "layers",
    color: "#0f172a",
  },
];

export const P00_Origin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const inP = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp", easing: easeOutExpo });
  const outP = interpolate(frame, [durationInFrames - 20, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInExpo,
  });
  const out = 1 - outP;

  // Phase 1 : C4RBON reveal (frames 0-110)
  const logoSpring = spring({ frame: frame - 4, fps, config: { damping: 14, stiffness: 110 } });
  const taglineSpring = spring({ frame: frame - 30, fps, config: { damping: 18 } });

  // Phase 2 : Timeline reveal — starts quickly after the intro
  const titleSpring = spring({ frame: frame - 85, fps, config: { damping: 16, stiffness: 130 } });

  // Phase 3 : Kinn emerges. Compressed timing — cards run faster.
  const kinnSpring = spring({ frame: frame - 420, fps, config: { damping: 14, stiffness: 100 } });
  const quoteSpring = spring({ frame: frame - 460, fps, config: { damping: 18 } });

  // Phase boundaries for slide layout
  const inTimeline = frame >= 80 && frame < 420;
  const inClosing = frame >= 420;

  return (
    <AbsoluteFill style={{ opacity: inP * out }}>
      <AnimatedBg variant="light" intensity={0.6} />

      {/* ═══ PHASE 1 : C4RBON HEADER ══════════════════ */}
      {/* Stays visible throughout as a top bar after the intro */}
      <div
        style={{
          position: "absolute",
          top: inTimeline || inClosing ? 44 : 440,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          transition: "top 0.6s cubic-bezier(0.65,0,0.35,1)",
          opacity: logoSpring,
          transform: `scale(${inTimeline || inClosing ? 0.55 : 1})`,
          transformOrigin: "center top",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "18px 28px",
            background: "#fff",
            borderRadius: 22,
            boxShadow: "0 24px 60px rgba(15,23,42,0.12), 0 4px 14px rgba(0,0,0,0.04)",
            border: "1px solid rgba(15,23,42,0.06)",
          }}
        >
          <Img
            src={staticFile("c4rbon-logo.png")}
            style={{ height: 64, width: 64, objectFit: "contain" }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div
              style={{
                fontSize: 38,
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: -1.5,
                lineHeight: 1,
              }}
            >
              C4RBON
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#64748b",
                letterSpacing: 3.5,
              }}
            >
              GROUP
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PHASE 1 : Tagline under C4RBON (intro only) ═══ */}
      {!inTimeline && !inClosing && (
        <div
          style={{
            position: "absolute",
            top: 620,
            left: 0,
            right: 0,
            textAlign: "center",
            opacity: taglineSpring,
            transform: `translateY(${interpolate(taglineSpring, [0, 1], [20, 0])}px)`,
          }}
        >
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: "#0f172a",
              letterSpacing: 0.2,
            }}
          >
            Ingénierie des Systèmes Intelligents
          </div>
          <div style={{ fontSize: 15, color: theme.color.textMuted, marginTop: 10, maxWidth: 720, margin: "10px auto 0" }}>
            Nous connectons, automatisons et intelligemment orchestrons les systèmes d'information.
          </div>
        </div>
      )}

      {/* ═══ PHASE 2 : Timeline ══════════════════════════ */}
      {(inTimeline || inClosing) && (
        <>
          <div
            style={{
              position: "absolute",
              top: 180,
              left: 0,
              right: 0,
              textAlign: "center",
              opacity: titleSpring,
              transform: `translateY(${interpolate(titleSpring, [0, 1], [-18, 0])}px)`,
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: theme.color.brand,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              Qui sommes-nous
            </div>
            <div
              style={{
                fontSize: 40,
                fontWeight: 800,
                color: theme.color.text,
                marginTop: 8,
                letterSpacing: -1,
              }}
            >
              4 ans de terrain, une plateforme <span style={{ color: theme.color.brand }}>unifiée</span>.
            </div>
          </div>

          {/* Timeline track — vertically centered, fill progresses card by card */}
          <svg
            style={{
              position: "absolute",
              top: 499,
              left: 0,
              right: 0,
              width: "100%",
              height: 6,
              overflow: "visible",
            }}
          >
            <line
              x1={240}
              y1={3}
              x2={1680}
              y2={3}
              stroke={theme.color.borderSoft}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <line
              x1={240}
              y1={3}
              x2={1680}
              y2={3}
              stroke={theme.color.brand}
              strokeWidth={3}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              // Compressed stepped fill — cards at 100, 180, 260, 340 (80 frames apart).
              //   [100, 140]  → 0     (card 1 settles, bar 0)
              //   [140, 180]  → 0→1/3 (bar fills)
              //   [180, 220]  → 1/3   (card 2 settles)
              //   [220, 260]  → 1/3→2/3
              //   [260, 300]  → 2/3   (card 3 settles)
              //   [300, 340]  → 2/3→1
              //   [340, 420]  → 1     (card 4 settles)
              strokeDashoffset={1 - interpolate(
                frame,
                [100, 140, 180, 220, 260, 300, 340, 420],
                [0,   0,   1/3, 1/3, 2/3, 2/3, 1,   1],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutExpo }
              )}
            />
          </svg>

          {/* Milestones — cards spaced 80 frames apart (compressed timeline). */}
          {milestones.map((m, i) => {
            const startAt = 100 + i * 80;
            const sp = spring({ frame: frame - startAt, fps, config: { damping: 13, stiffness: 120 } });
            const opacity = interpolate(sp, [0, 1], [0, 1]);
            const ty = interpolate(sp, [0, 1], [22, 0]);
            const x = 240 + (1440 / 3) * i;
            return (
              <div
                key={m.year}
                style={{
                  position: "absolute",
                  top: 440,
                  left: x - 165,
                  width: 330,
                  opacity,
                  transform: `translateY(${ty}px)`,
                }}
              >
                {/* Year above */}
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 34,
                    fontWeight: 800,
                    color: m.color,
                    letterSpacing: -0.8,
                    marginBottom: 8,
                  }}
                >
                  {m.year}
                </div>

                {/* Dot on timeline */}
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 999,
                    background: m.color,
                    border: "3px solid #fff",
                    margin: "0 auto",
                    boxShadow: `0 6px 16px ${m.color}66`,
                    marginBottom: 18,
                  }}
                />

                {/* Card */}
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 16,
                    border: `1px solid ${m.color}22`,
                    boxShadow: `0 16px 36px ${m.color}22, 0 2px 8px rgba(0,0,0,0.04)`,
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    minHeight: 160,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: `linear-gradient(135deg, ${m.color}, ${m.color}cc)`,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: `0 6px 16px ${m.color}55`,
                      }}
                    >
                      <LucideIcon name={m.icon} size={18} color="#fff" strokeWidth={2} />
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: theme.color.text,
                        letterSpacing: -0.2,
                      }}
                    >
                      {m.title}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: theme.color.textMuted, lineHeight: 1.5 }}>
                    {m.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ═══ PHASE 3 : Kinn aboutissement + citation ═══ */}
      {inClosing && (
        <>
          {/* Kinn logo emerges at bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 200,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              opacity: kinnSpring,
              transform: `scale(${interpolate(kinnSpring, [0, 1], [0.7, 1])})`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "14px 26px",
                background: `linear-gradient(135deg, ${theme.color.brand}, #7c3aed)`,
                color: "#fff",
                borderRadius: 16,
                boxShadow: `0 24px 60px ${theme.color.brand}55`,
              }}
            >
              <Img src={staticFile("logo-kinn.svg")} style={{ height: 40, filter: "brightness(0) invert(1)" }} />
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                  borderLeft: "2px solid rgba(255,255,255,0.35)",
                  paddingLeft: 18,
                }}
              >
                aboutissement logique
                <br />
                <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.85 }}>
                  de 4 ans de terrain et de R&D
                </span>
              </div>
            </div>
          </div>

          {/* Closing quote */}
          <div
            style={{
              position: "absolute",
              bottom: 60,
              left: 0,
              right: 0,
              textAlign: "center",
              opacity: quoteSpring,
              transform: `translateY(${interpolate(quoteSpring, [0, 1], [12, 0])}px)`,
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontStyle: "italic",
                color: theme.color.text,
                fontWeight: 500,
                maxWidth: 900,
                margin: "0 auto",
                lineHeight: 1.4,
              }}
            >
              « Les entreprises n'ont pas besoin de nouveaux outils.
              <br />
              Elles ont besoin qu'ils se <span style={{ color: theme.color.brand, fontWeight: 700 }}>parlent</span>. »
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 12,
                color: theme.color.textSubtle,
                letterSpacing: 2,
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              C4RBON Group · 2024
            </div>
          </div>
        </>
      )}
    </AbsoluteFill>
  );
};

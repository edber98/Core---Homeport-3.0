import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../../theme";
import { AnimatedBg } from "../../components/AnimatedBg";
import { LucideIcon, IconName } from "../../components/AgentIcon";
import { easeOutExpo, easeInExpo } from "../../utils/easing";

// Real-world use cases. Focus on HUMAN simplification: show the chain of
// people/steps before vs the one-shot after. Accessible wording, no jargon.

type Actor = { label: string; icon: IconName };

type UseCase = {
  icon: IconName;
  color: string;
  domain: string;
  title: string;
  // "Before" chain : what actually happens today in companies
  before: { time: string; actors: Actor[] };
  // "After" : single action with Kinn
  after: { time: string; desc: string };
  benefit: string;
};

const useCases: UseCase[] = [
  {
    icon: "creditCard",
    color: "#10b981",
    domain: "Comptabilité",
    title: "Saisir une facture fournisseur",
    before: {
      time: "15 min",
      actors: [
        { label: "Assistant", icon: "briefcase" },
        { label: "Comptable", icon: "file" },
        { label: "Responsable", icon: "check" },
      ],
    },
    after: { time: "2 min", desc: "Email → Kinn → ERP" },
    benefit: "Plus de double saisie",
  },
  {
    icon: "briefcase",
    color: "#e61982",
    domain: "Commercial",
    title: "Ajouter un lead au CRM",
    before: {
      time: "2 jours",
      actors: [
        { label: "Commercial", icon: "briefcase" },
        { label: "Assistant", icon: "file" },
      ],
    },
    after: { time: "3 sec", desc: "Photo de carte → CRM" },
    benefit: "Aucun contact oublié",
  },
  {
    icon: "mail",
    color: "#3b82f6",
    domain: "Support client",
    title: "Router un email arrivant",
    before: {
      time: "2 h",
      actors: [
        { label: "Support", icon: "mail" },
        { label: "Manager", icon: "check" },
        { label: "Expert", icon: "settings" },
      ],
    },
    after: { time: "instantané", desc: "Tri, catégorie, équipe cible" },
    benefit: "Réponses plus rapides",
  },
  {
    icon: "cpu",
    color: "#f59e0b",
    domain: "Industrie",
    title: "Traiter une alerte machine",
    before: {
      time: "45 min",
      actors: [
        { label: "Opérateur", icon: "cpu" },
        { label: "Technicien", icon: "settings" },
        { label: "Responsable", icon: "check" },
      ],
    },
    after: { time: "8 min", desc: "Diagnostic + plan d'action auto" },
    benefit: "Moins de pannes répétées",
  },
  {
    icon: "building",
    color: "#7c3aed",
    domain: "RH / Admin",
    title: "Valider une demande de congé",
    before: {
      time: "3 jours",
      actors: [
        { label: "Salarié", icon: "briefcase" },
        { label: "Manager", icon: "check" },
        { label: "RH", icon: "building" },
      ],
    },
    after: { time: "1 clic", desc: "Formulaire → paie synchronisée" },
    benefit: "Zéro ressaisie paie",
  },
  {
    icon: "trendingUp",
    color: "#13c2c2",
    domain: "Pilotage",
    title: "Consolider un rapport mensuel",
    before: {
      time: "1 journée",
      actors: [
        { label: "Chacun", icon: "briefcase" },
        { label: "Contrôleur", icon: "file" },
      ],
    },
    after: { time: "temps réel", desc: "Dashboard consolidé live" },
    benefit: "Visibilité 360°",
  },
];

export const P10_UseCases: React.FC = () => {
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
  const kpiSpring = spring({ frame: frame - 200, fps, config: { damping: 16 } });

  return (
    <AbsoluteFill style={{ opacity: inP * out }}>
      <AnimatedBg variant="light" intensity={0.7} />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 54,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [-22, 0])}px)`,
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
          Plus-value en entreprise
        </div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            color: theme.color.text,
            marginTop: 8,
            letterSpacing: -1,
          }}
        >
          Le répétitif, automatisé. <span style={{ color: theme.color.brand }}>Le stratégique, amplifié.</span>
        </div>
        <div
          style={{
            fontSize: 14,
            color: theme.color.textMuted,
            marginTop: 6,
            maxWidth: 1000,
            margin: "6px auto 0",
          }}
        >
          Vos équipes arrêtent de ressaisir, copier-coller et consolider à la main. Elles retrouvent du temps pour ce qui fait vraiment avancer l'entreprise.
        </div>
      </div>

      {/* Grid vertically centered */}
      <div
        style={{
          position: "absolute",
          top: 210,
          bottom: 160,
          left: 60,
          right: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}
        >
          {useCases.map((uc, i) => {
            const startAt = 20 + i * 10;
            const sp = spring({ frame: frame - startAt, fps, config: { damping: 14, stiffness: 130 } });
            const opacity = interpolate(sp, [0, 1], [0, 1]);
            const ty = interpolate(sp, [0, 1], [30, 0]);
            return (
              <div
                key={uc.domain}
                style={{
                  opacity,
                  transform: `translateY(${ty}px)`,
                  background: "#fff",
                  borderRadius: 18,
                  border: `1px solid ${uc.color}22`,
                  boxShadow: `0 16px 36px ${uc.color}1f, 0 2px 8px rgba(0,0,0,0.04)`,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  minHeight: 280,
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: `linear-gradient(135deg, ${uc.color}, ${uc.color}cc)`,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `0 8px 22px ${uc.color}55`,
                      flexShrink: 0,
                    }}
                  >
                    <LucideIcon name={uc.icon} size={20} color="#fff" strokeWidth={2} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: uc.color,
                        fontWeight: 700,
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                      }}
                    >
                      {uc.domain}
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: theme.color.text,
                        marginTop: 2,
                        letterSpacing: -0.2,
                        lineHeight: 1.3,
                      }}
                    >
                      {uc.title}
                    </div>
                  </div>
                </div>

                {/* Avant : chain of people */}
                <div
                  style={{
                    padding: "10px 12px",
                    background: "#f8fafc",
                    borderRadius: 10,
                    border: `1px solid ${theme.color.borderSoft}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 7,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        color: theme.color.textSubtle,
                        fontWeight: 700,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                      }}
                    >
                      Avant · {uc.before.actors.length} intervenants
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: theme.color.textMuted,
                        fontWeight: 600,
                        textDecoration: "line-through",
                      }}
                    >
                      {uc.before.time}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {uc.before.actors.map((a, idx) => (
                      <React.Fragment key={idx}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "4px 7px",
                            background: "#fff",
                            border: `1px solid ${theme.color.borderSoft}`,
                            borderRadius: 6,
                            fontSize: 10,
                            color: theme.color.textMuted,
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          <LucideIcon name={a.icon} size={10} color={theme.color.textMuted} strokeWidth={2.2} />
                          {a.label}
                        </div>
                        {idx < uc.before.actors.length - 1 && (
                          <span style={{ color: theme.color.textSubtle, fontSize: 11 }}>→</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Après : one action */}
                <div
                  style={{
                    padding: "10px 12px",
                    background: `linear-gradient(135deg, ${uc.color}10, ${uc.color}05)`,
                    borderRadius: 10,
                    border: `1.5px solid ${uc.color}44`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        color: uc.color,
                        fontWeight: 700,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                      }}
                    >
                      Avec Kinn · 1 action
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        color: uc.color,
                        fontWeight: 800,
                      }}
                    >
                      {uc.after.time}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: theme.color.text, fontWeight: 500, lineHeight: 1.4 }}>
                    {uc.after.desc}
                  </div>
                </div>

                {/* Benefit chip */}
                <div
                  style={{
                    marginTop: "auto",
                    padding: "6px 10px",
                    background: uc.color + "12",
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    color: uc.color,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    letterSpacing: 0.2,
                  }}
                >
                  <LucideIcon name="check" size={12} color={uc.color} strokeWidth={2.5} />
                  {uc.benefit}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI banner at bottom — 3 blocks perfectly aligned on one line */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: "50%",
          transform: `translateX(-50%) translateY(${interpolate(kpiSpring, [0, 1], [20, 0])}px)`,
          opacity: kpiSpring,
          display: "flex",
          alignItems: "stretch",
          padding: "18px 32px",
          background: "#0f172a",
          borderRadius: 18,
          boxShadow: "0 20px 50px rgba(15,23,42,0.25)",
          gap: 0,
        }}
      >
        <Kpi value="30→60 %" label="de travail manuel éliminé" color="#22c55e" />
        <Sep />
        <Kpi value="10 h" label="gagnées / semaine / employé" color={theme.color.brand} />
        <Sep />
        <Kpi value="< 1 mois" label="pour voir les résultats" color="#fbbf24" />
      </div>
    </AbsoluteFill>
  );
};

// Each KPI : value on top, label on single line below — all blocks share
// the same height so the row is perfectly aligned.
const Kpi: React.FC<{ value: string; label: string; color: string }> = ({ value, label, color }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "0 28px",
      height: 48,
    }}
  >
    <div
      style={{
        fontSize: 30,
        fontWeight: 800,
        color,
        letterSpacing: -0.6,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: 12,
        color: "rgba(255,255,255,0.78)",
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  </div>
);

const Sep = () => (
  <div style={{ width: 1, alignSelf: "center", height: 36, background: "rgba(255,255,255,0.15)" }} />
);

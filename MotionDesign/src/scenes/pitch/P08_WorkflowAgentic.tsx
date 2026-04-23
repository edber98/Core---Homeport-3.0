import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../../theme";
import { AnimatedBg } from "../../components/AnimatedBg";
import { EmailCard } from "../../components/EmailCard";
import { LucideIcon, IconName } from "../../components/AgentIcon";
import { ProviderIcon } from "../../components/ProviderIcon";
import { easeOutExpo, easeInExpo } from "../../utils/easing";

// Sequence: 1) Flow visible, 2) event triggers it, 3) agent reads/understands,
// 4) actions execute in parallel. Each phase gets its own clear moment.
export const P08_WorkflowAgentic: React.FC = () => {
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

  // Phase timeline
  const P1_FLOW = 20;      // workflow appears idle
  const P2_EVENT = 120;    // email arrives
  const P3_AGENT = 250;    // agent reads & extracts
  const P4_ACTIONS = 430;  // actions execute in parallel

  // Phase boundaries for highlighted step
  const phaseLabel =
    frame < P2_EVENT ? "1 · Le workflow attend un événement" :
    frame < P3_AGENT ? "2 · Un email déclenche le workflow" :
    frame < P4_ACTIONS ? "3 · L'agent lit et extrait l'information" :
    "4 · Les actions s'exécutent en parallèle";

  return (
    <AbsoluteFill style={{ opacity: inP * out }}>
      <AnimatedBg variant="light" intensity={0.6} />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 56,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [-22, 0])}px)`,
        }}
      >
        <div style={{ fontSize: 14, color: theme.color.brand, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
          Workflow + Agents
        </div>
        <div style={{ fontSize: 46, fontWeight: 800, color: theme.color.text, marginTop: 8, letterSpacing: -1 }}>
          Un événement, une réaction <span style={{ color: theme.color.brand }}>intelligente</span>.
        </div>
      </div>

      {/* Phase indicator */}
      <div
        style={{
          position: "absolute",
          top: 178,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            padding: "6px 16px",
            borderRadius: 999,
            background: "rgba(15,23,42,0.9)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.5,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: theme.color.brand,
              boxShadow: `0 0 10px ${theme.color.brand}`,
            }}
          />
          {phaseLabel}
        </div>
      </div>

      {/* MAIN : 3 columns horizontal flow */}
      <div
        style={{
          position: "absolute",
          top: 230,
          left: 40,
          right: 40,
          bottom: 40,
          display: "flex",
          gap: 24,
          alignItems: "stretch",
        }}
      >
        {/* Column 1 — Workflow + event trigger */}
        <Column label="Déclenchement" index={1}>
          <PhaseTrigger frame={frame} eventAt={P2_EVENT} />
        </Column>

        <Arrow active={frame >= P3_AGENT - 20} />

        {/* Column 2 — Agent analyzing */}
        <Column label="Analyse IA" index={2}>
          <PhaseAgent frame={frame} agentAt={P3_AGENT} />
        </Column>

        <Arrow active={frame >= P4_ACTIONS - 20} parallel />

        {/* Column 3 — Actions in parallel */}
        <Column label="Actions parallèles" index={3}>
          <PhaseActions frame={frame} at={P4_ACTIONS} />
        </Column>
      </div>
    </AbsoluteFill>
  );
};

const Column: React.FC<{ label: string; index: number; children: React.ReactNode }> = ({ label, index, children }) => (
  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
    <div
      style={{
        fontSize: 10,
        color: theme.color.textSubtle,
        fontWeight: 700,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          background: theme.color.brandLight,
          color: theme.color.brand,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 800,
        }}
      >
        {index}
      </span>
      {label}
    </div>
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
  </div>
);

const Arrow: React.FC<{ active: boolean; parallel?: boolean }> = ({ active, parallel }) => {
  const frame = useCurrentFrame();
  const pulse = active ? 0.7 + (Math.sin(frame / 5) + 1) * 0.15 : 0.25;
  return (
    <div
      style={{
        width: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 40,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: active ? theme.color.brand : "#e5e7eb",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: active ? `0 0 0 ${3 + pulse * 3}px ${theme.color.brand}22, 0 8px 20px ${theme.color.brand}44` : "none",
          transition: "all 0.3s",
        }}
      >
        <LucideIcon name="arrowRight" size={18} color="#fff" strokeWidth={2.5} />
      </div>
      {parallel && active && (
        <div
          style={{
            marginTop: 8,
            padding: "2px 8px",
            borderRadius: 999,
            background: theme.color.brand + "18",
            color: theme.color.brand,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          Parallèle
        </div>
      )}
    </div>
  );
};

// ═══ Phase 1 · Trigger email ══════════════════════
const PhaseTrigger: React.FC<{ frame: number; eventAt: number }> = ({ frame, eventAt }) => {
  const hasEmail = frame >= eventAt;
  const sp = spring({ frame: frame - eventAt, fps: 30, config: { damping: 12, stiffness: 130 } });
  const emailOp = hasEmail ? interpolate(sp, [0, 1], [0, 1]) : 0;
  const emailScale = hasEmail ? interpolate(sp, [0, 1], [0.7, 1]) : 0.9;

  return (
    <>
      {/* Workflow mini diagram */}
      <div
        style={{
          padding: "12px 14px",
          background: "#fff",
          borderRadius: 12,
          border: `1px solid ${theme.color.borderSoft}`,
          boxShadow: "0 8px 20px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: theme.color.textSubtle,
            fontWeight: 700,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Workflow · Traitement facture
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <MiniNode label="Trigger" color={hasEmail ? theme.color.brand : "#94a3b8"} icon="mail" />
          <Dash active={hasEmail} />
          <MiniNode label="Agent" color="#94a3b8" icon="bot" />
          <Dash active={false} />
          <MiniNode label="Actions" color="#94a3b8" icon="zap" />
        </div>
      </div>

      {/* Email arriving */}
      <div style={{ opacity: emailOp, transform: `scale(${emailScale})`, transformOrigin: "top left" }}>
        <EmailCard
          from="factures@acme-fournisseur.fr"
          subject="Facture 2026-04-FR-00321 — échéance 30 jours"
          preview="Bonjour, veuillez trouver ci-joint la facture. Paiement attendu avant le 21/05/2026. Montant TTC : 14 250 €. Ref commande PO-4871."
          time="09:14"
          highlight={hasEmail}
        />
      </div>

      {hasEmail && (
        <div
          style={{
            padding: "8px 12px",
            background: theme.color.brand + "10",
            border: `1px solid ${theme.color.brand}33`,
            borderRadius: 10,
            fontSize: 11,
            color: theme.color.brand,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <LucideIcon name="zap" size={12} color={theme.color.brand} strokeWidth={2.2} />
          Trigger Gmail activé · workflow lancé
        </div>
      )}
    </>
  );
};

// ═══ Phase 2 · Agent reads ══════════════════════════
const PhaseAgent: React.FC<{ frame: number; agentAt: number }> = ({ frame, agentAt }) => {
  const active = frame >= agentAt;
  const sp = spring({ frame: frame - agentAt, fps: 30, config: { damping: 14 } });

  const fields = [
    { label: "Fournisseur", value: "ACME Fournisseur", at: agentAt + 12 },
    { label: "N° facture", value: "2026-04-FR-00321", at: agentAt + 30 },
    { label: "Montant TTC", value: "14 250 €", at: agentAt + 48 },
    { label: "Échéance", value: "21 mai 2026", at: agentAt + 66 },
    { label: "Commande", value: "PO-4871", at: agentAt + 84 },
    { label: "Catégorie", value: "Matières premières", at: agentAt + 108, ai: true },
  ];

  return (
    <div
      style={{
        padding: "14px 16px",
        background: "#fff",
        borderRadius: 14,
        border: `2px solid ${active ? "#13c2c2" : theme.color.borderSoft}`,
        boxShadow: active
          ? "0 0 0 3px rgba(19,194,194,0.18), 0 16px 40px rgba(19,194,194,0.18)"
          : "0 8px 20px rgba(0,0,0,0.04)",
        opacity: active ? 1 : 0.4,
        transform: active ? `scale(${interpolate(sp, [0, 1], [0.97, 1])})` : "scale(1)",
        transition: "opacity 0.3s",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        flex: 1,
        minHeight: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: "linear-gradient(135deg, #13c2c2, #08979c)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 6px 18px rgba(19,194,194,0.5)",
          }}
        >
          <LucideIcon name="ada" size={18} color="#fff" strokeWidth={2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.color.text }}>Ada</div>
          <div style={{ fontSize: 10, color: theme.color.textMuted }}>Analyste · extraction structurée</div>
        </div>
        {active && (
          <div
            style={{
              padding: "3px 9px",
              borderRadius: 999,
              background: "#13c2c222",
              color: "#13c2c2",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            EN COURS
          </div>
        )}
      </div>

      {active && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {fields.map((f) => {
            const visible = frame >= f.at;
            if (!visible) return null;
            const rowSp = interpolate(frame, [f.at, f.at + 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={f.label}
                style={{
                  padding: "7px 10px",
                  background: f.ai ? theme.color.brandLight : "#f8fafc",
                  borderRadius: 8,
                  border: `1px solid ${f.ai ? theme.color.brand + "33" : theme.color.borderSoft}`,
                  opacity: rowSp,
                  transform: `translateY(${(1 - rowSp) * 5}px)`,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: f.ai ? theme.color.brand : theme.color.textSubtle,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {f.label}
                  {f.ai && <LucideIcon name="sparkles" size={9} color={theme.color.brand} strokeWidth={2.2} />}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: theme.color.text, marginTop: 2 }}>{f.value}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ═══ Phase 3 · Actions in parallel ═══════════════════
const PhaseActions: React.FC<{ frame: number; at: number }> = ({ frame, at }) => {
  const actions: { provider: "odoo" | "slack" | "gmail"; title: string; desc: string; at: number }[] = [
    { provider: "odoo", title: "Odoo", desc: "Facture fournisseur créée", at: at + 8 },
    { provider: "slack", title: "Slack", desc: "Équipe compta #factures alertée", at: at + 8 },
    { provider: "gmail", title: "Gmail", desc: "Email archivé dans 'Traité'", at: at + 8 },
  ];

  return (
    <>
      {actions.map((a, i) => {
        const visible = frame >= a.at;
        if (!visible)
          return (
            <div
              key={i}
              style={{
                padding: 14,
                background: "#fff",
                border: `1px solid ${theme.color.borderSoft}`,
                borderRadius: 14,
                opacity: 0.4,
              }}
            >
              <div style={{ fontSize: 12, color: theme.color.textMuted }}>En attente…</div>
            </div>
          );
        const sp = spring({ frame: frame - a.at, fps: 30, config: { damping: 13, stiffness: 130 } });
        const opacity = interpolate(sp, [0, 1], [0, 1]);
        const scale = interpolate(sp, [0, 1], [0.95, 1]);
        const done = frame >= a.at + 30;
        return (
          <div
            key={i}
            style={{
              padding: 14,
              background: "#fff",
              borderRadius: 14,
              border: `2px solid ${done ? theme.color.success : theme.color.brand}`,
              boxShadow: done
                ? `0 12px 30px ${theme.color.success}2a, 0 0 0 3px ${theme.color.success}15`
                : `0 12px 30px ${theme.color.brand}2a, 0 0 0 3px ${theme.color.brand}15`,
              opacity,
              transform: `scale(${scale})`,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <ProviderIcon provider={a.provider} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.color.text }}>{a.title}</div>
              <div style={{ fontSize: 10, color: theme.color.textMuted, marginTop: 2, lineHeight: 1.4 }}>{a.desc}</div>
            </div>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                background: done ? theme.color.success : theme.color.brand + "22",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: done ? `0 4px 12px ${theme.color.success}55` : "none",
              }}
            >
              {done ? (
                <LucideIcon name="check" size={13} color="#fff" strokeWidth={2.8} />
              ) : (
                <LucideIcon name="clock" size={12} color={theme.color.brand} strokeWidth={2.5} />
              )}
            </div>
          </div>
        );
      })}
    </>
  );
};

const MiniNode: React.FC<{ label: string; color: string; icon: IconName }> = ({ label, color, icon }) => (
  <div
    style={{
      padding: "6px 10px",
      borderRadius: 8,
      background: color + "18",
      color,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 0.4,
      border: `1px solid ${color}`,
      display: "flex",
      alignItems: "center",
      gap: 5,
    }}
  >
    <LucideIcon name={icon} size={10} color={color} strokeWidth={2.2} />
    {label}
  </div>
);

const Dash: React.FC<{ active: boolean }> = ({ active }) => (
  <div
    style={{
      width: 18,
      height: 2,
      background: active ? theme.color.brand : "#e2e8f0",
      borderRadius: 1,
    }}
  />
);

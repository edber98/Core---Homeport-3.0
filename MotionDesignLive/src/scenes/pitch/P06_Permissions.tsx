import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../../theme";
import { AnimatedBg } from "../../components/AnimatedBg";
import { Icon } from "../../components/Icon";
import { easeOutExpo, easeInExpo } from "../../utils/easing";

// Demonstrate the permission request flow.
// An agent asks for approval before a sensitive action.
export const P06_Permissions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const inP = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp", easing: easeOutExpo });
  const outP = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInExpo });
  const out = 1 - outP;

  const titleSpring = spring({ frame: frame - 4, fps, config: { damping: 16, stiffness: 130 } });

  // Permission card timing
  const cardSpring = spring({ frame: frame - 60, fps, config: { damping: 14, stiffness: 120 } });
  const approved = frame >= 230;

  return (
    <AbsoluteFill style={{ opacity: inP * out }}>
      <AnimatedBg variant="light" intensity={0.7} />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 72,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [-22, 0])}px)`,
        }}
      >
        <div style={{ fontSize: 14, color: theme.color.brand, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
          Contrôle & permissions
        </div>
        <div style={{ fontSize: 50, fontWeight: 800, color: theme.color.text, marginTop: 10, letterSpacing: -1 }}>
          Vous gardez la <span style={{ color: theme.color.brand }}>main</span>.
        </div>
        <div style={{ fontSize: 17, color: theme.color.textMuted, marginTop: 12, maxWidth: 900, margin: "12px auto 0" }}>
          Chaque action sensible peut exiger votre validation.
          Configurable par agent, par workflow, ou globalement.
        </div>
      </div>

      {/* Main : left = 3 modes, right = permission card in action */}
      <div style={{ position: "absolute", top: 300, left: 80, right: 80, bottom: 60, display: "flex", gap: 40, alignItems: "flex-start" }}>
        {/* Modes */}
        <div style={{ flex: "0 0 380px", display: "flex", flexDirection: "column", gap: 14 }}>
          <ModeRow
            icon="🛡️"
            label="Prudent"
            desc="Chaque écriture demande validation"
            color="#10b981"
            active={frame > 40 && frame < 140}
          />
          <ModeRow
            icon="⚖️"
            label="Équilibré"
            desc="Seules les suppressions/déploiements"
            color="#f59e0b"
            active={frame >= 140 && frame < 230}
          />
          <ModeRow
            icon="🚀"
            label="Autonome"
            desc="Liberté totale, supervision par logs"
            color={theme.color.brand}
            active={approved}
          />
          <div style={{ marginTop: 12, fontSize: 12, color: theme.color.textMuted, lineHeight: 1.55, padding: "0 4px" }}>
            Paramétrable <strong style={{ color: theme.color.text }}>par niveau</strong> (utilisateur, agent ou action)
            et aligné sur vos règles métier.
          </div>
        </div>

        {/* Permission request card */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: 20,
          }}
        >
          <div
            style={{
              width: 560,
              background: "#ffffff",
              borderRadius: 22,
              border: `2px solid ${approved ? theme.color.success : theme.color.brand}`,
              boxShadow: approved
                ? `0 32px 72px ${theme.color.success}30, 0 0 0 4px ${theme.color.success}18`
                : `0 32px 72px ${theme.color.brand}30, 0 0 0 4px ${theme.color.brand}18`,
              padding: 28,
              opacity: cardSpring,
              transform: `scale(${interpolate(cardSpring, [0, 1], [0.9, 1])}) translateY(${(1 - cardSpring) * 16}px)`,
              transition: "border 0.3s, box-shadow 0.3s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: approved ? theme.color.success + "18" : theme.color.brandLight,
                  color: approved ? theme.color.success : theme.color.brand,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={approved ? "check" : "key"} size={20} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: theme.color.textSubtle, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
                  {approved ? "Action autorisée" : "Demande de permission"}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: theme.color.text, marginTop: 2 }}>
                  Denis · Généraliste
                </div>
              </div>
            </div>

            <div style={{ fontSize: 14, color: theme.color.text, lineHeight: 1.55, marginBottom: 14 }}>
              Avant de continuer, je souhaite <strong>envoyer 12 relances par email</strong>
              vers des contacts de votre Odoo. Action réversible mais visible par le client.
            </div>

            {/* Details rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
              <DetailRow label="Action" value="email.send_batch" />
              <DetailRow label="Destinataires" value="12 comptables · Odoo contacts" />
              <DetailRow label="Réversible" value="Non — email part immédiatement" important />
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                style={{
                  flex: 1,
                  padding: "13px 16px",
                  borderRadius: 12,
                  background: approved ? theme.color.success : theme.color.brand,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  border: "none",
                  boxShadow: `0 8px 22px ${approved ? theme.color.success : theme.color.brand}55`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Icon name="check" size={14} color="#fff" />
                {approved ? "Action approuvée" : "Approuver"}
              </button>
              <button
                style={{
                  padding: "13px 20px",
                  borderRadius: 12,
                  background: "#fff",
                  color: theme.color.text,
                  fontSize: 14,
                  fontWeight: 600,
                  border: `1px solid ${theme.color.borderSoft}`,
                }}
              >
                Refuser
              </button>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ModeRow: React.FC<{
  icon: string;
  label: string;
  desc: string;
  color: string;
  active: boolean;
}> = ({ icon, label, desc, color, active }) => {
  const frame = useCurrentFrame();
  const pulse = active ? 0.7 + (Math.sin(frame / 6) + 1) * 0.15 : 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: 16,
        background: "#ffffff",
        borderRadius: 16,
        border: `2px solid ${active ? color : theme.color.borderSoft}`,
        boxShadow: active ? `0 0 0 ${2 + pulse * 2}px ${color}22, 0 12px 32px ${color}22` : "0 4px 14px rgba(0,0,0,0.03)",
        transition: "all 0.25s",
        transform: active ? "scale(1.02)" : "scale(1)",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          boxShadow: `0 8px 20px ${color}55`,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: theme.color.text }}>{label}</div>
        <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
      </div>
      {active && (
        <div
          style={{
            padding: "3px 10px",
            borderRadius: 999,
            background: color + "18",
            color,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          ACTIF
        </div>
      )}
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string; important?: boolean }> = ({ label, value, important }) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "8px 12px",
      background: important ? "#fff7ed" : "#f8fafc",
      borderRadius: 8,
      fontSize: 12,
    }}
  >
    <span style={{ color: theme.color.textMuted, fontWeight: 600 }}>{label}</span>
    <span
      style={{
        color: important ? "#c2410c" : theme.color.text,
        fontWeight: important ? 700 : 600,
        fontFamily: label === "Action" ? "'SF Mono', Menlo, monospace" : "inherit",
      }}
    >
      {value}
    </span>
  </div>
);

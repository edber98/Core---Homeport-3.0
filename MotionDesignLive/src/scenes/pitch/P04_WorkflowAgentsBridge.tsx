import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../../theme";
import { AnimatedBg } from "../../components/AnimatedBg";
import { LucideIcon, IconName } from "../../components/AgentIcon";
import { easeOutExpo, easeInExpo } from "../../utils/easing";

// Explain how Workflows and Agents relate in Kinn:
// 1. Workflows can embed "agent" nodes that call sub-agents
// 2. Agents can be invoked directly from a prompt (no workflow needed)
// 3. Agents can trigger workflow nodes to perform ad-hoc actions
// Shows a clean bidirectional diagram.

export const P04_WorkflowAgentsBridge: React.FC = () => {
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

  // Layout centers
  const wfX = 430;
  const agX = 1490;
  const centerY = 620;

  return (
    <AbsoluteFill style={{ opacity: inP * out }}>
      <AnimatedBg variant="light" intensity={0.7} />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [-22, 0])}px)`,
        }}
      >
        <div style={{ fontSize: 14, color: theme.color.brand, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
          Pont entre les deux mondes
        </div>
        <div style={{ fontSize: 50, fontWeight: 800, color: theme.color.text, marginTop: 10, letterSpacing: -1 }}>
          Workflows <span style={{ color: theme.color.brand }}>ET</span> Agents. Pas l'un sans l'autre.
        </div>
        <div
          style={{
            fontSize: 16,
            color: theme.color.textMuted,
            marginTop: 12,
            maxWidth: 1000,
            margin: "12px auto 0",
            lineHeight: 1.5,
          }}
        >
          Deux manières complémentaires de mettre l'IA au travail : l'une pour les tâches <strong style={{ color: theme.color.text }}>récurrentes</strong>,
          l'autre pour les demandes <strong style={{ color: theme.color.text }}>ponctuelles</strong>. Et les deux se parlent.
        </div>
      </div>

      {/* Big arrows between the two columns */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <defs>
          <filter id="p4-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Top arrow : Workflow → Agent */}
        <path
          d={`M ${wfX + 180} ${centerY - 30} C ${960} ${centerY - 120}, ${960} ${centerY - 120}, ${agX - 180} ${centerY - 30}`}
          fill="none"
          stroke={theme.color.brand}
          strokeWidth={3}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - interpolate(frame, [80, 130], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutExpo })}
        />
        {/* Bottom arrow : Agent → Workflow */}
        <path
          d={`M ${agX - 180} ${centerY + 30} C ${960} ${centerY + 120}, ${960} ${centerY + 120}, ${wfX + 180} ${centerY + 30}`}
          fill="none"
          stroke="#7c3aed"
          strokeWidth={3}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - interpolate(frame, [140, 190], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOutExpo })}
        />

        {/* Flowing particles top arrow */}
        {frame > 140 &&
          Array.from({ length: 2 }).map((_, k) => {
            const cycle = 80;
            const phase = ((frame - 140 + k * 40) % cycle) / cycle;
            // Bezier approx
            const t = phase;
            const p1x = wfX + 180;
            const p1y = centerY - 30;
            const cx1 = 960;
            const cy1 = centerY - 120;
            const p2x = agX - 180;
            const p2y = centerY - 30;
            const bx = (1 - t) ** 3 * p1x + 3 * (1 - t) ** 2 * t * cx1 + 3 * (1 - t) * t * t * cx1 + t ** 3 * p2x;
            const by = (1 - t) ** 3 * p1y + 3 * (1 - t) ** 2 * t * cy1 + 3 * (1 - t) * t * t * cy1 + t ** 3 * p2y;
            return (
              <circle
                key={`top-${k}`}
                cx={bx}
                cy={by}
                r={5}
                fill={theme.color.brand}
                filter="url(#p4-glow)"
              />
            );
          })}
        {frame > 200 &&
          Array.from({ length: 2 }).map((_, k) => {
            const cycle = 80;
            const phase = ((frame - 200 + k * 40) % cycle) / cycle;
            const t = phase;
            const p1x = agX - 180;
            const p1y = centerY + 30;
            const cx1 = 960;
            const cy1 = centerY + 120;
            const p2x = wfX + 180;
            const p2y = centerY + 30;
            const bx = (1 - t) ** 3 * p1x + 3 * (1 - t) ** 2 * t * cx1 + 3 * (1 - t) * t * t * cx1 + t ** 3 * p2x;
            const by = (1 - t) ** 3 * p1y + 3 * (1 - t) ** 2 * t * cy1 + 3 * (1 - t) * t * t * cy1 + t ** 3 * p2y;
            return (
              <circle
                key={`bot-${k}`}
                cx={bx}
                cy={by}
                r={5}
                fill="#7c3aed"
                filter="url(#p4-glow)"
              />
            );
          })}
      </svg>

      {/* Bidirectional labels on the arrows */}
      <div
        style={{
          position: "absolute",
          top: centerY - 170,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: interpolate(frame, [130, 170], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 12px",
            borderRadius: 999,
            background: "#fff",
            color: theme.color.brand,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.4,
            boxShadow: "0 6px 16px rgba(230,25,130,0.18)",
            border: `1px solid ${theme.color.brand}33`,
          }}
        >
          <LucideIcon name="arrowRight" size={12} color={theme.color.brand} strokeWidth={2.5} />
          Un workflow peut appeler des agents
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: centerY + 130,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: interpolate(frame, [190, 230], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 12px",
            borderRadius: 999,
            background: "#fff",
            color: "#7c3aed",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.4,
            boxShadow: "0 6px 16px rgba(124,58,237,0.18)",
            border: "1px solid #7c3aed33",
          }}
        >
          <LucideIcon name="arrowRight" size={12} color="#7c3aed" strokeWidth={2.5} />
          Un agent peut exécuter des nœuds de workflow
        </div>
      </div>

      {/* Left column : Workflow */}
      <SideCard
        x={wfX}
        y={centerY}
        title="Workflow"
        subtitle="Automatisations récurrentes, déclenchées par événement ou planning"
        primaryColor={theme.color.brand}
        icon="layers"
        startAt={20}
        bullets={[
          { icon: "clock", label: "Tâches répétitives" },
          { icon: "mail", label: "Déclenchement par trigger" },
          { icon: "bot", label: "Peut embarquer des nœuds-agents" },
          { icon: "save", label: "Versionné, déployé, audité" },
        ]}
      />

      {/* Right column : Agents */}
      <SideCard
        x={agX}
        y={centerY}
        title="Agents IA"
        subtitle="Demandes ponctuelles, en langage naturel, via prompt"
        primaryColor="#7c3aed"
        icon="bot"
        startAt={60}
        bullets={[
          { icon: "sparkles", label: "Demande en langage naturel" },
          { icon: "isaac", label: "Sous-agents spécialisés" },
          { icon: "zap", label: "Peut déclencher n'importe quel nœud" },
          { icon: "clock", label: "Pas de workflow à créer pour tester" },
        ]}
      />

      {/* Bottom reminder */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 15,
          color: theme.color.textMuted,
          opacity: interpolate(frame, [260, 300], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <strong style={{ color: theme.color.text }}>Récurrent</strong> → workflow.{" "}
        <strong style={{ color: theme.color.text }}>Ponctuel</strong> → agent.{" "}
        <span style={{ color: theme.color.brand }}>Les deux partagent les mêmes briques.</span>
      </div>
    </AbsoluteFill>
  );
};

const SideCard: React.FC<{
  x: number;
  y: number;
  title: string;
  subtitle: string;
  primaryColor: string;
  icon: IconName;
  startAt: number;
  bullets: { icon: IconName; label: string }[];
}> = ({ x, y, title, subtitle, primaryColor, icon, startAt, bullets }) => {
  const frame = useCurrentFrame();
  const sp = spring({ frame: frame - startAt, fps: 30, config: { damping: 14, stiffness: 120 } });
  const opacity = interpolate(sp, [0, 1], [0, 1]);
  const scale = interpolate(sp, [0, 1], [0.85, 1]);

  return (
    <div
      style={{
        position: "absolute",
        left: x - 260,
        top: y - 180,
        width: 520,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: "center",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 22,
          border: `2px solid ${primaryColor}33`,
          boxShadow: `0 28px 64px ${primaryColor}26, 0 4px 14px rgba(0,0,0,0.04)`,
          padding: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)`,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 12px 28px ${primaryColor}55`,
            }}
          >
            <LucideIcon name={icon} size={28} color="#fff" strokeWidth={2} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: theme.color.text, letterSpacing: -0.5 }}>
              {title}
            </div>
            <div style={{ fontSize: 12, color: theme.color.textMuted, marginTop: 4, lineHeight: 1.4 }}>
              {subtitle}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {bullets.map((b, i) => {
            const at = startAt + 30 + i * 18;
            const bulletSp = interpolate(frame, [at, at + 15], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "9px 12px",
                  background: primaryColor + "0d",
                  borderRadius: 10,
                  border: `1px solid ${primaryColor}22`,
                  opacity: bulletSp,
                  transform: `translateY(${(1 - bulletSp) * 6}px)`,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    minWidth: 28,
                    borderRadius: 8,
                    background: primaryColor,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <LucideIcon name={b.icon as IconName} size={13} color="#fff" strokeWidth={2.2} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.color.text }}>
                  {b.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

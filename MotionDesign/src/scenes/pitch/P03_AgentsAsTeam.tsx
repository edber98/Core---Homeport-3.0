import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme, agents } from "../../theme";
import { AnimatedBg } from "../../components/AnimatedBg";
import { LucideIcon, IconName } from "../../components/AgentIcon";
import { easeOutExpo, easeInExpo } from "../../utils/easing";

// Metaphor: your AI agents are like human specialists in a team.
// Clean 3-level hierarchy centered on the screen.
export const P03_AgentsAsTeam: React.FC = () => {
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

  // 3 highlighted sub-agents
  const subAgents = [
    { agent: agents.find(a => a.id === "tim")!, job: "Chef de projet recherche" },
    { agent: agents.find(a => a.id === "ada")!, job: "Analyste de données" },
    { agent: agents.find(a => a.id === "donald")!, job: "Rédacteur senior" },
  ];

  const t = frame / 30;

  // Centered geometry (viewport 1920 × 1080)
  // Title ends around y ≈ 250 — leave 120px of breathing room before Denis.
  const viewCenterX = 960;
  const denisY = 430; // was 330 — pushed down so Denis doesn't overlap the subtitle
  const subY = 680;
  const subSubY = 900;

  const subSpread = 430; // distance between sub-agent centers
  const subSubSpread = 90; // distance between sub-sub-agents

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
          Solution 2 · Agents IA
        </div>
        <div style={{ fontSize: 52, fontWeight: 800, color: theme.color.text, marginTop: 10, letterSpacing: -1 }}>
          <span style={{ color: theme.color.brand }}>Augmentez</span> vos équipes.
        </div>
        <div
          style={{
            fontSize: 17,
            color: theme.color.textMuted,
            marginTop: 12,
            maxWidth: 900,
            margin: "12px auto 0",
          }}
        >
          Chaque agent est un spécialiste. Ils collaborent, se délèguent des tâches,
          et peuvent <strong style={{ color: theme.color.text }}>mobiliser d'autres agents</strong> à l'infini.
        </div>
      </div>

      {/* Graph */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {/* Lines Denis → 3 sub-agents */}
        {subAgents.map((s, i) => {
          const targetX = viewCenterX + (i - 1) * subSpread;
          const progress = interpolate(frame, [60 + i * 10, 100 + i * 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: easeOutExpo,
          });
          return (
            <line
              key={`main-${i}`}
              x1={viewCenterX}
              y1={denisY + 55}
              x2={targetX}
              y2={subY - 45}
              stroke={s.agent.color}
              strokeWidth={2.5}
              opacity={0.5}
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - progress}
            />
          );
        })}

        {/* Lines sub → sub-sub (3 each, equally spaced) */}
        {subAgents.map((s, i) => {
          const originX = viewCenterX + (i - 1) * subSpread;
          return [0, 1, 2].map((k) => {
            const targetX = originX + (k - 1) * subSubSpread;
            const progress = interpolate(frame, [130 + i * 12 + k * 6, 170 + i * 12 + k * 6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: easeOutExpo,
            });
            return (
              <line
                key={`sub-${i}-${k}`}
                x1={originX}
                y1={subY + 36}
                x2={targetX}
                y2={subSubY - 22}
                stroke={s.agent.color}
                strokeWidth={1.5}
                opacity={0.32}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - progress}
              />
            );
          });
        })}
      </svg>

      {/* Denis (top) */}
      <AgentBubble
        agent={agents.find(a => a.id === "denis")!}
        job="Chef d'orchestre"
        size={120}
        top={denisY}
        left={viewCenterX}
        frame={frame}
        startAt={10}
        t={t}
        seed={0}
      />

      {/* 3 sub-agents */}
      {subAgents.map((s, i) => (
        <AgentBubble
          key={s.agent.id}
          agent={s.agent}
          job={s.job}
          size={84}
          top={subY}
          left={viewCenterX + (i - 1) * subSpread}
          frame={frame}
          startAt={80 + i * 10}
          t={t}
          seed={i + 1}
        />
      ))}

      {/* 3 sub-sub-agents per sub-agent */}
      {subAgents.map((s, i) =>
        [0, 1, 2].map((k) => (
          <AgentBubble
            key={`${s.agent.id}-${k}`}
            agent={s.agent}
            job=""
            size={42}
            top={subSubY}
            left={viewCenterX + (i - 1) * subSpread + (k - 1) * subSubSpread}
            frame={frame}
            startAt={150 + i * 12 + k * 6}
            t={t}
            seed={i * 10 + k}
            faded
          />
        ))
      )}

      {/* Bottom caption */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 15,
          color: theme.color.textMuted,
          opacity: interpolate(frame, [220, 260], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <strong style={{ color: theme.color.text }}>Profondeur illimitée</strong> — chaque spécialiste peut
        mobiliser ses propres experts.
      </div>
    </AbsoluteFill>
  );
};

const AgentBubble: React.FC<{
  agent: typeof agents[number];
  job: string;
  size: number;
  top: number;
  left: number;
  frame: number;
  startAt: number;
  t: number;
  seed: number;
  faded?: boolean;
}> = ({ agent, job, size, top, left, frame, startAt, t, seed, faded }) => {
  const sp = spring({ frame: frame - startAt, fps: 30, config: { damping: 12, stiffness: 130 } });
  const opacity = interpolate(sp, [0, 1], [0, 1]) * (faded ? 0.75 : 1);
  const scale = interpolate(sp, [0, 1], [0.5, 1]);
  const float = Math.sin(t * 1.1 + seed) * 3;

  return (
    <div
      style={{
        position: "absolute",
        top,
        left,
        transform: `translate(-50%, -50%) translateY(${float}px) scale(${scale})`,
        opacity,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          background: `linear-gradient(135deg, ${agent.color}, ${agent.color}cc)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: `0 ${size * 0.15}px ${size * 0.3}px ${agent.color}55, inset 0 1px 0 rgba(255,255,255,0.3)`,
          margin: "0 auto",
        }}
      >
        <LucideIcon name={agent.iconName as IconName} size={Math.round(size * 0.45)} color="#fff" strokeWidth={2} />
      </div>
      {job && (
        <>
          <div style={{ fontSize: Math.max(12, size * 0.15), fontWeight: 700, color: theme.color.text, marginTop: 10 }}>
            {agent.name}
          </div>
          <div style={{ fontSize: Math.max(10, size * 0.11), color: theme.color.textMuted, marginTop: 2 }}>{job}</div>
        </>
      )}
    </div>
  );
};

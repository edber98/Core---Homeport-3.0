import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { NodeKind } from "../components/FlowNode";
import { AnimatedBg } from "../components/AnimatedBg";
import { Icon } from "../components/Icon";
import { easeOutExpo, easeInExpo, easeOutBack, easeInOutCubic } from "../utils/easing";

type NodeDef = {
  id: string;
  kind: NodeKind;
  title: string;
  subtitle?: string;
  icon?: string;
  accent?: string;
  x: number;
  y: number;
  appearAt: number;
};

const NODE_W = 230;
const NODE_H = 62;
const CANVAS_W = 1800;
const CANVAS_H = 620;

// Nodes centered in the 1800px canvas. Graph span 1350px → start at x=225.
// 5 cols with 280 spacing: 225, 505, 785, 1065, 1345 (last right edge 1575)
const nodes: NodeDef[] = [
  { id: "start", kind: "start", title: "Déclencheur · 9h00 Cron", icon: "▶", x: 165, y: 270, appearAt: 6 },
  { id: "list", kind: "function", title: "Odoo · Lister factures", subtitle: "status = overdue", icon: "O", accent: "#714b67", x: 435, y: 270, appearAt: 14 },
  { id: "filter", kind: "condition", title: "Filtrer · > 15 jours", icon: "◇", x: 705, y: 270, appearAt: 22 },
  { id: "loop", kind: "loop", title: "Boucle · Pour chaque facture", icon: "⟳", x: 975, y: 270, appearAt: 30 },
  { id: "agent", kind: "agent", title: "Donald · Rédiger relance", subtitle: "ton = formel", icon: "✒", accent: "#722ed1", x: 1245, y: 160, appearAt: 38 },
  { id: "slack", kind: "function", title: "Slack · Envoyer DM", subtitle: "à comptable", icon: "#", accent: "#4a154b", x: 1245, y: 380, appearAt: 46 },
];

const edges = [
  { from: "start", to: "list", delay: 10 },
  { from: "list", to: "filter", delay: 18 },
  { from: "filter", to: "loop", delay: 26 },
  { from: "loop", to: "agent", delay: 34 },
  { from: "loop", to: "slack", delay: 42 },
];

export const S06_FlowBuilder: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const inProgress = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp", easing: easeOutExpo });
  const outProgress = interpolate(frame, [durationInFrames - 22, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInExpo });
  const outOpacity = 1 - outProgress;

  const titleSpring = spring({ frame: frame - 2, fps, config: { damping: 16, stiffness: 130 } });

  // Camera move: subtle breathing, not aggressive
  const camZoom = interpolate(frame, [0, 50, 120, durationInFrames], [1.03, 1, 0.98, 0.96], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInOutCubic,
  });
  const camTilt = interpolate(frame, [0, 80], [3, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const camRotY = Math.sin(frame / 80) * 1.2;

  // Grid drift
  const gridShiftX = (frame / 2) % 28;
  const gridShiftY = (frame / 3) % 28;

  // Selected node (rotating spotlight after nodes complete) — snappier rotation
  const selectedTimeline: { id: string; at: number }[] = [
    { id: "list", at: 70 },
    { id: "filter", at: 95 },
    { id: "loop", at: 120 },
    { id: "agent", at: 150 },
    { id: "slack", at: 185 },
    { id: "agent", at: 230 },
  ];
  const selectedId = [...selectedTimeline].reverse().find(s => frame >= s.at)?.id ?? null;

  return (
    <AbsoluteFill style={{ opacity: inProgress * outOpacity, overflow: "hidden" }}>
      <AnimatedBg variant="light" intensity={0.9} showGrid={false} />

      {/* Animated grid layer */}
      <div
        style={{
          position: "absolute",
          inset: -40,
          backgroundImage: `radial-gradient(circle, ${theme.color.grid} 1.3px, transparent 1.3px)`,
          backgroundSize: "28px 28px",
          backgroundPosition: `${gridShiftX}px ${gridShiftY}px`,
          opacity: 0.55,
        }}
      />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 48,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [-22, 0])}px)`,
          zIndex: 20,
        }}
      >
        <div style={{ fontSize: 13, color: theme.color.brand, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
          Constructeur de workflow
        </div>
        <div style={{ fontSize: 46, fontWeight: 800, color: theme.color.text, marginTop: 8, letterSpacing: -1 }}>
          L'agent code votre automatisation.
        </div>
      </div>

      {/* Canvas with 3D perspective */}
      <div
        style={{
          position: "absolute",
          top: 180,
          left: 0,
          right: 0,
          bottom: 0,
          perspective: 2000,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            width: CANVAS_W,
            height: CANVAS_H,
            marginLeft: -CANVAS_W / 2,
            transformStyle: "preserve-3d",
            transform: `rotateX(${camTilt}deg) rotateY(${camRotY}deg) scale(${camZoom})`,
            transformOrigin: "center 40%",
          }}
        >
          {/* Edges */}
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
              <filter id="edge-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {edges.map((e) => {
              const from = nodes.find(n => n.id === e.from)!;
              const to = nodes.find(n => n.id === e.to)!;
              const progress = interpolate(frame, [e.delay, e.delay + 18], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: easeOutExpo,
              });
              const x1 = from.x + NODE_W;
              const y1 = from.y + NODE_H / 2;
              const x2 = to.x;
              const y2 = to.y + NODE_H / 2;
              const mid = (x1 + x2) / 2;
              const path = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
              return (
                <path
                  key={`${e.from}-${e.to}`}
                  d={path}
                  fill="none"
                  stroke={theme.color.nodeConnection}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - progress}
                />
              );
            })}

            {/* Travelling particles on edges */}
            {edges.map((e, i) => {
              const from = nodes.find(n => n.id === e.from)!;
              const to = nodes.find(n => n.id === e.to)!;
              const x1 = from.x + NODE_W;
              const y1 = from.y + NODE_H / 2;
              const x2 = to.x;
              const y2 = to.y + NODE_H / 2;
              const edgeReady = frame > e.delay + 20;
              if (!edgeReady) return null;
              // Multiple particles per edge with phase
              return Array.from({ length: 2 }).map((_, k) => {
                const cycle = 90; // frames per trip
                const offset = (i * 18 + k * 45) % cycle;
                const p = ((frame - e.delay - 20 + offset) % cycle) / cycle;
                const mid = (x1 + x2) / 2;
                const bx = (1 - p) * (1 - p) * (1 - p) * x1 + 3 * (1 - p) * (1 - p) * p * mid + 3 * (1 - p) * p * p * mid + p * p * p * x2;
                const by = (1 - p) * (1 - p) * (1 - p) * y1 + 3 * (1 - p) * (1 - p) * p * y1 + 3 * (1 - p) * p * p * y2 + p * p * p * y2;
                return (
                  <circle
                    key={`${i}-${k}`}
                    cx={bx}
                    cy={by}
                    r={3.5}
                    fill={theme.color.brand}
                    filter="url(#edge-glow)"
                    opacity={0.9}
                  />
                );
              });
            })}
          </svg>

          {/* Nodes (3D flip-in) */}
          {nodes.map((n) => {
            const appear = spring({ frame: frame - n.appearAt, fps, config: { damping: 11, stiffness: 130, mass: 0.8 } });
            const opacity = interpolate(appear, [0, 1], [0, 1]);
            const scale = interpolate(appear, [0, 1], [0.6, 1]);
            const rotY = interpolate(appear, [0, 1], [-55, 0]);
            const rotX = interpolate(appear, [0, 1], [25, 0]);
            const tz = interpolate(appear, [0, 1], [-100, 0]);
            const isSelected = selectedId === n.id;
            return (
              <AnimatedFlowNode
                key={n.id}
                node={n}
                opacity={opacity}
                rotY={rotY}
                rotX={rotX}
                tz={tz}
                scale={scale}
                selected={isSelected}
              />
            );
          })}
        </div>
      </div>

      {/* Inspector slides in from right */}
      <InspectorPanel frame={frame} />

      {/* Typing status bottom */}
      <TypingStatus frame={frame} />
    </AbsoluteFill>
  );
};

const AnimatedFlowNode: React.FC<{
  node: NodeDef;
  opacity: number;
  rotY: number;
  rotX: number;
  tz: number;
  scale: number;
  selected: boolean;
}> = ({ node, opacity, rotY, rotX, tz, scale, selected }) => {
  const frame = useCurrentFrame();
  const color =
    node.accent ??
    ({
      start: theme.color.success,
      function: theme.color.brand,
      condition: theme.color.warning,
      loop: theme.color.info,
      agent: "#722ed1",
      end: theme.color.textMuted,
    }[node.kind]);

  // Selected glow pulse
  const pulse = selected ? 0.7 + (Math.sin(frame / 5) + 1) * 0.15 : 0;
  // Subtle floating
  const float = Math.sin(frame / 18 + node.x * 0.01) * 2;

  return (
    <div
      style={{
        position: "absolute",
        left: node.x,
        top: node.y + float,
        width: NODE_W,
        opacity,
        transform: `translateZ(${tz}px) rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${scale})`,
        transformStyle: "preserve-3d",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          border: `1px solid ${selected ? theme.color.brand : theme.color.grid}`,
          borderRadius: 14,
          padding: 14,
          boxShadow: selected
            ? `0 0 0 ${2 + pulse * 2}px ${theme.color.brand}${Math.round(30 + pulse * 40).toString(16)}, 0 20px 40px rgba(230,25,130,0.25)`
            : "0 1px 4px rgba(0,0,0,0.04), 0 8px 20px rgba(0,0,0,0.04)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          transition: "box-shadow 0.2s",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${color}22, ${color}14)`,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {node.icon ?? "●"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: theme.color.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              letterSpacing: -0.1,
            }}
          >
            {node.title}
          </div>
          {node.subtitle && (
            <div
              style={{
                fontSize: 11,
                color: theme.color.textMuted,
                marginTop: 2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {node.subtitle}
            </div>
          )}
        </div>
      </div>
      {/* Handles */}
      {node.kind !== "start" && <Handle side="left" />}
      <Handle side="right" />
    </div>
  );
};

const Handle: React.FC<{ side: "left" | "right" }> = ({ side }) => (
  <div
    style={{
      position: "absolute",
      [side]: -5,
      top: "50%",
      width: 10,
      height: 10,
      borderRadius: 5,
      background: "#ffffff",
      border: `2px solid ${theme.color.nodeConnection}`,
      transform: "translateY(-50%)",
    }}
  />
);

const InspectorPanel: React.FC<{ frame: number }> = ({ frame }) => {
  const enterSpring = spring({ frame: frame - 145, fps: 30, config: { damping: 16, stiffness: 120 } });
  const opacity = interpolate(enterSpring, [0, 1], [0, 1]);
  const translateX = interpolate(enterSpring, [0, 1], [60, 0]);
  const rotY = interpolate(enterSpring, [0, 1], [-12, 0]);

  return (
    <div
      style={{
        position: "absolute",
        right: 40,
        top: 180,
        width: 320,
        opacity,
        transform: `translateX(${translateX}px) rotateY(${rotY}deg)`,
        transformOrigin: "right center",
        perspective: 1200,
        zIndex: 30,
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,248,248,0.95))",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderRadius: 20,
          border: "1px solid rgba(0,0,0,0.06)",
          padding: 20,
          boxShadow: "0 24px 60px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: theme.color.textSubtle,
            fontWeight: 700,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Inspector
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "linear-gradient(135deg, #722ed1, #531dab)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              boxShadow: "0 8px 20px rgba(114,46,209,0.4)",
            }}
          >
            ✒
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.color.text }}>Donald</div>
            <div style={{ fontSize: 11, color: theme.color.textMuted }}>Agent rédacteur</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Template" value="relance_fr" />
          <Field label="Ton" value="formel" />
          <Field label="Variables" value="{{loop.invoice}}" mono />
          <Field label="Mémoire" value="save_project_memory" mono />
        </div>
        <div
          style={{
            marginTop: 14,
            padding: 10,
            borderRadius: 10,
            background: theme.color.brandLight,
            color: theme.color.brand,
            fontSize: 12,
            fontWeight: 700,
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Icon name="check" size={12} color={theme.color.brand} />
          Validé par l'agent
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <div
      style={{
        fontSize: 9,
        color: theme.color.textSubtle,
        fontWeight: 700,
        letterSpacing: 0.8,
        textTransform: "uppercase",
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    <div
      style={{
        padding: "8px 10px",
        background: "#ffffff",
        border: `1px solid ${theme.color.borderSoft}`,
        borderRadius: 8,
        fontSize: 12,
        color: theme.color.text,
        fontFamily: mono ? "'SF Mono', Menlo, monospace" : "inherit",
      }}
    >
      {value}
    </div>
  </div>
);

const TypingStatus: React.FC<{ frame: number }> = ({ frame }) => {
  const show = interpolate(frame, [6, 200, 220], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (show < 0.02) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 42,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "10px 20px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(0,0,0,0.04)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        fontSize: 13,
        fontWeight: 500,
        color: theme.color.text,
        display: "flex",
        alignItems: "center",
        gap: 12,
        opacity: show,
        zIndex: 30,
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 999,
          background: `linear-gradient(135deg, ${theme.color.brand}, #7c3aed)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
        }}
      >
        <Icon name="sparkle" size={11} color="#fff" />
      </div>
      Denis construit le workflow
      <span style={{ display: "inline-flex", gap: 3, marginLeft: 4 }}>
        <Pulse delay={0} />
        <Pulse delay={1} />
        <Pulse delay={2} />
      </span>
    </div>
  );
};

const Pulse: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const phase = ((frame + delay * 6) % 24) / 24;
  const op = 0.3 + Math.sin(phase * Math.PI * 2) * 0.35 + 0.35;
  return (
    <span
      style={{
        display: "inline-block",
        width: 5,
        height: 5,
        borderRadius: 3,
        background: theme.color.brand,
        opacity: Math.min(1, Math.max(0.2, op)),
      }}
    />
  );
};

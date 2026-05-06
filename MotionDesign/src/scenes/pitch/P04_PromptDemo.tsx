import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { KinnAppScene } from "../../components/KinnAppScene";
import { theme } from "../../theme";
import { easeOutExpo, easeInExpo } from "../../utils/easing";

// The big live demo: type a prompt in the real interface, camera zooms around,
// sub-agents work, xlsx is generated. ~90s (2700 frames).
export const P04_PromptDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const inP = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: "clamp", easing: easeOutExpo });
  const outP = interpolate(frame, [durationInFrames - 24, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInExpo });

  return (
    <AbsoluteFill style={{ opacity: inP * (1 - outP) }}>
      <KinnAppScene duration={durationInFrames} />

      {/* Optional label overlay at top showing what's happening */}
      <DemoLabel frame={frame} />
    </AbsoluteFill>
  );
};

const phases: { from: number; to: number; label: string }[] = [
  { from: 0, to: 140, label: "Étape 1 · On ouvre l'Assistant IA" },
  { from: 140, to: 600, label: "Étape 2 · On décrit le besoin en langage naturel" },
  { from: 600, to: 720, label: "Étape 3 · Kinn délègue à plusieurs agents spécialisés" },
  { from: 720, to: 1380, label: "Étape 4 · Chaque agent produit un canvas interactif" },
  { from: 1380, to: 1700, label: "Étape 5 · Donald assemble le livrable .xlsx" },
  { from: 1700, to: 9999, label: "Étape 6 · Livrable final avec charte c4rbon.group" },
];

const DemoLabel: React.FC<{ frame: number }> = ({ frame }) => {
  const current = phases.find((p) => frame >= p.from && frame < p.to) ?? phases[phases.length - 1];
  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "8px 18px",
        borderRadius: 999,
        background: "rgba(15,23,42,0.88)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 0.2,
        boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          background: theme.color.brand,
          boxShadow: `0 0 10px ${theme.color.brand}`,
        }}
      />
      {current.label}
    </div>
  );
};

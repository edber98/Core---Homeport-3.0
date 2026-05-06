import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../../theme";
import { AnimatedBg } from "../../components/AnimatedBg";
import { LucideIcon, IconName } from "../../components/AgentIcon";
import { easeOutExpo, easeInExpo } from "../../utils/easing";

// Single circular loop that reads step by step: input → anonymize → external LLM →
// de-anonymize → output. Side panel on the right describes current step and actions.

type Step = {
  id: string;
  title: string;
  subtitle: string;
  icon: IconName;
  color: string;
  angleDeg: number; // position on ring
  startAt: number;
  description: string;
  actions: string[];
};

const STEPS: Step[] = [
  {
    id: "input",
    title: "Vos données",
    subtitle: "sensibles, locales",
    icon: "lock",
    color: "#10b981",
    angleDeg: -90,
    startAt: 20,
    description: "Données d'entrée confidentielles issues de votre SI.",
    actions: [
      "Chargées depuis votre ERP, CRM, Drive",
      "Strictement hébergées chez vous",
      "Marquées comme sensibles",
    ],
  },
  {
    id: "anonymize",
    title: "LLM local · Anonymise",
    subtitle: "tourne sur votre infra",
    icon: "shield",
    color: "#3b82f6",
    angleDeg: -18,
    startAt: 80,
    description: "Un petit modèle local détecte et remplace les informations identifiantes par des IDs anonymes.",
    actions: [
      "Détection PII (nom, email, IBAN, CA…)",
      "Remplacement par tokens PER_xxxx, EML_xxxx",
      "Table de correspondance conservée localement",
    ],
  },
  {
    id: "reason",
    title: "LLM puissant · Raisonne",
    subtitle: "Claude · GPT · Gemini",
    icon: "zap",
    color: "#7c3aed",
    angleDeg: 54,
    startAt: 150,
    description: "Le modèle externe raisonne uniquement sur des identifiants anonymes.",
    actions: [
      "Envoi vers l'API externe",
      "Traitement NLP / génération",
      "Aucune donnée réelle exposée",
    ],
  },
  {
    id: "deanon",
    title: "LLM local · Désanonymise",
    subtitle: "remet les vraies valeurs",
    icon: "key",
    color: "#3b82f6",
    angleDeg: 126,
    startAt: 220,
    description: "Retour local : la table de correspondance permet de réinjecter vos vraies valeurs.",
    actions: [
      "Récupération de la réponse tokenisée",
      "Lookup sur la table de correspondance",
      "Remplacement par vos données réelles",
    ],
  },
  {
    id: "output",
    title: "Réponse finale",
    subtitle: "avec vos vraies données",
    icon: "check",
    color: "#10b981",
    angleDeg: 198,
    startAt: 290,
    description: "Vous recevez un livrable complet avec vos vraies valeurs, sans qu'elles aient quitté votre périmètre.",
    actions: [
      "Livrable final assemblé",
      "Audit trail conservé",
      "Conformité RGPD respectée",
    ],
  },
];

export const P07_Confidentiality: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const inP = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp", easing: easeOutExpo });
  const outP = interpolate(frame, [durationInFrames - 20, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInExpo,
  });
  const out = 1 - outP;

  const titleSpring = spring({ frame: frame - 4, fps, config: { damping: 16, stiffness: 130 } });

  // Ring geometry — single ring centered in the left half of the screen.
  // Right panel starts at y=40 inside the container (≈260 in viewport) and
  // runs ~580px tall, so its visual center is at local y ≈ 330.
  // We align the circle on the SAME horizontal axis so both blocks are
  // vertically centered against each other.
  const centerX = 660;
  const centerY = 340;
  const radius = 240;

  // Active step index (the one currently being read by the loop)
  const highlightFloor = STEPS.findIndex((s, i) => {
    const next = STEPS[i + 1];
    return frame >= s.startAt && (!next || frame < next.startAt);
  });
  const activeIdx = Math.max(0, highlightFloor === -1 ? STEPS.length - 1 : highlightFloor);
  const activeStep = STEPS[activeIdx];

  return (
    <AbsoluteFill style={{ opacity: inP * out }}>
      <AnimatedBg variant="light" intensity={0.6} />

      {/* R&D badge */}
      <div
        style={{
          position: "absolute",
          top: 30,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          opacity: titleSpring,
        }}
      >
        <div
          style={{
            padding: "8px 18px",
            borderRadius: 999,
            background: "linear-gradient(90deg, #f59e0b, #e61982)",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.8,
            textTransform: "uppercase",
            boxShadow: "0 10px 28px rgba(230,25,130,0.35)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 4,
              background: "#fde68a",
              boxShadow: "0 0 10px #fde68a",
            }}
          />
          En R&D · pas encore actif en production
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 90,
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
          Laboratoire · Confidentialité
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: theme.color.text, marginTop: 10, letterSpacing: -1 }}>
          Puissant <span style={{ color: theme.color.brand }}>ET</span> confidentiel.
        </div>
      </div>

      {/* Main area */}
      <div style={{ position: "absolute", top: 220, left: 0, right: 0, bottom: 0 }}>
        {/* Single ring SVG — one continuous circle that fills progressively */}
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
            <filter id="p7-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="p7-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="35%" stopColor="#3b82f6" />
              <stop offset="65%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>

          {/* ONE single circle — starts as pale track, fills up with gradient progressively */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={2}
          />
          {/* Progressive fill — uses stroke-dashoffset on the same circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="url(#p7-ring-grad)"
            strokeWidth={3.5}
            strokeLinecap="round"
            transform={`rotate(-90 ${centerX} ${centerY})`}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - interpolate(frame, [30, 330], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: easeOutExpo,
            })}
          />

          {/* Flowing particle on ring */}
          {frame > 330 &&
            Array.from({ length: 3 }).map((_, k) => {
              const cycle = 180;
              const phase = (((frame - 330) / cycle + k / 3) % 1) * Math.PI * 2 - Math.PI / 2;
              const px = centerX + Math.cos(phase) * radius;
              const py = centerY + Math.sin(phase) * radius;
              return (
                <circle
                  key={`flow-${k}`}
                  cx={px}
                  cy={py}
                  r={6}
                  fill={theme.color.brand}
                  filter="url(#p7-glow)"
                />
              );
            })}
        </svg>

        {/* Center label — centered exactly on (centerX, centerY) */}
        <div
          style={{
            position: "absolute",
            left: centerX - 120,
            top: centerY - 70,
            width: 240,
            height: 140,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: interpolate(frame, [60, 110], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: theme.color.textSubtle,
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            Boucle fermée
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: theme.color.text,
              marginTop: 4,
              letterSpacing: -0.6,
            }}
          >
            RGPD ready
          </div>
          <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 6, lineHeight: 1.4 }}>
            aucune donnée sensible<br />ne quitte votre périmètre
          </div>
        </div>

        {/* Node chips on the ring */}
        {STEPS.map((s, i) => {
          const a = (s.angleDeg * Math.PI) / 180;
          const nx = centerX + Math.cos(a) * radius;
          const ny = centerY + Math.sin(a) * radius;
          const sp = spring({ frame: frame - s.startAt, fps, config: { damping: 14, stiffness: 120 } });
          const opacity = interpolate(sp, [0, 1], [0, 1]);
          const scale = interpolate(sp, [0, 1], [0.5, 1]);
          const isActive = activeIdx === i;
          const pulse = isActive ? 0.7 + (Math.sin(frame / 5) + 1) * 0.15 : 0;
          return (
            <div
              key={s.id}
              style={{
                position: "absolute",
                left: nx - 100,
                top: ny - 36,
                width: 200,
                opacity,
                transform: `scale(${scale * (isActive ? 1.04 : 1)})`,
                transition: "transform 0.25s",
              }}
            >
              <div
                style={{
                  background: "#fff",
                  borderRadius: 14,
                  border: `2px solid ${s.color}`,
                  boxShadow: isActive
                    ? `0 0 0 ${2 + pulse * 3}px ${s.color}33, 0 18px 40px ${s.color}44`
                    : `0 12px 28px ${s.color}22, 0 2px 6px rgba(0,0,0,0.04)`,
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    minWidth: 36,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${s.color}, ${s.color}cc)`,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 4px 12px ${s.color}55`,
                  }}
                >
                  <LucideIcon name={s.icon} size={18} color="#fff" strokeWidth={2.2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: theme.color.text, letterSpacing: -0.1, lineHeight: 1.2 }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 10, color: theme.color.textMuted, marginTop: 1 }}>
                    {s.subtitle}
                  </div>
                </div>
              </div>
              {/* Step number badge */}
              <div
                style={{
                  position: "absolute",
                  top: -8,
                  left: -10,
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  background: isActive ? s.color : "#ffffff",
                  color: isActive ? "#fff" : s.color,
                  border: `2px solid ${s.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 800,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
                }}
              >
                {i + 1}
              </div>
            </div>
          );
        })}

        {/* Right-side description panel */}
        <DescriptionPanel step={activeStep} activeIdx={activeIdx} frame={frame} />
      </div>
    </AbsoluteFill>
  );
};

const DescriptionPanel: React.FC<{ step: Step; activeIdx: number; frame: number }> = ({ step, activeIdx, frame }) => {
  const op = interpolate(frame, [40, 80], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        right: 80,
        top: 40,
        width: 560,
        opacity: op,
      }}
    >
      {/* Stepper dots */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i <= activeIdx ? s.color : "#e5e7eb",
              transition: "background 0.4s",
            }}
          />
        ))}
      </div>

      {/* Active step header */}
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          border: `2px solid ${step.color}33`,
          boxShadow: `0 32px 72px ${step.color}18, 0 4px 14px rgba(0,0,0,0.04)`,
          padding: 24,
          transition: "border 0.35s, box-shadow 0.35s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: step.color + "18",
              color: step.color,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Étape {activeIdx + 1} / {STEPS.length}
          </div>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${step.color}, ${step.color}cc)`,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 8px 20px ${step.color}55`,
              marginLeft: "auto",
            }}
          >
            <LucideIcon name={step.icon} size={22} color="#fff" strokeWidth={2} />
          </div>
        </div>

        <div style={{ fontSize: 26, fontWeight: 800, color: theme.color.text, letterSpacing: -0.6 }}>
          {step.title}
        </div>
        <div style={{ fontSize: 14, color: theme.color.textMuted, marginTop: 8, lineHeight: 1.55 }}>
          {step.description}
        </div>

        {/* Actions list */}
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          {step.actions.map((a, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                background: step.color + "0d",
                borderRadius: 10,
                fontSize: 13,
                color: theme.color.text,
                border: `1px solid ${step.color}26`,
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  minWidth: 20,
                  borderRadius: 999,
                  background: step.color,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LucideIcon name="check" size={12} color="#fff" strokeWidth={2.5} />
              </span>
              {a}
            </div>
          ))}
        </div>
      </div>

      {/* Transformation visualizer — shows data becoming anonymous IDs */}
      <TransformationVisualizer activeIdx={activeIdx} frame={frame} />
    </div>
  );
};

const TransformationVisualizer: React.FC<{ activeIdx: number; frame: number }> = ({ activeIdx, frame }) => {
  // 0 input, 1 anonymize, 2 reason, 3 deanon, 4 output
  const rows = [
    { label: "nom", real: "Martin Dupont", token: "PER_8a3f", color: "#22c55e" },
    { label: "email", real: "m.dupont@acme.fr", token: "EML_2b9c", color: "#0ea5e9" },
    { label: "CA", real: "124 500 €", token: "NUM_7d21", color: "#f59e0b" },
  ];

  // Animation progress: at step 1 (anonymize) animate from real → token
  // at step 3 (deanon) animate back from token → real
  const stepFrame = frame - STEPS[Math.max(1, activeIdx)].startAt;

  const realFade =
    activeIdx === 0 ? 1 :
    activeIdx === 1 ? interpolate(stepFrame, [0, 30], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) :
    activeIdx === 3 ? interpolate(stepFrame, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) :
    activeIdx === 4 ? 1 :
    0;

  const tokenFade =
    activeIdx === 0 ? 0 :
    activeIdx === 1 ? interpolate(stepFrame, [0, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) :
    activeIdx === 2 ? 1 :
    activeIdx === 3 ? interpolate(stepFrame, [0, 30], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) :
    0;

  const headerLabel =
    activeIdx === 0 ? "Données d'entrée" :
    activeIdx === 1 ? "Anonymisation en cours…" :
    activeIdx === 2 ? "Envoyé au LLM puissant" :
    activeIdx === 3 ? "Désanonymisation en cours…" :
    "Livrable final";

  const headerColor =
    activeIdx === 0 ? "#22c55e" :
    activeIdx === 1 || activeIdx === 3 ? "#3b82f6" :
    activeIdx === 2 ? "#7c3aed" :
    "#10b981";

  return (
    <div
      style={{
        marginTop: 14,
        padding: "14px 16px",
        background: "#0f172a",
        color: "#e2e8f0",
        borderRadius: 14,
        fontFamily: "'SF Mono', Menlo, monospace",
        fontSize: 12,
        lineHeight: 1.6,
        boxShadow: "0 16px 36px rgba(15,23,42,0.22)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div
        style={{
          fontSize: 9,
          color: headerColor,
          fontWeight: 700,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          marginBottom: 10,
          fontFamily: theme.font.family,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            background: headerColor,
            boxShadow: `0 0 10px ${headerColor}`,
          }}
        />
        {headerLabel}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((r) => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "#94a3b8", minWidth: 70 }}>{r.label}</span>
            <span style={{ color: "#64748b" }}>:</span>
            <div style={{ position: "relative", flex: 1, height: 18 }}>
              {/* Real value */}
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  color: r.color,
                  opacity: realFade,
                  transform: `translateY(${(1 - realFade) * -6}px)`,
                  transition: "opacity 0.2s, transform 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                "{r.real}"
              </span>
              {/* Token value */}
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  color: "#fbbf24",
                  opacity: tokenFade,
                  transform: `translateY(${(1 - tokenFade) * 6}px)`,
                  transition: "opacity 0.2s, transform 0.2s",
                  whiteSpace: "nowrap",
                }}
              >
                "{r.token}"
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Transformation arrow for anonymize/deanonymize */}
      {(activeIdx === 1 || activeIdx === 3) && (
        <div
          style={{
            marginTop: 10,
            padding: "6px 10px",
            background: activeIdx === 1 ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.15)",
            borderRadius: 8,
            fontFamily: theme.font.family,
            fontSize: 10,
            fontWeight: 600,
            color: "#60a5fa",
            display: "flex",
            alignItems: "center",
            gap: 8,
            letterSpacing: 0.3,
          }}
        >
          <LucideIcon
            name={activeIdx === 1 ? "shield" : "key"}
            size={11}
            color="#60a5fa"
            strokeWidth={2.2}
          />
          {activeIdx === 1
            ? "Chaque valeur sensible → remplacée par un identifiant anonyme"
            : "Chaque identifiant → remplacé par la vraie valeur d'origine"}
        </div>
      )}
    </div>
  );
};

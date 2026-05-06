import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../../theme";
import { AppShell } from "../../components/AppShell";
import { AnimatedCursor, CursorKeyframe } from "../../components/AnimatedCursor";
import { CameraViewport, CameraShot } from "../../components/CameraViewport";
import { Icon } from "../../components/Icon";
import { LucideIcon, IconName } from "../../components/AgentIcon";
import { ProviderIcon } from "../../components/ProviderIcon";
import { NodeKind } from "../../components/FlowNode";
import { easeOutExpo, easeInExpo } from "../../utils/easing";
import { TypingText, StreamingText } from "../../components/TypingAnimations";

// Scene shows Flow Builder + AI panel on the right. User writes a prompt,
// AI generates the workflow (VERTICAL, no branching), then execution runs
// through with a business card → Odoo contact notification.

const PROMPT = [
  "Crée un formulaire qui prend une image en argument.",
  "Analyse-la, extrait les informations de contact et ajoute-les",
  "automatiquement dans Odoo.",
].join(" ");

type WfNode = {
  id: string;
  kind: NodeKind;
  title: string;
  subtitle?: string;
  iconName: IconName;
  accent: string;
  appearAt: number;
};

// Vertical linear layout — one column, top-to-bottom, 5 nodes max for clarity.
const NODE_W = 280;
const NODE_H = 64;
const COL_X = 260;
const TOP_Y = 120;
const ROW_GAP = 112;

// Nodes only appear AFTER the AI has finished planning (frame ~ 490 onward).
// Before that, the canvas is empty — only the AI in the right panel is busy.
const wfNodes: WfNode[] = [
  { id: "form", kind: "start", title: "Formulaire · Upload image", subtitle: "1 champ : photo carte", iconName: "clipboard", accent: "#10b981", appearAt: 490 },
  { id: "vision", kind: "agent", title: "Hedy · Vision IA", subtitle: "analyse la photo", iconName: "hedy", accent: "#eb2f96", appearAt: 540 },
  { id: "extract", kind: "function", title: "Extraire le contact", subtitle: "nom · email · tel · société", iconName: "scan", accent: "#e61982", appearAt: 590 },
  { id: "odoo", kind: "function", title: "Odoo · Créer le contact", subtitle: "res.partner", iconName: "database", accent: "#714b67", appearAt: 640 },
  { id: "end", kind: "end", title: "Notification", subtitle: "Slack #contacts", iconName: "send", accent: "#4a154b", appearAt: 690 },
];

// Camera shot — match the new tighter timing.
const shot: CameraShot = {
  width: 1920,
  height: 1080,
  keyframes: [
    { frame: 0, cx: 960, cy: 540, zoom: 1.0 }, // full view
    { frame: 40, cx: 1550, cy: 900, zoom: 1.4 }, // zoom on AI composer
    { frame: 210, cx: 1550, cy: 900, zoom: 1.4 }, // hold while prompt is typed
    { frame: 280, cx: 1550, cy: 540, zoom: 1.2 }, // move to AI chat area
    { frame: 480, cx: 1550, cy: 540, zoom: 1.2 }, // hold planning reply
    { frame: 520, cx: 500, cy: 480, zoom: 1.1 }, // pan to flow builder
    { frame: 720, cx: 500, cy: 540, zoom: 1.0 }, // pull back
    { frame: 860, cx: 960, cy: 540, zoom: 0.95 }, // wide so we can see Lancer
    { frame: 940, cx: 1100, cy: 1010, zoom: 1.5 }, // tight zoom on Lancer button
    { frame: 1040, cx: 500, cy: 320, zoom: 1.2 }, // zoom on first node during execution
    { frame: 1240, cx: 500, cy: 540, zoom: 1.1 }, // follow execution down
    { frame: 1520, cx: 500, cy: 820, zoom: 1.2 }, // zoom on Odoo notification
    { frame: 1780, cx: 960, cy: 540, zoom: 0.9 }, // wide final
    { frame: 2100, cx: 960, cy: 540, zoom: 0.9 },
  ],
};

// Cursor click targets — visual button centers in scene-space.
//  • AI panel is 480 px wide, anchored right. Its composer sits at the bottom.
//    Composer y-center ≈ 1035 (bottom-aligned, height ~70).
//  • AI panel composer horizontal inside : 1454..1906. The "Demandez…" text
//    zone is centered around 1650. Send button sits at the far right ≈ 1885.
//  • Flow builder bottombar : x 248..1422, y ≈ 1048 (bottom:12 + padding 8 +
//    button height 36 → center y = 1080 - 12 - 8 - 18 ≈ 1042).
const CURSOR = {
  aiInput: { x: 1650, y: 1035 },
  aiSend:  { x: 1885, y: 1035 },
  runBtn:  { x: 1358, y: 1048 },
};

// Cursor moves ~15 frames (0.5 s) before each click, so the user sees the
// cursor arrive, settle, THEN click — much more natural than landing on the
// button and clicking instantly.
const cursor: CursorKeyframe[] = [
  { frame: 0,   x: 1300, y: 700 },
  { frame: 20,  x: CURSOR.aiInput.x, y: CURSOR.aiInput.y },                      // arrived, waits
  { frame: 35,  x: CURSOR.aiInput.x, y: CURSOR.aiInput.y, click: true },        // click input
  { frame: 210, x: CURSOR.aiInput.x, y: CURSOR.aiInput.y },
  { frame: 215, x: CURSOR.aiSend.x,  y: CURSOR.aiSend.y },                       // arrived on Send
  { frame: 230, x: CURSOR.aiSend.x,  y: CURSOR.aiSend.y,  click: true },         // click Send
  { frame: 520, x: CURSOR.aiSend.x,  y: CURSOR.aiSend.y },
  { frame: 880, x: CURSOR.runBtn.x,  y: CURSOR.runBtn.y },                       // arrived on Lancer (15 frames before click)
  { frame: 960, x: CURSOR.runBtn.x,  y: CURSOR.runBtn.y,  click: true },         // click Lancer
  { frame: 1040, x: CURSOR.runBtn.x, y: CURSOR.runBtn.y },
];

export const P03_WorkflowBuilderDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const inP = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp", easing: easeOutExpo });
  const outP = interpolate(frame, [durationInFrames - 22, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeInExpo,
  });

  return (
    <AbsoluteFill style={{ opacity: inP * (1 - outP) }}>
      <DemoLabel frame={frame} />

      <CameraViewport shot={shot} window3d>
        <AppShell userInitials="EB">
          <div style={{ position: "absolute", inset: 0, display: "flex", overflow: "hidden" }}>
            {/* LEFT: Flow builder */}
            <div
              style={{
                flex: 1,
                position: "relative",
                background: "#f8f8f8",
                backgroundImage: `radial-gradient(circle, #e8e8e8 1.2px, transparent 1.2px)`,
                backgroundSize: "28px 28px",
              }}
            >
              <FlowBuilderTopbar />
              <FlowCanvasVertical frame={frame} />
              <FlowBuilderBottombar frame={frame} />
            </div>

            {/* RIGHT: AI panel */}
            <AiAssistantPanel frame={frame} />
          </div>
        </AppShell>

        <AnimatedCursor keyframes={cursor} />
      </CameraViewport>
    </AbsoluteFill>
  );
};

// ════════════════════════════════════════════════════════
const DemoLabel: React.FC<{ frame: number }> = ({ frame }) => {
  const label =
    frame < 230 ? "Étape 1 · Vous décrivez votre besoin dans le panneau IA" :
    frame < 490 ? "Étape 2 · L'IA analyse et planifie la structure" :
    frame < 760 ? "Étape 3 · Kinn dépose les nœuds du workflow" :
    frame < 990 ? "Étape 4 · Vous cliquez sur Lancer pour exécuter" :
    frame < 1500 ? "Étape 5 · Chaque nœud s'exécute dans l'ordre" :
    "Étape 6 · Votre contact est créé automatiquement dans Odoo";
  return (
    <div
      style={{
        position: "absolute",
        top: 14,
        left: "50%",
        transform: "translateX(-50%)",
        padding: "8px 18px",
        borderRadius: 999,
        background: "rgba(15,23,42,0.9)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        color: "#fff",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        zIndex: 300,
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
      {label}
    </div>
  );
};

const FlowBuilderTopbar: React.FC = () => (
  <>
    {/* Workflow name pinned at top-left, separate from the centered segment */}
    <div
      style={{
        position: "absolute",
        top: 14,
        left: 18,
        zIndex: 5,
        fontSize: 13,
        fontWeight: 600,
        color: theme.color.text,
        background: "#fff",
        padding: "8px 14px",
        borderRadius: 10,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      Workflow · Scan carte de visite
    </div>

    {/* Segmented control — absolutely centered within the flow builder canvas */}
    <div
      style={{
        position: "absolute",
        top: 14,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 5,
        display: "inline-flex",
        background: "#fff",
        borderRadius: 14,
        padding: 4,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
      }}
    >
      <SegLink label="Éditeur" active />
      <SegLink label="Simulation" />
      <SegLink label="Historique" />
      <SegLink label="Paramètres" />
    </div>
  </>
);

const SegLink: React.FC<{ label: string; active?: boolean }> = ({ label, active }) => (
  <div
    style={{
      padding: "6px 14px",
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 500,
      color: active ? "#fff" : "#8b8b8b",
      background: active ? theme.color.brand : "transparent",
      boxShadow: active ? "0 2px 8px rgba(230,25,130,0.2)" : "none",
    }}
  >
    {label}
  </div>
);

// ════════════════════════════════════════════════════════
// VERTICAL flow canvas — no branching
const FlowCanvasVertical: React.FC<{ frame: number }> = ({ frame }) => {
  // Execution timeline per node — runs right after Lancer click (frame 960)
  const EXEC = {
    form: 980,
    vision: 1070,
    extract: 1170,
    odoo: 1280,
    end: 1380,
  };

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Edges (vertical connectors) */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        <defs>
          <filter id="wfv-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {wfNodes.slice(0, -1).map((n, i) => {
          const next = wfNodes[i + 1];
          const x = COL_X + NODE_W / 2;
          const y1 = TOP_Y + i * ROW_GAP + NODE_H;
          const y2 = TOP_Y + (i + 1) * ROW_GAP;
          const progress = interpolate(frame, [next.appearAt - 10, next.appearAt + 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: easeOutExpo,
          });
          return (
            <line
              key={i}
              x1={x}
              y1={y1}
              x2={x}
              y2={y2}
              stroke={theme.color.nodeConnection}
              strokeWidth={2.5}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - progress}
            />
          );
        })}

        {/* Execution particles flowing down */}
        {frame > 1150 &&
          wfNodes.slice(0, -1).map((n, i) => {
            const next = wfNodes[i + 1];
            const execTimes = [EXEC.form, EXEC.vision, EXEC.extract, EXEC.odoo];
            const startF = execTimes[i];
            if (frame < startF) return null;
            const x = COL_X + NODE_W / 2;
            const y1 = TOP_Y + i * ROW_GAP + NODE_H;
            const y2 = TOP_Y + (i + 1) * ROW_GAP;
            const cycle = 50;
            return Array.from({ length: 2 }).map((_, k) => {
              const phase = ((frame - startF + k * 25) % cycle) / cycle;
              const y = y1 + (y2 - y1) * phase;
              return (
                <circle
                  key={`p-${i}-${k}`}
                  cx={x}
                  cy={y}
                  r={5}
                  fill={theme.color.brand}
                  filter="url(#wfv-glow)"
                />
              );
            });
          })}
      </svg>

      {/* "AI is planning" placeholder — shown before any node appears */}
      {frame < 490 && frame > 240 && <AiPlanningPlaceholder frame={frame} />}

      {/* Nodes */}
      {wfNodes.map((n, idx) => {
        const sp = spring({ frame: frame - n.appearAt, fps: 30, config: { damping: 12, stiffness: 130 } });
        const opacity = interpolate(sp, [0, 1], [0, 1]);
        const scale = interpolate(sp, [0, 1], [0.6, 1]);
        const execTimes = [EXEC.form, EXEC.vision, EXEC.extract, EXEC.odoo, EXEC.end];
        const execAt = execTimes[idx];
        const isExecuting = frame >= execAt && frame < execAt + 100;
        const isDone = frame >= execAt + 100;
        const pulse = isExecuting ? 0.6 + (Math.sin(frame / 4) + 1) * 0.2 : 0;
        const color = n.accent;

        return (
          <div
            key={n.id}
            style={{
              position: "absolute",
              left: COL_X,
              top: TOP_Y + idx * ROW_GAP,
              width: NODE_W,
              opacity,
              transform: `scale(${scale})`,
            }}
          >
            <div
              style={{
                background: "#fff",
                border: `1px solid ${isExecuting ? color : isDone ? theme.color.success : theme.color.grid}`,
                borderRadius: 14,
                padding: 14,
                boxShadow: isExecuting
                  ? `0 0 0 ${2 + pulse * 3}px ${color}33, 0 14px 32px ${color}44`
                  : isDone
                  ? `0 0 0 2px ${theme.color.success}22, 0 6px 18px ${theme.color.success}22`
                  : "0 1px 4px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.04)",
                display: "flex",
                alignItems: "center",
                gap: 12,
                transition: "box-shadow 0.2s",
                minHeight: NODE_H,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 11,
                  background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: `0 6px 16px ${color}44`,
                }}
              >
                <LucideIcon name={n.iconName} size={18} color="#fff" strokeWidth={2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.color.text, letterSpacing: -0.1 }}>
                  {n.title}
                </div>
                {n.subtitle && (
                  <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 2 }}>{n.subtitle}</div>
                )}
              </div>
              {isDone && (
                <div
                  style={{
                    width: 22,
                    height: 22,
                    minWidth: 22,
                    borderRadius: 999,
                    background: theme.color.success,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 4px 12px ${theme.color.success}55`,
                    flexShrink: 0,
                  }}
                >
                  <LucideIcon name="check" size={13} color="#fff" strokeWidth={3} />
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Business card preview — floating next to the form node during exec */}
      {frame >= 930 && frame < 1170 && <BusinessCardPreview frame={frame} />}

      {/* Extracted fields bubble — appears when extract node runs */}
      {frame >= 1170 && frame < 1480 && <ExtractedFieldsBubble frame={frame} />}

      {/* Odoo notification — appears when odoo node runs */}
      {frame >= 1380 && <OdooNotification frame={frame} />}
    </div>
  );
};

const AiPlanningPlaceholder: React.FC<{ frame: number }> = ({ frame }) => {
  const sp = spring({ frame: frame - 250, fps: 30, config: { damping: 14 } });
  const opacity = interpolate(sp, [0, 1], [0, 1]);
  const fadeOut = interpolate(frame, [470, 500], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const steps = [
    { label: "Analyse du besoin utilisateur", at: 270 },
    { label: "Identification des outils nécessaires", at: 320 },
    { label: "Séquencement des étapes", at: 370 },
    { label: "Préparation du canvas visuel", at: 420 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 300,
        transform: "translateX(-50%)",
        width: 520,
        opacity: opacity * fadeOut,
        background: "rgba(255,255,255,0.96)",
        borderRadius: 18,
        border: `1px solid ${theme.color.borderSoft}`,
        padding: 24,
        boxShadow: "0 20px 48px rgba(0,0,0,0.08)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${theme.color.brand}, #7c3aed)`,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 8px 22px ${theme.color.brand}55`,
          }}
        >
          <LucideIcon name="sparkles" size={20} color="#fff" strokeWidth={2} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.color.text }}>Kinn planifie votre workflow</div>
          <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 2 }}>
            L'IA réfléchit à la structure optimale…
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((s, i) => {
          const done = frame >= s.at + 20;
          const active = frame >= s.at && !done;
          const vis = frame >= s.at - 10;
          if (!vis) return null;
          const alpha = interpolate(frame, [s.at - 10, s.at + 5], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 12px",
                background: active ? theme.color.brandLight : done ? "#f0fdf4" : "#f8fafc",
                borderRadius: 9,
                border: `1px solid ${active ? theme.color.brand + "55" : done ? theme.color.success + "33" : theme.color.borderSoft}`,
                opacity: alpha,
                transform: `translateY(${(1 - alpha) * 6}px)`,
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  background: done ? theme.color.success : active ? theme.color.brand : "transparent",
                  border: done || active ? "none" : "2px solid #d1d5db",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {done ? (
                  <LucideIcon name="check" size={11} color="#fff" strokeWidth={3} />
                ) : active ? (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: "#fff",
                      opacity: 0.5 + (Math.sin(frame / 5) + 1) * 0.25,
                    }}
                  />
                ) : null}
              </div>
              <div style={{ fontSize: 12, color: theme.color.text, fontWeight: active ? 600 : 500 }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const BusinessCardPreview: React.FC<{ frame: number }> = ({ frame }) => {
  const sp = spring({ frame: frame - 930, fps: 30, config: { damping: 12 } });
  const opacity = interpolate(sp, [0, 1], [0, 1]);
  const scale = interpolate(sp, [0, 1], [0.6, 1]);
  const ty = interpolate(sp, [0, 1], [30, 0]);
  const fadeOut = interpolate(frame, [1120, 1170], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        left: COL_X + NODE_W + 60,
        top: TOP_Y - 10,
        width: 320,
        opacity: opacity * fadeOut,
        transform: `translateY(${ty}px) scale(${scale}) rotate(-2deg)`,
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #1e293b, #0f172a)",
          color: "#fff",
          borderRadius: 14,
          padding: "20px 22px",
          boxShadow: "0 28px 56px rgba(0,0,0,0.28)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ fontSize: 9, color: "#22c55e", fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>
          Photo carte de visite
        </div>
        <div style={{ marginTop: 12, fontSize: 16, fontWeight: 800, letterSpacing: -0.3 }}>Sophie Laurent</div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Directrice Commerciale</div>
        <div style={{ fontSize: 11, color: "#22c55e", marginTop: 10, fontWeight: 700, letterSpacing: 0.5 }}>
          NOVATECH INDUSTRIES
        </div>
        <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 6, lineHeight: 1.5 }}>
          sophie.laurent@novatech.fr<br />
          +33 6 12 45 78 93<br />
          12 rue de la Tech, 75009 Paris
        </div>
      </div>
      <div
        style={{
          marginTop: 8,
          padding: "4px 10px",
          background: "#1e293b",
          borderRadius: 999,
          fontSize: 10,
          color: "#fff",
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        card_sophie.jpg · 2.4 Mo
      </div>
    </div>
  );
};

const ExtractedFieldsBubble: React.FC<{ frame: number }> = ({ frame }) => {
  const sp = spring({ frame: frame - 1170, fps: 30, config: { damping: 14 } });
  const opacity = interpolate(sp, [0, 1], [0, 1]);
  const fadeOut = interpolate(frame, [1430, 1480], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const rows = [
    { label: "Nom", value: "Sophie Laurent", at: 1180 },
    { label: "Fonction", value: "Directrice Commerciale", at: 1210 },
    { label: "Société", value: "NovaTech Industries", at: 1240 },
    { label: "Email", value: "sophie.laurent@novatech.fr", at: 1270 },
    { label: "Téléphone", value: "+33 6 12 45 78 93", at: 1300 },
  ];

  return (
    <div
      style={{
        position: "absolute",
        left: COL_X + NODE_W + 60,
        top: TOP_Y + 2 * ROW_GAP - 30,
        width: 340,
        background: "#fff",
        borderRadius: 14,
        border: `1px solid ${theme.color.brand}55`,
        padding: 14,
        boxShadow: `0 20px 48px ${theme.color.brand}28, 0 4px 12px rgba(0,0,0,0.05)`,
        opacity: opacity * fadeOut,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: theme.color.brand,
          fontWeight: 700,
          letterSpacing: 1,
          textTransform: "uppercase",
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <LucideIcon name="sparkles" size={11} color={theme.color.brand} strokeWidth={2.2} />
        Champs extraits par l'IA
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {rows.map((r) => {
          const rowSp = interpolate(frame, [r.at, r.at + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={r.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                padding: "5px 8px",
                background: "#f8fafc",
                borderRadius: 7,
                opacity: rowSp,
                transform: `translateY(${(1 - rowSp) * 6}px)`,
              }}
            >
              <span style={{ color: theme.color.textMuted, fontWeight: 600 }}>{r.label}</span>
              <span style={{ color: theme.color.text, fontWeight: 600 }}>{r.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const OdooNotification: React.FC<{ frame: number }> = ({ frame }) => {
  const sp = spring({ frame: frame - 1380, fps: 30, config: { damping: 14 } });
  const opacity = interpolate(sp, [0, 1], [0, 1]);
  const tx = interpolate(sp, [0, 1], [30, 0]);

  return (
    <div
      style={{
        position: "absolute",
        left: COL_X + NODE_W + 60,
        top: TOP_Y + 3 * ROW_GAP,
        width: 340,
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 24px 56px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)",
        border: "1px solid rgba(0,0,0,0.06)",
        padding: 16,
        opacity,
        transform: `translateX(${tx}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <ProviderIcon provider="odoo" size={40} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: "#714b67", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
            Odoo · Notification
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: theme.color.text, marginTop: 2 }}>
            Nouveau contact créé
          </div>
          <div style={{ fontSize: 11, color: theme.color.textMuted, marginTop: 4, lineHeight: 1.4 }}>
            <strong>Sophie Laurent</strong> · NovaTech Industries<br />
            Catégorie : Lead · Source : Scan carte
          </div>
          <div
            style={{
              marginTop: 10,
              padding: "4px 10px",
              background: theme.color.success + "18",
              color: theme.color.success,
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <LucideIcon name="check" size={11} color={theme.color.success} strokeWidth={2.5} />
            Contact synchronisé
          </div>
        </div>
      </div>
    </div>
  );
};

const FlowBuilderBottombar: React.FC<{ frame: number }> = ({ frame }) => {
  const running = frame >= 960 && frame < 1500;
  const runClicked = frame >= 960 && frame < 1020;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 12,
        left: 18,
        right: 18,
        display: "flex",
        alignItems: "center",
        background: "rgba(255,255,255,0.98)",
        borderRadius: 12,
        padding: "8px 14px",
        boxShadow: "0 -4px 14px rgba(0,0,0,0.04)",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", gap: 6 }}>
        <IconSquare>
          <Icon name="save" size={14} color="#6b7280" />
        </IconSquare>
        <IconSquare>
          <Icon name="play" size={12} color="#6b7280" />
        </IconSquare>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        {running && (
          <div
            style={{
              padding: "5px 11px",
              borderRadius: 8,
              background: "#10b98118",
              color: "#10b981",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: 3, background: "#10b981" }} />
            EXÉCUTION EN COURS
          </div>
        )}
        <button
          style={{
            padding: "9px 18px",
            background: runClicked ? "#059669" : "#10b981",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: runClicked ? "0 2px 8px rgba(5,150,105,0.4)" : "0 6px 16px rgba(16,185,129,0.35)",
            transform: runClicked ? "scale(0.96)" : "scale(1)",
            transition: "all 0.15s",
          }}
        >
          <LucideIcon name="play" size={12} color="#fff" strokeWidth={2.5} />
          Lancer
        </button>
      </div>
    </div>
  );
};

const IconSquare: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      width: 30,
      height: 30,
      borderRadius: 8,
      background: "#f8fafc",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {children}
  </div>
);

// ════════════════════════════════════════════════════════
// Timing constants for P03's AI panel — adjust these to retime the scene.
const P3_PROMPT_START = 40;
const P3_SEND_CLICK = 230;     // cursor fires click here
const P3_SENT_FRAME = 265;     // user bubble appears (after ripple finishes)
const P3_REPLY_START = 290;

const AiAssistantPanel: React.FC<{ frame: number }> = ({ frame }) => {
  const sent = frame >= P3_SENT_FRAME;
  // Typed text is considered "done" ~ when the cursor reaches the send button.
  const typingLikelyDone = frame >= P3_SEND_CLICK - 10;

  const assistantReply = "Je construis votre workflow. Voici les étapes mises en place à gauche :";

  const buildSteps = [
    { at: 240, label: "Formulaire · champ image" },
    { at: 290, label: "Agent Hedy (vision IA)" },
    { at: 340, label: "Fonction d'extraction contact" },
    { at: 390, label: "Connecteur Odoo" },
    { at: 440, label: "Notification Slack" },
  ];

  return (
    <aside
      style={{
        width: 480,
        background: "#fff",
        borderLeft: `1px solid ${theme.color.borderSoft}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: `1px solid ${theme.color.borderSoft}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: theme.color.brandLight,
            color: theme.color.brand,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LucideIcon name="sparkles" size={14} color={theme.color.brand} strokeWidth={2.2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: theme.color.text }}>Assistant IA</div>
          <div style={{ fontSize: 11, color: theme.color.textMuted }}>Mode · Workflow builder</div>
        </div>
        <div
          style={{
            padding: "2px 8px",
            borderRadius: 6,
            background: "#e6f4ff",
            color: "#1890ff",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: 0.4,
          }}
        >
          WORKFLOW
        </div>
      </div>

      {/* Context bar */}
      <div
        style={{
          margin: "10px 12px",
          padding: "7px 12px",
          background: theme.color.brandLight,
          color: theme.color.brand,
          borderRadius: 10,
          fontSize: 11,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontWeight: 500,
        }}
      >
        <LucideIcon name="file" size={11} color={theme.color.brand} strokeWidth={2.2} />
        Contexte · workflow vide · « Scan carte de visite »
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, padding: "4px 14px 10px", overflow: "hidden", display: "flex", flexDirection: "column", gap: 10 }}>
        {sent && (
          <>
            <div
              style={{
                alignSelf: "flex-end",
                maxWidth: "92%",
                padding: "10px 14px",
                background: theme.color.brand,
                color: "#fff",
                borderRadius: 14,
                fontSize: 13,
                lineHeight: 1.5,
                fontWeight: 500,
                boxShadow: "0 4px 14px rgba(230,25,130,0.25)",
              }}
            >
              {PROMPT}
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  background: `linear-gradient(135deg, ${theme.color.brand}, #7c3aed)`,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <LucideIcon name="sparkles" size={13} color="#fff" strokeWidth={2.2} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: theme.color.textMuted, fontWeight: 600, marginBottom: 3 }}>
                  Kinn · Workflow agent
                </div>
                <div
                  style={{
                    padding: "10px 13px",
                    background: "#f8fafc",
                    borderRadius: 12,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: theme.color.text,
                    border: `1px solid ${theme.color.borderSoft}`,
                  }}
                >
                  <StreamingText
                    text={assistantReply}
                    startFrame={P3_REPLY_START}
                    wps={8}
                  />
                </div>

                {frame >= 360 && (
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                    {buildSteps.map((s, i) => {
                      if (frame < s.at) return null;
                      const done = frame >= s.at + 50;
                      const sp = interpolate(frame, [s.at, s.at + 15], [0, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      });
                      return (
                        <div
                          key={i}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 11,
                            color: done ? theme.color.textMuted : theme.color.brand,
                            opacity: sp,
                            transform: `translateY(${(1 - sp) * 4}px)`,
                            fontFamily: "'SF Mono', Menlo, monospace",
                          }}
                        >
                          <span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 999,
                              background: done ? theme.color.success : theme.color.brand,
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {done && (
                              <LucideIcon name="check" size={8} color="#fff" strokeWidth={3} />
                            )}
                          </span>
                          + {s.label}
                        </div>
                      );
                    })}
                  </div>
                )}

                {frame > 750 && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "10px 12px",
                      background: theme.color.success + "10",
                      border: `1px solid ${theme.color.success}44`,
                      borderRadius: 10,
                      fontSize: 12,
                      color: theme.color.success,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <LucideIcon name="check" size={13} color={theme.color.success} strokeWidth={2.5} />
                    Workflow prêt. Cliquez sur « Lancer » pour exécuter.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Composer bottom — TypingText streams the prompt char by char with
          human-like jitter (uses CSS caret so it blinks during pause). */}
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${theme.color.borderSoft}`, background: "#fff" }}>
        <div
          style={{
            background: "#fff",
            border: `2px solid ${!sent ? theme.color.brand + "88" : theme.color.borderSoft}`,
            borderRadius: 12,
            padding: "10px 12px",
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            boxShadow: !sent ? `0 0 0 3px ${theme.color.brand}14` : "none",
          }}
        >
          <LucideIcon name="sparkles" size={13} color={theme.color.brand} strokeWidth={2.2} />
          <div
            style={{
              flex: 1,
              fontSize: 12,
              color: theme.color.text,
              lineHeight: 1.55,
              minHeight: 48,
            }}
          >
            {sent ? (
              <span style={{ color: "#c4c4c4" }}>Demandez quelque chose…</span>
            ) : frame < P3_PROMPT_START ? (
              <span style={{ color: "#c4c4c4" }}>Demandez quelque chose…</span>
            ) : (
              <TypingText
                text={PROMPT}
                startFrame={P3_PROMPT_START}
                cps={36}
                caret
              />
            )}
          </div>
          <div
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              background: typingLikelyDone && !sent ? theme.color.brand : "#f1f5f9",
              color: typingLikelyDone && !sent ? "#fff" : theme.color.textMuted,
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 5,
              flexShrink: 0,
              boxShadow: typingLikelyDone && !sent ? "0 4px 12px rgba(230,25,130,0.35)" : "none",
            }}
          >
            <LucideIcon name="send" size={10} color={typingLikelyDone && !sent ? "#fff" : theme.color.textMuted} strokeWidth={2.2} />
          </div>
        </div>
      </div>
    </aside>
  );
};

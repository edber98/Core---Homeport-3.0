import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { theme, agents } from "../theme";
import { AppShell } from "./AppShell";
import { ChatMessage } from "./ChatMessage";
import { Icon } from "./Icon";
import { AnimatedCursor, CursorKeyframe } from "./AnimatedCursor";
import { CameraViewport, CameraShot } from "./CameraViewport";
import { C4rbonLogo, c4rbonPalette } from "./C4rbonLogo";
import { CanvasArtifact } from "./CanvasArtifact";
import { XlsxPreview } from "./XlsxPreview";
import { LucideIcon } from "./AgentIcon";
import { TypingText, StreamingText } from "./TypingAnimations";

// Pixel coordinates (in scene space 1920×1080) of clickable Kinn UI elements.
// These MUST match the real geometry produced by AppShell.
// UI coordinates (scene space 1920×1080) of clickable Kinn elements.
// These are the TIP positions the animated cursor should land on.
const UI = {
  // Header right icons (34×34, gap 8, padding-right 16). AI is 3rd from right.
  aiBtn: { x: 1803, y: 26 },
  search: { x: 960, y: 26 },
  // Composer at bottom : max-width 900, centered in main (main starts x=230
  // width 1690). Composer bar horizontal range ≈ 625..1525. Send button sits
  // at the right end with ~18px padding — center ≈ 1468, but the visible
  // button edge is closer to 1475 so we aim there for a clean landing.
  promptInput: { x: 910, y: 978 },
  sendBtn: { x: 1470, y: 978 },
};

const PROMPT_LINE_1 = "Étude de marché sur les plateformes iPaaS en Europe 2026.";
const PROMPT_LINE_2 = "Axe 1 : concurrents (top 10, pricing, positioning)";
const PROMPT_LINE_3 = "Axe 2 : tendances tech (AI agents, MCP, RAG, multimodal)";
const PROMPT_LINE_4 = "Télécharge le logo de c4rbon.group et applique sa charte.";
const PROMPT_LINE_5 = "→ /analyses/etude-marche-2026-3.0.xlsx";
const FULL_PROMPT = [PROMPT_LINE_1, PROMPT_LINE_2, PROMPT_LINE_3, PROMPT_LINE_4, PROMPT_LINE_5].join("\n");

// Denis progressively-typed reply (word by word).
const DENIS_REPLY = [
  "Parfait, voici ma stratégie pour cette étude.",
  "Je vais mobiliser trois spécialistes en parallèle :",
  "Tim pour l'intelligence concurrentielle, Ada pour les tendances techniques,",
  "et Donald pour rédiger le livrable à la charte c4rbon.group.",
].join(" ");

// Scene timeline (frames, 30fps):
// 0-60      open plan
// 60-150    zoom AI btn, click
// 150-220   pull back, move to prompt
// 220-540   type multi-line prompt (zoomed on input)
// 540-600   pull back, cursor to send button
// 600-620   click send
// 620-720   user message appears, Denis starts answering
// 720-1100  Denis types word by word, first canvas appears inline
// 1100-1400 canvases reveal content (Tim, Ada)
// 1400-1700 Donald assembles with c4rbon
// 1700-2100 xlsx opens fullscreen
// 2100-end  hold xlsx

// Compressed timeline — tight camera + snappy transitions.
//   0-30   cursor to AI btn + click
//   30-80  halo + zoom on prompt input
//   100    cursor click inside input (field focused)
//   120-340 TypingText prompt (≈210 frames at 34 cps)
//   340    cursor moves to send
//   360    click send
//   370    user bubble appears
//   420    Denis msg appears, StreamingText begins
//   420-620 Denis streams (~200 frames)
//   700    canvas inline (Tim/Ada)
//   1100   Donald assembling
//   1400   xlsx fullscreen
const cameraShot: CameraShot = {
  width: 1920,
  height: 1080,
  keyframes: [
    { frame: 0, cx: 960, cy: 540, zoom: 1.0 },
    { frame: 30, cx: 1760, cy: 120, zoom: 1.9 },
    { frame: 70, cx: 1760, cy: 120, zoom: 1.9 },
    { frame: 110, cx: 960, cy: 540, zoom: 1.0 },
    { frame: 150, cx: 960, cy: 960, zoom: 1.7 },
    { frame: 340, cx: 960, cy: 960, zoom: 1.7 },
    { frame: 380, cx: 960, cy: 540, zoom: 1.0 },
    { frame: 430, cx: 960, cy: 540, zoom: 1.0 },
    { frame: 640, cx: 720, cy: 560, zoom: 1.1 },
    { frame: 900, cx: 960, cy: 540, zoom: 1.0 },
    { frame: 1140, cx: 560, cy: 540, zoom: 1.2 },
    { frame: 1300, cx: 1360, cy: 540, zoom: 1.2 },
    { frame: 1430, cx: 960, cy: 540, zoom: 1.0 },
    { frame: 1560, cx: 960, cy: 540, zoom: 1.0 },
    { frame: 1650, cx: 960, cy: 540, zoom: 1.06 },
    { frame: 1800, cx: 960, cy: 540, zoom: 1.02 },
  ],
};

// Cursor path — each click is preceded by an "arrival" keyframe ~15 frames
// earlier so the viewer sees the cursor reach the target, hold, then click.
const cursorPath: CursorKeyframe[] = [
  { frame: 0,   x: 1300, y: 700 },
  { frame: 15,  x: UI.aiBtn.x,       y: UI.aiBtn.y },                           // arrived on AI btn
  { frame: 30,  x: UI.aiBtn.x,       y: UI.aiBtn.y,       click: true },        // click
  { frame: 90,  x: UI.aiBtn.x,       y: UI.aiBtn.y },
  { frame: 108, x: UI.promptInput.x, y: UI.promptInput.y },                      // arrived on input
  { frame: 120, x: UI.promptInput.x, y: UI.promptInput.y, click: true },         // click input
  { frame: 340, x: UI.promptInput.x, y: UI.promptInput.y },
  { frame: 348, x: UI.sendBtn.x,     y: UI.sendBtn.y },                          // arrived on Send (12f before click)
  { frame: 360, x: UI.sendBtn.x,     y: UI.sendBtn.y,     click: true },         // click Send
  { frame: 430, x: UI.sendBtn.x,     y: UI.sendBtn.y },
];

// Scheduling constants — change these to retime the whole scene.
// NB: the cursor click ripple lasts ~22 frames, so the user bubble should
// only appear AFTER the ripple has fully played out, not during it.
const PROMPT_TYPE_START = 120;
const SEND_CLICK_FRAME = 360;   // cursor fires the click here
const USER_BUBBLE_FRAME = 400;  // +40 frames so the ripple has finished
const DENIS_START = 450;
const CANVAS_INLINE_FRAME = 720;
const DONALD_FRAME = 1100;
const XLSX_FRAME = 1400;

export const KinnAppScene: React.FC<{ duration: number }> = ({ duration }) => {
  const frame = useCurrentFrame();

  // State flags — tightly synchronized with cursor clicks
  const aiBtnHalo = frame >= 15 && frame < 80;
  const inputFocused = frame >= 110 && frame < SEND_CLICK_FRAME;
  const sentPromptVisible = frame >= USER_BUBBLE_FRAME;
  const denisMsgVisible = frame >= DENIS_START;
  const canvasInline = frame >= CANVAS_INLINE_FRAME;
  const donaldSection = frame >= DONALD_FRAME;
  const showXlsx = frame >= XLSX_FRAME;

  return (
    <CameraViewport shot={cameraShot} background="#05050a">
      <AppShell userInitials="EB">
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Scrollable chat area */}
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              maxWidth: 1280,
              margin: "0 auto",
              width: "100%",
              padding: "24px 32px 12px",
              display: "flex",
              flexDirection: "column",
              justifyContent: !sentPromptVisible ? "center" : "flex-start",
            }}
          >
            {!sentPromptVisible && (
              <GreetingBlock frame={frame} />
            )}

            {sentPromptVisible && (
              <div style={{ paddingBottom: 14 }}>
                <ChatMessage
                  kind="user"
                  opacity={interpolate(frame, [USER_BUBBLE_FRAME, USER_BUBBLE_FRAME + 20], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })}
                  translateY={0}
                  maxWidth={780}
                >
                  <div style={{ whiteSpace: "pre-wrap" }}>{FULL_PROMPT}</div>
                </ChatMessage>
              </div>
            )}

            {denisMsgVisible && (
              <div style={{ paddingBottom: 14 }}>
                <ChatMessage
                  kind="assistant"
                  agentColor="#e61982"
                  agentName="Denis · Généraliste"
                  agentIcon="denis"
                  opacity={interpolate(frame, [DENIS_START, DENIS_START + 20], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })}
                  maxWidth={780}
                >
                  <StreamingText
                    text={DENIS_REPLY}
                    startFrame={DENIS_START + 10}
                    wps={8}
                    style={{ lineHeight: 1.6 }}
                  />
                </ChatMessage>
              </div>
            )}

            {canvasInline && !showXlsx && (
              <InlineCanvasBlock frame={frame} donaldSection={donaldSection} />
            )}

            {showXlsx && (
              <XlsxFullscreen frame={frame} />
            )}
          </div>

          {/* Composer (always visible at bottom) */}
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
              width: "100%",
              padding: "6px 16px 16px",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                border: `2px solid ${inputFocused ? theme.color.brand + "88" : theme.color.borderSoft}`,
                borderRadius: 18,
                padding: "14px 18px",
                boxShadow: inputFocused
                  ? `0 0 0 4px ${theme.color.brand}14, 0 12px 36px rgba(0,0,0,0.05)`
                  : "0 12px 36px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.03)",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                transition: "box-shadow 0.2s, border 0.2s",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: theme.color.brandLight,
                  color: theme.color.brand,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <Icon name="sparkle" size={15} />
              </div>
              <div
                style={{
                  flex: 1,
                  minHeight: 22,
                  fontSize: 14,
                  color: theme.color.text,
                  lineHeight: 1.55,
                  paddingTop: 3,
                }}
              >
                {sentPromptVisible ? (
                  <span style={{ color: "#c4c4c4" }}>Demandez à Kinn...</span>
                ) : frame < PROMPT_TYPE_START ? (
                  <span style={{ color: "#c4c4c4" }}>Demandez à Kinn...</span>
                ) : (
                  <TypingText
                    text={FULL_PROMPT}
                    startFrame={PROMPT_TYPE_START}
                    cps={34}
                    caret
                  />
                )}
              </div>
              {(() => {
                const ready = frame >= PROMPT_TYPE_START + 180 && !sentPromptVisible;
                return (
                  <div
                    style={{
                      padding: "8px 14px",
                      borderRadius: 11,
                      background: ready ? theme.color.brand : theme.color.bg,
                      color: ready ? "#fff" : theme.color.textMuted,
                      fontSize: 12,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: ready ? "0 6px 18px rgba(230,25,130,0.35)" : "none",
                      flexShrink: 0,
                      transition: "all 0.2s",
                    }}
                  >
                    <Icon name="send" size={12} color={ready ? "#fff" : theme.color.textMuted} />
                    Envoyer
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </AppShell>

      <AnimatedCursor keyframes={cursorPath} />

      {aiBtnHalo && (
        <div
          style={{
            position: "absolute",
            left: UI.aiBtn.x - 17,
            top: UI.aiBtn.y - 17,
            width: 34,
            height: 34,
            borderRadius: 12,
            boxShadow: `0 0 0 4px ${theme.color.brand}44, 0 0 30px ${theme.color.brand}88`,
            pointerEvents: "none",
          }}
        />
      )}
    </CameraViewport>
  );
};

// ════════════════════════════════════════════════════════
// Greeting block (visible when no message sent yet)

const GreetingBlock: React.FC<{ frame: number }> = ({ frame }) => {
  const op = interpolate(frame, [10, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [180, 230], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 14,
        opacity: op * fadeOut,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${theme.color.brand}, #7c3aed)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          boxShadow: `0 12px 32px ${theme.color.brand}55`,
        }}
      >
        <Icon name="sparkle" size={24} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: theme.color.text, letterSpacing: -0.5, textAlign: "center" }}>
        Bonjour Édouard — que souhaitez-vous automatiser ?
      </div>
      <div style={{ fontSize: 14, color: theme.color.textMuted, textAlign: "center" }}>
        Décrivez votre besoin, Kinn mobilise les bons agents.
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════
// Inline canvas block — agents work inline in the chat.
// Mimics the real Kinn "structured response" UI.

const InlineCanvasBlock: React.FC<{ frame: number; donaldSection: boolean }> = ({ frame, donaldSection }) => {
  const containerOp = interpolate(frame, [700, 760], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        marginLeft: 48,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        opacity: containerOp,
      }}
    >
      {/* Intro line from Denis above the canvases */}
      <div
        style={{
          fontSize: 12,
          color: theme.color.textMuted,
          fontStyle: "italic",
          marginBottom: -6,
        }}
      >
        ✦ Voici les canvas en cours d'élaboration par mon équipe :
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <CanvasInlineTim frame={frame} />
        <CanvasInlineAda frame={frame} />
      </div>

      {donaldSection && <DonaldAssembling frame={frame} />}
    </div>
  );
};

const CanvasInlineTim: React.FC<{ frame: number }> = ({ frame }) => {
  const height = 340;
  const progress = interpolate(frame, [770, 1020], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ height }}>
      <CanvasArtifact
        title="Concurrents iPaaS Europe"
        agent={{ name: "Tim", iconName: "tim", color: "#1890ff" }}
        items={[
          { tag: "ZAPIER", title: "Leader US", excerpt: "5000+ apps, $19–$799/mo" },
          { tag: "MAKE", title: "Scenario-based", excerpt: "Visuel, $9–$29, ex-Integromat" },
          { tag: "N8N", title: "Open-source DE", excerpt: "Self-hosted, dev-first" },
          { tag: "WORKATO", title: "Enterprise US", excerpt: "Finance/HR, orchestration B2B" },
        ]}
        revealProgress={progress}
      />
    </div>
  );
};

const CanvasInlineAda: React.FC<{ frame: number }> = ({ frame }) => {
  const height = 340;
  const progress = interpolate(frame, [810, 1060], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ height }}>
      <CanvasArtifact
        title="Tendances tech 2026"
        agent={{ name: "Ada", iconName: "ada", color: "#13c2c2" }}
        items={[
          { tag: "AI AGENTS", title: "Multi-agent orchestration", excerpt: "Délégation, memory, planning" },
          { tag: "MCP", title: "Model Context Protocol", excerpt: "Standard Anthropic, adoption rapide" },
          { tag: "RAG", title: "Retrieval Augmented Gen.", excerpt: "Vector DB, embeddings, citations" },
          { tag: "MULTIMODAL", title: "Vision + voix + texte", excerpt: "Image, audio, fusion sémantique" },
        ]}
        revealProgress={progress}
      />
    </div>
  );
};

const DonaldAssembling: React.FC<{ frame: number }> = ({ frame }) => {
  const op = interpolate(frame, [1100, 1150], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const donald = agents.find(a => a.id === "donald")!;

  return (
    <div
      style={{
        opacity: op,
        background: "#ffffff",
        borderRadius: 16,
        border: `1px solid ${theme.color.borderSoft}`,
        padding: 18,
        boxShadow: "0 12px 32px rgba(0,0,0,0.05)",
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: `linear-gradient(135deg, ${donald.color}, ${donald.color}cc)`,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 6px 18px ${donald.color}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
          flexShrink: 0,
        }}
      >
        <LucideIcon name="donald" size={18} color="#fff" strokeWidth={2} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: theme.color.text }}>Donald · Rédacteur</span>
          <span style={{ fontSize: 11, color: theme.color.textMuted }}>
            assemble le livrable final
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <DonaldStep label="Import données Tim & Ada" done={frame > 1160} />
          <DonaldStep label="Téléchargement charte c4rbon.group" done={frame > 1210} branded />
          <DonaldStep label="Application couleurs + typos + logo" done={frame > 1260} />
          <DonaldStep label="Génération des 3 feuilles Excel" done={frame > 1310} />
          <DonaldStep label="/analyses/etude-marche-2026-3.0.xlsx" done={frame > 1360} file />
        </div>
      </div>
    </div>
  );
};

const DonaldStep: React.FC<{ label: string; done: boolean; branded?: boolean; file?: boolean }> = ({ label, done, branded, file }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 12,
      color: done ? theme.color.text : theme.color.textMuted,
    }}
  >
    <span
      style={{
        width: 16,
        height: 16,
        minWidth: 16,
        borderRadius: 999,
        background: done ? theme.color.success : "transparent",
        border: done ? "none" : "2px solid #d1d5db",
        color: "#fff",
        fontSize: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
      }}
    >
      {done && "✓"}
    </span>
    {branded && done ? (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {label}
        <span style={{ transform: "scale(0.8)" }}>
          <C4rbonLogo size={16} compact />
        </span>
      </span>
    ) : file && done ? (
      <span
        style={{
          fontFamily: "'SF Mono', Menlo, monospace",
          background: theme.color.brandLight,
          color: theme.color.brand,
          padding: "2px 8px",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    ) : (
      label
    )}
  </div>
);

// ════════════════════════════════════════════════════════
// Xlsx fullscreen preview (after Donald is done)

const XlsxFullscreen: React.FC<{ frame: number }> = ({ frame }) => {
  const op = interpolate(frame, [1400, 1470], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ty = interpolate(frame, [1400, 1470], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        flex: 1,
        marginLeft: 48,
        marginTop: 6,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: theme.color.textMuted,
          fontStyle: "italic",
          marginBottom: 8,
          opacity: op,
        }}
      >
        ✓ Livrable généré — ouvrez-le dans votre espace de travail.
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          opacity: op,
          transform: `translateY(${ty}px)`,
        }}
      >
        <XlsxPreview
          progress={interpolate(frame, [1470, 1670], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        />
      </div>
    </div>
  );
};

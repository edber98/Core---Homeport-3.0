import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme, agents } from "../../theme";
import { AnimatedBg } from "../../components/AnimatedBg";
import { LucideIcon, IconName } from "../../components/AgentIcon";
import { easeOutExpo, easeInExpo } from "../../utils/easing";

// When an agent doesn't know how to do something, it writes and runs code
// inside a fully isolated sandbox.
// Example: scraping a competitor's pricing page that has no public API.
export const P05_SandboxCode: React.FC = () => {
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

  const alan = agents.find((a) => a.id === "alan")!;

  // Code lines — extract competitor pricing from HTML
  const codeLines: { t: string; color: string }[] = [
    { t: "# Extraction de la grille tarifaire de zapier.com/pricing", color: "#6b7280" },
    { t: "import requests", color: "#a78bfa" },
    { t: "from bs4 import BeautifulSoup", color: "#a78bfa" },
    { t: "", color: "" },
    { t: "url = 'https://zapier.com/pricing'", color: "#67e8f9" },
    { t: "html = requests.get(url, timeout=8).text", color: "#67e8f9" },
    { t: "soup = BeautifulSoup(html, 'html.parser')", color: "#67e8f9" },
    { t: "", color: "" },
    { t: "plans = []", color: "#67e8f9" },
    { t: "for card in soup.select('[data-testid=\"pricing-card\"]'):", color: "#67e8f9" },
    { t: "    name = card.select_one('h3').text.strip()", color: "#67e8f9" },
    { t: "    price = card.select_one('.price').text.strip()", color: "#67e8f9" },
    { t: "    plans.append({'name': name, 'price': price})", color: "#67e8f9" },
    { t: "", color: "" },
    { t: "return plans", color: "#fb7185" },
  ];

  const totalLines = codeLines.length;
  const linesVisible = Math.floor(
    interpolate(frame, [26, 230], [0, totalLines], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const running = frame >= 240 && frame < 340;
  const finished = frame >= 340;

  return (
    <AbsoluteFill style={{ opacity: inP * out }}>
      <AnimatedBg variant="light" intensity={0.6} />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 60,
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
          Infrastructure & sécurité
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: theme.color.text,
            marginTop: 10,
            letterSpacing: -1,
          }}
        >
          Quand l'agent ne sait pas, il <span style={{ color: theme.color.brand }}>code</span>.
        </div>
        <div
          style={{
            fontSize: 16,
            color: theme.color.textMuted,
            marginTop: 12,
            maxWidth: 940,
            margin: "12px auto 0",
            lineHeight: 1.5,
          }}
        >
          Aucune API disponible pour récupérer une grille tarifaire concurrente ? L'agent écrit le script
          et l'exécute dans un <strong style={{ color: theme.color.text }}>environnement isolé et sécurisé</strong>.
          Zéro risque pour votre système.
        </div>
      </div>

      {/* Main split */}
      <div
        style={{
          position: "absolute",
          top: 280,
          left: 80,
          right: 80,
          bottom: 50,
          display: "flex",
          gap: 24,
        }}
      >
        {/* Left: Alan's need + security badges */}
        <div style={{ flex: "0 0 360px", display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 18,
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "0 16px 40px rgba(0,0,0,0.06)",
              padding: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${alan.color}, ${alan.color}cc)`,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 8px 22px ${alan.color}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
                }}
              >
                <LucideIcon name="alan" size={22} color="#fff" strokeWidth={2} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.color.text }}>{alan.name}</div>
                <div style={{ fontSize: 11, color: theme.color.textMuted }}>Exécuteur code</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: theme.color.text, lineHeight: 1.55 }}>
              "Je dois récupérer la grille tarifaire de Zapier. Pas d'API publique —
              <strong> je vais scraper la page HTML</strong> avec un script isolé."
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Badge iconName="lock" label="Environnement isolé éphémère" desc="détruit après exécution" />
            <Badge iconName="shield" label="Sortie réseau contrôlée" desc="uniquement les sites autorisés" />
            <Badge iconName="zap" label="Limites CPU · RAM · temps" desc="1 vCPU · 512 Mo · 60 s max" />
            <Badge iconName="clipboard" label="Logs intégralement tracés" desc="audit · rejouable" />
          </div>
        </div>

        {/* Right: Code editor + terminal */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              flex: 1,
              background: "#0b1020",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "8px 14px",
                background: "#050814",
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 11,
                color: "rgba(255,255,255,0.6)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span style={{ display: "inline-flex", gap: 5 }}>
                <Dot color="#ff5f57" />
                <Dot color="#ffbd2e" />
                <Dot color="#28c840" />
              </span>
              <span style={{ color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>scrape_pricing.py</span>
              <span
                style={{
                  marginLeft: "auto",
                  color: "#22c55e",
                  fontSize: 10,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: 3, background: "#22c55e" }} />
                ISOLÉ · kinn-sbx-7a2d
              </span>
            </div>

            <div
              style={{
                flex: 1,
                padding: "16px 20px",
                fontFamily: "'SF Mono', Menlo, monospace",
                fontSize: 13,
                lineHeight: 1.75,
                color: "#e2e8f0",
                overflow: "hidden",
              }}
            >
              {codeLines.slice(0, linesVisible).map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 14 }}>
                  <span
                    style={{
                      color: "rgba(255,255,255,0.25)",
                      minWidth: 22,
                      textAlign: "right",
                      userSelect: "none",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ color: line.color || "#cbd5e1", whiteSpace: "pre" }}>{line.t || " "}</span>
                </div>
              ))}
              {linesVisible < totalLines && (
                <div style={{ display: "flex", gap: 14 }}>
                  <span style={{ color: "rgba(255,255,255,0.25)", minWidth: 22, textAlign: "right" }}>
                    {linesVisible + 1}
                  </span>
                  <span style={{ borderRight: "2px solid #e61982", paddingRight: 1 }}>&nbsp;</span>
                </div>
              )}
            </div>
          </div>

          {/* Terminal */}
          <div
            style={{
              height: 190,
              background: "#0b1020",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "7px 14px",
                background: "#050814",
                fontSize: 11,
                color: "rgba(255,255,255,0.65)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span>⏵ Terminal</span>
              <span
                style={{
                  marginLeft: "auto",
                  color: finished ? "#22c55e" : running ? "#f59e0b" : "rgba(255,255,255,0.4)",
                  fontSize: 10,
                }}
              >
                {finished ? "✓ EXITED 0" : running ? "● RUNNING" : "idle"}
              </span>
            </div>
            <div
              style={{
                flex: 1,
                padding: "14px 18px",
                fontFamily: "'SF Mono', Menlo, monospace",
                fontSize: 13,
                color: "#cbd5e1",
                lineHeight: 1.7,
              }}
            >
              {frame > 240 && (
                <div>
                  <span style={{ color: "#22c55e" }}>▸</span> python scrape_pricing.py
                </div>
              )}
              {frame > 255 && (
                <div style={{ color: "rgba(255,255,255,0.55)" }}>
                  [sandbox] environnement démarré · accès réseau limité à zapier.com
                </div>
              )}
              {frame > 275 && (
                <div style={{ color: "rgba(255,255,255,0.55)" }}>[http] GET zapier.com/pricing → 200 OK (247 ko)</div>
              )}
              {frame > 300 && (
                <div style={{ color: "rgba(255,255,255,0.55)" }}>[parse] 5 pricing-cards détectées dans le DOM</div>
              )}
              {finished && (
                <>
                  <div style={{ color: "#22c55e", fontWeight: 700 }}>
                    → [{"{"}'name': 'Free', 'price': '$0/mo'{"}"}, ..., {"{"}'name': 'Company', 'price': '$799/mo'{"}"}]
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.55)" }}>[sandbox] environnement détruit · disque effacé ✓</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Badge: React.FC<{ iconName: IconName; label: string; desc: string }> = ({ iconName, label, desc }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 14px",
      background: "#ffffff",
      border: "1px solid rgba(0,0,0,0.06)",
      borderRadius: 12,
      boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
    }}
  >
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        background: theme.color.brandLight,
        color: theme.color.brand,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <LucideIcon name={iconName} size={17} color={theme.color.brand} strokeWidth={2} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: theme.color.text }}>{label}</div>
      <div style={{ fontSize: 10, color: theme.color.textMuted, marginTop: 1 }}>{desc}</div>
    </div>
  </div>
);

const Dot: React.FC<{ color: string }> = ({ color }) => (
  <span style={{ width: 10, height: 10, borderRadius: 5, background: color, display: "inline-block" }} />
);

import React, { useCallback, useEffect, useRef, useState } from "react";
import { slides } from "./slides";

/**
 * Kinn Pitch Live — MP4 edition with white fade transitions.
 *
 * Controls :
 *  • Space           : toggle play/pause on the current slide.
 *  • → / Enter       : fade through white, move to next slide, auto-play.
 *  • ←               : fade through white, back to previous slide, idle.
 *  • ↓ / ↑           : jump to next / prev slide (no auto-play).
 *  • F               : fullscreen.
 *  • H               : keyboard shortcuts help.
 *
 * All transitions cross-fade through a solid white overlay (no black flash).
 * The rendered MP4s also start and end with a built-in white fade, so even
 * a hard cut looks seamless.
 */

type Status = "idle" | "playing" | "paused" | "ended";
const FADE_MS = 350;
type FadePhase = "off" | "in" | "hold" | "out";

export const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [fadePhase, setFadePhase] = useState<FadePhase>("off");
  const [showHelp, setShowHelp] = useState(false);
  const [autoPlayOnNext, setAutoPlayOnNext] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mouseIdle, setMouseIdle] = useState(false);
  const transitioningRef = useRef(false);
  const idleTimerRef = useRef<number | null>(null);

  const current = slides[idx];
  const isLast = idx === slides.length - 1;

  // Preload next slide
  useEffect(() => {
    const next = slides[idx + 1];
    if (!next) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "video";
    link.href = next.file;
    document.head.appendChild(link);
    return () => {
      if (link.parentNode) link.parentNode.removeChild(link);
    };
  }, [idx]);

  // If we just switched slide with autoPlayOnNext flag, launch the new one.
  useEffect(() => {
    if (!autoPlayOnNext) return;
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => undefined);
    setStatus("playing");
    setAutoPlayOnNext(false);
  }, [idx, autoPlayOnNext]);

  // Fullscreen listener
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // Auto-hide mouse cursor + chrome bar when the mouse stays still.
  useEffect(() => {
    const IDLE_MS = 1800;
    const bump = () => {
      setMouseIdle(false);
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
      idleTimerRef.current = window.setTimeout(() => {
        setMouseIdle(true);
      }, IDLE_MS);
    };
    bump();
    window.addEventListener("mousemove", bump);
    window.addEventListener("mousedown", bump);
    return () => {
      window.removeEventListener("mousemove", bump);
      window.removeEventListener("mousedown", bump);
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, []);

  // White-overlay transition helper.
  // The overlay is only mounted in the DOM while it's actually needed, so it
  // doesn't force a GPU compositing layer over the video during playback.
  const transition = useCallback((fn: () => void) => {
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    // Mount the overlay at opacity 0, then animate to 1 on the next frame.
    setFadePhase("in");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setFadePhase("hold"));
    });
    window.setTimeout(() => {
      fn();
      window.setTimeout(() => {
        setFadePhase("out");
        window.setTimeout(() => {
          setFadePhase("off");
          transitioningRef.current = false;
        }, FADE_MS);
      }, 60);
    }, FADE_MS);
  }, []);

  // Space : play/pause toggle on the CURRENT slide (no transition).
  const togglePlayPause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (status === "playing") {
      v.pause();
      setStatus("paused");
    } else {
      // idle, paused, or ended → play (ended restarts from 0)
      if (status === "ended") v.currentTime = 0;
      v.play().catch(() => undefined);
      setStatus("playing");
    }
  }, [status]);

  // Right arrow / Enter : fade through white, switch to next, AUTO-PLAY.
  const skipToNext = useCallback(() => {
    if (isLast) return;
    transition(() => {
      videoRef.current?.pause();
      setAutoPlayOnNext(true);
      setIdx((i) => i + 1);
      setStatus("idle");
    });
  }, [isLast, transition]);

  // Left arrow : fade, go back one slide, stay paused on first frame.
  const skipToPrev = useCallback(() => {
    transition(() => {
      videoRef.current?.pause();
      setIdx((i) => Math.max(0, i - 1));
      setStatus("idle");
    });
  }, [transition]);

  // Down arrow : jump forward without auto-play.
  const jumpNext = useCallback(() => {
    if (isLast) return;
    transition(() => {
      videoRef.current?.pause();
      setIdx((i) => i + 1);
      setStatus("idle");
    });
  }, [isLast, transition]);

  const jumpHome = useCallback(() => {
    transition(() => {
      videoRef.current?.pause();
      setIdx(0);
      setStatus("idle");
    });
  }, [transition]);

  const jumpEnd = useCallback(() => {
    transition(() => {
      videoRef.current?.pause();
      setIdx(slides.length - 1);
      setStatus("idle");
    });
  }, [transition]);

  // Video ended naturally : cross-fade to next slide, idle (presenter clicks
  // Space or → to launch it).
  const onEnded = useCallback(() => {
    if (isLast) {
      setStatus("ended");
      return;
    }
    transition(() => {
      setIdx((i) => i + 1);
      setStatus("idle");
    });
  }, [isLast, transition]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      document.documentElement.requestFullscreen().catch(() => undefined);
    }
  }, []);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      switch (e.key) {
        case " ":
          e.preventDefault();
          togglePlayPause();
          break;
        case "ArrowRight":
        case "Enter":
        case "PageDown":
          e.preventDefault();
          skipToNext();
          break;
        case "ArrowLeft":
        case "Backspace":
        case "PageUp":
          e.preventDefault();
          skipToPrev();
          break;
        case "ArrowDown":
          e.preventDefault();
          jumpNext();
          break;
        case "ArrowUp":
          e.preventDefault();
          skipToPrev();
          break;
        case "Home":
          e.preventDefault();
          jumpHome();
          break;
        case "End":
          e.preventDefault();
          jumpEnd();
          break;
        case "f":
        case "F":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
        case "h":
        case "H":
        case "?":
          e.preventDefault();
          setShowHelp((v) => !v);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    togglePlayPause,
    skipToNext,
    skipToPrev,
    jumpNext,
    jumpHome,
    jumpEnd,
    toggleFullscreen,
  ]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#ffffff",
        display: "grid",
        placeItems: "center",
        cursor: mouseIdle && !showHelp ? "none" : "default",
      }}
    >
      <video
        ref={videoRef}
        src={current.file}
        onEnded={onEnded}
        onClick={togglePlayPause}
        playsInline
        preload="auto"
        style={{
          width: "100vw",
          height: "100vh",
          objectFit: "contain",
          background: "#ffffff",
          cursor: mouseIdle ? "none" : "pointer",
        }}
      />

      {/* Global white fade overlay — only mounted during transitions. */}
      {fadePhase !== "off" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#ffffff",
            opacity: fadePhase === "hold" ? 1 : 0,
            transition: `opacity ${FADE_MS}ms ease-in-out`,
            pointerEvents: "none",
            zIndex: 80,
          }}
        />
      )}

      {/* First-launch hint */}
      {status === "idle" && idx === 0 && fadePhase === "off" && (
        <div
          onClick={togglePlayPause}
          style={{
            position: "fixed",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "rgba(255,255,255,0.6)",
            cursor: "pointer",
            zIndex: 70,
          }}
        >
          <div
            style={{
              padding: "22px 36px",
              background: "#ffffff",
              border: "1px solid rgba(15,23,42,0.08)",
              borderRadius: 22,
              textAlign: "center",
              color: "#0f172a",
              boxShadow: "0 24px 60px rgba(15,23,42,0.12)",
            }}
          >
            <div
              style={{
                fontSize: 13,
                color: "#e61982",
                textTransform: "uppercase",
                letterSpacing: 3,
                marginBottom: 8,
                fontWeight: 700,
              }}
            >
              Kinn · Pitch Live
            </div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>
              Espace pour démarrer
            </div>
            <div style={{ fontSize: 13, opacity: 0.55, marginTop: 8 }}>
              → passe à la suivante · F plein écran · H aide
            </div>
          </div>
        </div>
      )}

      {/* Bottom chrome */}
      <div
        style={{
          position: "fixed",
          bottom: 18,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 16px",
          background: "rgba(15,23,42,0.85)",
          color: "#fff",
          borderRadius: 999,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          fontSize: 12,
          fontWeight: 600,
          opacity: showHelp || mouseIdle ? 0 : 0.9,
          pointerEvents: showHelp || mouseIdle ? "none" : "auto",
          transition: "opacity 0.3s ease-out",
          zIndex: 90,
        }}
      >
        <span style={{ opacity: 0.65 }}>
          {idx + 1} / {slides.length}
        </span>
        <Sep />
        <ProgressDots count={slides.length} current={idx} />
        <Sep />
        <span
          style={{
            maxWidth: 360,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {current.title}
        </span>
        <Sep />
        <span
          style={{
            fontSize: 11,
            color:
              status === "playing"
                ? "#e61982"
                : "rgba(255,255,255,0.55)",
          }}
        >
          {status === "playing"
            ? "● LECTURE"
            : status === "paused"
              ? "⏸ PAUSE"
              : status === "ended"
                ? "FIN"
                : "EN ATTENTE"}
        </span>
        <Sep />
        <Ghost onClick={toggleFullscreen}>{isFullscreen ? "⤢" : "⛶"}</Ghost>
        <Ghost onClick={() => setShowHelp(true)}>?</Ghost>
      </div>

      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
    </div>
  );
};

const Sep: React.FC = () => (
  <span
    style={{
      width: 1,
      height: 14,
      background: "rgba(255,255,255,0.2)",
    }}
  />
);

const ProgressDots: React.FC<{ count: number; current: number }> = ({
  count,
  current,
}) => (
  <div style={{ display: "flex", gap: 4 }}>
    {Array.from({ length: count }).map((_, i) => (
      <span
        key={i}
        style={{
          width: i === current ? 18 : 6,
          height: 6,
          borderRadius: 3,
          background:
            i === current
              ? "#e61982"
              : i < current
                ? "rgba(230,25,130,0.5)"
                : "rgba(255,255,255,0.25)",
          transition: "width 0.25s, background 0.25s",
        }}
      />
    ))}
  </div>
);

const Ghost: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({
  onClick,
  children,
}) => (
  <button
    onClick={onClick}
    style={{
      background: "transparent",
      border: "none",
      color: "#fff",
      cursor: "pointer",
      padding: 2,
      fontSize: 14,
      display: "flex",
      alignItems: "center",
    }}
  >
    {children}
  </button>
);

const HelpOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,0.7)",
      backdropFilter: "blur(6px)",
      zIndex: 100,
      display: "grid",
      placeItems: "center",
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "#ffffff",
        color: "#0f172a",
        borderRadius: 20,
        padding: 32,
        width: 520,
        boxShadow: "0 40px 100px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>
        Raccourcis clavier
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Shortcut keys="Espace" label="Play / Pause de la slide courante" />
        <Shortcut keys="→ · Entrée" label="Fondu blanc → slide suivante (auto-play)" />
        <Shortcut keys="←" label="Fondu blanc → slide précédente (en pause)" />
        <Shortcut keys="↓" label="Sauter à la suivante sans auto-play" />
        <Shortcut keys="↑" label="Slide précédente" />
        <Shortcut keys="Home · End" label="Première · Dernière slide" />
        <Shortcut keys="F" label="Plein écran" />
        <Shortcut keys="H · ?" label="Afficher cette aide" />
      </div>
      <div
        style={{
          marginTop: 18,
          fontSize: 12,
          color: "rgba(15,23,42,0.6)",
          lineHeight: 1.5,
        }}
      >
        Les transitions cross-fadent à travers un blanc opaque. Aucun flash
        noir même si vous interrompez la lecture en plein milieu.
      </div>
    </div>
  </div>
);

const Shortcut: React.FC<{ keys: string; label: string }> = ({ keys, label }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: 13,
    }}
  >
    <span
      style={{
        background: "#f1f5f9",
        padding: "4px 10px",
        borderRadius: 8,
        fontFamily: "'SF Mono', Menlo, monospace",
        fontWeight: 600,
      }}
    >
      {keys}
    </span>
    <span style={{ color: "rgba(15,23,42,0.65)" }}>{label}</span>
  </div>
);

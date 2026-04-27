import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { KinnPitch } from "@motion/KinnPitch";
import { checkpoints, lastFrame } from "./checkpoints";
import { useKeyboard } from "./hooks/useKeyboard";
import { useFullscreen } from "./hooks/useFullscreen";
import { Icon } from "./components/Icon";
import { theme } from "./theme";

const FPS = 30;

const PLAYBACK_RATES = [1, 1.5, 2, 2.5, 3] as const;
type PlaybackRate = (typeof PLAYBACK_RATES)[number];

export const App: React.FC = () => {
  const playerRef = useRef<PlayerRef>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [rate, setRate] = useState<PlaybackRate>(2);
  const { isFullscreen, toggle } = useFullscreen();

  // Refs to avoid stale closures and to clean up listeners reliably.
  const currentIdxRef = useRef(0);
  const playingRef = useRef(false);
  const targetFrameRef = useRef<number | null>(null);
  const listenerRef = useRef<((d: { detail: { frame: number } }) => void) | null>(null);

  // Keep refs in sync with state
  useEffect(() => { currentIdxRef.current = currentIdx; }, [currentIdx]);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  // Detach the active timeupdate listener (if any).
  const clearListener = useCallback(() => {
    const p = playerRef.current;
    if (p && listenerRef.current) {
      p.removeEventListener("timeupdate", listenerRef.current);
    }
    listenerRef.current = null;
    targetFrameRef.current = null;
  }, []);

  // Low-level : park the player at `idx` (seek + pause + clean listener).
  const parkAt = useCallback((idx: number) => {
    const p = playerRef.current;
    if (!p) return;
    clearListener();
    const cp = checkpoints[idx];
    if (!cp) return;
    p.pause();
    p.seekTo(cp.frame);
    setCurrentIdx(idx);
    setPlaying(false);
  }, [clearListener]);

  // Start paused at checkpoint 0 + apply initial playback rate
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    p.seekTo(checkpoints[0].frame);
    p.pause();
    // @ts-expect-error — setPlaybackRate exists on the Player ref
    p.setPlaybackRate?.(rate);
    return () => clearListener();

  }, []);

  // Update playback rate whenever it changes
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    // @ts-expect-error — setPlaybackRate exists on the Player ref
    p.setPlaybackRate?.(rate);
  }, [rate]);

  const cycleRate = useCallback(() => {
    setRate((r) => {
      const i = PLAYBACK_RATES.indexOf(r);
      return PLAYBACK_RATES[(i + 1) % PLAYBACK_RATES.length];
    });
  }, []);

  // Advance : if already playing toward a target, fast-forward to that target
  // and stop. Otherwise start playing toward the next checkpoint.
  const advance = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;

    // Case 1 — already playing : cut the animation short and land on target.
    if (playingRef.current && targetFrameRef.current != null) {
      const target = targetFrameRef.current;
      clearListener();
      p.pause();
      p.seekTo(target);
      setPlaying(false);
      return;
    }

    // Case 2 — paused : start playing toward the next checkpoint.
    const idx = currentIdxRef.current;
    const next = checkpoints[idx + 1];
    if (!next) {
      // We are at the last checkpoint : jump to end.
      clearListener();
      p.seekTo(lastFrame - 1);
      p.pause();
      return;
    }
    // Update currentIdx immediately so UI reflects target position.
    setCurrentIdx(idx + 1);
    targetFrameRef.current = next.frame;
    setPlaying(true);
    p.play();

    // Attach a listener that pauses when we reach `next.frame`.
    const onFrame = (data: { detail: { frame: number } }) => {
      if (data.detail.frame >= next.frame) {
        clearListener();
        p.pause();
        p.seekTo(next.frame);
        setPlaying(false);
      }
    };
    listenerRef.current = onFrame;
    p.addEventListener("timeupdate", onFrame);
  }, [clearListener]);

  // Rewind : jump back to previous checkpoint (kills any in-flight playback).
  const rewind = useCallback(() => {
    const idx = currentIdxRef.current;
    if (idx <= 0) return;
    parkAt(idx - 1);
  }, [parkAt]);

  // Jump to next slide start (find first checkpoint of a different slide)
  const nextSlide = useCallback(() => {
    const idx = currentIdxRef.current;
    const currentSlide = checkpoints[idx].slide;
    const nextIdx = checkpoints.findIndex(
      (c, i) => i > idx && c.slide !== currentSlide
    );
    if (nextIdx === -1) return;
    parkAt(nextIdx);
  }, [parkAt]);

  const prevSlide = useCallback(() => {
    const idx = currentIdxRef.current;
    const currentSlide = checkpoints[idx].slide;
    let targetIdx = -1;
    for (let i = idx - 1; i >= 0; i--) {
      if (checkpoints[i].slide !== currentSlide) {
        const slide = checkpoints[i].slide;
        let j = i;
        while (j > 0 && checkpoints[j - 1].slide === slide) j--;
        targetIdx = j;
        break;
      }
    }
    if (targetIdx === -1) targetIdx = 0;
    parkAt(targetIdx);
  }, [parkAt]);

  const first = useCallback(() => parkAt(0), [parkAt]);
  const last = useCallback(() => parkAt(checkpoints.length - 1), [parkAt]);

  useKeyboard({
    onAdvance: advance,
    onRewind: rewind,
    onNextSlide: nextSlide,
    onPrevSlide: prevSlide,
    onFirst: first,
    onLast: last,
    onToggleFullscreen: toggle,
    onToggleHelp: () => setShowHelp((v) => !v),
    onCycleRate: cycleRate,
  });

  const current = checkpoints[currentIdx];
  // slide-level progress
  const slidePositions = useMemo(() => {
    const map: Record<string, { first: number; total: number; index: number }> = {};
    checkpoints.forEach((c, i) => {
      if (!map[c.slide]) map[c.slide] = { first: i, total: 0, index: 0 };
    });
    Object.keys(map).forEach((slide) => {
      const entries = checkpoints.filter((c) => c.slide === slide);
      map[slide].total = entries.length;
    });
    return map;
  }, []);
  const slideInfo = slidePositions[current.slide];
  const slideStepIdx = currentIdx - slideInfo.first;
  const uniqueSlides = Object.keys(slidePositions);
  const slideNumber = uniqueSlides.indexOf(current.slide) + 1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
    >
      <PlayerStage>
        <Player
          ref={playerRef}
          component={KinnPitch}
          durationInFrames={lastFrame}
          compositionWidth={1920}
          compositionHeight={1080}
          fps={FPS}
          style={{ width: "100%", height: "100%" }}
          controls={false}
          autoPlay={false}
          loop={false}
          clickToPlay={false}
          spaceKeyToPlayOrPause={false}
          showVolumeControls={false}
        />
      </PlayerStage>

      {/* Bottom chrome */}
      <div
        style={{
          position: "fixed",
          bottom: 12,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "8px 14px",
          background: "rgba(15,23,42,0.85)",
          color: "#fff",
          borderRadius: 999,
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: 0.3,
          boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          zIndex: 100,
          opacity: 0.92,
        }}
      >
        <span style={{ opacity: 0.7 }}>
          {slideNumber}/{uniqueSlides.length} · {current.slide}
        </span>
        <Sep />
        <StepDots count={slideInfo.total} step={slideStepIdx} />
        <Sep />
        <span
          style={{
            maxWidth: 360,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {current.label}
        </span>
        <Sep />
        {playing && (
          <>
            <span style={{ color: theme.color.brand, display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: theme.color.brand,
                }}
                className="kn-pulse"
              />
              Lecture
            </span>
            <Sep />
          </>
        )}
        <button
          onClick={cycleRate}
          title="Vitesse de lecture (R)"
          style={{
            background: "rgba(230,25,130,0.18)",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            padding: "3px 8px",
            borderRadius: 6,
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: 0.3,
            display: "flex",
            alignItems: "center",
          }}
        >
          {rate}×
        </button>
        <Ghost onClick={toggle} title={isFullscreen ? "Quitter plein écran (F)" : "Plein écran (F)"}>
          <Icon name={isFullscreen ? "minimize" : "maximize"} size={14} color="#fff" />
        </Ghost>
        <Ghost onClick={() => setShowHelp((v) => !v)} title="Aide (H)">
          <Icon name="help" size={14} color="#fff" />
        </Ghost>
      </div>

      {showHelp && <HelpOverlay onClose={() => setShowHelp(false)} />}
    </div>
  );
};

const PlayerStage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dims, setDims] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const recompute = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const ratio = 1920 / 1080;
      // Fit while preserving ratio
      let W = w;
      let H = w / ratio;
      if (H > h) {
        H = h;
        W = h * ratio;
      }
      setDims({ w: W, h: H });
    };
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, []);
  return (
    <div
      style={{
        width: dims.w,
        height: dims.h,
        position: "relative",
        background: "#f5f5f7",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
};

const Sep: React.FC = () => (
  <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.2)" }} />
);

const Ghost: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
}> = ({ children, onClick, title }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      background: "transparent",
      border: "none",
      color: "#fff",
      cursor: "pointer",
      padding: 2,
      display: "flex",
      alignItems: "center",
    }}
  >
    {children}
  </button>
);

const StepDots: React.FC<{ count: number; step: number }> = ({ count, step }) => (
  <div style={{ display: "flex", gap: 4 }}>
    {Array.from({ length: count }).map((_, i) => (
      <span
        key={i}
        style={{
          width: i === step ? 16 : 6,
          height: 6,
          borderRadius: 3,
          background:
            i === step
              ? theme.color.brand
              : i < step
                ? "rgba(230,25,130,0.55)"
                : "rgba(255,255,255,0.25)",
          transition: "width 0.3s, background 0.3s",
        }}
      />
    ))}
  </div>
);

const HelpOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(4px)",
      zIndex: 200,
      display: "grid",
      placeItems: "center",
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "#ffffff",
        borderRadius: 18,
        padding: 28,
        width: 460,
        boxShadow: "0 40px 80px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 18, color: theme.color.text }}>
        Raccourcis clavier
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Shortcut keys="Espace · →" label="Jouer jusqu'au prochain point d'arrêt" />
        <Shortcut keys="←" label="Revenir au point précédent" />
        <Shortcut keys="↓" label="Slide suivante (saute le reste)" />
        <Shortcut keys="↑" label="Slide précédente" />
        <Shortcut keys="Home" label="Début de la présentation" />
        <Shortcut keys="End" label="Fin de la présentation" />
        <Shortcut keys="F" label="Plein écran" />
        <Shortcut keys="R" label="Changer la vitesse de lecture" />
        <Shortcut keys="H · ?" label="Afficher / masquer cette aide" />
      </div>
      <div style={{ marginTop: 18, fontSize: 12, color: theme.color.textMuted, lineHeight: 1.5 }}>
        La présentation utilise la même composition Remotion que le rendu vidéo.
        Entre deux points d'arrêt, l'animation joue à vitesse normale ; sur un point
        d'arrêt, tout reste fixe sur la frame clé.
      </div>
    </div>
  </div>
);

const Shortcut: React.FC<{ keys: string; label: string }> = ({ keys, label }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
    <span
      style={{
        background: theme.color.bg,
        padding: "4px 10px",
        borderRadius: 8,
        fontFamily: "'SF Mono', Menlo, monospace",
        fontWeight: 600,
        color: theme.color.text,
      }}
    >
      {keys}
    </span>
    <span style={{ color: theme.color.textMuted }}>{label}</span>
  </div>
);

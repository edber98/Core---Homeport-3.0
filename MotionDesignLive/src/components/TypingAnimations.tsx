import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

// Deterministic pseudo-random in [0, 1) for a given integer.
function seededRand(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Pre-computes the frame at which each character appears, with human-like
 *  variability : slight jitter per key + longer pauses after punctuation. */
function buildCharTiming(
  text: string,
  startFrame: number,
  cps: number,
  fps: number
): number[] {
  const base = fps / cps;
  let current = startFrame;
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const jitter = 0.6 + seededRand(i) * 0.8;
    let delta = base * jitter;
    if (ch === "." || ch === "!" || ch === "?") delta += fps * 0.28;
    else if (ch === "," || ch === ";" || ch === ":") delta += fps * 0.14;
    else if (ch === "\n") delta += fps * 0.22;
    else if (ch === " ") delta += base * 0.3;
    current += delta;
    out.push(current);
  }
  return out;
}

/**
 * TypingText — human-like typing with jitter + punctuation pauses.
 * Everything is frame-based so Remotion's MP4 render captures it properly
 * (browser CSS animations do NOT play during frame-by-frame capture).
 */
export const TypingText: React.FC<{
  text: string;
  startFrame: number;
  cps?: number;
  caret?: boolean;
  caretColor?: string;
  style?: React.CSSProperties;
}> = ({
  text,
  startFrame,
  cps = 80,
  caret = true,
  caretColor = theme.color.brand,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const timing = React.useMemo(
    () => buildCharTiming(text, startFrame, cps, fps),
    [text, startFrame, cps, fps]
  );

  let charsVisible = 0;
  for (let i = 0; i < timing.length; i++) {
    if (timing[i] <= frame) charsVisible++;
    else break;
  }
  const typed = text.slice(0, charsVisible);
  const started = frame >= startFrame;
  // Frame-based blink : ticks every 10 frames
  const caretVisible = caret && started && Math.floor(frame / 10) % 2 === 0;

  return (
    <span style={{ whiteSpace: "pre-wrap", ...style }}>
      {typed}
      {caretVisible && (
        <span
          style={{
            display: "inline-block",
            width: 2,
            height: "1em",
            background: caretColor,
            marginLeft: 1,
            verticalAlign: "text-bottom",
          }}
        />
      )}
    </span>
  );
};

/**
 * StreamingText — LLM-style token-by-token reveal with fade + translateY + blur.
 * Cursor blink is frame-based so it renders correctly in the MP4.
 */
export const StreamingText: React.FC<{
  text: string;
  startFrame: number;
  wps?: number;
  fadeFrames?: number;
  cursor?: boolean;
  cursorColor?: string;
  style?: React.CSSProperties;
}> = ({
  text,
  startFrame,
  wps = 16,
  fadeFrames = 5,
  cursor = true,
  cursorColor = theme.color.brand,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tokens = React.useMemo(() => text.split(/(\s+)/), [text]);
  const schedule = React.useMemo(() => {
    const base = fps / wps;
    let t = startFrame;
    const out: number[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (/^\s+$/.test(tok) || tok === "") {
        out.push(t);
        continue;
      }
      const jitter = 0.7 + seededRand(i * 7) * 0.6;
      let delta = base * jitter;
      if (/[.!?]$/.test(tok)) delta += fps * 0.25;
      else if (/[,:;]$/.test(tok)) delta += fps * 0.12;
      t += delta;
      out.push(t);
    }
    return out;
  }, [tokens, startFrame, wps, fps]);

  const revealedCount = schedule.filter((f) => f <= frame).length;
  const isStreaming = revealedCount < tokens.length;
  const started = frame >= startFrame;
  const cursorVisible =
    cursor && started && isStreaming && Math.floor(frame / 8) % 2 === 0;

  return (
    <span style={{ whiteSpace: "pre-wrap", ...style }}>
      {tokens.map((tok, i) => {
        if (i >= revealedCount) return null;
        if (/^\s+$/.test(tok) || tok === "") {
          return <React.Fragment key={i}>{tok}</React.Fragment>;
        }
        const revealAt = schedule[i];
        const localFrame = frame - revealAt;
        const opacity = interpolate(localFrame, [0, fadeFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const ty = interpolate(localFrame, [0, fadeFrames], [4, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const blur = interpolate(localFrame, [0, fadeFrames * 0.7], [2.4, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity,
              transform: `translateY(${ty}px)`,
              filter: `blur(${blur}px)`,
              willChange: "opacity, transform, filter",
            }}
          >
            {tok}
          </span>
        );
      })}
      {cursorVisible && (
        <span
          style={{
            display: "inline-block",
            width: 6,
            height: "0.9em",
            background: cursorColor,
            marginLeft: 3,
            borderRadius: 1,
            verticalAlign: "text-bottom",
            boxShadow: `0 0 8px ${cursorColor}66`,
          }}
        />
      )}
    </span>
  );
};

export function framesForTyping(text: string, cps: number, fps: number): number {
  return Math.ceil((text.length / cps) * fps * 1.25);
}

export function framesForStreaming(text: string, wps: number, fps: number): number {
  const tokens = text.split(/(\s+)/).filter((t) => t.trim() !== "").length;
  return Math.ceil((tokens / wps) * fps * 1.2);
}

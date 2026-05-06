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
    // 0.6× to 1.4× the base interval, deterministic per char position
    const jitter = 0.6 + seededRand(i) * 0.8;
    let delta = base * jitter;
    // Pauses after punctuation / newlines feel natural
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
 * TypingText — simulates a human typing with character-level jitter and
 * pauses after punctuation. The blinking caret is pure CSS so it keeps
 * blinking even when Remotion Player is paused on a checkpoint.
 */
export const TypingText: React.FC<{
  text: string;
  startFrame: number;
  cps?: number;
  caret?: boolean;
  caretColor?: string;
  style?: React.CSSProperties;
}> = ({ text, startFrame, cps = 80, caret = true, caretColor = theme.color.brand, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const timing = React.useMemo(
    () => buildCharTiming(text, startFrame, cps, fps),
    [text, startFrame, cps, fps]
  );

  // Count how many characters should be visible at this frame
  let charsVisible = 0;
  for (let i = 0; i < timing.length; i++) {
    if (timing[i] <= frame) charsVisible++;
    else break;
  }
  const typed = text.slice(0, charsVisible);
  const started = frame >= startFrame;

  return (
    <span style={{ whiteSpace: "pre-wrap", ...style }}>
      {typed}
      {caret && started && (
        <span className="kn-caret" style={{ background: caretColor }} />
      )}
    </span>
  );
};

/**
 * StreamingText — simulates an LLM streaming its response. Each token fades in
 * with translateY + blur (ChatGPT-style). The streaming cursor is CSS, so it
 * keeps blinking during paused checkpoints.
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
  // Schedule each token with mild jitter for a more natural cadence
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
      const jitter = 0.7 + seededRand(i * 7) * 0.6; // 0.7..1.3
      let delta = base * jitter;
      // Short pause after sentence-ending tokens
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

  return (
    <span style={{ whiteSpace: "pre-wrap", ...style }}>
      {tokens.map((tok, i) => {
        if (i >= revealedCount) return null;

        // Whitespace tokens : no animation (they just fill the gap).
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
      {isStreaming && started && cursor && (
        <span
          className="kn-stream-cursor"
          style={{
            background: cursorColor,
            boxShadow: `0 0 8px ${cursorColor}66`,
          }}
        />
      )}
    </span>
  );
};

/**
 * Approximates the number of frames a given typed text will take, accounting
 * for the pauses and jitter applied by TypingText. Useful for scheduling the
 * click on "Send" right after typing completes.
 */
export function framesForTyping(text: string, cps: number, fps: number): number {
  // Include ~25 % buffer to cover jitter + punctuation pauses
  return Math.ceil((text.length / cps) * fps * 1.25);
}

/**
 * Approximate number of frames StreamingText will take. Useful for scheduling
 * what comes after an LLM reply.
 */
export function framesForStreaming(text: string, wps: number, fps: number): number {
  const tokens = text.split(/(\s+)/).filter((t) => t.trim() !== "").length;
  return Math.ceil((tokens / wps) * fps * 1.2);
}

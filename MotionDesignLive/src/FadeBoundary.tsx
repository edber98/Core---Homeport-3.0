import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * FadeBoundary — wraps a scene so its exported MP4 starts with a black fade-in
 * and ends with a black fade-out. Makes seamless transitions possible when the
 * clips are chained in a live presentation (HTML5 video or PowerPoint).
 *
 * Default fade length : 12 frames (0.4s at 30fps).
 */
export const FadeBoundary: React.FC<{
  children: React.ReactNode;
  fadeIn?: number;
  fadeOut?: number;
}> = ({ children, fadeIn = 12, fadeOut = 12 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const inA = interpolate(frame, [0, fadeIn], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outA = interpolate(
    frame,
    [durationInFrames - fadeOut, durationInFrames - 1],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const alpha = Math.max(inA, outA);

  return (
    <AbsoluteFill>
      {children}
      {/* White overlay — opaque at the edges, transparent in the middle. */}
      <AbsoluteFill
        style={{
          background: "#ffffff",
          opacity: alpha,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

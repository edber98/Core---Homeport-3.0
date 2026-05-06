import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { easeOutExpo, easeInExpo } from "../utils/easing";

// Wrap a scene to give it cinema in/out transitions:
// - IN: depth zoom + blur fade
// - OUT: pull-back zoom + blur + fade
export const SceneTransition: React.FC<{
  children: React.ReactNode;
  inDuration?: number;
  outDuration?: number;
  style?: "depth" | "slide" | "fade";
}> = ({ children, inDuration = 18, outDuration = 18, style = "depth" }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const inProgress = interpolate(frame, [0, inDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easeOutExpo,
  });
  const outProgress = interpolate(
    frame,
    [durationInFrames - outDuration, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeInExpo }
  );

  let transform = "";
  let opacity = 1;
  let filter = "";

  if (style === "depth") {
    const inScale = interpolate(inProgress, [0, 1], [1.12, 1]);
    const outScale = interpolate(outProgress, [0, 1], [1, 0.94]);
    const blurIn = interpolate(inProgress, [0, 1], [14, 0]);
    const blurOut = interpolate(outProgress, [0, 1], [0, 10]);
    transform = `scale(${inScale * outScale})`;
    opacity = inProgress * (1 - outProgress);
    filter = `blur(${blurIn + blurOut}px)`;
  } else if (style === "slide") {
    const inX = interpolate(inProgress, [0, 1], [80, 0]);
    const outX = interpolate(outProgress, [0, 1], [0, -80]);
    transform = `translateX(${inX + outX}px)`;
    opacity = inProgress * (1 - outProgress);
  } else {
    opacity = inProgress * (1 - outProgress);
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform,
        opacity,
        filter,
        transformOrigin: "center center",
      }}
    >
      {children}
    </div>
  );
};

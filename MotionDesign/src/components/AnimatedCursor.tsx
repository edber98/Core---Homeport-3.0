import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { easeInOutCubic, easeOutExpo } from "../utils/easing";

export type CursorKeyframe = { frame: number; x: number; y: number; click?: boolean };

// Animated macOS-style cursor that travels between keyframes.
export const AnimatedCursor: React.FC<{
  keyframes: CursorKeyframe[];
  size?: number;
  opacity?: number;
}> = ({ keyframes, size = 28, opacity = 1 }) => {
  const frame = useCurrentFrame();

  if (keyframes.length === 0) return null;

  // Find current segment
  let x = keyframes[0].x;
  let y = keyframes[0].y;
  let clicking = false;

  for (let i = 0; i < keyframes.length; i++) {
    const kf = keyframes[i];
    const next = keyframes[i + 1];
    if (frame >= kf.frame && (!next || frame < next.frame)) {
      if (!next) {
        x = kf.x;
        y = kf.y;
      } else {
        const p = interpolate(frame, [kf.frame, next.frame], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: easeInOutCubic,
        });
        x = kf.x + (next.x - kf.x) * p;
        y = kf.y + (next.y - kf.y) * p;
      }
      // Clicking animation in a 6-frame window around the click keyframe
      if (kf.click && frame >= kf.frame - 2 && frame <= kf.frame + 4) {
        clicking = true;
      }
      break;
    }
  }

  // Click ripple
  const clickRipples = keyframes
    .filter((k) => k.click)
    .map((k) => {
      const delta = frame - k.frame;
      if (delta < 0 || delta > 22) return null;
      const s = interpolate(delta, [0, 22], [0, 1], { extrapolateRight: "clamp", easing: easeOutExpo });
      const op = interpolate(delta, [0, 22], [0.6, 0]);
      return { key: k.frame, x: k.x, y: k.y, scale: s, opacity: op };
    })
    .filter(Boolean);

  const scale = clicking ? 0.85 : 1;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 100,
        opacity,
      }}
    >
      {clickRipples.map(
        (r) =>
          r && (
            <div
              key={r.key}
              style={{
                position: "absolute",
                left: r.x,
                top: r.y,
                width: 48,
                height: 48,
                marginLeft: -24,
                marginTop: -24,
                borderRadius: "50%",
                border: "2px solid #e61982",
                transform: `scale(${r.scale * 1.6})`,
                opacity: r.opacity,
              }}
            />
          )
      )}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y,
          width: size,
          height: size,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.25))",
          transition: "transform 0.1s",
        }}
      >
        <svg width={size} height={size} viewBox="0 0 28 28">
          <path
            d="M5 3 L5 22 L10.5 17.5 L13.5 24.5 L16 23.5 L13 16.5 L20 16.5 Z"
            fill="#ffffff"
            stroke="#111"
            strokeWidth={1.3}
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

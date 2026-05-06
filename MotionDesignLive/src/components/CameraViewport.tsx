import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { easeInOutCubic } from "../utils/easing";

export type CameraKeyframe = {
  frame: number;
  // Focus point in scene space (viewport is 1920x1080 by default)
  cx: number;
  cy: number;
  zoom: number;
  // Optional easing override per keyframe
  easing?: (n: number) => number;
};

export type CameraShot = {
  keyframes: CameraKeyframe[];
  width?: number; // logical scene width (default 1920)
  height?: number; // logical scene height (default 1080)
};

// Interpolates smoothly between keyframes (cx, cy, zoom) and applies a
// transform that zooms the children around the focus point.
export const CameraViewport: React.FC<{
  shot: CameraShot;
  children: React.ReactNode;
  background?: string;
  // When true, the "app window" floats in the space with a 3D shadow and
  // rounded corners are visible when zoomed out.
  window3d?: boolean;
}> = ({ shot, children, background = "#ffffff", window3d = true }) => {
  const frame = useCurrentFrame();
  const W = shot.width ?? 1920;
  const H = shot.height ?? 1080;

  const kfs = shot.keyframes;
  let cx = kfs[0].cx;
  let cy = kfs[0].cy;
  let zoom = kfs[0].zoom;

  for (let i = 0; i < kfs.length; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (!b) {
      if (frame >= a.frame) {
        cx = a.cx;
        cy = a.cy;
        zoom = a.zoom;
      }
      break;
    }
    if (frame >= a.frame && frame < b.frame) {
      const easing = b.easing ?? easeInOutCubic;
      const p = interpolate(frame, [a.frame, b.frame], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing,
      });
      cx = a.cx + (b.cx - a.cx) * p;
      cy = a.cy + (b.cy - a.cy) * p;
      zoom = a.zoom + (b.zoom - a.zoom) * p;
      break;
    }
  }

  // Subtle idle rotation on the window for a 3D feel — only when zoomed out.
  const rotAmount = Math.max(0, 1.5 - zoom) * 1; // stronger rotation when zoom < 1.5
  const t = frame / 30;
  const rotX = Math.sin(t * 0.3) * rotAmount;
  const rotY = Math.cos(t * 0.22) * rotAmount * 1.2;

  // Translate so that (cx, cy) in scene space lands at viewport center (W/2, H/2) after zoom.
  const tx = W / 2 - cx * zoom;
  const ty = H / 2 - cy * zoom;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "linear-gradient(135deg, #fafafa 0%, #ffffff 50%, #f4f4f6 100%)",
        perspective: 2600,
      }}
    >
      {/* Subtle grid / dust pattern behind the paper */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(230,25,130,0.04) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(124,58,237,0.035) 0%, transparent 45%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: W,
          height: H,
          transform: `translate(${tx}px, ${ty}px) scale(${zoom}) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
          transformOrigin: "0 0",
          transformStyle: "preserve-3d",
          willChange: "transform",
          borderRadius: window3d ? 26 : 0,
          overflow: "hidden",
          background: "#ffffff",
          // Crisp paper shadow — clearly visible floating on white background.
          boxShadow: window3d
            ? [
                "0 2px 4px rgba(15,23,42,0.04)",
                "0 8px 16px rgba(15,23,42,0.06)",
                "0 32px 64px rgba(15,23,42,0.12)",
                "0 80px 160px rgba(15,23,42,0.18)",
                "0 0 0 1px rgba(15,23,42,0.05)",
              ].join(", ")
            : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
};

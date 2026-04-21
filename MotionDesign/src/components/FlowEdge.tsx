import React from "react";
import { theme } from "../theme";

export const FlowEdge: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress?: number;
  color?: string;
}> = ({ x1, y1, x2, y2, progress = 1, color = theme.color.nodeConnection }) => {
  const dx = x2 - x1;
  const midX = x1 + dx / 2;
  const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

  return (
    <svg
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - progress}
      />
    </svg>
  );
};

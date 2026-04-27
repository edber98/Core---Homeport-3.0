import React from "react";

/**
 * AmbientStyles — injects a global <style> block with CSS keyframes used by
 * ambient animations (blinking cursors, flowing packets, pulsing dots…).
 *
 * These animations are driven by the browser's animation engine, NOT by
 * Remotion's frame counter — so they keep running when a Remotion Player is
 * paused on a checkpoint. Indispensable for the live pitch experience.
 *
 * Mount this once, ideally at the top of the composition (`KinnPitch.tsx`).
 */
export const AmbientStyles: React.FC = () => (
  <style>{`
    @keyframes kn-blink {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0; }
    }
    @keyframes kn-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes kn-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.55; transform: scale(0.85); }
    }
    @keyframes kn-pulse-strong {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(230,25,130,0.55);
      }
      70% {
        box-shadow: 0 0 0 14px rgba(230,25,130,0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(230,25,130,0);
      }
    }
    @keyframes kn-breathe {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.04); }
    }
    @keyframes kn-dot-wave {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
      30% { transform: translateY(-5px); opacity: 1; }
    }
    @keyframes kn-dash-flow {
      from { stroke-dashoffset: 0; }
      to { stroke-dashoffset: -40; }
    }
    @keyframes kn-packet-flow {
      from { offset-distance: 0%; }
      to { offset-distance: 100%; }
    }
    @keyframes kn-orbit {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes kn-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .kn-caret {
      display: inline-block;
      width: 2px;
      height: 1em;
      margin-left: 1px;
      vertical-align: text-bottom;
      animation: kn-blink 1s steps(2, end) infinite;
    }
    .kn-stream-cursor {
      display: inline-block;
      width: 6px;
      height: 0.9em;
      margin-left: 3px;
      border-radius: 1px;
      vertical-align: text-bottom;
      animation: kn-blink 0.9s steps(2, end) infinite;
    }
    .kn-spin { animation: kn-spin 1.1s linear infinite; }
    .kn-pulse { animation: kn-pulse 1.6s ease-in-out infinite; }
    .kn-pulse-strong { animation: kn-pulse-strong 1.8s ease-out infinite; }
    .kn-breathe { animation: kn-breathe 3.8s ease-in-out infinite; }
    .kn-dot-wave { animation: kn-dot-wave 1.2s ease-in-out infinite; }
    .kn-dash-flow { animation: kn-dash-flow 1.4s linear infinite; }

    /* Stagger helpers for wave loaders */
    .kn-dot-wave:nth-child(1) { animation-delay: 0s; }
    .kn-dot-wave:nth-child(2) { animation-delay: 0.15s; }
    .kn-dot-wave:nth-child(3) { animation-delay: 0.3s; }
  `}</style>
);

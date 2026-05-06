import { useEffect } from "react";

type Handlers = {
  onAdvance: () => void;
  onRewind: () => void;
  onNextSlide: () => void;
  onPrevSlide: () => void;
  onFirst?: () => void;
  onLast?: () => void;
  onToggleFullscreen?: () => void;
  onToggleHelp?: () => void;
  onCycleRate?: () => void;
};

export function useKeyboard(h: Handlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore if user is typing somewhere
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
        case "ArrowRight":
        case "PageDown":
        case "Enter":
          e.preventDefault();
          h.onAdvance();
          break;
        case "ArrowLeft":
        case "PageUp":
        case "Backspace":
          e.preventDefault();
          h.onRewind();
          break;
        case "ArrowDown":
          e.preventDefault();
          h.onNextSlide();
          break;
        case "ArrowUp":
          e.preventDefault();
          h.onPrevSlide();
          break;
        case "Home":
          e.preventDefault();
          h.onFirst?.();
          break;
        case "End":
          e.preventDefault();
          h.onLast?.();
          break;
        case "f":
        case "F":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            h.onToggleFullscreen?.();
          }
          break;
        case "?":
        case "h":
          e.preventDefault();
          h.onToggleHelp?.();
          break;
        case "r":
        case "R":
          e.preventDefault();
          h.onCycleRate?.();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [h]);
}

import { useCallback, useState } from "react";

export type PitchState = {
  slideIndex: number;
  step: number;
};

export function usePitchState(
  slideStepCounts: number[],
  initial: PitchState = { slideIndex: 0, step: 0 }
) {
  const [state, setState] = useState<PitchState>(initial);

  const advance = useCallback(() => {
    setState((s) => {
      const maxStep = slideStepCounts[s.slideIndex] - 1;
      if (s.step < maxStep) return { ...s, step: s.step + 1 };
      if (s.slideIndex < slideStepCounts.length - 1)
        return { slideIndex: s.slideIndex + 1, step: 0 };
      return s;
    });
  }, [slideStepCounts]);

  const rewind = useCallback(() => {
    setState((s) => {
      if (s.step > 0) return { ...s, step: s.step - 1 };
      if (s.slideIndex > 0) {
        const prev = s.slideIndex - 1;
        return { slideIndex: prev, step: slideStepCounts[prev] - 1 };
      }
      return s;
    });
  }, [slideStepCounts]);

  const nextSlide = useCallback(() => {
    setState((s) => {
      if (s.slideIndex < slideStepCounts.length - 1)
        return { slideIndex: s.slideIndex + 1, step: 0 };
      return s;
    });
  }, [slideStepCounts]);

  const prevSlide = useCallback(() => {
    setState((s) => {
      if (s.slideIndex > 0) return { slideIndex: s.slideIndex - 1, step: 0 };
      return s;
    });
  }, []);

  const goTo = useCallback((slideIndex: number, step = 0) => {
    setState({ slideIndex, step });
  }, []);

  const first = useCallback(() => setState({ slideIndex: 0, step: 0 }), []);
  const last = useCallback(
    () =>
      setState({
        slideIndex: slideStepCounts.length - 1,
        step: slideStepCounts[slideStepCounts.length - 1] - 1,
      }),
    [slideStepCounts]
  );

  return { state, advance, rewind, nextSlide, prevSlide, goTo, first, last };
}

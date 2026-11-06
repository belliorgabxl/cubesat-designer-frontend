"use client";

import { useEffect, useState } from "react";

import { api, errorMessage } from "./api";
import type { Evaluation, MissionType, Placements } from "./types";

const DEBOUNCE_MS = 300;

export interface EvaluationState {
  result: Evaluation | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

interface Input {
  frameId: number;
  missionType: MissionType;
  altitudeKm: number;
  placements: Placements;
}


export function useEvaluation(input: Input | null): EvaluationState {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ key: string; result: Evaluation | null; error: string | null }>({
    key: "",
    result: null,
    error: null,
  });

  const key = input ? `${JSON.stringify(input)}#${attempt}` : "";

  useEffect(() => {
    if (!input) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api
        .evaluate(
          {
            frame: input.frameId,
            mission_type: input.missionType,
            altitude_km: input.altitudeKm,
            placements: input.placements,
          },
          controller.signal,
        )
        .then((result) => setSettled({ key, result, error: null }))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setSettled((previous) => ({ key, result: previous.result, error: errorMessage(error) }));
        });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    result: settled.result,
    loading: input !== null && settled.key !== key,
    error: settled.key === key ? settled.error : null,
    retry: () => setAttempt((value) => value + 1),
  };
}

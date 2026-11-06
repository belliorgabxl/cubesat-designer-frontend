"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { api, ApiError, errorMessage } from "./api";
import { toModuleMap } from "./placement";
import type { Frame, Module, ModuleMap } from "./types";

const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribeDesktop(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );
}

export interface Catalogue {
  frames: Frame[];
  modules: Module[];
  moduleMap: ModuleMap;
}

type LoadState<T> =
  | { status: "loading" }
  | { status: "error"; message: string; httpStatus: number | null }
  | { status: "ready"; data: T };

export function useLoad<T>(loader: () => Promise<T>, key: string): LoadState<T> & { retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const token = `${key}:${attempt}`;
  const [result, setResult] = useState<{ token: string; state: LoadState<T> } | null>(null);

  useEffect(() => {
    let active = true;
    loader()
      .then((data) => {
        if (active) setResult({ token, state: { status: "ready", data } });
      })
      .catch((error: unknown) => {
        if (active) {
          const httpStatus = error instanceof ApiError ? error.status : null;
          setResult({ token, state: { status: "error", message: errorMessage(error), httpStatus } });
        }
      });
    return () => {
      active = false;
    };
  }, [token]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const state: LoadState<T> = result?.token === token ? result.state : { status: "loading" };
  return { ...state, retry };
}

async function loadCatalogue(): Promise<Catalogue> {
  const [{ frames }, { modules }] = await Promise.all([api.frames(), api.modules()]);
  return { frames, modules, moduleMap: toModuleMap(modules) };
}

export function useCatalogue() {
  return useLoad(loadCatalogue, "catalogue");
}

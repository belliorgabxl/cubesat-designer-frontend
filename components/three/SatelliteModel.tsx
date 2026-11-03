"use client";

import { useMemo } from "react";

import { frameDims } from "@/lib/geometry";
import type { Frame, ModuleMap, Placements } from "@/lib/types";
import type { Selection } from "@/store/builder";

import { FrameMesh } from "./FrameMesh";
import { InternalModule } from "./InternalModule";
import { SolarPanel } from "./SolarPanel";

/** The assembled satellite in frame coordinates. The long axis is local Z. */
export function SatelliteModel({
  frame,
  placements,
  modules,
  exploded = false,
  deployed = true,
  selection = null,
  onSelect,
}: {
  frame: Frame;
  placements: Placements;
  modules: ModuleMap;
  exploded?: boolean;
  deployed?: boolean;
  selection?: Selection | null;
  onSelect?: (selection: Selection) => void;
}) {
  const dims = useMemo(() => frameDims(frame), [frame]);

  return (
    <group>
      <FrameMesh dims={dims} exploded={exploded} />

      {placements.internal.map((placement) => {
        const part = modules[placement.module];
        if (!part) return null;
        return (
          <InternalModule
            key={`${placement.module}@${placement.start_slot}`}
            module={part}
            placement={placement}
            dims={dims}
            exploded={exploded}
            selected={selection?.kind === "internal" && selection.startSlot === placement.start_slot}
            onSelect={onSelect && (() => onSelect({ kind: "internal", startSlot: placement.start_slot }))}
          />
        );
      })}

      {placements.faces.map((placement) => {
        const part = modules[placement.module];
        if (!part) return null;
        return (
          <SolarPanel
            key={`${placement.module}@${placement.face}`}
            module={part}
            face={placement.face}
            dims={dims}
            exploded={exploded}
            deployed={deployed}
            selected={selection?.kind === "face" && selection.face === placement.face}
            onSelect={onSelect && (() => onSelect({ kind: "face", face: placement.face }))}
          />
        );
      })}
    </group>
  );
}

"use client";

import { useRef } from "react";
import type { Group } from "three";

import type { Frame, ModuleMap } from "@/lib/types";
import { useBuilderStore } from "@/store/builder";

import { DragController, DropHighlights } from "./DropHighlights";
import SatelliteStage from "./SatelliteStage";
import { SatelliteModel } from "./SatelliteModel";

export default function BuilderScene({ frame, modules }: { frame: Frame; modules: ModuleMap }) {
  const groupRef = useRef<Group>(null);
  const placements = useBuilderStore((state) => state.doc?.placements);
  const selection = useBuilderStore((state) => state.selection);
  const exploded = useBuilderStore((state) => state.exploded);
  const deployed = useBuilderStore((state) => state.deployed);
  const select = useBuilderStore((state) => state.select);

  if (!placements) return null;

  return (
    <SatelliteStage frame={frame} exploded={exploded} groupRef={groupRef} onPointerMissed={() => select(null)}>
      <SatelliteModel
        frame={frame}
        placements={placements}
        modules={modules}
        exploded={exploded}
        deployed={deployed}
        selection={selection}
        onSelect={select}
      />
      <DropHighlights frame={frame} modules={modules} />
      <DragController groupRef={groupRef} frame={frame} modules={modules} />
    </SatelliteStage>
  );
}

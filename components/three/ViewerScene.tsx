"use client";

import type { Frame, ModuleMap, Placements } from "@/lib/types";

import SatelliteStage from "./SatelliteStage";
import { SatelliteModel } from "./SatelliteModel";

/** Read-only satellite that can be orbited but not edited. */
export default function ViewerScene({
  frame,
  placements,
  modules,
  exploded = false,
}: {
  frame: Frame;
  placements: Placements;
  modules: ModuleMap;
  exploded?: boolean;
}) {
  return (
    <SatelliteStage frame={frame} exploded={exploded} autoRotate>
      <SatelliteModel frame={frame} placements={placements} modules={modules} exploded={exploded} />
    </SatelliteStage>
  );
}

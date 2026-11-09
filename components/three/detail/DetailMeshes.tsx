"use client";

import type { Material } from "three";

import { type Finish, finishMaterial } from "./finishes";
import type { PartGeometries } from "./kit";

/** Detail meshes never take part in picking; each part has one cheap hit box instead. */
export const NO_RAYCAST = () => {};

/**
 * One mesh per finish. `dispose={null}` because the geometry and materials are cached and
 * shared: without it R3F would dispose them when any one part unmounts.
 */
export function DetailMeshes({ parts, accent }: { parts: PartGeometries; accent?: Material }) {
  return (
    <>
      {(Object.keys(parts) as Finish[]).map((finish) => {
        const material = finish === "accent" ? accent : finishMaterial(finish);
        if (!material) return null;
        return <mesh key={finish} geometry={parts[finish]} material={material} raycast={NO_RAYCAST} dispose={null} />;
      })}
    </>
  );
}

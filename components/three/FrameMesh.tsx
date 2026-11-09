"use client";

import type { FrameDims } from "@/lib/geometry";

import { DetailMeshes } from "./detail/DetailMeshes";
import { frameParts } from "./detail/frame";
import { Explodable } from "./Explodable";

const HALF_TURN: [number, number, number] = [0, Math.PI, 0];

/** Chassis body plus two end plates that slide off in the exploded view. */
export function FrameMesh({ dims, exploded }: { dims: FrameDims; exploded: boolean }) {
  const parts = frameParts(dims);
  const plateTravel = dims.z * 0.3 + 0.35;

  return (
    <group>
      <DetailMeshes parts={parts.body} />
      <Explodable base={[0, 0, dims.z / 2]} offset={[0, 0, plateTravel]} exploded={exploded}>
        <DetailMeshes parts={parts.plate} />
      </Explodable>
      <Explodable base={[0, 0, -dims.z / 2]} offset={[0, 0, -plateTravel]} exploded={exploded}>
        <group rotation={HALF_TURN}>
          <DetailMeshes parts={parts.plate} />
        </group>
      </Explodable>
    </group>
  );
}

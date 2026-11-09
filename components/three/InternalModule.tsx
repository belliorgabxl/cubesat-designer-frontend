"use client";

import { Edges, useCursor } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useMemo, useState } from "react";

import { type FrameDims, slotRunCenter, type Vec3 } from "@/lib/geometry";
import type { InternalPlacement, Module } from "@/lib/types";

import { DetailMeshes } from "./detail/DetailMeshes";
import { accentMaterial } from "./detail/finishes";
import { boundsGeometry, moduleParts } from "./detail/modules";
import { Explodable } from "./Explodable";
import { GlbModel } from "./GlbModel";

export const SELECT_COLOR = "#ffd166";
// Edges rather than drei Outlines: in screen-space mode Outlines bleeds into the
// ContactShadows pass as a large flat sheet, and in world-space mode it does not show.
export const OUTLINE_WIDTH_PX = 3;
export const SELECT_GLOW = 0.22;
export const CLICK_DRAG_TOLERANCE_PX = 4;

const BODY_INSET = 0.8;
const LENGTH_INSET = 0.9;
const EXPLODE_SPREAD = 0.6;

function ProceduralModule({ module, size, selected }: { module: Module; size: Vec3; selected: boolean }) {
  return (
    <DetailMeshes
      parts={moduleParts(module, size)}
      accent={accentMaterial(module.color, SELECT_COLOR, SELECT_GLOW, selected)}
    />
  );
}

export function InternalModule({
  module,
  placement,
  dims,
  exploded,
  selected,
  onSelect,
}: {
  module: Module;
  placement: InternalPlacement;
  dims: FrameDims;
  exploded: boolean;
  selected: boolean;
  onSelect?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && onSelect !== undefined);

  const width = dims.x * BODY_INSET;
  const height = dims.y * BODY_INSET;
  const length = module.slots * dims.slotPitch * LENGTH_INSET;
  const size = useMemo<Vec3>(() => [width, height, length], [width, height, length]);
  const hitBox = boundsGeometry(size);
  const handlers = onSelect
    ? {
        onClick: (event: ThreeEvent<MouseEvent>) => {
          if (event.delta > CLICK_DRAG_TOLERANCE_PX) return;
          event.stopPropagation();
          onSelect();
        },
        onPointerOver: (event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          setHovered(true);
        },
        onPointerOut: () => setHovered(false),
      }
    : {};

  // Exploded, a module moves away from the frame centre in proportion to its position.
  const center = slotRunCenter(dims, placement.start_slot, module.slots);

  return (
    <Explodable base={[0, 0, center]} offset={[0, 0, center * EXPLODE_SPREAD]} exploded={exploded}>
      <group {...handlers}>
        {/* Picking hits this one box rather than hundreds of detail triangles. */}
        <mesh geometry={hitBox} visible={false} dispose={null} />
        {module.model_url ? (
          <GlbModel
            url={module.model_url}
            size={size}
            fallback={<ProceduralModule module={module} size={size} selected={false} />}
          />
        ) : (
          <ProceduralModule module={module} size={size} selected={selected} />
        )}
        {selected && <Edges geometry={hitBox} color={SELECT_COLOR} lineWidth={OUTLINE_WIDTH_PX} renderOrder={1} />}
      </group>
    </Explodable>
  );
}

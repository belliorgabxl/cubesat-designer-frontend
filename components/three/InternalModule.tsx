"use client";

import { Edges, useCursor } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useState } from "react";

import { type FrameDims, slotRunCenter, type Vec3 } from "@/lib/geometry";
import type { Category, InternalPlacement, Module } from "@/lib/types";

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

/** Small category-specific shapes on the module's +Y side, so parts read differently at a glance. */
function CategoryDetail({ category, size, slug }: { category: Category; size: Vec3; slug: string }) {
  const top = size[1] / 2;
  const [width, , length] = size;

  if (category === "OBC") {
    return (
      <group position={[0, top, 0]}>
        {[-0.22, 0.2].map((x) => (
          <mesh key={x} position={[width * x, 0.012, 0]}>
            <boxGeometry args={[width * 0.26, 0.024, Math.min(length * 0.6, width * 0.26)]} />
            <meshStandardMaterial color="#10151e" metalness={0.4} roughness={0.5} />
          </mesh>
        ))}
      </group>
    );
  }

  if (category === "EPS_BATTERY") {
    return (
      <group position={[0, top, 0]}>
        {[-0.28, 0, 0.28].map((x) => (
          <mesh key={x} position={[width * x, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, length * 0.8, 14]} />
            <meshStandardMaterial color="#e9edf3" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
      </group>
    );
  }

  if (category === "COMMS") {
    return (
      <mesh position={[width * 0.22, top + 0.03, 0]}>
        <cylinderGeometry args={[0.09, 0.05, 0.05, 20]} />
        <meshStandardMaterial color="#dbe3ee" metalness={0.85} roughness={0.25} />
      </mesh>
    );
  }

  if (category === "ADCS") {
    return (
      <mesh position={[0, top + 0.015, 0]}>
        <cylinderGeometry args={[Math.min(width, length) * 0.36, Math.min(width, length) * 0.36, 0.03, 28]} />
        <meshStandardMaterial color="#2a303b" metalness={0.9} roughness={0.25} />
      </mesh>
    );
  }

  if (category === "PAYLOAD" && slug.includes("camera")) {
    return (
      <group position={[0, top, 0]}>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.15, 0.17, 0.06, 28]} />
          <meshStandardMaterial color="#1a1d24" metalness={0.8} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.062, 0]}>
          <cylinderGeometry args={[0.11, 0.11, 0.006, 28]} />
          <meshPhysicalMaterial color="#26407a" metalness={0.2} roughness={0.05} clearcoat={1} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh position={[0, top, 0]}>
      <sphereGeometry args={[0.07, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#e8f4f6" metalness={0.5} roughness={0.2} />
    </mesh>
  );
}

function ProceduralModule({ module, size, selected }: { module: Module; size: Vec3; selected: boolean }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={module.color}
          metalness={0.35}
          roughness={0.5}
          emissive={SELECT_COLOR}
          emissiveIntensity={selected ? SELECT_GLOW : 0}
        />
        {selected && <Edges color={SELECT_COLOR} lineWidth={OUTLINE_WIDTH_PX} renderOrder={1} />}
      </mesh>
      <CategoryDetail category={module.category} size={size} slug={module.slug} />
    </group>
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

  const length = module.slots * dims.slotPitch * LENGTH_INSET;
  const size: Vec3 = [dims.x * BODY_INSET, dims.y * BODY_INSET, length];
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
        {module.model_url ? (
          <>
            <GlbModel
              url={module.model_url}
              size={size}
              fallback={<ProceduralModule module={module} size={size} selected={false} />}
            />
            {selected && (
              <mesh>
                <boxGeometry args={size} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                <Edges color={SELECT_COLOR} lineWidth={OUTLINE_WIDTH_PX} renderOrder={1} />
              </mesh>
            )}
          </>
        ) : (
          <ProceduralModule module={module} size={size} selected={selected} />
        )}
      </group>
    </Explodable>
  );
}

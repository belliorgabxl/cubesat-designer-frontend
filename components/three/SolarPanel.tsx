"use client";

import { Edges, useCursor } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { type Group, MathUtils } from "three";

import { facePose, type FrameDims, type Vec3 } from "@/lib/geometry";
import type { Face, Module } from "@/lib/types";

import { Explodable } from "./Explodable";
import { CLICK_DRAG_TOLERANCE_PX, OUTLINE_WIDTH_PX, SELECT_COLOR, SELECT_GLOW } from "./InternalModule";
import { solarCellTexture } from "./textures";

const THICKNESS = 0.022;
const STANDOFF = 0.016;
const EDGE_INSET = 0.96;
const CELL_SIZE = 0.42;
const EXPLODE_DISTANCE = 1.1;
const DEPLOYED_ANGLE = Math.PI;
const DEPLOY_SPEED = 2.2;
const MAX_DT = 0.1;

function PanelPlate({
  width,
  height,
  selected,
}: {
  width: number;
  height: number;
  selected: boolean;
}) {
  const texture = useMemo(() => {
    const tiled = solarCellTexture().clone();
    tiled.repeat.set(Math.max(1, Math.round(width / CELL_SIZE)), Math.max(1, Math.round(height / CELL_SIZE)));
    tiled.needsUpdate = true;
    return tiled;
  }, [width, height]);

  return (
    <mesh>
      <boxGeometry args={[width, height, THICKNESS]} />
      {[0, 1, 2, 3].map((side) => (
        <meshStandardMaterial key={side} attach={`material-${side}`} color="#8c95a4" metalness={0.8} roughness={0.4} />
      ))}
      {[4, 5].map((side) => (
        <meshStandardMaterial
          key={side}
          attach={`material-${side}`}
          map={texture}
          metalness={0.35}
          roughness={0.34}
          envMapIntensity={1.4}
          emissive={SELECT_COLOR}
          emissiveIntensity={selected ? SELECT_GLOW : 0}
        />
      ))}
      {selected && <Edges color={SELECT_COLOR} lineWidth={OUTLINE_WIDTH_PX} renderOrder={1} />}
    </mesh>
  );
}

/** A wing stowed flat on the face that swings out on its hinge when `deployed`. */
function Hinged({
  width,
  height,
  deployed,
  selected,
}: {
  width: number;
  height: number;
  deployed: boolean;
  selected: boolean;
}) {
  const leaf = useRef<Group>(null);
  const angle = useRef(0);

  useFrame((_, delta) => {
    angle.current = MathUtils.damp(angle.current, deployed ? DEPLOYED_ANGLE : 0, DEPLOY_SPEED, Math.min(delta, MAX_DT));
    if (leaf.current) leaf.current.rotation.x = -angle.current;
  });

  const knuckles: number[] = [-0.35, 0, 0.35];

  return (
    <group position={[0, height / 2, 0]}>
      {knuckles.map((share) => (
        <mesh key={share} position={[width * share, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.022, width * 0.12, 10]} />
          <meshStandardMaterial color="#b9c0cc" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      <group ref={leaf}>
        <group position={[0, -height / 2, 0]}>
          <PanelPlate width={width} height={height} selected={selected} />
        </group>
      </group>
    </group>
  );
}

export function SolarPanel({
  module,
  face,
  dims,
  exploded,
  deployed,
  selected,
  onSelect,
}: {
  module: Module;
  face: Face;
  dims: FrameDims;
  exploded: boolean;
  deployed: boolean;
  selected: boolean;
  onSelect?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && onSelect !== undefined);

  const pose = facePose(face, dims, STANDOFF);
  const width = pose.width * EDGE_INSET;
  const height = pose.height * EDGE_INSET;
  const offset = pose.normal.map((component) => component * EXPLODE_DISTANCE) as Vec3;

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

  return (
    <Explodable base={pose.position} offset={offset} exploded={exploded}>
      <group rotation={pose.rotation} {...handlers}>
        {module.mount_type === "DEPLOYABLE" ? (
          <Hinged width={width} height={height} deployed={deployed} selected={selected} />
        ) : (
          <PanelPlate width={width} height={height} selected={selected} />
        )}
      </group>
    </Explodable>
  );
}

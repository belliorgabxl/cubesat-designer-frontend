"use client";

import { Edges, useCursor } from "@react-three/drei";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { type Group, MathUtils } from "three";

import { facePose, type FrameDims, type Vec3 } from "@/lib/geometry";
import type { Face, Module } from "@/lib/types";

import { DetailMeshes } from "./detail/DetailMeshes";
import { finishMaterial } from "./detail/finishes";
import { cellMaterial, hingeParts, panelDetails, panelPlate } from "./detail/panels";
import { Explodable } from "./Explodable";
import { CLICK_DRAG_TOLERANCE_PX, OUTLINE_WIDTH_PX, SELECT_COLOR, SELECT_GLOW } from "./InternalModule";

const STANDOFF = 0.016;
const EDGE_INSET = 0.96;
const EXPLODE_DISTANCE = 1.1;
const DEPLOYED_ANGLE = Math.PI;
const DEPLOY_SPEED = 2.2;
const MAX_DT = 0.1;

function PanelPlate({
  width,
  height,
  deployable,
  selected,
}: {
  width: number;
  height: number;
  deployable: boolean;
  selected: boolean;
}) {
  const plate = panelPlate(width, height);
  const cells = cellMaterial(width, height, SELECT_COLOR, SELECT_GLOW, selected);
  const materials = useMemo(() => [finishMaterial("anodized"), cells], [cells]);

  return (
    <group>
      <mesh geometry={plate} material={materials} dispose={null} />
      <DetailMeshes parts={panelDetails(width, height, deployable)} />
      {selected && <Edges geometry={plate} color={SELECT_COLOR} lineWidth={OUTLINE_WIDTH_PX} renderOrder={1} />}
    </group>
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

  return (
    <group position={[0, height / 2, 0]}>
      <DetailMeshes parts={hingeParts(width)} />
      <group ref={leaf}>
        <group position={[0, -height / 2, 0]}>
          <PanelPlate width={width} height={height} deployable selected={selected} />
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
          <PanelPlate width={width} height={height} deployable={false} selected={selected} />
        )}
      </group>
    </Explodable>
  );
}

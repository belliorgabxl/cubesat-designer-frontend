"use client";

import { useMemo } from "react";
import { ExtrudeGeometry, Path, Shape } from "three";

import type { FrameDims, Vec3 } from "@/lib/geometry";

import { Explodable } from "./Explodable";

const RAIL = 0.085;
const RIB = 0.05;
const PLATE_THICKNESS = 0.03;
const UNIT_LENGTH = 1.135;
const METAL = { color: "#c3cad6", metalness: 0.75, roughness: 0.34 };

function endPlateGeometry(width: number, height: number) {
  const shape = new Shape();
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2);
  shape.lineTo(-width / 2, height / 2);
  shape.closePath();
  const hole = new Path();
  hole.absarc(0, 0, Math.min(width, height) * 0.26, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = new ExtrudeGeometry(shape, { depth: PLATE_THICKNESS, bevelEnabled: false });
  geometry.translate(0, 0, -PLATE_THICKNESS / 2);
  return geometry;
}

function Bar({ position, size }: { position: Vec3; size: Vec3 }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial {...METAL} />
    </mesh>
  );
}

/** Procedural chassis: four corner rails, a rib at each 1U joint and two end plates. */
export function FrameMesh({ dims, exploded }: { dims: FrameDims; exploded: boolean }) {
  const plate = useMemo(() => endPlateGeometry(dims.x, dims.y), [dims.x, dims.y]);

  const inX = dims.x / 2 - RAIL / 2;
  const inY = dims.y / 2 - RAIL / 2;
  const corners: [number, number][] = [
    [inX, inY],
    [-inX, inY],
    [inX, -inY],
    [-inX, -inY],
  ];

  const rows = Math.max(1, Math.round(dims.z / UNIT_LENGTH));
  const ribPositions = Array.from({ length: rows - 1 }, (_, index) => -dims.z / 2 + ((index + 1) * dims.z) / rows);
  const plateTravel = dims.z * 0.3 + 0.35;

  return (
    <group>
      {corners.map(([x, y]) => (
        <Bar key={`${x}:${y}`} position={[x, y, 0]} size={[RAIL, RAIL, dims.z]} />
      ))}
      {ribPositions.map((z) => (
        <group key={z}>
          <Bar position={[0, inY, z]} size={[dims.x, RIB, RIB]} />
          <Bar position={[0, -inY, z]} size={[dims.x, RIB, RIB]} />
          <Bar position={[inX, 0, z]} size={[RIB, dims.y, RIB]} />
          <Bar position={[-inX, 0, z]} size={[RIB, dims.y, RIB]} />
        </group>
      ))}
      <Explodable base={[0, 0, dims.z / 2]} offset={[0, 0, plateTravel]} exploded={exploded}>
        <mesh geometry={plate}>
          <meshStandardMaterial {...METAL} />
        </mesh>
      </Explodable>
      <Explodable base={[0, 0, -dims.z / 2]} offset={[0, 0, -plateTravel]} exploded={exploded}>
        <mesh geometry={plate}>
          <meshStandardMaterial {...METAL} />
        </mesh>
      </Explodable>
    </group>
  );
}

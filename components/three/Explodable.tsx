"use client";

import { useFrame } from "@react-three/fiber";
import { type ReactNode, useRef } from "react";
import { type Group, MathUtils } from "three";

import type { Vec3 } from "@/lib/geometry";

const SPEED = 5;
const MAX_DT = 0.1;

/** Slides its children from `base` to `base + offset` when exploded, and back. */
export function Explodable({
  base,
  offset,
  exploded,
  children,
}: {
  base: Vec3;
  offset: Vec3;
  exploded: boolean;
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  const amount = useRef(exploded ? 1 : 0);

  useFrame((_, delta) => {
    amount.current = MathUtils.damp(amount.current, exploded ? 1 : 0, SPEED, Math.min(delta, MAX_DT));
    group.current?.position.set(
      base[0] + offset[0] * amount.current,
      base[1] + offset[1] * amount.current,
      base[2] + offset[2] * amount.current,
    );
  });

  return (
    <group ref={group} position={base}>
      {children}
    </group>
  );
}

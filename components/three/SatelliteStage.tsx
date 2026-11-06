"use client";

import { ContactShadows, Grid, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { type ReactNode, type RefObject, useMemo, useRef } from "react";
import { type Group, MathUtils } from "three";

import { frameDims, type Vec3 } from "@/lib/geometry";
import type { Frame } from "@/lib/types";

import { StudioLights } from "./Studio";

const FLOOR_GAP = 0.45;
const FLOOR_SPEED = 4;
const MAX_DT = 0.1;
const UPRIGHT: Vec3 = [-Math.PI / 2, 0, 0];

function Floor({ assembledY, explodedY, exploded }: { assembledY: number; explodedY: number; exploded: boolean }) {
  const floor = useRef<Group>(null);
  const current = useRef(exploded ? explodedY : assembledY);

  useFrame((_, delta) => {
    current.current = MathUtils.damp(
      current.current,
      exploded ? explodedY : assembledY,
      FLOOR_SPEED,
      Math.min(delta, MAX_DT),
    );
    if (floor.current) floor.current.position.y = current.current;
  });

  return (
    <group ref={floor} position={[0, assembledY, 0]}>
      <ContactShadows opacity={0.6} scale={14} blur={2.4} far={8} resolution={512} color="#000000" />
      <Grid
        position={[0, -0.002, 0]}
        args={[30, 30]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#1b2a44"
        sectionSize={2.5}
        sectionThickness={1}
        sectionColor="#2b4468"
        fadeDistance={22}
        fadeStrength={1.4}
        infiniteGrid
      />
    </group>
  );
}


export default function SatelliteStage({
  frame,
  exploded = false,
  autoRotate = false,
  groupRef,
  onPointerMissed,
  children,
}: {
  frame: Frame;
  exploded?: boolean;
  autoRotate?: boolean;
  groupRef?: RefObject<Group | null>;
  onPointerMissed?: () => void;
  children: ReactNode;
}) {
  const dims = useMemo(() => frameDims(frame), [frame]);
  const reach = Math.max(dims.z, dims.x);
  const distance = 3.5 + reach * 2.1;
  const cameraPosition = useMemo<Vec3>(
    () => [distance * 0.72, distance * 0.36, distance * 0.78],
    [distance],
  );

  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }} onPointerMissed={onPointerMissed}>
      <PerspectiveCamera makeDefault position={cameraPosition} fov={32} near={0.1} far={200} />
      <StudioLights />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        minDistance={reach + 1.5}
        maxDistance={distance * 2.2}
        autoRotate={autoRotate}
        autoRotateSpeed={0.8}
      />
      <group ref={groupRef} rotation={UPRIGHT}>
        {children}
      </group>
      <Floor
        assembledY={-dims.z / 2 - FLOOR_GAP}
        explodedY={-dims.z * 0.8 - 0.35 - FLOOR_GAP}
        exploded={exploded}
      />
    </Canvas>
  );
}

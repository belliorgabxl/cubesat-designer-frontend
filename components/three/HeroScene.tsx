"use client";

import { Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

import { HERO_FRAME, HERO_MODULES, HERO_PLACEMENTS } from "@/lib/heroSatellite";

import { SatelliteModel } from "./SatelliteModel";
import { StudioLights } from "./Studio";

const SPIN = 0.18;
const MAX_DT = 0.1;

function SpinningSatellite() {
  const spinner = useRef<Group>(null);

  useFrame((_, delta) => {
    if (spinner.current) spinner.current.rotation.y += SPIN * Math.min(delta, MAX_DT);
  });

  return (
    <group position={[0, 0.1, 0]} rotation={[0.28, 0, -0.32]}>
      <group ref={spinner}>
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <SatelliteModel frame={HERO_FRAME} placements={HERO_PLACEMENTS} modules={HERO_MODULES} />
        </group>
      </group>
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0.6, 10], fov: 34 }}>
      <StudioLights />
      <Stars radius={60} depth={40} count={1800} factor={2.6} saturation={0} fade speed={0.3} />
      <SpinningSatellite />
    </Canvas>
  );
}

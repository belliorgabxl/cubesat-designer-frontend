"use client";

import { Environment, Lightformer } from "@react-three/drei";

/** Reflections and lighting built from local light cards, so no HDR file has to be downloaded. */
export function StudioEnvironment({ intensity = 1.5 }: { intensity?: number }) {
  return (
    <Environment resolution={256} environmentIntensity={intensity}>
      <color attach="background" args={["#04060c"]} />
      <Lightformer form="rect" intensity={3.2} color="#ffffff" position={[0, 6, 2]} rotation={[Math.PI / 2, 0, 0]} scale={[12, 6, 1]} />
      <Lightformer form="rect" intensity={1.8} color="#cfe3ff" position={[-7, 1, 3]} rotation={[0, Math.PI / 2, 0]} scale={[10, 3, 1]} />
      <Lightformer form="rect" intensity={1.4} color="#ffe4bf" position={[7, -1, -3]} rotation={[0, -Math.PI / 2, 0]} scale={[10, 3, 1]} />
      <Lightformer form="ring" intensity={1.2} color="#8fc6ff" position={[0, -4, 6]} scale={5} />
    </Environment>
  );
}

export function StudioLights() {
  return (
    <>
      <ambientLight intensity={0.28} />
      <directionalLight position={[6, 9, 7]} intensity={2.3} color="#fff3df" />
      <directionalLight position={[-7, 2, -5]} intensity={0.7} color="#88b4ff" />
      <StudioEnvironment />
    </>
  );
}

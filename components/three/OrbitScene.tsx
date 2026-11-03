"use client";

import { Line, OrbitControls, PerspectiveCamera, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  type AmbientLight,
  BackSide,
  type DirectionalLight,
  type Group,
  MathUtils,
  type Mesh,
  SRGBColorSpace,
  type Texture,
  TextureLoader,
  Vector3,
} from "three";

import type { Vec3 } from "@/lib/geometry";
import type { Frame, ModuleMap, Placements } from "@/lib/types";

import { SatelliteModel } from "./SatelliteModel";
import { StudioEnvironment } from "./Studio";
import { fallbackEarthTexture } from "./textures";

const EARTH_RADIUS = 4;
const EARTH_RADIUS_KM = 6371;
const EARTH_TEXTURE_URL = "/textures/earth.jpg";
const EARTH_SPIN = 0.03;
const SATELLITE_SCALE = 0.16;
const ORBIT_COUNT = 3;
const RING_SEGMENTS = 96;
const DARKEN_SPEED = 5;
const MAX_DT = 0.1;

const SUN_LIGHT = 3;
const SUN_LIGHT_ECLIPSE = 0.9;
const AMBIENT = 0.14;
const AMBIENT_ECLIPSE = 0.1;
const ENV = 0.7;
const ENV_ECLIPSE = 0.3;

const WIDE_CAMERA: Vec3 = [-4.5, 6, 13];
const ATMOSPHERE_SCALE = 1.06;
const ATMOSPHERE_VERTEX = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
// Glow that is strongest at Earth's limb and fades to nothing at the shell's outer edge.
const ATMOSPHERE_FRAGMENT = `
  varying vec3 vNormal;
  void main() {
    float glow = smoothstep(0.0, 0.34, -vNormal.z);
    gl_FragColor = vec4(0.36, 0.66, 1.0, 1.0) * glow * glow * 0.65;
  }
`;
const followOffset = new Vector3();
const followPosition = new Vector3();

export interface OrbitSceneProps {
  frame: Frame;
  placements: Placements;
  modules: ModuleMap;
  altitudeKm: number;
  eclipseFraction: number;
  /** 0..1 across all simulated orbits; written by the animation loop in the parent. */
  progressRef: RefObject<number>;
  follow: boolean;
}

/** The user's NASA texture when it exists; otherwise the procedural blue-green globe. */
function useEarthTexture(): Texture {
  const [loaded, setLoaded] = useState<Texture | null>(null);
  useEffect(() => {
    let active = true;
    new TextureLoader().load(
      EARTH_TEXTURE_URL,
      (texture) => {
        texture.colorSpace = SRGBColorSpace;
        if (active) setLoaded(texture);
      },
      undefined,
      () => {
        // A missing file is the expected case until the user adds one.
      },
    );
    return () => {
      active = false;
    };
  }, []);
  return loaded ?? fallbackEarthTexture();
}

function Earth() {
  const texture = useEarthTexture();
  const globe = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (globe.current) globe.current.rotation.y += EARTH_SPIN * Math.min(delta, MAX_DT);
  });

  return (
    <group>
      {/* Lambert ignores the scene environment, so only the sun lights Earth and the night side stays dark. */}
      <mesh ref={globe}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 48]} />
        <meshLambertMaterial map={texture} />
      </mesh>
      <mesh scale={ATMOSPHERE_SCALE}>
        <sphereGeometry args={[EARTH_RADIUS, 48, 32]} />
        <shaderMaterial
          vertexShader={ATMOSPHERE_VERTEX}
          fragmentShader={ATMOSPHERE_FRAGMENT}
          side={BackSide}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Orbit path, drawn in two parts so the stretch inside Earth's shadow is visible. */
function OrbitRing({ radius, eclipseFraction }: { radius: number; eclipseFraction: number }) {
  const { sunlit, shadow } = useMemo(() => {
    const halfAngle = eclipseFraction * Math.PI;
    const arc = (from: number, to: number) =>
      Array.from({ length: RING_SEGMENTS + 1 }, (_, index) => {
        const angle = from + ((to - from) * index) / RING_SEGMENTS;
        return [radius * Math.cos(angle), 0, radius * Math.sin(angle)] as Vec3;
      });
    return {
      sunlit: arc(-Math.PI + halfAngle, Math.PI - halfAngle),
      shadow: arc(Math.PI - halfAngle, Math.PI + halfAngle),
    };
  }, [radius, eclipseFraction]);

  return (
    <>
      <Line points={sunlit} color="#5cc8e8" lineWidth={1} transparent opacity={0.55} />
      <Line points={shadow} color="#6b7890" lineWidth={1} dashed dashSize={0.12} gapSize={0.1} />
    </>
  );
}

/** Moves the satellite and fades the lights while it is inside Earth's shadow. */
function Flight({
  frame,
  placements,
  modules,
  radius,
  eclipseFraction,
  progressRef,
  follow,
}: Omit<OrbitSceneProps, "altitudeKm"> & { radius: number }) {
  const satellite = useRef<Group>(null);
  const sun = useRef<DirectionalLight>(null);
  const ambient = useRef<AmbientLight>(null);
  const shade = useRef(0);

  useFrame(({ camera, scene }, delta) => {
    const step = Math.min(delta, MAX_DT);
    const orbits = progressRef.current * ORBIT_COUNT;
    const phase = orbits - Math.floor(orbits);
    const angle = phase * Math.PI * 2;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);

    if (satellite.current) {
      satellite.current.position.set(x, 0, z);
      // Keep the same side facing Earth as it goes round.
      satellite.current.rotation.y = -angle;
    }

    const inShadow = Math.abs(phase - 0.5) < eclipseFraction / 2;
    shade.current = MathUtils.damp(shade.current, inShadow ? 1 : 0, DARKEN_SPEED, step);
    if (sun.current) sun.current.intensity = MathUtils.lerp(SUN_LIGHT, SUN_LIGHT_ECLIPSE, shade.current);
    if (ambient.current) ambient.current.intensity = MathUtils.lerp(AMBIENT, AMBIENT_ECLIPSE, shade.current);
    scene.environmentIntensity = MathUtils.lerp(ENV, ENV_ECLIPSE, shade.current);

    if (follow) {
      followOffset.set(x, 0, z).normalize();
      followPosition.set(x + followOffset.x * 1.6, 0.75, z + followOffset.z * 1.6);
      camera.position.lerp(followPosition, 1 - Math.exp(-3 * step));
      camera.lookAt(x, 0, z);
    }
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={AMBIENT} />
      {/* The sun stays fixed along +X, which is what defines where the shadow falls. */}
      <directionalLight ref={sun} position={[40, 0, 0]} intensity={SUN_LIGHT} color="#fff6e6" />
      <group ref={satellite} scale={SATELLITE_SCALE}>
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <SatelliteModel frame={frame} placements={placements} modules={modules} deployed />
        </group>
      </group>
    </>
  );
}

export default function OrbitScene({ altitudeKm, eclipseFraction, follow, ...flight }: OrbitSceneProps) {
  const radius = EARTH_RADIUS * (1 + altitudeKm / EARTH_RADIUS_KM);

  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={["#02030a"]} />
      <PerspectiveCamera makeDefault position={WIDE_CAMERA} fov={34} near={0.05} far={400} />
      <StudioEnvironment intensity={ENV} />
      <Stars radius={120} depth={60} count={3500} factor={3} saturation={0} fade speed={0.4} />
      {!follow && <OrbitControls makeDefault enablePan={false} minDistance={7} maxDistance={40} />}
      <Earth />
      <OrbitRing radius={radius} eclipseFraction={eclipseFraction} />
      <Flight {...flight} radius={radius} eclipseFraction={eclipseFraction} follow={follow} />
    </Canvas>
  );
}

"use client";

import { useGLTF } from "@react-three/drei";
import { Component, type ReactNode, Suspense, useMemo } from "react";
import { Box3, Vector3 } from "three";

import type { Vec3 } from "@/lib/geometry";

function FittedGlb({ url, size }: { url: string; size: Vec3 }) {
  const { scene } = useGLTF(url);

  const { clone, scale, offset } = useMemo(() => {
    const copy = scene.clone(true);
    const box = new Box3().setFromObject(copy);
    const extent = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const fit = Math.min(size[0] / extent.x, size[1] / extent.y, size[2] / extent.z);
    return { clone: copy, scale: fit, offset: center.multiplyScalar(-fit).toArray() as Vec3 };
  }, [scene, size]);

  return <primitive object={clone} scale={scale} position={offset} />;
}

class GlbBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Loads a module's GLB scaled to its bay; shows `fallback` while loading or if the file is bad. */
export function GlbModel({ url, size, fallback }: { url: string; size: Vec3; fallback: ReactNode }) {
  return (
    <GlbBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <FittedGlb url={url} size={size} />
      </Suspense>
    </GlbBoundary>
  );
}

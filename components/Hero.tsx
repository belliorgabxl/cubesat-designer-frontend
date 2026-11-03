"use client";

import dynamic from "next/dynamic";

import { CanvasBoundary } from "@/components/three/CanvasBoundary";

const HeroScene = dynamic(() => import("@/components/three/HeroScene"), { ssr: false });

export function HeroCanvas() {
  return (
    <CanvasBoundary>
      <HeroScene />
    </CanvasBoundary>
  );
}

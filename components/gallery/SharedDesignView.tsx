"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";

import { BudgetPanel } from "@/components/builder/BudgetPanel";
import { OrbitSimulation } from "@/components/orbit/OrbitSimulation";
import { CanvasBoundary } from "@/components/three/CanvasBoundary";
import { Button, ErrorState, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { missionLabel } from "@/lib/labels";
import { adaptPlacements, toModuleMap } from "@/lib/placement";
import { useEvaluation } from "@/lib/useEvaluation";

const ViewerScene = dynamic(() => import("@/components/three/ViewerScene"), {
  ssr: false,
  loading: () => <Spinner label="กำลังเตรียมฉาก 3D…" />,
});

async function loadShared(slug: string) {
  const [{ design }, { modules }] = await Promise.all([api.shared(slug), api.modules()]);
  const moduleMap = toModuleMap(modules);
  // Parts retired from the catalogue after saving cannot be drawn or evaluated.
  const { placements } = adaptPlacements(design.placements, design.frame, moduleMap);
  return { design, moduleMap, placements };
}

export function SharedDesignView({ slug }: { slug: string }) {
  const shared = useLoad(() => loadShared(slug), `shared:${slug}`);
  const [exploded, setExploded] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const data = shared.status === "ready" ? shared.data : null;
  const evaluation = useEvaluation(
    useMemo(
      () =>
        data && {
          frameId: data.design.frame.id,
          missionType: data.design.mission_type,
          altitudeKm: data.design.altitude_km,
          placements: data.placements,
        },
      [data],
    ),
  );

  if (shared.status === "loading") return <Spinner />;
  if (shared.status === "error") {
    const gone = shared.httpStatus === 404;
    return (
      <div className="flex flex-1 flex-col items-center justify-center">
        <ErrorState
          message={gone ? "ไม่พบแบบนี้ ลิงก์อาจไม่ถูกต้องหรือแบบถูกลบไปแล้ว" : shared.message}
          onRetry={gone ? undefined : shared.retry}
        />
        <Link href="/gallery" className="text-sm text-signal hover:underline">
          ไปที่แกลเลอรี
        </Link>
      </div>
    );
  }

  const { design, moduleMap, placements } = shared.data;

  return (
    <div className="flex flex-1 flex-col lg:h-[calc(100dvh-3.25rem)] lg:min-h-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-deck px-4 py-2.5">
        <h1 className="font-medium">{design.name}</h1>
        <p className="font-mono text-xs text-ink-dim">
          {design.frame.name} · {missionLabel(design.mission_type)} · {design.altitude_km} km · โดย {design.owner}
        </p>
        <span className="ml-auto rounded border border-line-strong px-1.5 py-0.5 text-[11px] text-ink-dim">ดูอย่างเดียว</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:grid-rows-[minmax(0,1fr)]">
        <main className="starfield relative h-[60dvh] min-h-0 lg:h-auto">
          <CanvasBoundary>
            <ViewerScene frame={design.frame} placements={placements} modules={moduleMap} exploded={exploded} />
          </CanvasBoundary>
          <div className="absolute right-3 bottom-3 flex gap-2">
            <Button aria-pressed={exploded} onClick={() => setExploded(!exploded)} className="bg-deck/80">
              {exploded ? "ประกอบกลับ" : "Exploded view"}
            </Button>
            <Button variant="primary" onClick={() => setSimulating(true)}>
              จำลองวงโคจร
            </Button>
          </div>
        </main>
        <div className="flex min-h-0 flex-col">
          <BudgetPanel evaluation={evaluation} missionType={design.mission_type} />
        </div>
      </div>

      {simulating && (
        <OrbitSimulation
          frame={design.frame}
          placements={placements}
          modules={moduleMap}
          altitudeKm={design.altitude_km}
          onClose={() => setSimulating(false)}
        />
      )}
    </div>
  );
}

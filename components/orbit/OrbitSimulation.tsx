"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import { CanvasBoundary } from "@/components/three/CanvasBoundary";
import { Button, ErrorState, Spinner, StatusLamp } from "@/components/ui";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { BATTERY_STATUS_LABELS } from "@/lib/labels";
import type { Frame, ModuleMap, Placements, Simulation } from "@/lib/types";

import { BatteryChart } from "./BatteryChart";

const OrbitScene = dynamic(() => import("@/components/three/OrbitScene"), {
  ssr: false,
  loading: () => <Spinner label="กำลังเตรียมฉากวงโคจร…" />,
});

// Time is sped up so that one orbit of about 95 minutes plays in about 20 seconds.
const SECONDS_PER_ORBIT = 20;
const ORBIT_COUNT = 3;
const DURATION_S = SECONDS_PER_ORBIT * ORBIT_COUNT;

function batteryAt(simulation: Simulation, minutes: number): number | null {
  const { series } = simulation;
  if (series.length === 0) return null;
  const index = Math.min(series.length - 1, Math.floor((minutes / series[series.length - 1].t_min) * (series.length - 1)));
  return series[index].battery_pct;
}

function Playback({
  simulation,
  frame,
  placements,
  modules,
  altitudeKm,
}: {
  simulation: Simulation;
  frame: Frame;
  placements: Placements;
  modules: ModuleMap;
  altitudeKm: number;
}) {
  const progress = useRef(0);
  const cursor = useRef<HTMLDivElement>(null);
  const batteryReadout = useRef<HTMLSpanElement>(null);
  const timeReadout = useRef<HTMLSpanElement>(null);
  const [playing, setPlaying] = useState(true);
  const [finished, setFinished] = useState(false);
  const [inShadow, setInShadow] = useState(false);
  const [follow, setFollow] = useState(false);

  const totalMin = simulation.period_min * ORBIT_COUNT;

  // The animation loop writes straight to the DOM so React only re-renders on real state changes.
  useEffect(() => {
    if (!playing) return;
    let frameId = 0;
    let previous = performance.now();

    function tick(now: number) {
      progress.current = Math.min(1, progress.current + (now - previous) / 1000 / DURATION_S);
      previous = now;

      const minutes = progress.current * totalMin;
      if (cursor.current) cursor.current.style.left = `${progress.current * 100}%`;
      if (timeReadout.current) timeReadout.current.textContent = minutes.toFixed(1);
      if (batteryReadout.current) {
        const battery = batteryAt(simulation, minutes);
        batteryReadout.current.textContent = battery === null ? "—" : `${battery.toFixed(1)}%`;
      }

      const orbits = progress.current * ORBIT_COUNT;
      const phase = orbits - Math.floor(orbits);
      setInShadow(Math.abs(phase - 0.5) < simulation.eclipse_fraction / 2);

      if (progress.current >= 1) {
        setPlaying(false);
        setFinished(true);
        return;
      }
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [playing, simulation, totalMin]);

  const restart = useCallback(() => {
    progress.current = 0;
    setFinished(false);
    setPlaying(true);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-[3] bg-void">
        <CanvasBoundary>
          <OrbitScene
            frame={frame}
            placements={placements}
            modules={modules}
            altitudeKm={altitudeKm}
            eclipseFraction={simulation.eclipse_fraction}
            progressRef={progress}
            follow={follow}
          />
        </CanvasBoundary>

        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-500 ${inShadow ? "opacity-25" : "opacity-0"}`}
        />

        <div className="absolute top-3 left-3 grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 rounded-md border border-line bg-deck/85 px-3 py-2 text-xs">
          <span className="text-ink-dim">เวลา</span>
          <span className="text-right font-mono">
            <span ref={timeReadout}>0.0</span> นาที
          </span>
          <span className="text-ink-dim">แบตเตอรี่</span>
          <span ref={batteryReadout} className="text-right font-mono">
            {simulation.series.length ? "100.0%" : "—"}
          </span>
          <span className="text-ink-dim">สถานะ</span>
          <span className={`text-right font-medium ${inShadow ? "text-ink-dim" : "text-solar"}`}>
            {inShadow ? "อยู่ในเงาโลก" : "รับแสงอาทิตย์"}
          </span>
        </div>

        <p className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-mono text-xs text-solar/80">
          แสงอาทิตย์ →
        </p>

        <div className="absolute bottom-3 left-3 flex gap-2">
          <Button className="bg-deck/85" disabled={finished} onClick={() => setPlaying((value) => !value)}>
            {playing ? "หยุดชั่วคราว" : "เล่นต่อ"}
          </Button>
          <Button className="bg-deck/85" onClick={restart}>
            เริ่มใหม่
          </Button>
          <Button className="bg-deck/85" aria-pressed={follow} onClick={() => setFollow((value) => !value)}>
            {follow ? "มุมกว้าง" : "ติดตามดาวเทียม"}
          </Button>
        </div>

        {finished && (
          <div
            role="status"
            className="absolute top-1/2 left-1/2 w-72 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line-strong bg-panel/95 p-4 text-center shadow-2xl"
          >
            <p className="eyebrow">ผลการจำลอง 3 รอบวงโคจร</p>
            <p className="mt-2 flex justify-center">
              <StatusLamp status={simulation.status} label={`${simulation.status} · ${BATTERY_STATUS_LABELS[simulation.status]}`} />
            </p>
            <p className="mt-2 font-mono text-2xl">{simulation.min_battery_pct.toFixed(1)}%</p>
            <p className="text-xs text-ink-dim">แบตเตอรี่ต่ำสุด</p>
            <p className="mt-2 text-sm text-ink-dim">{simulation.reason}</p>
          </div>
        )}
      </div>

      <div className="min-h-44 flex-[2] border-t border-line bg-panel p-3">
        {simulation.series.length > 0 ? (
          <BatteryChart simulation={simulation} cursorRef={cursor} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-bad">{simulation.reason}</div>
        )}
      </div>
    </div>
  );
}

/** Full-screen orbit demo: the satellite circles Earth alongside its battery graph. */
export function OrbitSimulation({
  frame,
  placements,
  modules,
  altitudeKm,
  onClose,
}: {
  frame: Frame;
  placements: Placements;
  modules: ModuleMap;
  altitudeKm: number;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const simulation = useLoad(() => api.simulate(altitudeKm, placements), "simulation");

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-label="จำลองวงโคจร"
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-deck text-ink"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-4 border-b border-line px-4 py-2.5">
          <h2 className="font-medium">จำลองวงโคจร</h2>
          {simulation.status === "ready" && (
            <p className="font-mono text-xs text-ink-dim">
              {altitudeKm} km · คาบ {simulation.data.period_min.toFixed(1)} นาที · เงา{" "}
              {(simulation.data.eclipse_fraction * 100).toFixed(1)}% · ผลิต {simulation.data.generate_sunlit_w} W · ใช้{" "}
              {simulation.data.consume_w} W · แบต {simulation.data.capacity_wh} Wh
            </p>
          )}
          <Button className="ml-auto" onClick={() => dialog.current?.close()}>
            ปิด
          </Button>
        </div>
        {simulation.status === "loading" && <Spinner label="กำลังคำนวณการจำลอง…" />}
        {simulation.status === "error" && <ErrorState message={simulation.message} onRetry={simulation.retry} />}
        {simulation.status === "ready" && (
          <Playback
            simulation={simulation.data}
            frame={frame}
            placements={placements}
            modules={modules}
            altitudeKm={altitudeKm}
          />
        )}
      </div>
    </dialog>
  );
}

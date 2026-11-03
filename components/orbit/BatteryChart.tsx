"use client";

import { memo, type RefObject, useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Simulation, SimulationPoint } from "@/lib/types";

const MAX_POINTS = 360;
const LOW_BATTERY_PCT = 30;
const ORBIT_COUNT = 3;

// The moving cursor is an HTML overlay positioned over the plot, so that animating
// it does not re-render the chart. These numbers tie the overlay to the plot area.
const Y_AXIS_WIDTH = 40;
const MARGIN_RIGHT = 14;
const MARGIN_TOP = 8;
const X_AXIS_HEIGHT = 24;

interface Band {
  start: number;
  end: number;
}

function eclipseBands(simulation: Simulation): Band[] {
  const bands: Band[] = [];
  const half = simulation.eclipse_fraction / 2;
  for (let orbit = 0; orbit < ORBIT_COUNT; orbit += 1) {
    bands.push({
      start: (orbit + 0.5 - half) * simulation.period_min,
      end: (orbit + 0.5 + half) * simulation.period_min,
    });
  }
  return bands;
}

/** Thin the 10-second series for drawing, always keeping the lowest point of each bucket. */
function thin(series: SimulationPoint[]): SimulationPoint[] {
  if (series.length <= MAX_POINTS) return series;
  const size = Math.ceil(series.length / MAX_POINTS);
  const kept: SimulationPoint[] = [];
  for (let index = 0; index < series.length; index += size) {
    const bucket = series.slice(index, index + size);
    kept.push(bucket.reduce((low, point) => (point.battery_pct < low.battery_pct ? point : low)));
  }
  kept[0] = series[0];
  kept[kept.length - 1] = series[series.length - 1];
  return kept;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: SimulationPoint }[] }) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-md border border-line-strong bg-raised px-2.5 py-1.5 font-mono text-xs shadow-lg">
      <div className="text-ink">แบต {point.battery_pct.toFixed(1)}%</div>
      <div className="text-ink-dim">
        นาทีที่ {point.t_min.toFixed(1)} · {point.in_eclipse ? "อยู่ในเงาโลก" : "รับแสง"}
      </div>
    </div>
  );
}

const Plot = memo(function Plot({ simulation }: { simulation: Simulation }) {
  const data = useMemo(() => thin(simulation.series), [simulation.series]);
  const bands = useMemo(() => eclipseBands(simulation), [simulation]);
  const totalMin = ORBIT_COUNT * simulation.period_min;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: MARGIN_TOP, right: MARGIN_RIGHT, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="#232d42" strokeWidth={1} />
        <XAxis
          dataKey="t_min"
          type="number"
          domain={[0, totalMin]}
          height={X_AXIS_HEIGHT}
          tick={{ fill: "#9aa7bd", fontSize: 11 }}
          tickFormatter={(value: number) => `${Math.round(value)}`}
          tickCount={7}
          axisLine={{ stroke: "#36445f" }}
          tickLine={false}
          unit=" น."
        />
        <YAxis
          domain={[0, 100]}
          ticks={[0, 30, 50, 100]}
          width={Y_AXIS_WIDTH}
          tick={{ fill: "#9aa7bd", fontSize: 11 }}
          tickFormatter={(value: number) => `${value}%`}
          axisLine={false}
          tickLine={false}
        />
        {bands.map((band) => (
          <ReferenceArea
            key={band.start}
            x1={band.start}
            x2={band.end}
            fill="#8a94a6"
            fillOpacity={0.2}
            stroke="none"
            ifOverflow="hidden"
          />
        ))}
        <ReferenceLine y={LOW_BATTERY_PCT} stroke="#f6b73c" strokeDasharray="4 4" strokeWidth={1} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#6b7890", strokeWidth: 1 }} isAnimationActive={false} />
        <Line
          dataKey="battery_pct"
          type="linear"
          stroke="#2b9bc4"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: "#101624", strokeWidth: 2, fill: "#2b9bc4" }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

/** Battery level across three orbits. `cursorRef` is moved by the animation loop. */
export function BatteryChart({
  simulation,
  cursorRef,
}: {
  simulation: Simulation;
  cursorRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <figure className="flex h-full min-h-0 flex-col">
      <figcaption className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-dim">
        <span className="font-medium text-ink">ระดับแบตเตอรี่ตลอด 3 รอบวงโคจร</span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-3 rounded-[2px] bg-[#8a94a6]/40" />
          ช่วงอยู่ในเงาโลก
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="w-4 border-t border-dashed border-warn" />
          ระดับเตือน 30%
        </span>
      </figcaption>
      <div className="relative min-h-0 flex-1">
        <Plot simulation={simulation} />
        <div
          className="pointer-events-none absolute"
          style={{ top: MARGIN_TOP, bottom: X_AXIS_HEIGHT, left: Y_AXIS_WIDTH, right: MARGIN_RIGHT }}
        >
          <div ref={cursorRef} className="absolute inset-y-0 left-0 w-0.5 -translate-x-px rounded-full bg-solar" />
        </div>
      </div>
    </figure>
  );
}

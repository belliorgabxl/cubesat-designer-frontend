"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { StatusLamp } from "@/components/ui";
import { BATTERY_STATUS_LABELS, formatMass, formatUsd, missionLabel } from "@/lib/labels";
import type { Design, ModuleMap } from "@/lib/types";

/** A flat picture of the slot layout; one live 3D canvas per card would exhaust WebGL contexts. */
function SlotStrip({ design, modules }: { design: Design; modules: ModuleMap }) {
  const colors = new Array<string | null>(design.frame.slot_count).fill(null);
  for (const item of design.placements.internal) {
    const part = modules[item.module];
    if (!part) continue;
    for (let slot = item.start_slot; slot < item.start_slot + part.slots; slot += 1) {
      if (slot < colors.length) colors[slot] = part.color;
    }
  }

  return (
    <div aria-hidden className="flex h-6 gap-px overflow-hidden rounded-[3px] border border-line bg-deck p-px">
      {colors.map((color, slot) => (
        <span
          key={slot}
          className="min-w-0 flex-1 rounded-[1px]"
          style={{ backgroundColor: color ?? "var(--color-raised)" }}
        />
      ))}
    </div>
  );
}

export function DesignCard({
  design,
  modules,
  href,
  actions,
}: {
  design: Design;
  modules: ModuleMap;
  href: string;
  actions?: ReactNode;
}) {
  const summary = design.summary;

  return (
    <article className="flex flex-col rounded-lg border border-line bg-panel transition-colors hover:border-line-strong">
      <Link href={href} className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 font-medium">{design.name}</h2>
          <span className="shrink-0 rounded border border-line-strong px-1.5 py-0.5 font-mono text-[11px] text-ink-dim">
            {design.frame.size_u}U
          </span>
        </div>
        <SlotStrip design={design} modules={modules} />
        <p className="text-xs text-ink-dim">
          {missionLabel(design.mission_type)} · {design.altitude_km} km · โดย {design.owner}
        </p>
        {summary && (
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs text-ink-dim">
              {summary.module_count} ชิ้น · {formatMass(summary.mass_g)} · {formatUsd(summary.cost_usd)}
            </p>
            <StatusLamp status={summary.battery_status} label={BATTERY_STATUS_LABELS[summary.battery_status]} />
          </div>
        )}
      </Link>
      {actions && <div className="flex flex-wrap items-center gap-2 border-t border-line p-3">{actions}</div>}
    </article>
  );
}

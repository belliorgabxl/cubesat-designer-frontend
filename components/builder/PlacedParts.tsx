"use client";

import type { ModuleMap, Placements } from "@/lib/types";
import { type Selection, useBuilderStore } from "@/store/builder";

/**
 * The same parts as the 3D view, as a list. This is how you reach a part
 * hidden behind panels, and how to select and delete by keyboard.
 */
export function PlacedParts({ placements, modules }: { placements: Placements; modules: ModuleMap }) {
  const selection = useBuilderStore((state) => state.selection);
  const select = useBuilderStore((state) => state.select);
  const removePlacement = useBuilderStore((state) => state.removePlacement);

  const rows: { key: string; name: string; where: string; color: string; target: Selection; active: boolean }[] = [
    ...[...placements.internal]
      .sort((a, b) => a.start_slot - b.start_slot)
      .map((item) => {
        const part = modules[item.module];
        const last = item.start_slot + (part?.slots ?? 1) - 1;
        return {
          key: `slot-${item.start_slot}`,
          name: part?.name ?? item.module,
          where: last === item.start_slot ? `ช่อง ${item.start_slot}` : `ช่อง ${item.start_slot}–${last}`,
          color: part?.color ?? "#8899aa",
          target: { kind: "internal", startSlot: item.start_slot } as const,
          active: selection?.kind === "internal" && selection.startSlot === item.start_slot,
        };
      }),
    ...placements.faces.map((item) => ({
      key: `face-${item.face}`,
      name: modules[item.module]?.name ?? item.module,
      where: `ด้าน ${item.face}`,
      color: "#2c5fc4",
      target: { kind: "face", face: item.face } as const,
      active: selection?.kind === "face" && selection.face === item.face,
    })),
  ];

  return (
    <section className="max-h-52 shrink-0 overflow-hidden border-t border-line">
      <h3 className="eyebrow px-3 pt-2.5 pb-1.5">ชิ้นส่วนที่ติดตั้ง ({rows.length})</h3>
      <div className="thin-scroll max-h-40 overflow-y-auto px-1.5 pb-1.5">
        {rows.length === 0 && <p className="px-1.5 pb-2 text-xs text-ink-faint">ยังไม่มีชิ้นส่วน เริ่มจากคลังโมดูลด้านซ้าย</p>}
        <ul>
          {rows.map((row) => (
            <li
              key={row.key}
              className={`flex items-center gap-1 rounded-md transition-colors ${row.active ? "bg-raised" : "hover:bg-panel"}`}
            >
              <button
                type="button"
                aria-pressed={row.active}
                onClick={() => select(row.active ? null : row.target)}
                className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1 text-left text-xs"
              >
                <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ backgroundColor: row.color }} />
                <span className="truncate">{row.name}</span>
                <span className="ml-auto shrink-0 font-mono text-[11px] text-ink-faint">{row.where}</span>
              </button>
              <button
                type="button"
                aria-label={`ลบ ${row.name}`}
                onClick={() => removePlacement(row.target)}
                className="shrink-0 rounded px-1.5 py-1 text-xs text-ink-faint transition-colors hover:text-bad"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

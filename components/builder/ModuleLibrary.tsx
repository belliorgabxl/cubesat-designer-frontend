"use client";

import { type PointerEvent as ReactPointerEvent, useMemo, useRef, useState } from "react";

import { dragPointer } from "@/lib/dragPointer";
import { CATEGORY_LABELS, CATEGORY_ORDER, formatUsd, formatWatts } from "@/lib/labels";
import { fitsFrame } from "@/lib/placement";
import type { Frame, Module, ModuleMap } from "@/lib/types";
import { useBuilderStore } from "@/store/builder";

const DRAG_THRESHOLD_PX = 6;

function ModuleCard({ module, frame, modules }: { module: Module; frame: Frame; modules: ModuleMap }) {
  const autoPlace = useBuilderStore((state) => state.autoPlace);
  const startDrag = useBuilderStore((state) => state.startDrag);
  const commitDrag = useBuilderStore((state) => state.commitDrag);
  const didDrag = useRef(false);
  const fits = fitsFrame(module, frame);

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!fits || event.button !== 0) return;
    const originX = event.clientX;
    const originY = event.clientY;
    didDrag.current = false;

    function onMove(move: PointerEvent) {
      dragPointer.x = move.clientX;
      dragPointer.y = move.clientY;
      if (!didDrag.current && Math.hypot(move.clientX - originX, move.clientY - originY) > DRAG_THRESHOLD_PX) {
        didDrag.current = true;
        startDrag(module.slug);
      }
    }

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (didDrag.current) commitDrag();
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleClick() {
    if (didDrag.current) {
      didDrag.current = false;
      return;
    }
    autoPlace(module, frame, modules);
  }

  const isPanel = module.mount_type !== "INTERNAL";

  return (
    <button
      type="button"
      disabled={!fits}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      title={module.description}
      className="group w-full cursor-grab touch-none select-none rounded-md border border-line bg-panel p-2.5 text-left transition-colors hover:border-line-strong hover:bg-raised active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-panel"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: isPanel ? "#2c5fc4" : module.color }} />
        <span className="truncate text-sm font-medium">{module.name}</span>
        {!isPanel && <span className="ml-auto shrink-0 font-mono text-[11px] text-ink-faint">{module.slots} ช่อง</span>}
        {module.mount_type === "DEPLOYABLE" && <span className="ml-auto shrink-0 font-mono text-[11px] text-signal">กางออก</span>}
      </div>
      <dl className="mt-1.5 grid grid-cols-3 gap-1 font-mono text-[11px] text-ink-dim">
        <div>
          <dt className="sr-only">น้ำหนัก</dt>
          <dd>{module.mass_g} g</dd>
        </div>
        <div>
          <dt className="sr-only">กำลังไฟ</dt>
          <dd className={isPanel ? "text-solar" : ""}>
            {isPanel ? `+${formatWatts(module.power_generate_w)}` : `−${formatWatts(module.power_consume_w)}`}
          </dd>
        </div>
        <div>
          <dt className="sr-only">ราคา</dt>
          <dd className="text-right">{formatUsd(module.price_usd)}</dd>
        </div>
      </dl>
      {!fits && <p className="mt-1 text-[11px] text-ink-faint">ใช้กับโครง {frame.size_u}U ไม่ได้</p>}
    </button>
  );
}

export function ModuleLibrary({ modules, moduleMap, frame }: { modules: Module[]; moduleMap: ModuleMap; frame: Frame }) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? modules.filter((module) => `${module.name} ${module.description}`.toLowerCase().includes(needle))
      : modules;
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: matches.filter((module) => module.category === category),
    })).filter((group) => group.items.length > 0);
  }, [modules, query]);

  return (
    <aside aria-label="คลังโมดูล" className="flex min-h-0 flex-col border-r border-line bg-deck">
      <div className="border-b border-line p-3">
        <label htmlFor="module-search" className="eyebrow">
          คลังโมดูล
        </label>
        <input
          id="module-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ค้นหาโมดูล…"
          className="mt-1.5 w-full rounded-md border border-line bg-panel px-2.5 py-1.5 text-sm placeholder:text-ink-faint"
        />
        <p className="mt-2 text-xs leading-relaxed text-ink-faint">ลากเข้าโครง 3 มิติ หรือคลิกเพื่อเพิ่มในตำแหน่งว่างแรก</p>
      </div>
      <div className="thin-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {groups.length === 0 && <p className="py-6 text-center text-sm text-ink-dim">ไม่พบโมดูลที่ตรงกับ “{query}”</p>}
        {groups.map((group) => (
          <section key={group.category}>
            <h3 className="eyebrow mb-1.5">{CATEGORY_LABELS[group.category]}</h3>
            <div className="space-y-1.5">
              {group.items.map((module) => (
                <ModuleCard key={module.slug} module={module} frame={frame} modules={moduleMap} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

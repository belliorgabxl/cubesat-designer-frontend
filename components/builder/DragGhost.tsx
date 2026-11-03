"use client";

import { useEffect, useRef } from "react";

import type { ModuleMap } from "@/lib/types";
import { dragPointer } from "@/lib/dragPointer";
import { useBuilderStore } from "@/store/builder";

const OFFSET_PX = 14;

/** The label that follows the pointer while a part is dragged from the library. */
export function DragGhost({ modules }: { modules: ModuleMap }) {
  const slug = useBuilderStore((state) => state.draggingSlug);
  const target = useBuilderStore((state) => state.dropTarget);
  const element = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;
    function place(x: number, y: number) {
      if (element.current) element.current.style.transform = `translate(${x + OFFSET_PX}px, ${y + OFFSET_PX}px)`;
    }
    function onMove(event: PointerEvent) {
      place(event.clientX, event.clientY);
    }
    place(dragPointer.x, dragPointer.y);
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [slug]);

  if (!slug) return null;
  const part = modules[slug];
  const outcome = target === null ? "ลากมาที่โครง" : target.valid ? "ปล่อยเพื่อวาง" : "ไม่มีที่ว่าง";

  return (
    <div
      ref={element}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-50 rounded-md border border-line-strong bg-raised px-2.5 py-1.5 text-xs shadow-lg"
    >
      <span className="font-medium">{part?.name}</span>
      <span className={`ml-2 font-mono ${target === null ? "text-ink-dim" : target.valid ? "text-ok" : "text-bad"}`}>{outcome}</span>
    </div>
  );
}

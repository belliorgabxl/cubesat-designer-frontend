// Snapping helpers. These only decide where a part may land; every budget figure comes from Django.

import type { Face, Frame, InternalPlacement, Module, ModuleMap, Placements } from "./types";

export const EMPTY_PLACEMENTS: Placements = { internal: [], faces: [] };

export function toModuleMap(modules: Module[]): ModuleMap {
  return Object.fromEntries(modules.map((module) => [module.slug, module]));
}

export function occupiedSlots(internal: InternalPlacement[], modules: ModuleMap): Set<number> {
  const occupied = new Set<number>();
  for (const item of internal) {
    const size = modules[item.module]?.slots ?? 0;
    for (let slot = item.start_slot; slot < item.start_slot + size; slot += 1) occupied.add(slot);
  }
  return occupied;
}

/** Start of the free run of `size` slots closest to `target`, or null when none exists. */
export function nearestFreeStart(
  occupied: Set<number>,
  slotCount: number,
  size: number,
  target: number,
): number | null {
  let best: number | null = null;
  let bestDistance = Infinity;
  for (let start = 0; start + size <= slotCount; start += 1) {
    let free = true;
    for (let slot = start; slot < start + size; slot += 1) {
      if (occupied.has(slot)) {
        free = false;
        break;
      }
    }
    const distance = Math.abs(start - target);
    if (free && distance < bestDistance) {
      best = start;
      bestDistance = distance;
    }
  }
  return best;
}

export function allowedFaces(module: Module, frame: Frame): Face[] {
  return module.allowed_faces[String(frame.size_u)] ?? [];
}

export function firstFreeFace(module: Module, frame: Frame, placements: Placements): Face | null {
  const taken = new Set(placements.faces.map((item) => item.face));
  return allowedFaces(module, frame).find((face) => !taken.has(face)) ?? null;
}

export function fitsFrame(module: Module, frame: Frame): boolean {
  return module.fits_frame_sizes.length === 0 || module.fits_frame_sizes.includes(frame.size_u);
}

/** Keep what still fits after a frame change; also drops modules no longer in the catalogue. */
export function adaptPlacements(
  placements: Placements,
  frame: Frame,
  modules: ModuleMap,
): { placements: Placements; dropped: number } {
  const internal: InternalPlacement[] = [];
  const claimed = new Set<number>();
  for (const item of placements.internal) {
    const part = modules[item.module];
    if (!part || !fitsFrame(part, frame)) continue;
    const slots = Array.from({ length: part.slots }, (_, offset) => item.start_slot + offset);
    if (slots.some((slot) => slot >= frame.slot_count || claimed.has(slot))) continue;
    slots.forEach((slot) => claimed.add(slot));
    internal.push(item);
  }

  const takenFaces = new Set<Face>();
  const faces = placements.faces.filter((item) => {
    const part = modules[item.module];
    if (!part || !allowedFaces(part, frame).includes(item.face) || takenFaces.has(item.face)) return false;
    takenFaces.add(item.face);
    return true;
  });

  const before = placements.internal.length + placements.faces.length;
  return { placements: { internal, faces }, dropped: before - internal.length - faces.length };
}

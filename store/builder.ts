import { create } from "zustand";

import { adaptPlacements, EMPTY_PLACEMENTS, firstFreeFace, fitsFrame, nearestFreeStart, occupiedSlots } from "@/lib/placement";
import type { Design, Face, Frame, MissionType, Module, ModuleMap, Placements } from "@/lib/types";

/** The part of the state that undo/redo rewinds. */
export interface BuilderDoc {
  name: string;
  frameId: number;
  missionType: MissionType;
  altitudeKm: number;
  placements: Placements;
}

export type Selection = { kind: "internal"; startSlot: number } | { kind: "face"; face: Face };

export type DropTarget =
  | { kind: "slot"; start: number; valid: boolean }
  | { kind: "face"; face: Face; valid: boolean };

export const DEFAULT_NAME = "ดาวเทียมของฉัน";
const HISTORY_LIMIT = 100;
const COALESCE_MS = 800;

interface BuilderState {
  doc: BuilderDoc | null;
  savedDoc: string | null;
  past: BuilderDoc[];
  future: BuilderDoc[];
  coalesce: { key: string; at: number } | null;

  designId: number | null;
  shareSlug: string | null;
  isPublic: boolean;

  selection: Selection | null;
  draggingSlug: string | null;
  dropTarget: DropTarget | null;
  exploded: boolean;
  deployed: boolean;
  notice: string | null;

  startNew: (frame: Frame, draft?: BuilderDoc | null) => void;
  loadDesign: (design: Design, modules: ModuleMap) => void;
  markSaved: (design: Design) => void;
  setPublic: (value: boolean) => void;

  setName: (name: string) => void;
  setMission: (missionType: MissionType) => void;
  setAltitude: (altitudeKm: number) => void;
  setFrame: (frame: Frame, modules: ModuleMap) => void;
  autoPlace: (module: Module, frame: Frame, modules: ModuleMap) => void;
  removeSelected: () => void;
  removePlacement: (selection: Selection) => void;

  undo: () => void;
  redo: () => void;

  select: (selection: Selection | null) => void;
  startDrag: (slug: string) => void;
  setDropTarget: (target: DropTarget | null) => void;
  endDrag: () => void;
  commitDrag: () => void;
  setExploded: (value: boolean) => void;
  setDeployed: (value: boolean) => void;
  setNotice: (notice: string | null) => void;
}

function serialize(doc: BuilderDoc): string {
  return JSON.stringify(doc);
}

export const useBuilderStore = create<BuilderState>((set, get) => {
  /** Apply a change as one undo step; rapid changes sharing a key collapse into a single step. */
  function commit(change: Partial<BuilderDoc>, coalesceKey?: string) {
    const { doc, past, coalesce } = get();
    if (!doc) return;
    const now = Date.now();
    const merge = coalesceKey !== undefined && coalesce?.key === coalesceKey && now - coalesce.at < COALESCE_MS;
    set({
      doc: { ...doc, ...change },
      past: merge ? past : [...past, doc].slice(-HISTORY_LIMIT),
      future: [],
      coalesce: coalesceKey === undefined ? null : { key: coalesceKey, at: now },
    });
  }

  function reset(doc: BuilderDoc, savedDoc: string | null, meta: Pick<BuilderState, "designId" | "shareSlug" | "isPublic">) {
    set({
      doc,
      savedDoc,
      past: [],
      future: [],
      coalesce: null,
      selection: null,
      draggingSlug: null,
      dropTarget: null,
      exploded: false,
      deployed: true,
      notice: null,
      ...meta,
    });
  }

  return {
    doc: null,
    savedDoc: null,
    past: [],
    future: [],
    coalesce: null,
    designId: null,
    shareSlug: null,
    isPublic: false,
    selection: null,
    draggingSlug: null,
    dropTarget: null,
    exploded: false,
    deployed: true,
    notice: null,

    startNew: (frame, draft) => {
      const doc = draft ?? {
        name: DEFAULT_NAME,
        frameId: frame.id,
        missionType: "EARTH_OBSERVATION" as const,
        altitudeKm: 500,
        placements: EMPTY_PLACEMENTS,
      };
      reset(doc, null, { designId: null, shareSlug: null, isPublic: false });
    },

    loadDesign: (design, modules) => {
      const { placements, dropped } = adaptPlacements(design.placements, design.frame, modules);
      const doc: BuilderDoc = {
        name: design.name,
        frameId: design.frame.id,
        missionType: design.mission_type,
        altitudeKm: design.altitude_km,
        placements,
      };
      reset(doc, serialize(doc), {
        designId: design.id,
        shareSlug: design.share_slug,
        isPublic: design.is_public,
      });
      if (dropped > 0) set({ notice: `นำชิ้นส่วนที่ไม่มีในคลังแล้วออก ${dropped} ชิ้น` });
    },

    markSaved: (design) => {
      const { doc } = get();
      set({
        designId: design.id,
        shareSlug: design.share_slug,
        isPublic: design.is_public,
        savedDoc: doc ? serialize(doc) : null,
      });
    },

    setPublic: (value) => set({ isPublic: value }),

    setName: (name) => commit({ name }, "name"),
    setMission: (missionType) => commit({ missionType }),
    setAltitude: (altitudeKm) => commit({ altitudeKm }, "altitude"),

    setFrame: (frame, modules) => {
      const { doc } = get();
      if (!doc || doc.frameId === frame.id) return;
      const { placements, dropped } = adaptPlacements(doc.placements, frame, modules);
      commit({ frameId: frame.id, placements });
      set({
        selection: null,
        notice: dropped > 0 ? `นำชิ้นส่วนที่ใส่ในโครง ${frame.size_u}U ไม่ได้ออก ${dropped} ชิ้น (กด Undo เพื่อย้อนกลับ)` : null,
      });
    },

    autoPlace: (module, frame, modules) => {
      const { doc } = get();
      if (!doc) return;
      if (!fitsFrame(module, frame)) {
        set({ notice: `${module.name} ใช้กับโครง ${frame.size_u}U ไม่ได้` });
        return;
      }
      if (module.mount_type === "INTERNAL") {
        const occupied = occupiedSlots(doc.placements.internal, modules);
        const start = nearestFreeStart(occupied, frame.slot_count, module.slots, 0);
        if (start === null) {
          set({ notice: `ไม่มีช่องว่างต่อเนื่อง ${module.slots} ช่องสำหรับ ${module.name}` });
          return;
        }
        commit({
          placements: {
            ...doc.placements,
            internal: [...doc.placements.internal, { module: module.slug, start_slot: start }],
          },
        });
        set({ selection: { kind: "internal", startSlot: start }, notice: null });
        return;
      }
      const face = firstFreeFace(module, frame, doc.placements);
      if (face === null) {
        set({ notice: `ไม่มีด้านว่างที่ติด ${module.name} ได้` });
        return;
      }
      commit({
        placements: { ...doc.placements, faces: [...doc.placements.faces, { module: module.slug, face }] },
      });
      set({ selection: { kind: "face", face }, notice: null });
    },

    removeSelected: () => {
      const { selection, removePlacement } = get();
      if (selection) removePlacement(selection);
    },

    removePlacement: (selection) => {
      const { doc } = get();
      if (!doc) return;
      const placements: Placements =
        selection.kind === "internal"
          ? {
              ...doc.placements,
              internal: doc.placements.internal.filter((item) => item.start_slot !== selection.startSlot),
            }
          : { ...doc.placements, faces: doc.placements.faces.filter((item) => item.face !== selection.face) };
      commit({ placements });
      set({ selection: null });
    },

    undo: () => {
      const { doc, past, future } = get();
      const previous = past[past.length - 1];
      if (!doc || !previous) return;
      set({
        doc: previous,
        past: past.slice(0, -1),
        future: [doc, ...future],
        selection: null,
        coalesce: null,
        notice: null,
      });
    },

    redo: () => {
      const { doc, past, future } = get();
      const next = future[0];
      if (!doc || !next) return;
      set({
        doc: next,
        past: [...past, doc],
        future: future.slice(1),
        selection: null,
        coalesce: null,
        notice: null,
      });
    },

    select: (selection) => set({ selection }),
    // Slots and faces are highlighted in their assembled positions, so reassemble before dropping.
    startDrag: (slug) => set({ draggingSlug: slug, dropTarget: null, exploded: false, selection: null, notice: null }),
    setDropTarget: (dropTarget) => set({ dropTarget }),
    endDrag: () => set({ draggingSlug: null, dropTarget: null }),

    commitDrag: () => {
      const { doc, draggingSlug, dropTarget } = get();
      set({ draggingSlug: null, dropTarget: null });
      if (!doc || !draggingSlug || !dropTarget?.valid) return;
      if (dropTarget.kind === "slot") {
        commit({
          placements: {
            ...doc.placements,
            internal: [...doc.placements.internal, { module: draggingSlug, start_slot: dropTarget.start }],
          },
        });
        set({ selection: { kind: "internal", startSlot: dropTarget.start } });
      } else {
        commit({
          placements: {
            ...doc.placements,
            faces: [...doc.placements.faces, { module: draggingSlug, face: dropTarget.face }],
          },
        });
        set({ selection: { kind: "face", face: dropTarget.face } });
      }
    },

    setExploded: (exploded) => set({ exploded }),
    setDeployed: (deployed) => set({ deployed }),
    setNotice: (notice) => set({ notice }),
  };
});

export function isDirty(state: Pick<BuilderState, "doc" | "savedDoc">): boolean {
  return state.doc !== null && (state.savedDoc === null || serialize(state.doc) !== state.savedDoc);
}

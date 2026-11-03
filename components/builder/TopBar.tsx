"use client";

import { Button } from "@/components/ui";
import { MISSIONS } from "@/lib/labels";
import type { Frame, MissionType, ModuleMap } from "@/lib/types";
import { isDirty, useBuilderStore } from "@/store/builder";

const MIN_ALTITUDE = 300;
const MAX_ALTITUDE = 800;
const ALTITUDE_STEP = 10;

export function TopBar({
  frames,
  modules,
  saving,
  onSave,
  onShare,
}: {
  frames: Frame[];
  modules: ModuleMap;
  saving: boolean;
  onSave: () => void;
  onShare: () => void;
}) {
  const doc = useBuilderStore((state) => state.doc);
  const canUndo = useBuilderStore((state) => state.past.length > 0);
  const canRedo = useBuilderStore((state) => state.future.length > 0);
  const dirty = useBuilderStore(isDirty);
  const setName = useBuilderStore((state) => state.setName);
  const setFrame = useBuilderStore((state) => state.setFrame);
  const setMission = useBuilderStore((state) => state.setMission);
  const setAltitude = useBuilderStore((state) => state.setAltitude);
  const undo = useBuilderStore((state) => state.undo);
  const redo = useBuilderStore((state) => state.redo);

  if (!doc) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-deck px-3 py-2">
      <input
        aria-label="ชื่อแบบ"
        value={doc.name}
        maxLength={100}
        onChange={(event) => setName(event.target.value)}
        className="w-48 rounded-md border border-transparent bg-transparent px-2 py-1 font-medium transition-colors hover:border-line focus:border-line-strong"
      />

      <div role="group" aria-label="ขนาดโครง" className="flex overflow-hidden rounded-md border border-line-strong">
        {frames.map((frame) => (
          <button
            key={frame.id}
            type="button"
            aria-pressed={frame.id === doc.frameId}
            onClick={() => setFrame(frame, modules)}
            className={`px-2.5 py-1 font-mono text-xs transition-colors ${
              frame.id === doc.frameId ? "bg-solar font-semibold text-void" : "text-ink-dim hover:bg-raised"
            }`}
          >
            {frame.size_u}U
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-ink-dim">ภารกิจ</span>
        <select
          value={doc.missionType}
          onChange={(event) => setMission(event.target.value as MissionType)}
          className="rounded-md border border-line-strong bg-panel px-2 py-1 text-sm"
        >
          {MISSIONS.map((mission) => (
            <option key={mission.value} value={mission.value}>
              {mission.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-ink-dim">ความสูง</span>
        <input
          type="range"
          min={MIN_ALTITUDE}
          max={MAX_ALTITUDE}
          step={ALTITUDE_STEP}
          value={doc.altitudeKm}
          onChange={(event) => setAltitude(Number(event.target.value))}
          className="range-solar w-32"
        />
        <span className="w-14 font-mono text-xs">{doc.altitudeKm} km</span>
      </label>

      <div className="ml-auto flex items-center gap-2">
        <Button onClick={undo} disabled={!canUndo} title="Ctrl+Z" aria-label="Undo">
          Undo
        </Button>
        <Button onClick={redo} disabled={!canRedo} title="Ctrl+Y" aria-label="Redo">
          Redo
        </Button>
        <Button onClick={onShare} disabled={saving}>
          Share
        </Button>
        <Button variant="primary" onClick={onSave} disabled={saving || !dirty}>
          {saving ? "กำลังบันทึก…" : dirty ? "Save" : "บันทึกแล้ว"}
        </Button>
      </div>
    </div>
  );
}

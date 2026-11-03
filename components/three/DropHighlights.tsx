"use client";

import { Edges } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { RefObject } from "react";
import { type Group, Raycaster, Vector2, Vector3 } from "three";

import { ALL_FACES, facePose, type FrameDims, frameDims, slotRunCenter } from "@/lib/geometry";
import { allowedFaces, nearestFreeStart, occupiedSlots } from "@/lib/placement";
import { dragPointer } from "@/lib/dragPointer";
import type { Face, Frame, Module, ModuleMap, Placements } from "@/lib/types";
import { type DropTarget, useBuilderStore } from "@/store/builder";

const GOOD = "#3ddc97";
const BAD = "#ff5d6c";
const FACE_STANDOFF = 0.02;
const BACK_FACE_PENALTY = 0.8;

const raycaster = new Raycaster();
const ndc = new Vector2();
const axisOrigin = new Vector3();
const axisDirection = new Vector3();
const toAxis = new Vector3();
const faceCenter = new Vector3();
const faceNormal = new Vector3();
const toCamera = new Vector3();

function sameTarget(a: DropTarget | null, b: DropTarget | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Distance along the frame's long axis of the point closest to the mouse ray. */
function pointerAlongAxis(group: Group): number {
  group.getWorldPosition(axisOrigin);
  axisDirection.set(0, 0, 1).transformDirection(group.matrixWorld);
  const { origin, direction } = raycaster.ray;
  toAxis.subVectors(axisOrigin, origin);
  const b = axisDirection.dot(direction);
  const d = axisDirection.dot(toAxis);
  const e = direction.dot(toAxis);
  const denominator = 1 - b * b;
  // Looking straight down the axis there is no closest point; aim for the middle.
  return denominator < 1e-5 ? 0 : (b * e - d) / denominator;
}

function slotTarget(group: Group, module: Module, frame: Frame, dims: FrameDims, placements: Placements, modules: ModuleMap): DropTarget {
  const along = pointerAlongAxis(group);
  const desired = (along + dims.z / 2) / dims.slotPitch - module.slots / 2;
  const occupied = occupiedSlots(placements.internal, modules);
  const start = nearestFreeStart(occupied, frame.slot_count, module.slots, desired);
  if (start !== null) return { kind: "slot", start, valid: true };
  const clamped = Math.max(0, Math.min(frame.slot_count - module.slots, Math.round(desired)));
  return { kind: "slot", start: clamped, valid: false };
}

function faceTarget(
  group: Group,
  module: Module,
  frame: Frame,
  dims: FrameDims,
  placements: Placements,
  camera: Parameters<Vector3["project"]>[0],
): DropTarget | null {
  const taken = new Set(placements.faces.map((item) => item.face));
  let best: Face | null = null;
  let bestScore = Infinity;
  for (const face of allowedFaces(module, frame)) {
    if (taken.has(face)) continue;
    const pose = facePose(face, dims);
    faceCenter.set(...pose.position);
    group.localToWorld(faceCenter);
    faceNormal.set(...pose.normal).transformDirection(group.matrixWorld);
    toCamera.subVectors(camera.position, faceCenter);
    const penalty = faceNormal.dot(toCamera) > 0 ? 0 : BACK_FACE_PENALTY;
    faceCenter.project(camera);
    const score = Math.hypot(faceCenter.x - ndc.x, faceCenter.y - ndc.y) + penalty;
    if (score < bestScore) {
      best = face;
      bestScore = score;
    }
  }
  return best === null ? null : { kind: "face", face: best, valid: true };
}

/** Works out the snap target every frame while a module from the library is being dragged. */
export function DragController({
  groupRef,
  frame,
  modules,
}: {
  groupRef: RefObject<Group | null>;
  frame: Frame;
  modules: ModuleMap;
}) {
  useFrame(({ camera, gl }) => {
    const { draggingSlug, doc, dropTarget, setDropTarget } = useBuilderStore.getState();
    const group = groupRef.current;
    if (!draggingSlug || !doc || !group) return;
    const part = modules[draggingSlug];
    if (!part) return;

    const rect = gl.domElement.getBoundingClientRect();
    const inside =
      dragPointer.x >= rect.left &&
      dragPointer.x <= rect.right &&
      dragPointer.y >= rect.top &&
      dragPointer.y <= rect.bottom;

    let target: DropTarget | null = null;
    if (inside) {
      ndc.set(((dragPointer.x - rect.left) / rect.width) * 2 - 1, -((dragPointer.y - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const dims = frameDims(frame);
      target =
        part.mount_type === "INTERNAL"
          ? slotTarget(group, part, frame, dims, doc.placements, modules)
          : faceTarget(group, part, frame, dims, doc.placements, camera);
    }
    if (!sameTarget(target, dropTarget)) setDropTarget(target);
  });

  return null;
}

function SlotHighlights({
  module,
  frame,
  dims,
  placements,
  modules,
  target,
}: {
  module: Module;
  frame: Frame;
  dims: FrameDims;
  placements: Placements;
  modules: ModuleMap;
  target: DropTarget | null;
}) {
  const occupied = occupiedSlots(placements.internal, modules);
  const slots = Array.from({ length: frame.slot_count }, (_, slot) => slot);
  const width = dims.x * 0.84;
  const height = dims.y * 0.84;

  return (
    <group>
      {slots.map((slot) => (
        <mesh key={slot} position={[0, 0, slotRunCenter(dims, slot, 1)]}>
          <boxGeometry args={[width, height, dims.slotPitch * 0.9]} />
          <meshBasicMaterial
            color={occupied.has(slot) ? BAD : GOOD}
            transparent
            opacity={occupied.has(slot) ? 0.1 : 0.07}
            depthWrite={false}
          />
        </mesh>
      ))}
      {target?.kind === "slot" && (
        <mesh position={[0, 0, slotRunCenter(dims, target.start, module.slots)]}>
          <boxGeometry args={[width * 1.03, height * 1.03, module.slots * dims.slotPitch * 0.96]} />
          <meshBasicMaterial color={target.valid ? GOOD : BAD} transparent opacity={0.5} depthWrite={false} />
          <Edges color={target.valid ? GOOD : BAD} />
        </mesh>
      )}
    </group>
  );
}

function FaceHighlights({
  module,
  frame,
  dims,
  placements,
  target,
}: {
  module: Module;
  frame: Frame;
  dims: FrameDims;
  placements: Placements;
  target: DropTarget | null;
}) {
  const allowed = allowedFaces(module, frame);
  const taken = new Set(placements.faces.map((item) => item.face));

  return (
    <group>
      {ALL_FACES.filter((face) => allowed.includes(face)).map((face) => {
        const pose = facePose(face, dims, FACE_STANDOFF);
        const isTaken = taken.has(face);
        const isTarget = target?.kind === "face" && target.face === face;
        return (
          <mesh key={face} position={pose.position} rotation={pose.rotation}>
            <planeGeometry args={[pose.width, pose.height]} />
            <meshBasicMaterial
              color={isTaken ? BAD : GOOD}
              transparent
              opacity={isTarget ? 0.6 : isTaken ? 0.22 : 0.16}
              depthWrite={false}
              side={2}
            />
            {isTarget && <Edges color={GOOD} />}
          </mesh>
        );
      })}
    </group>
  );
}

/** Green and red guides drawn in the frame while a drag is in progress. */
export function DropHighlights({ frame, modules }: { frame: Frame; modules: ModuleMap }) {
  const draggingSlug = useBuilderStore((state) => state.draggingSlug);
  const target = useBuilderStore((state) => state.dropTarget);
  const placements = useBuilderStore((state) => state.doc?.placements);

  const part = draggingSlug ? modules[draggingSlug] : null;
  if (!part || !placements) return null;
  const dims = frameDims(frame);

  return part.mount_type === "INTERNAL" ? (
    <SlotHighlights module={part} frame={frame} dims={dims} placements={placements} modules={modules} target={target} />
  ) : (
    <FaceHighlights module={part} frame={frame} dims={dims} placements={placements} target={target} />
  );
}

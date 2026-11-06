
import { Euler, Matrix4, Vector3 } from "three";

import type { Face, Frame } from "./types";

export const MM_PER_UNIT = 100;
export const ALL_FACES: Face[] = ["+X", "-X", "+Y", "-Y", "+Z", "-Z"];

export type Vec3 = [number, number, number];

export interface FrameDims {
  x: number;
  y: number;
  z: number;
  slotPitch: number;
}

export function frameDims(frame: Frame): FrameDims {
  const z = frame.length_mm / MM_PER_UNIT;
  return {
    x: frame.width_mm / MM_PER_UNIT,
    y: frame.height_mm / MM_PER_UNIT,
    z,
    slotPitch: z / frame.slot_count,
  };
}


export function slotRunCenter(dims: FrameDims, start: number, count: number): number {
  return -dims.z / 2 + (start + count / 2) * dims.slotPitch;
}

export interface FacePose {
  position: Vec3;
  rotation: Vec3;
  normal: Vec3;
  width: number;
  height: number;
}

const NORMALS: Record<Face, Vec3> = {
  "+X": [1, 0, 0],
  "-X": [-1, 0, 0],
  "+Y": [0, 1, 0],
  "-Y": [0, -1, 0],
  "+Z": [0, 0, 1],
  "-Z": [0, 0, -1],
};

export function facePose(face: Face, dims: FrameDims, standoff = 0): FacePose {
  const normal = NORMALS[face];
  const isEnd = face === "+Z" || face === "-Z";
  const zAxis = new Vector3(...normal);
  const xAxis = isEnd ? new Vector3(1, 0, 0) : new Vector3(0, 0, 1);
  const yAxis = new Vector3().crossVectors(zAxis, xAxis);
  const euler = new Euler().setFromRotationMatrix(new Matrix4().makeBasis(xAxis, yAxis, zAxis));

  const half = [dims.x / 2, dims.y / 2, dims.z / 2];
  const position = normal.map((component, axis) => component * (half[axis] + standoff)) as Vec3;

  let width = dims.x;
  let height = dims.y;
  if (face === "+X" || face === "-X") {
    width = dims.z;
    height = dims.y;
  } else if (face === "+Y" || face === "-Y") {
    width = dims.z;
    height = dims.x;
  }

  return { position, rotation: [euler.x, euler.y, euler.z], normal, width, height };
}

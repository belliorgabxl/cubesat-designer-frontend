/**
 * Procedural chassis: L-profile corner rails with solid ends, a rib at every 1U joint,
 * screws, separation-spring plungers and notched end plates. Everything that does not
 * move is merged, so the whole frame body costs two draw calls.
 */
import { ExtrudeGeometry, Path, Shape } from "three";

import type { FrameDims, Vec3 } from "@/lib/geometry";

import { cached, Kit, type PartGeometries, sizeKey } from "./kit";

const RAIL = 0.085;
const RAIL_WALL = 0.024;
const RAIL_END = 0.08;
const RIB = 0.06;
const RIB_WALL = 0.02;
const UNIT_LENGTH = 1.135;
const PLATE_THICKNESS = 0.03;
const BEVEL = 0.004;
const SCREW_RADIUS = 0.014;
const SCREW_HEIGHT = 0.008;
const PLUNGER_RADIUS = 0.016;
const PLUNGER_LENGTH = 0.012;
const WIDE_PLATE_RATIO = 1.6;

export interface FrameParts {
  body: PartGeometries;
  /** Drawn at +Z as is and at -Z turned half a turn, so its screws always face outwards. */
  plate: PartGeometries;
}

const CORNERS: [number, number][] = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
];

function body({ x, y, z }: FrameDims): PartGeometries {
  const kit = new Kit();
  const middle = z - 2 * RAIL_END;

  for (const [sx, sy] of CORNERS) {
    kit.box("aluminium", [RAIL_WALL, RAIL, middle], [sx * (x / 2 - RAIL_WALL / 2), sy * (y / 2 - RAIL / 2), 0]);
    kit.box(
      "aluminium",
      [RAIL - RAIL_WALL, RAIL_WALL, middle],
      [sx * (x / 2 - RAIL_WALL - (RAIL - RAIL_WALL) / 2), sy * (y / 2 - RAIL_WALL / 2), 0],
    );
    for (const end of [-1, 1]) {
      kit.box("aluminium", [RAIL, RAIL, RAIL_END], [sx * (x / 2 - RAIL / 2), sy * (y / 2 - RAIL / 2), end * (z / 2 - RAIL_END / 2)]);
    }
  }

  // Separation springs on one diagonal, deployment switches on the other.
  for (const [sx, sy] of [CORNERS[0], CORNERS[3]]) {
    for (const end of [-1, 1]) {
      kit.cylinder("steel", PLUNGER_RADIUS, PLUNGER_LENGTH, [sx * (x / 2 - RAIL / 2), sy * (y / 2 - RAIL / 2), end * (z / 2 + PLUNGER_LENGTH / 2)], "z", 12);
    }
  }

  const rows = Math.max(1, Math.round(z / UNIT_LENGTH));
  const ribs = Array.from({ length: rows - 1 }, (_, index) => -z / 2 + ((index + 1) * z) / rows);
  for (const at of ribs) {
    for (const side of [-1, 1]) {
      kit.box("aluminium", [x - 2 * RAIL, RIB_WALL, RIB], [0, side * (y / 2 - RIB_WALL / 2), at]);
      kit.box("aluminium", [RIB_WALL, y - 2 * RAIL, RIB], [side * (x / 2 - RIB_WALL / 2), 0, at]);
    }
  }

  for (const at of [...ribs, -(z / 2 - RAIL_END / 2), z / 2 - RAIL_END / 2]) {
    for (const [sx, sy] of CORNERS) {
      kit.hex("steel", SCREW_RADIUS, SCREW_HEIGHT, [sx * (x / 2 - RAIL / 2), sy * (y / 2 + SCREW_HEIGHT / 2), at], "y");
      kit.hex("steel", SCREW_RADIUS, SCREW_HEIGHT, [sx * (x / 2 + SCREW_HEIGHT / 2), sy * (y / 2 - RAIL / 2), at], "x");
    }
  }
  return kit.build();
}

/** End plate outline: the full end minus a notch at each corner where the rail ends sit. */
function plateShape(x: number, y: number): Shape {
  const hx = x / 2 - BEVEL;
  const hy = y / 2 - BEVEL;
  const notch = RAIL + BEVEL;
  const shape = new Shape();
  shape.moveTo(-hx + notch, -hy);
  shape.lineTo(hx - notch, -hy);
  shape.lineTo(hx - notch, -hy + notch);
  shape.lineTo(hx, -hy + notch);
  shape.lineTo(hx, hy - notch);
  shape.lineTo(hx - notch, hy - notch);
  shape.lineTo(hx - notch, hy);
  shape.lineTo(-hx + notch, hy);
  shape.lineTo(-hx + notch, hy - notch);
  shape.lineTo(-hx, hy - notch);
  shape.lineTo(-hx, -hy + notch);
  shape.lineTo(-hx + notch, -hy + notch);
  shape.closePath();

  const hole = (cx: number, cy: number, radius: number) => {
    const path = new Path();
    path.absarc(cx, cy, radius, 0, Math.PI * 2, true);
    shape.holes.push(path);
  };
  if (x / y > WIDE_PLATE_RATIO) {
    const radius = Math.min(x / 2, y) * 0.26;
    hole(-x / 4, 0, radius);
    hole(x / 4, 0, radius);
  } else {
    hole(0, 0, Math.min(x, y) * 0.26);
  }
  const small = Math.min(x, y) * 0.05;
  for (const [sx, sy] of CORNERS) hole(sx * hx * 0.62, sy * hy * 0.62, small);
  return shape;
}

function plate({ x, y }: FrameDims): PartGeometries {
  const kit = new Kit();
  const depth = PLATE_THICKNESS - 2 * BEVEL;
  const geometry = new ExtrudeGeometry(plateShape(x, y), {
    depth,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 1,
    curveSegments: 24,
  });
  geometry.translate(0, 0, -depth / 2);
  kit.add("aluminium", geometry);

  const face = PLATE_THICKNESS / 2 + SCREW_HEIGHT / 2;
  const hx = x / 2 - BEVEL;
  const hy = y / 2 - BEVEL;
  const inset = 0.04;
  for (const [sx, sy] of CORNERS) {
    const screws: Vec3[] = [
      [sx * (hx - RAIL - inset), sy * (hy - inset), face],
      [sx * (hx - inset), sy * (hy - RAIL - inset), face],
    ];
    for (const at of screws) kit.hex("steel", SCREW_RADIUS, SCREW_HEIGHT, at);
  }
  kit.box("chip", [0.1, 0.05, 0.016], [0, -(hy - 0.1), PLATE_THICKNESS / 2 + 0.008]);
  return kit.build();
}

const cache = new Map<string, FrameParts>();

export function frameParts(dims: FrameDims): FrameParts {
  return cached(cache, sizeKey(dims.x, dims.y, dims.z), () => ({ body: body(dims), plate: plate(dims) }));
}

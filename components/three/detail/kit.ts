import {
  BoxGeometry,
  type BufferGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Euler,
  Matrix4,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import type { Vec3 } from "@/lib/geometry";

import type { Finish } from "./finishes";

export type Axis = "x" | "y" | "z";
export type PartGeometries = Partial<Record<Finish, BufferGeometry>>;

/** Turns a Y-up primitive (cylinder, cone) so its +Y end points along the given axis. */
const ALONG: Record<Axis, Vec3> = {
  x: [0, 0, -Math.PI / 2],
  y: [0, 0, 0],
  z: [Math.PI / 2, 0, 0],
};
/** Turns an XY-plane primitive (torus) so it faces the given axis. */
const FACING: Record<Axis, Vec3> = {
  x: [0, Math.PI / 2, 0],
  y: [Math.PI / 2, 0, 0],
  z: [0, 0, 0],
};
const KEPT_ATTRIBUTES = new Set(["position", "normal", "uv"]);

const matrix = new Matrix4();
const rotation = new Quaternion();
const euler = new Euler();
const unit = new Vector3(1, 1, 1);
const offset = new Vector3();

/**
 * Collects many small primitives and merges them into one geometry per finish.
 * A part made of a hundred boxes still costs one draw call per material.
 */
export class Kit {
  private readonly pieces = new Map<Finish, BufferGeometry[]>();

  add(finish: Finish, geometry: BufferGeometry, position: Vec3 = [0, 0, 0], turn: Vec3 = [0, 0, 0]): this {
    rotation.setFromEuler(euler.set(turn[0], turn[1], turn[2]));
    geometry.applyMatrix4(matrix.compose(offset.set(...position), rotation, unit));
    const list = this.pieces.get(finish);
    if (list) list.push(geometry);
    else this.pieces.set(finish, [geometry]);
    return this;
  }

  box(finish: Finish, size: Vec3, position: Vec3, turn?: Vec3): this {
    return this.add(finish, new BoxGeometry(...size), position, turn);
  }

  /** Cylinder lying along `axis`; `endRadius` is the radius at the positive end. */
  cylinder(
    finish: Finish,
    radius: number,
    length: number,
    position: Vec3,
    axis: Axis = "z",
    segments = 16,
    endRadius = radius,
  ): this {
    return this.add(finish, new CylinderGeometry(endRadius, radius, length, segments), position, ALONG[axis]);
  }

  /** Hex screw head or nut. */
  hex(finish: Finish, radius: number, length: number, position: Vec3, axis: Axis = "z"): this {
    return this.cylinder(finish, radius, length, position, axis, 6);
  }

  ring(finish: Finish, radius: number, tube: number, position: Vec3, axis: Axis = "z", segments = 32): this {
    return this.add(finish, new TorusGeometry(radius, tube, 8, segments), position, FACING[axis]);
  }

  /** Half sphere bulging towards +Z. */
  dome(finish: Finish, radius: number, position: Vec3): this {
    return this.add(finish, new SphereGeometry(radius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), position, ALONG.z);
  }

  /** A cable or pipe through the given points. */
  tube(finish: Finish, points: Vec3[], radius: number, segments = 24): this {
    const curve = new CatmullRomCurve3(points.map((point) => new Vector3(...point)));
    return this.add(finish, new TubeGeometry(curve, segments, radius, 6, false));
  }

  build(): PartGeometries {
    const result: PartGeometries = {};
    for (const [finish, list] of this.pieces) {
      // mergeGeometries needs every piece indexed or every piece not indexed.
      const allIndexed = list.every((geometry) => geometry.index !== null);
      const ready = list.map((geometry) => {
        const piece = allIndexed || geometry.index === null ? geometry : geometry.toNonIndexed();
        for (const name of Object.keys(piece.attributes)) {
          if (!KEPT_ATTRIBUTES.has(name)) piece.deleteAttribute(name);
        }
        return piece;
      });
      const merged = mergeGeometries(ready, false);
      new Set([...list, ...ready]).forEach((geometry) => geometry.dispose());
      if (merged) {
        merged.computeBoundingSphere();
        result[finish] = merged;
      }
    }
    return result;
  }
}

/** Geometry that depends only on its key is built once and shared by every mesh that needs it. */
export function cached<T>(store: Map<string, T>, key: string, build: () => T): T {
  let value = store.get(key);
  if (value === undefined) {
    value = build();
    store.set(key, value);
  }
  return value;
}

/** Small deterministic generator, so a part looks the same on every load. */
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export function hashString(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Key fragment for a size, rounded so float noise does not defeat the cache. */
export function sizeKey(...values: number[]): string {
  return values.map((value) => value.toFixed(3)).join("x");
}

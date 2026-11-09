import { BoxGeometry, type BufferGeometry, type Material, MeshStandardMaterial } from "three";

import { solarCellTexture } from "../textures";
import { cached, Kit, type PartGeometries, sizeKey } from "./kit";

export const PANEL_THICKNESS = 0.022;
const CELL_WIDTH = 0.8;
const CELL_HEIGHT = 0.42;
const SIDE_INDICES = 24;
const FACE_INDICES = 12;

const plates = new Map<string, BufferGeometry>();
const details = new Map<string, PartGeometries>();
const hinges = new Map<string, PartGeometries>();
const cellMaterials = new Map<string, Material>();

/**
 * Panel board with two material groups instead of BoxGeometry's six: the four edges
 * share group 0 and the two cell faces share group 1, so a panel is two draw calls.
 */
export function panelPlate(width: number, height: number): BufferGeometry {
  return cached(plates, sizeKey(width, height), () => {
    const geometry = new BoxGeometry(width, height, PANEL_THICKNESS);
    geometry.clearGroups();
    geometry.addGroup(0, SIDE_INDICES, 0);
    geometry.addGroup(SIDE_INDICES, FACE_INDICES, 1);
    return geometry;
  });
}

/** Sun sensor and thermistor on body panels, hold-down bracket on deployable wings. */
export function panelDetails(width: number, height: number, deployable: boolean): PartGeometries {
  return cached(details, `${sizeKey(width, height)}|${deployable}`, () => {
    const kit = new Kit();
    const face = PANEL_THICKNESS / 2;
    if (deployable) {
      kit.box("chip", [0.1, 0.035, 0.024], [0, -height / 2 + 0.035, face + 0.012]);
      kit.hex("steel", 0.014, 0.006, [0, -height / 2 + 0.035, face + 0.027]);
    } else {
      const x = width / 2 - 0.09;
      const y = height / 2 - 0.09;
      kit.box("chip", [0.07, 0.07, 0.012], [x, y, face + 0.006]);
      kit.cylinder("glass", 0.018, 0.004, [x, y, face + 0.014], "z", 20);
      kit.box("ceramic", [0.02, 0.012, 0.004], [-(width / 2 - 0.06), -(height / 2 - 0.05), face + 0.002]);
    }
    return kit.build();
  });
}

/** Hinge knuckles and pin along the wing's root edge. */
export function hingeParts(width: number): PartGeometries {
  return cached(hinges, sizeKey(width), () => {
    const kit = new Kit();
    for (const share of [-0.35, 0, 0.35]) kit.cylinder("steel", 0.022, width * 0.12, [width * share, 0, 0], "x", 12);
    kit.cylinder("steel", 0.008, width * 0.82, [0, 0, 0], "x", 8);
    return kit.build();
  });
}

/** Cell-face material: one per panel size and selection state, shared by every panel like it. */
export function cellMaterial(width: number, height: number, glowColor: string, glow: number, selected: boolean): Material {
  const repeatX = Math.max(1, Math.round(width / CELL_WIDTH));
  const repeatY = Math.max(1, Math.round(height / CELL_HEIGHT));
  return cached(cellMaterials, `${repeatX}x${repeatY}|${selected}`, () => {
    return new MeshStandardMaterial({
      map: solarCellTexture(repeatX, repeatY),
      metalness: 0.35,
      roughness: 0.3,
      envMapIntensity: 1.4,
      emissive: glowColor,
      emissiveIntensity: selected ? glow : 0,
    });
  });
}

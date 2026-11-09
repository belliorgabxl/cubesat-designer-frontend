import { type Material, MeshPhysicalMaterial, MeshStandardMaterial } from "three";

const STANDARD = {
  aluminium: { color: "#c3cad6", metalness: 0.75, roughness: 0.34 },
  anodized: { color: "#3b424d", metalness: 0.6, roughness: 0.42 },
  steel: { color: "#9ca3ad", metalness: 0.9, roughness: 0.3 },
  chip: { color: "#16191f", metalness: 0.25, roughness: 0.55 },
  gold: { color: "#d8ad4c", metalness: 1, roughness: 0.28 },
  copper: { color: "#c0703f", metalness: 0.95, roughness: 0.34 },
  shield: { color: "#d9dee5", metalness: 0.85, roughness: 0.24 },
  ceramic: { color: "#ebe7dc", metalness: 0, roughness: 0.6 },
} as const;

/**
 * Shared surface types. `accent` is not in the table: it is the module's own colour,
 * so the part still reads as "the orange battery" or "the red wheels" at a glance.
 */
export type Finish = keyof typeof STANDARD | "glass" | "accent";

const materials = new Map<string, Material>();

/** One material per finish for the whole app, so meshes share state and shader programs. */
export function finishMaterial(finish: Exclude<Finish, "accent">): Material {
  let material = materials.get(finish);
  if (!material) {
    material =
      finish === "glass"
        ? new MeshPhysicalMaterial({ color: "#1d2f5c", metalness: 0.1, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05 })
        : new MeshStandardMaterial(STANDARD[finish]);
    materials.set(finish, material);
  }
  return material;
}

/** The module-coloured material, in its normal and selected (glowing) state. */
export function accentMaterial(color: string, glowColor: string, glow: number, selected: boolean): Material {
  const key = `accent:${color}:${selected}`;
  let material = materials.get(key);
  if (!material) {
    material = new MeshStandardMaterial({
      color,
      metalness: 0.35,
      roughness: 0.45,
      emissive: glowColor,
      emissiveIntensity: selected ? glow : 0,
    });
    materials.set(key, material);
  }
  return material;
}

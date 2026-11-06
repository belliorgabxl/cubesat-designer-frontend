
import type { Category, Frame, Module, ModuleMap, MountType, Placements } from "./types";

export const HERO_FRAME: Frame = {
  id: 0,
  name: "CubeSat 3U",
  size_u: 3,
  length_mm: 341,
  width_mm: 100,
  height_mm: 100,
  mass_g: 450,
  max_mass_g: 6000,
  slot_count: 12,
};

function part(slug: string, category: Category, mountType: MountType, slots: number, color: string): Module {
  return {
    id: 0,
    name: slug,
    slug,
    category,
    mount_type: mountType,
    slots,
    mass_g: 0,
    power_consume_w: 0,
    power_generate_w: 0,
    battery_capacity_wh: 0,
    fits_frame_sizes: [],
    price_usd: 0,
    color,
    model_url: null,
    description: "",
    allowed_faces: {},
  };
}

const PARTS = [
  part("obc", "OBC", "INTERNAL", 1, "#2fa66a"),
  part("battery", "EPS_BATTERY", "INTERNAL", 2, "#e8a62f"),
  part("radio", "COMMS", "INTERNAL", 1, "#5563e0"),
  part("wheels", "ADCS", "INTERNAL", 2, "#d6455f"),
  part("camera", "PAYLOAD", "INTERNAL", 4, "#b57bee"),
  part("wing", "SOLAR_DEPLOYABLE", "DEPLOYABLE", 0, "#14264f"),
];

export const HERO_MODULES: ModuleMap = Object.fromEntries(PARTS.map((module) => [module.slug, module]));

export const HERO_PLACEMENTS: Placements = {
  internal: [
    { module: "obc", start_slot: 0 },
    { module: "battery", start_slot: 1 },
    { module: "radio", start_slot: 3 },
    { module: "wheels", start_slot: 4 },
    { module: "camera", start_slot: 7 },
  ],
  faces: [
    { module: "wing", face: "+X" },
    { module: "wing", face: "-X" },
  ],
};

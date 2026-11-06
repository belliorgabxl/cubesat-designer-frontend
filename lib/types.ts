export type Category =
  | "OBC"
  | "EPS_BATTERY"
  | "COMMS"
  | "ADCS"
  | "PAYLOAD"
  | "SOLAR_BODY"
  | "SOLAR_DEPLOYABLE";

export type MountType = "INTERNAL" | "FACE" | "DEPLOYABLE";

export type MissionType = "EARTH_OBSERVATION" | "COMMUNICATION" | "SCIENCE";

export type Face = "+X" | "-X" | "+Y" | "-Y" | "+Z" | "-Z";

export interface Frame {
  id: number;
  name: string;
  size_u: number;
  length_mm: number;
  width_mm: number;
  height_mm: number;
  mass_g: number;
  max_mass_g: number;
  slot_count: number;
}

export interface Module {
  id: number;
  name: string;
  slug: string;
  category: Category;
  mount_type: MountType;
  slots: number;
  mass_g: number;
  power_consume_w: number;
  power_generate_w: number;
  battery_capacity_wh: number;
  fits_frame_sizes: number[];
  price_usd: number;
  color: string;
  model_url: string | null;
  description: string;
  allowed_faces: Record<string, Face[]>;
}

export type ModuleMap = Record<string, Module>;

export interface InternalPlacement {
  module: string;
  start_slot: number;
}

export interface FacePlacement {
  module: string;
  face: Face;
}

export interface Placements {
  internal: InternalPlacement[];
  faces: FacePlacement[];
}

export type BudgetStatus = "OK" | "WARNING" | "ERROR";
export type BatteryStatus = "OK" | "WARNING" | "FAILED";

export interface Evaluation {
  mass: { total_g: number; max_g: number; pct: number; status: BudgetStatus };
  slots: {
    used: number;
    total: number;
    occupied: number[];
    free: number[];
    conflicts: number[];
    out_of_range: number[];
  };
  power: {
    generate_sunlit_w: number;
    generate_avg_w: number;
    consume_w: number;
    status: BudgetStatus;
  };
  orbit: { altitude_km: number; period_min: number; eclipse_fraction: number };
  mission: { type: MissionType; missing: string[] };
  cost_usd: number;
  warnings: string[];
  errors: string[];
}

export interface SimulationPoint {
  t_min: number;
  battery_pct: number;
  in_eclipse: boolean;
}

export interface Simulation {
  capacity_wh: number;
  generate_sunlit_w: number;
  consume_w: number;
  period_min: number;
  eclipse_fraction: number;
  series: SimulationPoint[];
  min_battery_pct: number;
  status: BatteryStatus;
  reason: string;
}

export interface DesignSummary {
  module_count: number;
  mass_g: number;
  cost_usd: number;
  battery_status: BatteryStatus;
}

export interface Design {
  id: number;
  name: string;
  owner: string;
  frame: Frame;
  mission_type: MissionType;
  altitude_km: number;
  placements: Placements;
  is_public: boolean;
  share_slug: string;
  created_at: string;
  updated_at: string;
  summary?: DesignSummary;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface DesignPayload {
  name: string;
  frame: number;
  mission_type: MissionType;
  altitude_km: number;
  placements: Placements;
  is_public?: boolean;
}

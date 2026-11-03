import type { BatteryStatus, Category, MissionType } from "./types";

export const CATEGORY_ORDER: Category[] = [
  "OBC",
  "EPS_BATTERY",
  "COMMS",
  "ADCS",
  "PAYLOAD",
  "SOLAR_BODY",
  "SOLAR_DEPLOYABLE",
];

export const CATEGORY_LABELS: Record<Category, string> = {
  OBC: "OBC · คอมพิวเตอร์ควบคุม",
  EPS_BATTERY: "EPS · แบตเตอรี่",
  COMMS: "COMMS · สื่อสาร",
  ADCS: "ADCS · ควบคุมท่าทาง",
  PAYLOAD: "PAYLOAD · อุปกรณ์ภารกิจ",
  SOLAR_BODY: "แผงโซลาร์ติดผิว",
  SOLAR_DEPLOYABLE: "แผงโซลาร์กางออก",
};

export const MISSIONS: { value: MissionType; label: string }[] = [
  { value: "EARTH_OBSERVATION", label: "ถ่ายภาพโลก" },
  { value: "COMMUNICATION", label: "สื่อสาร" },
  { value: "SCIENCE", label: "วิทยาศาสตร์" },
];

export function missionLabel(value: MissionType): string {
  return MISSIONS.find((mission) => mission.value === value)?.label ?? value;
}

export const BATTERY_STATUS_LABELS: Record<BatteryStatus, string> = {
  OK: "พลังงานพอ",
  WARNING: "แบตเตอรี่ต่ำ",
  FAILED: "แบตเตอรี่หมด",
};

export function formatUsd(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function formatMass(grams: number): string {
  return grams >= 1000 ? `${(grams / 1000).toFixed(2)} kg` : `${grams} g`;
}

export function formatWatts(value: number): string {
  return `${value.toFixed(1)} W`;
}

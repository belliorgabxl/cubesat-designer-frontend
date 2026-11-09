/**
 * Procedural internal modules, built as PC/104-style stacks: boards across the frame,
 * four corner rods with anodised spacers, a stack-through connector, and the parts
 * that make each module recognisable. Coordinates are module-local: Z runs along the
 * frame, the module spans z = -l/2 .. l/2 and each board's parts sit on its +Z side.
 */
import { BoxGeometry } from "three";

import type { Vec3 } from "@/lib/geometry";
import type { Module } from "@/lib/types";

import type { Finish } from "./finishes";
import { cached, hashString, Kit, type PartGeometries, seededRandom, sizeKey } from "./kit";

const BOARD = 0.02;
const ROD_INSET = 0.045;
const ROD_RADIUS = 0.011;
const NUT_RADIUS = 0.02;
const NUT_HEIGHT = 0.008;
const SPACER_RADIUS = 0.019;
const CONNECTOR_WIDTH = 0.05;
const MAX_BRIDGE = 0.26;
const SHORT_HEADER = 0.04;
const CORNER_KEEP_OUT = 0.07;
const EDGE_MARGIN = 0.03;
const GRID = 0.07;
const CHIP_CHANCE = 0.26;
const PASSIVE_CHANCE = 0.56;
const MIN_FILL_DEPTH = 0.015;

export type Variant =
  | "obc"
  | "obc-advanced"
  | "battery"
  | "uhf"
  | "s-band"
  | "x-band"
  | "magnetorquer"
  | "wheels"
  | "star-tracker"
  | "camera"
  | "telescope"
  | "sensor"
  | "generic";

/** Picks the look from the slug, falling back to the category for modules the table does not know. */
export function moduleVariant(module: Pick<Module, "category" | "slug" | "slots">): Variant {
  const slug = module.slug;
  switch (module.category) {
    case "OBC":
      return slug.includes("advanced") ? "obc-advanced" : "obc";
    case "EPS_BATTERY":
      return "battery";
    case "COMMS":
      if (slug.includes("x-band")) return "x-band";
      if (slug.includes("s-band")) return "s-band";
      return "uhf";
    case "ADCS":
      if (slug.includes("star")) return "star-tracker";
      if (slug.includes("magnet") || slug.includes("torquer")) return "magnetorquer";
      return "wheels";
    case "PAYLOAD":
      if (slug.includes("camera")) return module.slots >= 4 ? "telescope" : "camera";
      return "sensor";
    default:
      return "generic";
  }
}

interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** One board and the space above it, up to the next board or the end of the module. */
class Deck {
  readonly keepOut: Rect[] = [];

  constructor(
    readonly kit: Kit,
    readonly z: number,
    readonly depth: number,
    readonly w: number,
    readonly h: number,
  ) {}

  /** Marks a footprint as used so the filler leaves it alone. */
  reserve(x: number, y: number, sizeX: number, sizeY: number) {
    this.keepOut.push({ x0: x - sizeX / 2, x1: x + sizeX / 2, y0: y - sizeY / 2, y1: y + sizeY / 2 });
  }

  /** A box standing on the board (raised by `lift`), with its footprint reserved. */
  box(finish: Finish, size: Vec3, x: number, y: number, lift = 0) {
    this.reserve(x, y, size[0], size[1]);
    this.kit.box(finish, size, [x, y, this.z + lift + size[2] / 2]);
  }

  /** Point at `height` above the board. */
  at(x: number, y: number, height: number): Vec3 {
    return [x, y, this.z + height];
  }

  free(rect: Rect) {
    return this.keepOut.every((used) => rect.x1 <= used.x0 || rect.x0 >= used.x1 || rect.y1 <= used.y0 || rect.y0 >= used.y1);
  }
}

/** Boards, corner rods, spacers and the stack connector shared by every module. */
function stack(kit: Kit, w: number, h: number, l: number, count: number): Deck[] {
  const pitch = l / count;
  const decks: Deck[] = [];
  const corners: [number, number][] = [
    [w / 2 - ROD_INSET, h / 2 - ROD_INSET],
    [-(w / 2 - ROD_INSET), h / 2 - ROD_INSET],
    [w / 2 - ROD_INSET, -(h / 2 - ROD_INSET)],
    [-(w / 2 - ROD_INSET), -(h / 2 - ROD_INSET)],
  ];

  for (let index = 0; index < count; index += 1) {
    const base = -l / 2 + index * pitch;
    kit.box("accent", [w, h, BOARD], [0, 0, base + BOARD / 2]);
    const deck = new Deck(kit, base + BOARD, pitch - BOARD, w, h);
    const last = index === count - 1;
    const spacerLength = deck.depth - NUT_HEIGHT - (last ? NUT_HEIGHT : 0);

    for (const [x, y] of corners) {
      kit.hex("steel", NUT_RADIUS, NUT_HEIGHT, deck.at(x, y, NUT_HEIGHT / 2));
      kit.cylinder("accent", SPACER_RADIUS, spacerLength, deck.at(x, y, NUT_HEIGHT + spacerLength / 2), "z", 12);
      deck.reserve(x, y, CORNER_KEEP_OUT, CORNER_KEEP_OUT);
    }
    // A stack-through header bridges to the next board; a tall single-board module gets a short one.
    const header = deck.depth > MAX_BRIDGE ? SHORT_HEADER : deck.depth;
    deck.box("chip", [CONNECTOR_WIDTH, h * 0.42, header], -w / 2 + 0.075, 0);
    decks.push(deck);
  }

  for (const [x, y] of corners) {
    kit.cylinder("steel", ROD_RADIUS, l, [x, y, 0], "z", 8);
    kit.hex("steel", NUT_RADIUS, NUT_HEIGHT, [x, y, l / 2 - NUT_HEIGHT / 2]);
  }
  return decks;
}

/** Scatters chips and passives over whatever board area the main parts left free. */
function fill(deck: Deck, random: () => number) {
  if (deck.depth < MIN_FILL_DEPTH) return;
  const chipHeight = Math.min(0.012, deck.depth * 0.3);
  const columns = Math.floor((deck.w - 2 * EDGE_MARGIN) / GRID);
  const rows = Math.floor((deck.h - 2 * EDGE_MARGIN) / GRID);
  const startX = -(columns * GRID) / 2;
  const startY = -(rows * GRID) / 2;

  for (let column = 0; column < columns; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      const cell = {
        x0: startX + column * GRID,
        x1: startX + (column + 1) * GRID,
        y0: startY + row * GRID,
        y1: startY + (row + 1) * GRID,
      };
      if (!deck.free(cell)) continue;
      const x = (cell.x0 + cell.x1) / 2;
      const y = (cell.y0 + cell.y1) / 2;
      const roll = random();
      if (roll < CHIP_CHANCE) {
        const sizeX = GRID * (0.4 + random() * 0.42);
        const sizeY = GRID * (0.3 + random() * 0.5);
        const height = chipHeight * (0.5 + random() * 0.5);
        deck.kit.box("chip", [sizeX, sizeY, height], deck.at(x, y, height / 2));
      } else if (roll < PASSIVE_CHANCE) {
        const count = 2 + Math.floor(random() * 3);
        const vertical = random() > 0.5;
        for (let item = 0; item < count; item += 1) {
          const shift = (item - (count - 1) / 2) * 0.016;
          const size: Vec3 = vertical ? [0.009, 0.018, 0.006] : [0.018, 0.009, 0.006];
          deck.kit.box("ceramic", size, deck.at(vertical ? x + shift : x, vertical ? y : y + shift, 0.003));
        }
      }
    }
  }
}

/** SMA connector at the board's +X edge; returns where its coax leaves. */
function sma(deck: Deck, y: number): Vec3 {
  const x = deck.w / 2 - 0.05;
  const height = 0.018;
  deck.box("gold", [0.026, 0.034, 0.03], x, y);
  deck.kit.cylinder("gold", 0.011, 0.04, deck.at(x + 0.03, y, height), "x", 12);
  deck.kit.hex("gold", 0.016, 0.01, deck.at(x + 0.017, y, height), "x");
  return deck.at(x - 0.014, y, height);
}

function coax(deck: Deck, from: Vec3, to: Vec3, lift: number) {
  const top = Math.max(from[2], to[2]) + lift;
  deck.kit.tube(
    "chip",
    [from, [from[0] - 0.04, from[1], top], [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, top], to],
    0.006,
  );
}

function shieldCan(deck: Deck, sizeX: number, sizeY: number, x: number, y: number): number {
  const height = Math.min(0.032, deck.depth * 0.5);
  deck.box("shield", [sizeX, sizeY, height], x, y);
  return height;
}

/** Heatsink fins spaced along X, standing on `base` (height above the board). */
function fins(deck: Deck, x: number, y: number, sizeX: number, sizeY: number, base: number, height: number, count: number) {
  if (height <= 0.004) return;
  for (let index = 0; index < count; index += 1) {
    const finX = x - sizeX / 2 + (index + 0.5) * (sizeX / count);
    deck.kit.box("aluminium", [Math.min(0.008, sizeX / count / 2), sizeY, height], deck.at(finX, y, base + height / 2));
  }
}

function obc(deck: Deck, advanced: boolean) {
  const { w, h, kit } = deck;
  const size = Math.min(w, h) * 0.26;
  const chipHeight = Math.min(0.018, deck.depth * 0.25);
  const cx = w * 0.06;
  const cy = h * 0.04;
  deck.box("chip", [size, size, chipHeight], cx, cy);

  if (advanced) {
    kit.box("aluminium", [size * 1.1, size * 1.1, 0.008], deck.at(cx, cy, chipHeight + 0.004));
    fins(deck, cx, cy, size * 1.1, size * 1.1, chipHeight + 0.008, Math.min(0.06, deck.depth - chipHeight - 0.03), 8);
    deck.box("chip", [size * 0.7, size * 0.7, chipHeight * 0.8], cx, -h * 0.26);
  } else {
    kit.box("shield", [size * 0.55, size * 0.55, 0.003], deck.at(cx, cy, chipHeight + 0.0015));
  }

  const ramCount = advanced ? 4 : 2;
  for (let index = 0; index < ramCount; index += 1) {
    deck.box("chip", [0.05, 0.11, 0.012], -w * 0.2 + (index % 2) * 0.07, (Math.floor(index / 2) - 0.5) * 0.15 + (advanced ? 0 : 0.075));
  }

  kit.cylinder("steel", 0.011, 0.04, deck.at(w * 0.3, -h * 0.3, 0.011), "x", 12);
  deck.reserve(w * 0.3, -h * 0.3, 0.05, 0.03);
  deck.box("shield", [0.12, 0.1, 0.014], w * 0.27, h * 0.3);
  deck.box("ceramic", [0.12, 0.026, 0.03], w * 0.12, -h * 0.4);
  for (let pin = 0; pin < 6; pin += 1) {
    kit.box("gold", [0.008, 0.008, 0.012], deck.at(w * 0.12 - 0.05 + pin * 0.02, -h * 0.4, 0.036));
  }
}

function battery(decks: Deck[], capacityWh: number, slots: number) {
  const wanted = capacityWh > 0 ? Math.max(1, Math.round(capacityWh / 10)) : 2 * slots;
  let remaining = wanted;

  decks.forEach((deck, index) => {
    const { kit, w, h } = deck;
    const radius = Math.min(0.088, (deck.depth - 0.006) / 2);
    const length = Math.min(0.65, w * 0.72);
    const pitch = 2 * radius + 0.006;
    const fit = Math.max(1, Math.floor((h * 0.95) / pitch));
    const here = Math.min(fit, Math.ceil(remaining / (decks.length - index)));
    remaining -= here;

    if (here > 0 && radius > 0.01) {
      const z = radius + 0.003;
      const span = here * pitch;
      for (let cell = 0; cell < here; cell += 1) {
        const y = -span / 2 + pitch * (cell + 0.5);
        kit.cylinder("accent", radius, length - 0.024, deck.at(0, y, z), "x", 20);
        for (const side of [-1, 1]) {
          kit.cylinder("steel", radius * 0.92, 0.012, deck.at(side * (length / 2 - 0.006), y, z), "x", 20);
        }
        const terminal = cell % 2 === 0 ? 1 : -1;
        kit.cylinder("steel", radius * 0.35, 0.006, deck.at(terminal * (length / 2 + 0.003), y, z), "x", 12);
      }
      for (const side of [-1, 1]) {
        kit.box("steel", [0.004, span - 0.006, radius * 0.9], deck.at(side * (length / 2 + 0.008), 0, z));
        kit.box("chip", [0.03, span + 0.012, radius * 1.2], deck.at(side * length * 0.3, 0, radius * 0.6));
      }
      deck.reserve(0, 0, length + 0.03, span + 0.012);
    }

    if (index === 0) deck.box("ceramic", [0.04, 0.12, 0.03], w / 2 - 0.07, 0);
  });
}

function uhf(deck: Deck) {
  const { w, h } = deck;
  const top = shieldCan(deck, w * 0.46, h * 0.5, -w * 0.02, h * 0.06);
  coax(deck, sma(deck, -h * 0.3), deck.at(w * 0.12, -h * 0.17, top + 0.004), 0.03);
  deck.box("ceramic", [0.1, 0.03, 0.025], -w * 0.15, -h * 0.36);
}

function sBand(deck: Deck) {
  const { w, h } = deck;
  const top = shieldCan(deck, w * 0.5, h * 0.46, -w * 0.03, h * 0.1);
  coax(deck, sma(deck, -h * 0.18), deck.at(w * 0.16, -h * 0.1, top + 0.004), 0.025);
  coax(deck, sma(deck, -h * 0.34), deck.at(w * 0.04, -h * 0.1, top + 0.004), 0.04);
  deck.box("chip", [0.08, 0.08, 0.01], -w * 0.16, -h * 0.28);
  fins(deck, -w * 0.16, -h * 0.28, 0.09, 0.08, 0.01, Math.min(0.035, deck.depth * 0.4), 5);
}

function xBand(decks: Deck[]) {
  const [amplifier, radio] = decks;
  {
    const { w, h } = amplifier;
    const height = Math.min(0.06, amplifier.depth * 0.4);
    amplifier.box("aluminium", [w * 0.56, h * 0.44, height], w * 0.04, -h * 0.02);
    fins(amplifier, w * 0.04, -h * 0.02, w * 0.56, h * 0.42, height, Math.min(0.05, amplifier.depth - height - 0.03), 9);
    for (const [sx, sy] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
      amplifier.kit.hex("steel", 0.012, 0.006, amplifier.at(w * 0.04 + sx * w * 0.26, -h * 0.02 + sy * h * 0.2, height + 0.003));
    }
    coax(amplifier, sma(amplifier, -h * 0.3), amplifier.at(w * 0.2, -h * 0.24, height * 0.5), 0.03);
  }
  if (radio) {
    const { w, h } = radio;
    const top = shieldCan(radio, w * 0.5, h * 0.48, -w * 0.02, h * 0.08);
    [-0.12, -0.24, -0.36].forEach((share, index) => {
      coax(radio, sma(radio, h * share), radio.at(w * (0.18 - index * 0.1), -h * 0.12, top + 0.004), 0.02 + index * 0.012);
    });
  }
}

function magnetorquer(deck: Deck) {
  const { w, h, kit } = deck;
  const rod = Math.min(0.03, deck.depth * 0.3);
  const rodX = w * 0.6;
  kit.cylinder("copper", rod, rodX, deck.at(0, h * 0.28, rod), "x", 16);
  for (const side of [-1, 1]) kit.cylinder("accent", rod * 1.25, 0.03, deck.at(side * (rodX / 2), h * 0.28, rod), "x", 16);
  deck.reserve(0, h * 0.28, rodX + 0.04, rod * 2.6);

  const rodY = h * 0.5;
  kit.cylinder("copper", rod, rodY, deck.at(w * 0.32, -h * 0.1, rod), "y", 16);
  for (const side of [-1, 1]) kit.cylinder("accent", rod * 1.25, 0.03, deck.at(w * 0.32, -h * 0.1 + side * (rodY / 2), rod), "y", 16);
  deck.reserve(w * 0.32, -h * 0.1, rod * 2.6, rodY + 0.04);

  const coil = Math.min(w, h) * 0.22;
  const tube = Math.min(0.018, deck.depth * 0.2);
  kit.ring("copper", coil, tube, deck.at(-w * 0.12, -h * 0.12, tube), "z", 40);
  deck.reserve(-w * 0.12, -h * 0.12, coil * 2 + tube * 2, coil * 2 + tube * 2);
}

function wheel(deck: Deck, radius: number, thickness: number, x: number, y: number, axis: "x" | "y" | "z") {
  const { kit } = deck;
  const standing = axis !== "z";
  const z = standing ? radius + 0.012 : thickness / 2 + 0.004;
  const centre = deck.at(x, y, z);
  const shift = (amount: number): Vec3 =>
    axis === "x" ? [centre[0] + amount, centre[1], centre[2]] : axis === "y" ? [centre[0], centre[1] + amount, centre[2]] : [centre[0], centre[1], centre[2] + amount];

  kit.cylinder("accent", radius, thickness, centre, axis, 32);
  kit.cylinder("shield", radius * 0.82, 0.004, shift(thickness / 2 + 0.002), axis, 32);
  kit.cylinder("chip", radius * 0.25, 0.008, shift(thickness / 2 + 0.006), axis, 16);
  for (let bolt = 0; bolt < 6; bolt += 1) {
    const angle = (bolt / 6) * Math.PI * 2;
    const a = Math.cos(angle) * radius * 0.92;
    const b = Math.sin(angle) * radius * 0.92;
    const offset: Vec3 = axis === "x" ? [0, a, b] : axis === "y" ? [a, 0, b] : [a, b, 0];
    const head = shift(thickness / 2 + 0.002);
    kit.hex("steel", 0.008, 0.005, [head[0] + offset[0], head[1] + offset[1], head[2] + offset[2]], axis);
  }

  const footprintX = axis === "x" ? thickness : radius * 2;
  const footprintY = axis === "y" ? thickness : radius * 2;
  if (standing) deck.box("aluminium", [footprintX * 1.3, footprintY * 0.7, 0.012], x, y);
  deck.reserve(x, y, footprintX + 0.02, footprintY + 0.02);
}

function wheels(deck: Deck) {
  const { w, h } = deck;
  const radius = Math.min(0.13, deck.depth * 0.42, w * 0.17, h * 0.2);
  const thickness = radius * 0.55;
  wheel(deck, radius, thickness, -w * 0.18, -h * 0.18, "z");
  wheel(deck, radius, thickness, w * 0.2, -h * 0.18, "x");
  wheel(deck, radius, thickness, w * 0.05, h * 0.2, "y");
}

function starTracker(deck: Deck) {
  const { w, h, kit } = deck;
  const radius = Math.min(0.075, deck.depth * 0.4);
  const body = Math.min(0.18, h * 0.3);
  const x = w * 0.05;
  const y = -h * 0.05;
  deck.box("accent", [body, body, Math.min(deck.depth * 0.85, radius * 2 + 0.02)], x, y);

  const start = y + body / 2;
  const end = h / 2 - 0.012;
  const length = end - start;
  const z = radius + 0.004;
  if (length > 0.02) {
    kit.cylinder("chip", radius, length, deck.at(x, start + length / 2, z), "y", 28);
    for (let vane = 1; vane <= 3; vane += 1) {
      kit.cylinder("chip", radius * 1.12, 0.008, deck.at(x, start + (length * vane) / 4, z), "y", 28);
    }
    kit.cylinder("glass", radius * 0.8, 0.004, deck.at(x, end + 0.002, z), "y", 28);
    deck.reserve(x, start + length / 2, radius * 2.3, length);
  }
}

function camera(deck: Deck) {
  const { w, h, kit } = deck;
  const height = Math.min(0.16, deck.depth * 0.55);
  const body = h * 0.4;
  const x = -w * 0.05;
  const y = -h * 0.14;
  deck.box("accent", [w * 0.42, body, height], x, y);

  const radius = Math.min(0.11, height * 0.48);
  const z = Math.max(height / 2, radius * 1.1);
  const start = y + body / 2;
  const end = h / 2 - 0.012;
  const length = end - start;
  if (length > 0.03) {
    const steps: [Finish, number, number][] = [
      ["chip", 1, 0.35],
      ["anodized", 1.08, 0.25],
      ["chip", 0.96, 0.4],
    ];
    let cursor = start;
    for (const [finish, scale, share] of steps) {
      kit.cylinder(finish, radius * scale, length * share, deck.at(x, cursor + (length * share) / 2, z), "y", 32);
      cursor += length * share;
    }
    kit.ring("aluminium", radius * 0.98, 0.006, deck.at(x, end - 0.004, z), "y", 32);
    kit.cylinder("glass", radius * 0.78, 0.004, deck.at(x, end + 0.002, z), "y", 32);
    deck.reserve(x, start + length / 2, radius * 2.2, length);
  }
}

function telescope(deck: Deck) {
  const { w, h, kit } = deck;
  const radius = Math.min(w, h) * 0.34;
  const mount = 0.03;
  const length = (deck.depth - mount) * 0.9;
  const bottom = mount;
  const top = bottom + length;

  kit.cylinder("aluminium", radius * 1.05, mount, deck.at(0, 0, mount / 2), "z", 40);
  kit.cylinder("accent", radius, length, deck.at(0, 0, bottom + length / 2), "z", 40);
  for (const share of [0.25, 0.55, 0.85]) {
    kit.cylinder("aluminium", radius * 1.04, 0.02, deck.at(0, 0, bottom + length * share), "z", 40);
  }
  kit.cylinder("aluminium", radius * 1.02, 0.02, deck.at(0, 0, top - 0.01), "z", 40);
  kit.cylinder("glass", radius * 0.9, 0.004, deck.at(0, 0, top + 0.002), "z", 40);
  kit.cylinder("chip", radius * 0.28, 0.03, deck.at(0, 0, top + 0.017), "z", 24);
  for (let vane = 0; vane < 3; vane += 1) {
    const angle = (vane / 3) * Math.PI * 2 + Math.PI / 2;
    const reach = radius * 0.62;
    const middle = radius * 0.28 + reach / 2;
    kit.box("chip", [reach, 0.008, 0.012], deck.at(Math.cos(angle) * middle, Math.sin(angle) * middle, top + 0.01), [0, 0, angle]);
  }
  deck.reserve(0, 0, radius * 2.2, radius * 2.2);
}

function sensor(deck: Deck) {
  const { w, h, kit } = deck;
  const body = Math.min(0.05, deck.depth * 0.35);
  deck.box("accent", [w * 0.35, h * 0.35, body], 0, 0);
  kit.dome("ceramic", Math.min(0.07, deck.depth * 0.45, h * 0.15), deck.at(0, 0, body));
  kit.ring("aluminium", Math.min(0.07, deck.depth * 0.45, h * 0.15) * 1.08, 0.006, deck.at(0, 0, body + 0.003), "z", 32);
  sma(deck, -h * 0.3);
}

function generic(deck: Deck) {
  const size = Math.min(deck.w, deck.h) * 0.22;
  deck.box("chip", [size, size, Math.min(0.016, deck.depth * 0.3)], deck.w * 0.08, 0);
}

const DECKS_FOR: Partial<Record<Variant, number>> = {
  wheels: 1,
  camera: 1,
  telescope: 1,
  "x-band": 2,
};

function build(module: Module, size: Vec3, variant: Variant): PartGeometries {
  const [w, h, l] = size;
  const kit = new Kit();
  const decks = stack(kit, w, h, l, Math.max(1, DECKS_FOR[variant] ?? module.slots));
  const [first] = decks;

  switch (variant) {
    case "obc":
    case "obc-advanced":
      obc(first, variant === "obc-advanced");
      break;
    case "battery":
      battery(decks, module.battery_capacity_wh, module.slots);
      break;
    case "uhf":
      uhf(first);
      break;
    case "s-band":
      sBand(first);
      break;
    case "x-band":
      xBand(decks);
      break;
    case "magnetorquer":
      magnetorquer(first);
      break;
    case "wheels":
      wheels(first);
      break;
    case "star-tracker":
      starTracker(first);
      break;
    case "camera":
      camera(first);
      break;
    case "telescope":
      telescope(first);
      break;
    case "sensor":
      sensor(first);
      break;
    default:
      generic(first);
  }

  const random = seededRandom(hashString(module.slug));
  decks.forEach((deck) => fill(deck, random));
  return kit.build();
}

const cache = new Map<string, PartGeometries>();
const bounds = new Map<string, BoxGeometry>();

/** The module's bounding box: its invisible hit target and the shape of its selection outline. */
export function boundsGeometry(size: Vec3): BoxGeometry {
  return cached(bounds, sizeKey(...size), () => new BoxGeometry(...size));
}

/** Geometry for a module of this kind and size, built on first use and shared afterwards. */
export function moduleParts(module: Module, size: Vec3): PartGeometries {
  const variant = moduleVariant(module);
  const key = [variant, module.slug, module.slots, module.battery_capacity_wh, sizeKey(...size)].join("|");
  return cached(cache, key, () => build(module, size, variant));
}

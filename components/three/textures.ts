import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

import { seededRandom } from "./detail/kit";

const CELL_TEXTURE_WIDTH = 512;
const CELL_TEXTURE_HEIGHT = 256;

let cellBase: CanvasTexture | null = null;
const cellTiles = new Map<string, CanvasTexture>();

/**
 * One triple-junction cell with cropped corners, grid fingers, a bus bar and the
 * interconnect tabs that bridge to the next cell. Tiled across each panel.
 */
function drawSolarCell(): CanvasTexture {
  const width = CELL_TEXTURE_WIDTH;
  const height = CELL_TEXTURE_HEIGHT;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;

  context.fillStyle = "#0a0e17";
  context.fillRect(0, 0, width, height);

  const gap = 6;
  const crop = 26;
  const left = gap;
  const right = width - gap;
  const top = gap;
  const bottom = height - gap;
  context.beginPath();
  context.moveTo(left + crop, top);
  context.lineTo(right, top);
  context.lineTo(right, bottom);
  context.lineTo(left + crop, bottom);
  context.lineTo(left, bottom - crop);
  context.lineTo(left, top + crop);
  context.closePath();

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#26368c");
  gradient.addColorStop(0.55, "#16225f");
  gradient.addColorStop(1, "#1d2c78");
  context.fillStyle = gradient;
  context.fill();

  context.save();
  context.clip();
  context.strokeStyle = "rgba(200, 212, 238, 0.16)";
  context.lineWidth = 1;
  for (let x = left + crop + 4; x < right; x += 9) {
    context.beginPath();
    context.moveTo(x, top + 16);
    context.lineTo(x, bottom);
    context.stroke();
  }
  const sheen = context.createLinearGradient(0, height, width, 0);
  sheen.addColorStop(0.35, "rgba(255, 255, 255, 0)");
  sheen.addColorStop(0.5, "rgba(170, 190, 255, 0.07)");
  sheen.addColorStop(0.65, "rgba(255, 255, 255, 0)");
  context.fillStyle = sheen;
  context.fillRect(0, 0, width, height);
  context.restore();

  context.fillStyle = "rgba(214, 222, 238, 0.85)";
  context.fillRect(left + crop, top + 4, right - left - crop - 4, 7);
  for (const x of [120, 256, 392]) {
    context.fillRect(x, 0, 22, top + 10);
    context.fillRect(x, bottom, 22, height - bottom);
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** The cell texture repeated `repeatX` x `repeatY` times; clones share one uploaded image. */
export function solarCellTexture(repeatX: number, repeatY: number): CanvasTexture {
  const key = `${repeatX}x${repeatY}`;
  let tile = cellTiles.get(key);
  if (!tile) {
    cellBase ??= drawSolarCell();
    tile = cellBase.clone();
    tile.repeat.set(repeatX, repeatY);
    tile.needsUpdate = true;
    cellTiles.set(key, tile);
  }
  return tile;
}

let fallbackEarth: CanvasTexture | null = null;

/** Blue-green stand-in used until the user adds public/textures/earth.jpg. */
export function fallbackEarthTexture(): CanvasTexture {
  if (fallbackEarth) return fallbackEarth;
  const width = 1024;
  const height = 512;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d")!;

  const ocean = context.createLinearGradient(0, 0, 0, height);
  ocean.addColorStop(0, "#1b4d7a");
  ocean.addColorStop(0.5, "#14639a");
  ocean.addColorStop(1, "#1b4d7a");
  context.fillStyle = ocean;
  context.fillRect(0, 0, width, height);

  const random = seededRandom(19);
  for (let land = 0; land < 16; land += 1) {
    const centerX = random() * width;
    const centerY = height * (0.15 + random() * 0.7);
    context.fillStyle = random() > 0.4 ? "#2f7d57" : "#3f8f5a";
    for (let blob = 0; blob < 26; blob += 1) {
      const x = centerX + (random() - 0.5) * 170;
      const y = centerY + (random() - 0.5) * 90;
      const radius = 8 + random() * 26;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.fillStyle = "rgba(235, 243, 250, 0.9)";
  context.fillRect(0, 0, width, 18);
  context.fillRect(0, height - 22, width, 22);

  fallbackEarth = new CanvasTexture(canvas);
  fallbackEarth.wrapS = RepeatWrapping;
  fallbackEarth.colorSpace = SRGBColorSpace;
  return fallbackEarth;
}

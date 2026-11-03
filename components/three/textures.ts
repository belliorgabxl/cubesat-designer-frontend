import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

let solarCell: CanvasTexture | null = null;

/** One solar cell: dark blue silicon, silver fingers and bus bars. Tiled across each panel. */
export function solarCellTexture(): CanvasTexture {
  if (solarCell) return solarCell;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;

  const gradient = context.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#1d438f");
  gradient.addColorStop(1, "#10296a");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  context.strokeStyle = "rgba(190, 205, 235, 0.22)";
  context.lineWidth = 1;
  for (let y = 8; y < size; y += 10) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(size, y);
    context.stroke();
  }

  context.fillStyle = "rgba(205, 215, 235, 0.75)";
  context.fillRect(size * 0.33, 0, 3, size);
  context.fillRect(size * 0.66, 0, 3, size);

  context.strokeStyle = "#020510";
  context.lineWidth = 8;
  context.strokeRect(0, 0, size, size);

  solarCell = new CanvasTexture(canvas);
  solarCell.wrapS = RepeatWrapping;
  solarCell.wrapT = RepeatWrapping;
  solarCell.colorSpace = SRGBColorSpace;
  solarCell.anisotropy = 8;
  return solarCell;
}

/** Small deterministic generator, so the fallback Earth looks the same on every load. */
function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
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

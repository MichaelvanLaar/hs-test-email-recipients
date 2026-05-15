import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, "../icons");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect width="24" height="24" rx="3" fill="#ff7a59"/>
  <path d="M2 10 L10 3 L18 10 Z" fill="white"/>
  <rect x="2" y="10" width="16" height="11" fill="white"/>
  <path d="M2 10 L10 16 L18 10" fill="none" stroke="#ff7a59" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M8.5 0.5 L11.5 0.5 L11.5 8 L13.5 8 L10 12.5 L6.5 8 L8.5 8 Z" fill="#00a4c4"/>
  <rect x="14" y="15" width="9" height="8.5" rx="1.5" fill="white" stroke="#00a4c4" stroke-width="1"/>
  <line x1="15.5" y1="17.5" x2="21.5" y2="17.5" stroke="#00a4c4" stroke-width="1.3" stroke-linecap="round"/>
  <line x1="15.5" y1="19.5" x2="21.5" y2="19.5" stroke="#00a4c4" stroke-width="1.3" stroke-linecap="round"/>
  <line x1="15.5" y1="21.5" x2="21.5" y2="21.5" stroke="#00a4c4" stroke-width="1.3" stroke-linecap="round"/>
</svg>`;

const sizes = [16, 48, 128];

for (const size of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(resolve(iconsDir, `icon${size}.png`));
  console.log(`Generated icon${size}.png`);
}

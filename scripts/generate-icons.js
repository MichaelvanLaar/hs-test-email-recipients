import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, "../icons");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect width="24" height="24" rx="5" fill="#00a4c4"/>
  <rect x="2" y="2" width="20" height="8" rx="1.5" fill="white"/>
  <path d="M2 2.5 L12 7 L22 2.5" fill="none" stroke="#0093b0" stroke-width="1.5" stroke-linejoin="round"/>
  <circle cx="7.5" cy="16" r="2" fill="white"/>
  <path d="M3.5 22.5 C3.5 19.5 11.5 19.5 11.5 22.5" fill="white"/>
  <circle cx="16.5" cy="16" r="2" fill="white"/>
  <path d="M12.5 22.5 C12.5 19.5 20.5 19.5 20.5 22.5" fill="white"/>
</svg>`;

const sizes = [16, 48, 128];

for (const size of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(resolve(iconsDir, `icon${size}.png`));
  console.log(`Generated icon${size}.png`);
}

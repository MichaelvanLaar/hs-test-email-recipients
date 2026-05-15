import sharp from "sharp";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = resolve(__dirname, "../icons");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <rect width="24" height="24" rx="5" fill="#00a4c4"/>
  <rect x="3" y="4" width="18" height="11" rx="1.5" fill="white"/>
  <path d="M3 4.5 L12 10.5 L21 4.5" fill="none" stroke="#0093b0" stroke-width="1.5" stroke-linejoin="round"/>
  <circle cx="8.5" cy="17" r="2.2" fill="white"/>
  <path d="M5 23.5 C5 20 12 20 12 23.5" fill="white"/>
  <circle cx="15.5" cy="17" r="2.2" fill="white"/>
  <path d="M12 23.5 C12 20 19 20 19 23.5" fill="white"/>
</svg>`;

const sizes = [16, 48, 128];

for (const size of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(resolve(iconsDir, `icon${size}.png`));
  console.log(`Generated icon${size}.png`);
}

import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import path from 'node:path';

const svgPath = path.resolve('assets/og-image.svg');
const outPath = path.resolve('public/og-image.png');

try {
  const svg = await readFile(svgPath, 'utf8');
  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).resize(1200, 630, { fit: 'cover' }).toBuffer();
  await writeFile(outPath, png);
  console.log(`Generated ${outPath} (${(png.length / 1024).toFixed(1)} KB)`);
} catch (err) {
  console.error('Failed to generate OG image:', err);
  process.exit(1);
}
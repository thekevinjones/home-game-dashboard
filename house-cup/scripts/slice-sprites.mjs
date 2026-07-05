// One-off slicer: cuts design-handoff/sprites.png.png into themed UI assets.
// Run from house-cup/: node scripts/slice-sprites.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const SHEET = "../design-handoff/sprites.png.png";
const UPDATED = "../design-handoff/updated.png"; // labeled revision sheet
const CSS_OUT = "app/theme/sprites";
const PUB_OUT = "public/theme";
mkdirSync(CSS_OUT, { recursive: true });
mkdirSync(PUB_OUT, { recursive: true });

// crop boxes in original 1856x2304 pixel space
const crops = {
  // parchment banner (caret glyph removed by mirroring the left half)
  banner: { left: 1285, top: 48, width: 340, height: 136, out: CSS_OUT },
  // hero leather panel: only its top-left quadrant is fully clean (the photo
  // frame overlaps the right, and the bottom stitch is too dim to survive
  // 9-slice compression), so we mirror the quadrant both ways
  "panel-quadrant": { left: 35, top: 215, width: 865, height: 370, out: null },
  "row-plaque": { left: 101, top: 1903, width: 961, height: 171, out: CSS_OUT },
  porthole: { left: 1242, top: 1135, width: 192, height: 201, out: CSS_OUT },
  leader: { left: 1463, top: 1184, width: 205, height: 74, out: CSS_OUT },
  pill: { left: 1431, top: 1357, width: 260, height: 81, out: CSS_OUT },
  medal: { left: 1263, top: 1449, width: 150, height: 122, out: CSS_OUT },
  divider: { left: 25, top: 2108, width: 1098, height: 21, out: CSS_OUT },
  "torn-card": { left: 643, top: 1104, width: 557, height: 465, out: CSS_OUT },
  // ornate gold picture frame (updated.png top-left) for the hero game photo
  "game-frame": { sheet: UPDATED, left: 19, top: 45, width: 214, height: 162, out: CSS_OUT },
  // golden snitch from updated.png (crisper than the original sheet's)
  snitch: { sheet: UPDATED, left: 20, top: 905, width: 145, height: 89, out: PUB_OUT },
  "potion-green": { left: 1158, top: 1788, width: 100, height: 127, out: PUB_OUT },
  "vial-blue": { left: 1161, top: 1921, width: 103, height: 153, out: PUB_OUT },
  "vial-pink": { left: 1152, top: 2085, width: 104, height: 150, out: PUB_OUT },
};

const sheet = sharp(SHEET);
const meta = await sheet.metadata();
console.log(`sheet: ${meta.width}x${meta.height}`);

async function extract(name) {
  const { sheet = SHEET, left, top, width, height } = crops[name];
  return sharp(sheet).extract({ left, top, width, height }).png().toBuffer();
}

for (const [name, c] of Object.entries(crops)) {
  if (!c.out) continue;
  let buf = await extract(name);

  if (name === "banner") {
    // the right side carries a baked dropdown caret — the banner is close to
    // symmetric, so rebuild the right half as a mirror of the left half
    const { width, height } = crops[name];
    const half = Math.floor(width / 2);
    const left = await sharp(buf)
      .extract({ left: 0, top: 0, width: half, height })
      .png()
      .toBuffer();
    const right = await sharp(left).flop().png().toBuffer();
    buf = await sharp(buf)
      .composite([{ input: right, left: width - half, top: 0 }])
      .png()
      .toBuffer();
    // the source crop has transparent margins above/below the parchment; trim
    // them so the 9-slice borders land on parchment, not empty space (else the
    // banner renders with cut-off gaps top and bottom)
    buf = await sharp(buf).trim({ threshold: 12 }).png().toBuffer();
    const tm = await sharp(buf).metadata();
    console.log(`  banner trimmed to ${tm.width}x${tm.height}`);
  }

  await sharp(buf).toFile(path.join(c.out, `${name}.png`));
  console.log(`wrote ${name}.png`);
}

// full hero panel frame = top-left quadrant mirrored horizontally and
// vertically, so every edge carries the crisp top stitching and every corner
// the brass cap. First erase the parchment banner baked onto the leather
// (local ~86..529 x ~125..205) with a patch of plain leather, softly blurred.
{
  let quad = await extract("panel-quadrant");
  const leatherPatch = await sharp(quad)
    .extract({ left: 76, top: 250, width: 463, height: 118 })
    .blur(1.5)
    .png()
    .toBuffer();
  quad = await sharp(quad)
    .composite([{ input: leatherPatch, left: 76, top: 108 }])
    .png()
    .toBuffer();
  const { width, height } = crops["panel-quadrant"];
  const tr = await sharp(quad).flop().png().toBuffer();
  const bl = await sharp(quad).flip().png().toBuffer();
  const br = await sharp(quad).flop().flip().png().toBuffer();
  await sharp({
    create: {
      width: width * 2,
      height: height * 2,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: quad, left: 0, top: 0 },
      { input: tr, left: width, top: 0 },
      { input: bl, left: 0, top: height },
      { input: br, left: width, top: height },
    ])
    .png()
    .toFile(path.join(CSS_OUT, "panel.png"));
  console.log("wrote panel.png (quadrant-mirrored)");
}
console.log("done");

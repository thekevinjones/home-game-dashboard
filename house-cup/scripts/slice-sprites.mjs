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
  // parchment banner: updated.png On-The-Table scroll, baked text erased
  // below by per-column vertical interpolation (seam-free blank scroll)
  banner: { sheet: UPDATED, left: 22, top: 246, width: 182, height: 54, out: null },
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

  await sharp(buf).toFile(path.join(c.out, `${name}.png`));
  console.log(`wrote ${name}.png`);
}

// Parchment banner: the updated.png scroll has "On The Table" baked across
// almost its full width. Rebuild a blank banner as [left roll cap] +
// [column-averaged smooth middle] + [right cap incl. the only clean strip].
// Averaging kills texture noise so the 9-slice middle stretches smoothly.
{
  const { width: W, height: H } = crops.banner;
  const { data } = await sharp(await extract("banner"))
    .raw()
    .toBuffer({ resolveWithObject: true });

  // the sheet's olive label text bleeds into the crop's top rows; the banner
  // itself starts at row ~3, so wipe rows 0..2 and clear olive remnants below
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const olive = data[i + 3] > 0 && data[i] < 160 && data[i + 1] > data[i] - 12;
      if (y < 3 || olive) {
        data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      }
    }
  }

  // mask dark text pixels (only in the middle rows — banner edges are dark too)
  const mask = new Uint8Array(W * H);
  for (let y = 6; y < H - 9; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (data[i + 3] > 100 && data[i] < 150 && data[i + 1] < 120) mask[y * W + x] = 1;
    }
  }
  // dilate twice to catch antialiased halos
  for (let pass = 0; pass < 2; pass++) {
    const src = mask.slice();
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++)
        if (src[y * W + x - 1] || src[y * W + x + 1] || src[(y - 1) * W + x] || src[(y + 1) * W + x])
          mask[y * W + x] = 1;
  }
  // per-column: replace each masked run by interpolating parchment above/below
  for (let x = 0; x < W; x++) {
    let y = 0;
    while (y < H) {
      if (!mask[y * W + x]) { y++; continue; }
      let a = y;
      while (y < H && mask[y * W + x]) y++;
      const b = y - 1;
      const top = Math.max(0, a - 1);
      const bot = Math.min(H - 1, b + 1);
      for (let yy = a; yy <= b; yy++) {
        const t = (yy - top) / Math.max(1, bot - top);
        for (let ch = 0; ch < 4; ch++) {
          const vTop = data[(top * W + x) * 4 + ch];
          const vBot = data[(bot * W + x) * 4 + ch];
          data[(yy * W + x) * 4 + ch] = Math.round(vTop + (vBot - vTop) * t);
        }
      }
    }
  }
  await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .png()
    .toFile(path.join(CSS_OUT, "banner.png"));
  console.log("wrote banner.png (text erased by vertical inpaint)");
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

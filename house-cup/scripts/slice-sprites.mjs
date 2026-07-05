// One-off slicer: cuts design-handoff/sprites.png.png into themed UI assets.
// Run from house-cup/: node scripts/slice-sprites.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";

const SHEET = "../design-handoff/sprites.png.png";
const CSS_OUT = "app/theme/sprites";
const PUB_OUT = "public/theme";
mkdirSync(CSS_OUT, { recursive: true });
mkdirSync(PUB_OUT, { recursive: true });

// crop boxes in original 1856x2304 pixel space
const crops = {
  // parchment banner (has a caret glyph we erase below)
  banner: { left: 1290, top: 55, width: 332, height: 116, out: CSS_OUT },
  // hero leather panel: only its left ~half is visible (photo frame overlaps
  // the right), so we mirror it into a full symmetric frame
  "panel-left": { left: 35, top: 213, width: 865, height: 749, out: null },
  "photo-frame": { left: 927, top: 221, width: 870, height: 735, out: CSS_OUT },
  "row-plaque": { left: 101, top: 1903, width: 961, height: 171, out: CSS_OUT },
  porthole: { left: 1242, top: 1135, width: 192, height: 201, out: CSS_OUT },
  leader: { left: 1463, top: 1184, width: 205, height: 74, out: CSS_OUT },
  pill: { left: 1431, top: 1357, width: 260, height: 81, out: CSS_OUT },
  medal: { left: 1263, top: 1449, width: 150, height: 122, out: CSS_OUT },
  divider: { left: 25, top: 2108, width: 1098, height: 21, out: CSS_OUT },
  "torn-card": { left: 643, top: 1104, width: 557, height: 465, out: CSS_OUT },
  snitch: { left: 954, top: 2152, width: 169, height: 83, out: PUB_OUT },
  "potion-green": { left: 1158, top: 1788, width: 100, height: 127, out: PUB_OUT },
  "vial-blue": { left: 1161, top: 1921, width: 103, height: 153, out: PUB_OUT },
  "vial-pink": { left: 1152, top: 2085, width: 104, height: 150, out: PUB_OUT },
};

const sheet = sharp(SHEET);
const meta = await sheet.metadata();
console.log(`sheet: ${meta.width}x${meta.height}`);

async function extract(name) {
  const { left, top, width, height } = crops[name];
  return sharp(SHEET).extract({ left, top, width, height }).png().toBuffer();
}

for (const [name, c] of Object.entries(crops)) {
  if (!c.out) continue;
  let buf = await extract(name);

  if (name === "banner") {
    // erase the dropdown caret (local ~271..302 x 43..66): cover with a patch
    // sampled directly below it so the horizontal shading matches
    const patch = await sharp(buf)
      .extract({ left: 266, top: 74, width: 42, height: 34 })
      .png()
      .toBuffer();
    buf = await sharp(buf)
      .composite([{ input: patch, left: 266, top: 38 }])
      .png()
      .toBuffer();
  }

  if (name === "photo-frame") {
    // border-image discards the middle — punch it transparent to save bytes
    const { width, height } = crops[name];
    const inset = 62;
    const hole = await sharp({
      create: {
        width: width - inset * 2,
        height: height - inset * 2,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    buf = await sharp(buf)
      .composite([{ input: hole, left: inset, top: inset, blend: "dest-out" }])
      .png()
      .toBuffer();
  }

  await sharp(buf).toFile(path.join(c.out, `${name}.png`));
  console.log(`wrote ${name}.png`);
}

// full hero panel frame = visible left half + mirrored copy.
// First erase the parchment banner baked onto the leather (local 86..529 x
// 127..207) with a patch of plain leather sampled below it, softly blurred.
{
  let leftBuf = await extract("panel-left");
  const leatherPatch = await sharp(leftBuf)
    .extract({ left: 76, top: 250, width: 463, height: 118 })
    .blur(1.5)
    .png()
    .toBuffer();
  leftBuf = await sharp(leftBuf)
    .composite([{ input: leatherPatch, left: 76, top: 110 }])
    .png()
    .toBuffer();
  const rightBuf = await sharp(leftBuf).flop().png().toBuffer();
  const { width, height } = crops["panel-left"];
  await sharp({
    create: {
      width: width * 2,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: leftBuf, left: 0, top: 0 },
      { input: rightBuf, left: width, top: 0 },
    ])
    .png()
    .toFile(path.join(CSS_OUT, "panel.png"));
  console.log("wrote panel.png (mirrored)");
}
console.log("done");

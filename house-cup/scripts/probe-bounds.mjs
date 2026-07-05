// Probe alpha bounds + produce fine-grid strips to measure the baked ring.
import sharp from "sharp";

const SHEET = "../design-handoff/sprites.png.png";
const { data, info } = await sharp(SHEET).raw().toBuffer({ resolveWithObject: true });
const alpha = (x, y) => data[(y * info.width + x) * info.channels + 3];

function bbox(name, x0, y0, x1, y1, thresh = 8) {
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (alpha(x, y) > thresh) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  console.log(`${name}: x ${minX}..${maxX} y ${minY}..${maxY} (w ${maxX - minX + 1} h ${maxY - minY + 1})`);
}

// panel bottom via middle columns only (x>450 avoids the On The Table banner below)
bbox("panel-mid-cols", 450, 190, 890, 1080);

// fine-grid strips over the ring (sheet coords): left edge + top edge
const strips = [
  { name: "ring-left", left: 940, top: 540, width: 160, height: 100 },
  { name: "ring-top", left: 1300, top: 235, width: 130, height: 120 },
];
const scale = 4;
for (const s of strips) {
  let lines = "";
  for (let x = 0; x <= s.width; x += 10) {
    const sheetX = s.left + x;
    const major = sheetX % 50 === 0;
    if (!major && x % 10 !== 0) continue;
    lines += `<line x1="${x * scale}" y1="0" x2="${x * scale}" y2="${s.height * scale}" stroke="${major ? "red" : "cyan"}" stroke-width="1"/>`;
    if (major) lines += `<text x="${x * scale + 2}" y="16" fill="red" font-size="15">${sheetX}</text>`;
  }
  for (let y = 0; y <= s.height; y += 10) {
    const sheetY = s.top + y;
    const major = sheetY % 50 === 0;
    lines += `<line x1="0" y1="${y * scale}" x2="${s.width * scale}" y2="${y * scale}" stroke="${major ? "red" : "cyan"}" stroke-width="1"/>`;
    if (major) lines += `<text x="2" y="${y * scale + 16}" fill="red" font-size="15">${sheetY}</text>`;
  }
  const grid = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s.width * scale}" height="${s.height * scale}">${lines}</svg>`
  );
  const img = await sharp(SHEET)
    .extract(s)
    .resize(s.width * scale, s.height * scale, { kernel: "nearest" })
    .composite([{ input: grid }])
    .png()
    .toBuffer();
  const out = `${process.env.SCRATCH ?? "."}/${s.name}.png`;
  await sharp(img).toFile(out);
  console.log("wrote", out);
}

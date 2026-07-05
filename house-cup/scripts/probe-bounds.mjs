// Find dark (text) pixel x-extents inside each parchment banner of updated.png
// so we can locate clean full-height columns for a blank rebuild.
import sharp from "sharp";

const banners = {
  onTheTable: { left: 22, top: 246, width: 182, height: 54 },
  recentPlayed: { left: 250, top: 232, width: 213, height: 64 },
  showAll: { left: 372, top: 1075, width: 195, height: 51 },
};

for (const [name, c] of Object.entries(banners)) {
  const { data, info } = await sharp("../design-handoff/updated.png")
    .extract(c)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  // "text" = dark opaque pixel well inside the banner vertically
  const isText = ([r, g, b, a]) => a > 128 && r < 120 && g < 95;
  let cols = [];
  for (let x = 0; x < info.width; x++) {
    let dark = 0;
    for (let y = 8; y < info.height - 8; y++) if (isText(px(x, y))) dark++;
    cols.push(dark > 1 ? 1 : 0);
  }
  const first = cols.indexOf(1);
  const last = cols.lastIndexOf(1);
  // report clean runs (0s) of width >= 4
  let runs = [], start = null;
  cols.forEach((v, x) => {
    if (!v && start === null) start = x;
    if (v && start !== null) {
      if (x - start >= 4) runs.push([start, x - 1]);
      start = null;
    }
  });
  if (start !== null && info.width - start >= 4) runs.push([start, info.width - 1]);
  console.log(`${name} (${info.width}x${info.height}): text x ${first}..${last}; clean runs ${JSON.stringify(runs)}`);
}

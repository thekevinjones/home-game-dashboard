// Measure the transparent interior opening of the Panel_Frame_Large_Catan.
import sharp from "sharp";

const SHEET = "../design-handoff/updated.png";
const FR = { left: 19, top: 45, width: 214, height: 162 };
const { data, info } = await sharp(SHEET)
  .extract(FR)
  .raw()
  .toBuffer({ resolveWithObject: true });
const alpha = (x, y) => data[(y * info.width + x) * info.channels + 3];

// scan center row/col for the transparent gap (border -> hole -> border)
function gap(label, coords) {
  let runs = [];
  let start = null;
  for (const [x, y, t] of coords) {
    const transp = alpha(x, y) < 40;
    if (transp && start === null) start = t;
    if (!transp && start !== null) {
      if (t - start > 8) runs.push([start, t - 1]);
      start = null;
    }
  }
  console.log(label, JSON.stringify(runs));
}

const w = info.width, h = info.height;
gap(`row y=${(h / 2) | 0}`, Array.from({ length: w }, (_, x) => [x, (h / 2) | 0, x]));
gap(`row y=${(h * 0.75) | 0}`, Array.from({ length: w }, (_, x) => [x, (h * 0.75) | 0, x]));
gap(`col x=${(w / 2) | 0}`, Array.from({ length: h }, (_, y) => [(w / 2) | 0, y, y]));
gap(`col x=${(w * 0.7) | 0}`, Array.from({ length: h }, (_, y) => [(w * 0.7) | 0, y, y]));

// Inspect vertical alpha profile of the current banner sprite to see whether
// the 9-slice is catching transparent margins (→ parchment looks cut off).
import sharp from "sharp";

const B = "app/theme/sprites/banner.png";
const { data, info } = await sharp(B).raw().toBuffer({ resolveWithObject: true });
const alpha = (x, y) => data[(y * info.width + x) * info.channels + 3];
console.log(`banner: ${info.width}x${info.height}`);

// opaque bbox
let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
for (let y = 0; y < info.height; y++)
  for (let x = 0; x < info.width; x++)
    if (alpha(x, y) > 24) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
console.log(`opaque bbox: x ${minX}..${maxX} y ${minY}..${maxY}`);

// at the horizontal center, where does parchment start/end vertically?
const cx = (info.width / 2) | 0;
let top = null, bot = null;
for (let y = 0; y < info.height; y++) {
  if (alpha(cx, y) > 24) { if (top === null) top = y; bot = y; }
}
console.log(`center column x=${cx}: parchment y ${top}..${bot} (of ${info.height})`);

// exif.js: reads the EXIF "camera info" hidden inside JPEG photos.
// EXIF is optional! Scanned photos have none, and that's fine:
// readExif() just gives back an empty object {} when nothing is found.

// Which tags we care about. The number is the tag's ID in the EXIF standard.
const EXIF_TAGS = {
  0x010f: "make",
  0x0110: "model",
  0x829a: "exposureTime",
  0x829d: "fNumber",
  0x8827: "iso",
  0x9003: "dateTaken",
  0x920a: "focalLength",
  0xa434: "lens"
};
// These tags live in a smaller "sub-list" that the main list points to.
const EXIF_SUB_LIST_POINTER = 0x8769;

// Sizes in bytes of each EXIF data type (1=byte, 2=text, 3=short, 4=long, 5=fraction).
const EXIF_TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 };

// Reads one value out of the file's bytes.
function readExifValue(view, type, count, offset, little) {
  if (type === 2) { // text
    let text = "";
    for (let i = 0; i < count - 1; i++) text += String.fromCharCode(view.getUint8(offset + i));
    return text.trim();
  }
  if (type === 3) return view.getUint16(offset, little);
  if (type === 4) return view.getUint32(offset, little);
  if (type === 5) { // a fraction: top number / bottom number
    const bottom = view.getUint32(offset + 4, little);
    return bottom === 0 ? 0 : view.getUint32(offset, little) / bottom;
  }
  return undefined;
}

// Reads one list of tags (called an IFD) and adds what we want to `result`.
function readExifList(view, tiff, listStart, little, result) {
  const count = view.getUint16(tiff + listStart, little);
  for (let i = 0; i < count; i++) {
    const entry = tiff + listStart + 2 + i * 12;
    const tag = view.getUint16(entry, little);
    const type = view.getUint16(entry + 2, little);
    const num = view.getUint32(entry + 4, little);
    const size = (EXIF_TYPE_SIZE[type] || 0) * num;
    // Small values sit right in the entry; big ones are stored elsewhere.
    const valueAt = size > 4 ? tiff + view.getUint32(entry + 8, little) : entry + 8;

    if (tag === EXIF_SUB_LIST_POINTER) {
      readExifList(view, tiff, view.getUint32(entry + 8, little), little, result);
    } else if (EXIF_TAGS[tag] && EXIF_TYPE_SIZE[type]) {
      result[EXIF_TAGS[tag]] = readExifValue(view, type, num, valueAt, little);
    }
  }
}

// Main function: give it the bytes of an image file (an ArrayBuffer).
function readExif(buffer) {
  const result = {};
  try {
    const view = new DataView(buffer);
    if (view.getUint16(0) !== 0xffd8) return result; // not a JPEG
    let pos = 2;
    // A JPEG is a series of "segments". EXIF is in the one labeled 0xFFE1.
    while (pos + 4 < view.byteLength) {
      const marker = view.getUint16(pos);
      const length = view.getUint16(pos + 2);
      if (marker === 0xffe1 && view.getUint32(pos + 4) === 0x45786966) { // "Exif"
        const tiff = pos + 10;
        const little = view.getUint16(tiff) === 0x4949; // byte order
        readExifList(view, tiff, view.getUint32(tiff + 4, little), little, result);
        break;
      }
      if ((marker & 0xff00) !== 0xff00) break;
      pos += 2 + length;
    }
  } catch (error) {
    // Broken or missing EXIF? Ignore it. EXIF is just a bonus.
  }
  return result;
}

// Turns raw EXIF numbers into friendly text lines like "f/2.8".
function formatExif(exif) {
  const parts = [];
  const camera = [exif.make, exif.model].filter(Boolean).join(" ");
  if (camera) parts.push(camera);
  if (exif.lens) parts.push(exif.lens);
  if (exif.focalLength) parts.push(Math.round(exif.focalLength) + "mm");
  if (exif.fNumber) parts.push("f/" + Number(exif.fNumber).toFixed(1).replace(".0", ""));
  if (exif.exposureTime) {
    const t = Number(exif.exposureTime);
    parts.push((t > 0 && t < 1 ? "1/" + Math.round(1 / t) : String(t)) + "s");
  }
  if (exif.iso) parts.push("ISO " + exif.iso);
  if (exif.dateTaken) parts.push(String(exif.dateTaken).split(" ")[0].replace(/:/g, "-"));
  return parts.join(" · ");
}

import { employeePictureUrl } from 'src/api/attendance';

// ----------------------------------------------------------------------
// Employees' photos for the PDF reports, read from GET /api/employee/{id}/picture
// a few at a time and shrunk to what a printed box needs, so a report of
// hundreds of guards stays a few megabytes.
// ----------------------------------------------------------------------

const BATCH = 6;

/**
 * One photo as a JPEG data URL, or null.
 * `aspect` (width / height): crop to fill a box of that shape, centred,
 * instead of keeping the whole photo.
 */
export async function loadPhoto(empId, { maxW = 150, maxH = 140, aspect = null } = {}) {
  try {
    const res = await fetch(employeePictureUrl(empId));
    if (!res.ok) return null;
    const bitmap = await createImageBitmap(await res.blob());

    let sx = 0;
    let sy = 0;
    let sw = bitmap.width;
    let sh = bitmap.height;
    if (aspect) {
      if (sw / sh > aspect) {
        sw = sh * aspect;
        sx = (bitmap.width - sw) / 2;
      } else {
        sh = sw / aspect;
        sy = (bitmap.height - sh) / 2;
      }
    }

    const scale = Math.min(maxW / sw, maxH / sh, 1);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw * scale));
    canvas.height = Math.max(1, Math.round(sh * scale));
    canvas.getContext('2d').drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return { url: canvas.toDataURL('image/jpeg', 0.85), w: canvas.width, h: canvas.height };
  } catch {
    return null;
  }
}

/** Map<empId, photo> for every row with `hasPicture`. */
export async function loadPhotos(rows, { onProgress, ...options } = {}) {
  const photos = new Map();
  const wanted = rows.filter((r) => r.hasPicture);
  for (let i = 0; i < wanted.length; i += BATCH) {
    const slice = wanted.slice(i, i + BATCH);
    // eslint-disable-next-line no-await-in-loop
    const loaded = await Promise.all(slice.map((r) => loadPhoto(r.empId, options)));
    slice.forEach((r, n) => loaded[n] && photos.set(r.empId, loaded[n]));
    onProgress?.(Math.min(i + BATCH, wanted.length), wanted.length);
  }
  return photos;
}

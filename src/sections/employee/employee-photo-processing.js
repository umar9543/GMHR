import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';

// ----------------------------------------------------------------------
// Employee photos on the blue background, done in the browser: Google's
// MediaPipe selfie segmenter tells the person from the background, pixel by
// pixel, and the person is laid on the company's photo blue. Nothing is sent
// anywhere to do it; the engine and the model are served from /mediapipe.
//
// A camera frame is wide, so it is cropped to a portrait around the person,
// the shape of the card's photo box. A photo that is already upright, as a
// phone takes it, keeps its framing.
// ----------------------------------------------------------------------

export const PHOTO_BLUE = [0, 171, 254];

const WASM_PATH = '/mediapipe/wasm';
const MODEL_PATH = '/mediapipe/models/selfie_multiclass_256x256.tflite';

// The card's photo box, 27.2 x 33.4 mm.
const PORTRAIT_ASPECT = 27.2 / 33.4;
// Longest side worked on: enough for a sharp card photo, quick to segment.
const WORK_MAX = 1280;
const OUT_MAX_W = 600;

let segmenterPromise = null;

/**
 * The engine and the model must come back as themselves. A dev server
 * started before they were added answers with the app's own page instead,
 * and MediaPipe then fails with nothing useful to say - so say it here.
 */
async function checkFiles() {
  const files = [`${WASM_PATH}/vision_wasm_internal.wasm`, MODEL_PATH];
  const answers = await Promise.all(
    files.map((url) => fetch(url, { method: 'HEAD' }).catch(() => null))
  );
  const missing = answers.some(
    (res) => !res || !res.ok || (res.headers.get('content-type') || '').includes('text/html')
  );
  if (missing) {
    throw new Error(
      'The background removal files are not being served. Restart the frontend (stop it and run npm run dev again) and reload this page.'
    );
  }
}

/** The segmenter, made once and kept; GPU where the browser allows it. */
function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      await checkFiles();
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
      const options = (delegate) => ({
        baseOptions: { modelAssetPath: MODEL_PATH, delegate },
        runningMode: 'IMAGE',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
      try {
        return await ImageSegmenter.createFromOptions(vision, options('GPU'));
      } catch {
        return ImageSegmenter.createFromOptions(vision, options('CPU'));
      }
    })().catch((error) => {
      segmenterPromise = null;
      throw error;
    });
  }
  return segmenterPromise;
}

/** Load the model ahead of the first photo, so the capture itself is quick. */
export function preloadSegmenter() {
  return getSegmenter().then(() => true);
}

function sourceSize(source) {
  return {
    w: source.videoWidth || source.naturalWidth || source.width,
    h: source.videoHeight || source.naturalHeight || source.height,
  };
}

/** How much of each pixel is the person, 0..1, from the background mask. */
function personAlpha(segmenter, canvas) {
  const result = segmenter.segment(canvas);
  try {
    // Category 0 of the multiclass model is the background; everything else
    // - hair, face, body, clothes - is the person.
    const background = result.confidenceMasks[0];
    const values = background.getAsFloat32Array();
    const alpha = new Float32Array(values.length);
    for (let i = 0; i < values.length; i += 1) alpha[i] = 1 - values[i];
    return { alpha, w: background.width, h: background.height };
  } finally {
    result.close();
  }
}

/** A soft box blur of the mask, so the edge blends instead of stair-stepping. */
function blurAlpha(alpha, w, h, radius) {
  const tmp = new Float32Array(alpha.length);
  const out = new Float32Array(alpha.length);
  const span = radius * 2 + 1;
  for (let y = 0; y < h; y += 1) {
    let sum = 0;
    for (let x = -radius; x <= radius; x += 1) sum += alpha[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x += 1) {
      tmp[y * w + x] = sum / span;
      const add = Math.min(w - 1, x + radius + 1);
      const drop = Math.max(0, x - radius);
      sum += alpha[y * w + add] - alpha[y * w + drop];
    }
  }
  for (let x = 0; x < w; x += 1) {
    let sum = 0;
    for (let y = -radius; y <= radius; y += 1) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y += 1) {
      out[y * w + x] = sum / span;
      const add = Math.min(h - 1, y + radius + 1);
      const drop = Math.max(0, y - radius);
      sum += tmp[add * w + x] - tmp[drop * w + x];
    }
  }
  return out;
}

/** Where the person is: the box round the pixels that are mostly person. */
function personBox(alpha, w, h) {
  let left = w;
  let right = -1;
  let top = h;
  let bottom = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (alpha[y * w + x] > 0.5) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  return right < 0 ? null : { left, right, top, bottom };
}

/** The portrait to keep: the whole photo when it is upright, else round the person. */
function framing(w, h, box) {
  if (w <= h) return { x: 0, y: 0, w, h };
  // As tall as the photo allows, the card's shape, centred on the person
  // (or on the middle when nobody was found).
  let cropH = h;
  let cropW = Math.round(cropH * PORTRAIT_ASPECT);
  if (cropW > w) {
    cropW = w;
    cropH = Math.round(cropW / PORTRAIT_ASPECT);
  }
  const centre = box ? (box.left + box.right) / 2 : w / 2;
  const x = Math.round(Math.min(w - cropW, Math.max(0, centre - cropW / 2)));
  const y = box ? Math.round(Math.min(h - cropH, Math.max(0, box.top - cropH * 0.08))) : 0;
  return { x, y, w: cropW, h: cropH };
}

/**
 * The photo on the blue background.
 * @param source  a <video> (the camera), <img> or ImageBitmap
 * @param options blue: false keeps the original background (still cropped)
 * @returns { dataUrl, width, height, foundPerson }
 */
export async function processEmployeePhoto(source, { blue = true } = {}) {
  const { w: srcW, h: srcH } = sourceSize(source);
  if (!srcW || !srcH) throw new Error('There is no picture to use yet');

  const scale = Math.min(1, WORK_MAX / Math.max(srcW, srcH));
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);

  const work = document.createElement('canvas');
  work.width = w;
  work.height = h;
  const ctx = work.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, w, h);

  // Without the blue, the mask only centres the crop: a photo is still made
  // when background removal cannot run, just framed on the middle.
  let alpha = null;
  try {
    const segmenter = await getSegmenter();
    const mask = personAlpha(segmenter, work);
    // The mask comes back at the picture's size; if not, it is read scaled.
    const at = (x, y) =>
      mask.alpha[
        Math.min(mask.h - 1, Math.floor((y * mask.h) / h)) * mask.w +
          Math.min(mask.w - 1, Math.floor((x * mask.w) / w))
      ];
    alpha = new Float32Array(w * h);
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) alpha[y * w + x] = at(x, y);
    alpha = blurAlpha(alpha, w, h, Math.max(1, Math.round(Math.max(w, h) / 500)));
  } catch (error) {
    if (blue) throw error;
  }

  const box = alpha ? personBox(alpha, w, h) : null;
  const crop = framing(w, h, box);

  // The person, with the mask as transparency, then laid on the blue.
  const pixels = ctx.getImageData(0, 0, w, h);
  if (blue && alpha) {
    const {data} = pixels;
    for (let i = 0; i < alpha.length; i += 1) {
      // A gentle S-curve: firm inside the person, soft only at the edge.
      const a = Math.min(1, Math.max(0, (alpha[i] - 0.2) / 0.6));
      const s = a * a * (3 - 2 * a);
      data[i * 4] = Math.round(data[i * 4] * s + PHOTO_BLUE[0] * (1 - s));
      data[i * 4 + 1] = Math.round(data[i * 4 + 1] * s + PHOTO_BLUE[1] * (1 - s));
      data[i * 4 + 2] = Math.round(data[i * 4 + 2] * s + PHOTO_BLUE[2] * (1 - s));
      data[i * 4 + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
  }

  const outScale = Math.min(1, OUT_MAX_W / crop.w);
  const out = document.createElement('canvas');
  out.width = Math.round(crop.w * outScale);
  out.height = Math.round(crop.h * outScale);
  const octx = out.getContext('2d');
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(work, crop.x, crop.y, crop.w, crop.h, 0, 0, out.width, out.height);

  return {
    dataUrl: out.toDataURL('image/jpeg', 0.9),
    width: out.width,
    height: out.height,
    foundPerson: !!box,
    blue: blue && !!alpha,
  };
}

/** A chosen file as an image element, ready to process. */
export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That file is not a picture'));
    };
    img.src = url;
  });
}

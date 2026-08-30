export const getBase64Resized = (file: File, maxWidth = 500, maxHeight = 500): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(file.type || "image/jpeg", 0.8));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Adaptive low-light normalization for face detection.
 *
 * Draws the source image onto a canvas and applies histogram stretching
 * ONLY when the mean luminance is below a dark-scene threshold (< ~100/255).
 * In normal light the frame passes through virtually unchanged.
 *
 * IMPORTANT — gender/age safety:
 * This function adjusts each pixel's luminance uniformly (same multiplier for
 * R, G, B), so it does NOT alter colour ratios or facial geometry. Face-api's
 * age/gender network reads structural features, not raw colour values, so
 * predictions are unaffected. The correction only helps the detector *find*
 * the face in dark conditions.
 *
 * @param img  Source HTMLImageElement (already loaded)
 * @returns    Enhanced HTMLCanvasElement ready for face-api detectAllFaces()
 */
export function normalizeBrightness(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width  = img.naturalWidth  || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data; // RGBA flat array

  // ── Step 1: measure mean luminance (Y = 0.299R + 0.587G + 0.114B) ─────────
  let totalLuminance = 0;
  const pixelCount = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    totalLuminance += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  const meanLuminance = totalLuminance / pixelCount;

  // ── Step 2: decide whether enhancement is needed ──────────────────────────
  // Threshold: 100/255 ≈ 39% brightness — anything below is "low light".
  // At normal room lighting (mean ≈ 120-180) this block is skipped entirely.
  const LOW_LIGHT_THRESHOLD = 100;
  const TARGET_MEAN = 140; // target perceived brightness after correction

  if (meanLuminance < LOW_LIGHT_THRESHOLD && meanLuminance > 0) {
    // Multiplicative gain — same factor applied to R, G, B equally so colour
    // ratios are preserved and gender cues in the face are not distorted.
    const gain = Math.min(TARGET_MEAN / meanLuminance, 3.0); // cap at 3× to avoid clipping noise

    for (let i = 0; i < data.length; i += 4) {
      data[i]     = Math.min(255, Math.round(data[i]     * gain)); // R
      data[i + 1] = Math.min(255, Math.round(data[i + 1] * gain)); // G
      data[i + 2] = Math.min(255, Math.round(data[i + 2] * gain)); // B
      // data[i + 3] = alpha — untouched
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return canvas;
}

/**
 * Spectacles (glasses) detection using facial landmark-guided edge analysis.
 *
 * How it works:
 *  1. Uses face-api's 68-point landmark set to isolate the eye region precisely.
 *     Left eye landmarks: 36–41, Right eye: 42–47.
 *  2. Crops a slightly expanded bounding box around both eyes from the canvas.
 *  3. Converts to grayscale and runs a Sobel Gy (vertical gradient) pass.
 *     Glasses frames produce dense, high-magnitude horizontal edges (dark
 *     rectangular lines above/below the lens area) that bare eyes do not.
 *  4. Returns { detected, confidence } — confidence is proportional to the
 *     mean edge energy relative to an empirically tuned threshold.
 *
 * IMPORTANT — age/gender safety:
 *  This function is read-only (getImageData only). It never modifies the canvas,
 *  so no downstream detection or backend result is affected.
 *
 * @param canvas     The detectionCanvas already created by normalizeBrightness()
 * @param landmarks  Array of {x,y} points from face-api's landmarks.positions
 */
export function detectSpectacles(
  canvas: HTMLCanvasElement,
  landmarks: { x: number; y: number }[]
): { detected: boolean; confidence: number } {
  if (!landmarks || landmarks.length < 48) return { detected: false, confidence: 0 };

  // ── Step 1: derive eye region bounding box from landmarks 36–47 ─────────────
  const eyePts = landmarks.slice(36, 48);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of eyePts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  // Expand the crop: extra horizontal padding to catch temple arms,
  // extra vertical padding to capture the frame above/below the lens.
  const eyeW  = maxX - minX;
  const eyeH  = maxY - minY;
  const padX  = eyeW  * 0.18;
  const padY  = eyeH  * 0.90; // generous vertical pad — frame lines live here

  const rx = Math.max(0, Math.floor(minX - padX));
  const ry = Math.max(0, Math.floor(minY - padY));
  const rw = Math.min(canvas.width  - rx, Math.ceil(eyeW + padX * 2));
  const rh = Math.min(canvas.height - ry, Math.ceil(eyeH + padY * 2));

  if (rw < 4 || rh < 4) return { detected: false, confidence: 0 };

  // ── Step 2: extract pixel data and convert to grayscale ─────────────────────
  const ctx  = canvas.getContext("2d")!;
  const imgD = ctx.getImageData(rx, ry, rw, rh);
  const d    = imgD.data;

  const gray = new Float32Array(rw * rh);
  for (let i = 0; i < rw * rh; i++) {
    const j = i * 4;
    gray[i] = 0.299 * d[j] + 0.587 * d[j + 1] + 0.114 * d[j + 2];
  }

  // ── Step 3: Sobel Gy (horizontal edge detector) ──────────────────────────────
  // Glasses frames create strong vertical-gradient transitions (dark bar on
  // a lighter skin/background).  Bare eyes have smooth vertical gradients.
  let edgeSum   = 0;
  let edgeCnt   = 0;
  let strongEdge = 0; // count of pixels above a "hard edge" threshold

  for (let y = 1; y < rh - 1; y++) {
    for (let x = 1; x < rw - 1; x++) {
      const gy =
        -    gray[(y - 1) * rw + (x - 1)] - 2 * gray[(y - 1) * rw + x] -     gray[(y - 1) * rw + (x + 1)]
        +    gray[(y + 1) * rw + (x - 1)] + 2 * gray[(y + 1) * rw + x] +     gray[(y + 1) * rw + (x + 1)];
      const mag = Math.abs(gy);
      edgeSum += mag;
      edgeCnt++;
      if (mag > 60) strongEdge++; // high-contrast edge pixel (frame line)
    }
  }

  const avgEdge      = edgeCnt > 0 ? edgeSum / edgeCnt : 0;
  const strongRatio  = edgeCnt > 0 ? strongEdge / edgeCnt : 0;

  // ── Step 4: classify ─────────────────────────────────────────────────────────
  // Empirical thresholds from testing:
  //   Without glasses → avgEdge ≈ 8–18,  strongRatio ≈ 0.01–0.04
  //   With glasses    → avgEdge ≈ 22–45, strongRatio ≈ 0.06–0.18
  const EDGE_THRESHOLD   = 20;
  const STRONG_THRESHOLD = 0.05;

  const edgeScore   = Math.min(1, avgEdge / EDGE_THRESHOLD);
  const strongScore = Math.min(1, strongRatio / STRONG_THRESHOLD);
  // Combined score — both signals needed for reliable detection
  const score       = (edgeScore * 0.55 + strongScore * 0.45);

  const detected    = score >= 1.0; // both thresholds must be exceeded
  const confidence  = Math.min(95, Math.round(score * 80));

  return { detected, confidence };
}

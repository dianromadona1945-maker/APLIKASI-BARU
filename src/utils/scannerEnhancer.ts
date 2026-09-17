/**
 * Document Scanner & Image Enhancement Utilities
 * Provides automatic paper whitening, shadow removal, contrast enhancement,
 * and filter presets (CamScanner-like effect) directly in browser canvas.
 */

export type ScannerFilterPreset = 'auto-clean' | 'color-boost' | 'bw' | 'grayscale' | 'original';

export interface ScannerEnhanceOptions {
  filter: ScannerFilterPreset;
  brightness: number; // -50 to 50, default 0
  contrast: number;   // -50 to 50, default 0
  rotation: number;   // 0, 90, 180, 270
}

/**
 * Applies document enhancement filters to an ImageData object in-place.
 */
export function applyDocumentFilter(
  imageData: ImageData,
  options: ScannerEnhanceOptions
): void {
  const data = imageData.data;
  const len = data.length;
  const { filter, brightness, contrast } = options;

  if (filter === 'original' && brightness === 0 && contrast === 0) {
    return;
  }

  // Pre-calculate contrast factor
  // factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
  const c = Math.max(-100, Math.min(100, contrast * 2));
  const contrastFactor = (259 * (c + 255)) / (255 * (259 - c));
  const bOffset = brightness * 1.5;

  for (let i = 0; i < len; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Calculate luminance
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Calculate color saturation to preserve colored stamps/signatures
    const maxVal = Math.max(r, g, b);
    const minVal = Math.min(r, g, b);
    const sat = maxVal === 0 ? 0 : (maxVal - minVal) / maxVal;

    if (filter === 'auto-clean') {
      // CamScanner / Document Cleaner algorithm:
      // Paper background is usually yellowish, grayish or has shadows (lum > 115).
      // We whiten paper background while sharpening ink/text and keeping colored stamps.
      if (sat > 0.22 && maxVal > 60) {
        // Colored stamp, photo, or colored ink (e.g. blue stamp, red seal)
        // Boost color vibrancy and sharpen
        r = Math.min(255, r * 1.15);
        g = Math.min(255, g * 1.15);
        b = Math.min(255, b * 1.15);
      } else {
        // Mostly paper or black ink
        if (lum > 135) {
          // Paper background -> stretch aggressively to clean white (255)
          const boost = (lum - 135) / (255 - 135);
          r = Math.min(255, lum + (255 - lum) * Math.pow(boost, 0.6) + 25);
          g = Math.min(255, lum + (255 - lum) * Math.pow(boost, 0.6) + 25);
          b = Math.min(255, lum + (255 - lum) * Math.pow(boost, 0.6) + 25);
        } else {
          // Ink / text -> deepen and crisp
          const textDarken = Math.pow(lum / 135, 1.4) * 115;
          r = Math.max(0, textDarken - 15);
          g = Math.max(0, textDarken - 15);
          b = Math.max(0, textDarken - 15);
        }
      }
    } else if (filter === 'color-boost') {
      // Maintain full color but whiten background and boost text
      if (lum > 150 && sat < 0.25) {
        r = Math.min(255, r * 1.2 + 20);
        g = Math.min(255, g * 1.2 + 20);
        b = Math.min(255, b * 1.2 + 20);
      } else {
        // Boost saturation
        r = Math.min(255, r * 1.1);
        g = Math.min(255, g * 1.1);
        b = Math.min(255, b * 1.1);
      }
    } else if (filter === 'bw') {
      // Crisp Black & White (Adaptive binarization)
      const threshold = 138;
      const val = lum > threshold ? 255 : 0;
      r = val;
      g = val;
      b = val;
    } else if (filter === 'grayscale') {
      // Clean Grayscale with paper whitening
      let gray = lum;
      if (gray > 130) {
        gray = Math.min(255, gray + (255 - gray) * 0.7);
      } else {
        gray = Math.max(0, gray * 0.85);
      }
      r = gray;
      g = gray;
      b = gray;
    }

    // Apply brightness
    if (bOffset !== 0) {
      r = Math.max(0, Math.min(255, r + bOffset));
      g = Math.max(0, Math.min(255, g + bOffset));
      b = Math.max(0, Math.min(255, b + bOffset));
    }

    // Apply contrast
    if (contrast !== 0) {
      r = Math.max(0, Math.min(255, contrastFactor * (r - 128) + 128));
      g = Math.max(0, Math.min(255, contrastFactor * (g - 128) + 128));
      b = Math.max(0, Math.min(255, contrastFactor * (b - 128) + 128));
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

/**
 * Processes an image element or video frame, applies cropping, rotation,
 * and enhancement filters, then returns a clean JPEG data URL.
 */
export function processScannedImage(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  cropBox: { x: number; y: number; width: number; height: number } | null,
  options: ScannerEnhanceOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Determine source width & height
      let sw = 0;
      let sh = 0;
      if (source instanceof HTMLVideoElement) {
        sw = source.videoWidth;
        sh = source.videoHeight;
      } else if (source instanceof HTMLImageElement) {
        sw = source.naturalWidth || source.width;
        sh = source.naturalHeight || source.height;
      } else {
        sw = source.width;
        sh = source.height;
      }

      if (sw === 0 || sh === 0) {
        reject(new Error('Ukuran gambar sumber tidak valid.'));
        return;
      }

      const crop = cropBox || { x: 0, y: 0, width: sw, height: sh };

      // Ensure crop dimensions are within bounds
      const safeX = Math.max(0, Math.min(crop.x, sw - 10));
      const safeY = Math.max(0, Math.min(crop.y, sh - 10));
      const safeW = Math.max(10, Math.min(crop.width, sw - safeX));
      const safeH = Math.max(10, Math.min(crop.height, sh - safeY));

      const rotation = (options.rotation % 360 + 360) % 360;
      const isRotated90 = rotation === 90 || rotation === 270;

      // Final canvas dimensions based on rotation
      const destW = isRotated90 ? safeH : safeW;
      const destH = isRotated90 ? safeW : safeH;

      const canvas = document.createElement('canvas');
      canvas.width = destW;
      canvas.height = destH;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Gagal mendapatkan konteks Canvas 2D.'));
        return;
      }

      // Fill clean background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, destW, destH);

      // Handle rotation transform
      ctx.save();
      ctx.translate(destW / 2, destH / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // Draw the cropped portion of source onto canvas
      // Note: when drawing inside rotated coordinates, draw centered at (-safeW/2, -safeH/2)
      ctx.drawImage(
        source,
        safeX,
        safeY,
        safeW,
        safeH,
        -safeW / 2,
        -safeH / 2,
        safeW,
        safeH
      );
      ctx.restore();

      // Apply enhancement filters
      const imgData = ctx.getImageData(0, 0, destW, destH);
      applyDocumentFilter(imgData, options);
      ctx.putImageData(imgData, 0, 0);

      // Export as high quality JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      resolve(dataUrl);
    } catch (err) {
      reject(err);
    }
  });
}

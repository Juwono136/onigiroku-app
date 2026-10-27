import {
  CMS_IMAGE_MAX_BYTES,
  CMS_IMAGE_MIME,
} from "@/lib/materials/plain-text";

/** Recommended published cover size (16:9). */
export const CMS_COVER_RECOMMENDED_WIDTH = 1600;
export const CMS_COVER_RECOMMENDED_HEIGHT = 900;

/** Soft floor so covers stay readable on cards and hero strips. */
export const CMS_COVER_MIN_WIDTH = 640;
export const CMS_COVER_MIN_HEIGHT = 360;

const TARGET_ASPECT = CMS_COVER_RECOMMENDED_WIDTH / CMS_COVER_RECOMMENDED_HEIGHT;
const ASPECT_TOLERANCE = 0.18;

export type CoverImageInspect =
  | {
      ok: true;
      width: number;
      height: number;
      /** True when ratio is far from 16:9 — still uploadable, but may crop. */
      aspectWarning: boolean;
    }
  | {
      ok: false;
      code:
        | "COVER_TYPE_INVALID"
        | "COVER_SIZE_INVALID"
        | "COVER_DECODE_FAILED"
        | "COVER_TOO_SMALL";
    };

function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      URL.revokeObjectURL(url);
      if (!width || !height) {
        reject(new Error("COVER_DECODE_FAILED"));
        return;
      }
      resolve({ width, height });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("COVER_DECODE_FAILED"));
    };
    image.src = url;
  });
}

/**
 * Validates MIME, size, decodability, and minimum dimensions for CMS covers.
 * Aspect ratio far from 16:9 yields `aspectWarning` (caller may toast, still allow).
 */
export async function inspectCoverImage(file: File): Promise<CoverImageInspect> {
  if (!CMS_IMAGE_MIME.has(file.type)) {
    return { ok: false, code: "COVER_TYPE_INVALID" };
  }
  if (file.size <= 0 || file.size > CMS_IMAGE_MAX_BYTES) {
    return { ok: false, code: "COVER_SIZE_INVALID" };
  }
  try {
    const { width, height } = await loadImageDimensions(file);
    if (width < CMS_COVER_MIN_WIDTH || height < CMS_COVER_MIN_HEIGHT) {
      return { ok: false, code: "COVER_TOO_SMALL" };
    }
    const aspect = width / height;
    const aspectWarning = Math.abs(aspect - TARGET_ASPECT) > ASPECT_TOLERANCE;
    return { ok: true, width, height, aspectWarning };
  } catch {
    return { ok: false, code: "COVER_DECODE_FAILED" };
  }
}

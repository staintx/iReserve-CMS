/**
 * Shared rules for admin image uploads.
 *
 * The limits mirror backend/src/middleware/upload.middleware.js (5MB per file,
 * JPG/PNG/GIF/WEBP) so the admin gets told about a bad file before the request
 * is made instead of after a 500 comes back.
 */

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export const IMAGE_ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(",");

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const IMAGE_HINT = "JPG, PNG, GIF or WEBP · up to 5MB";

export const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const CLOUDINARY_UPLOAD_SEGMENT = "/image/upload/";

/**
 * Display-only thumbnail URL.
 *
 * Cloudinary reads transforms out of the path, so a grid of 80px tiles can ask
 * for 240px renditions instead of pulling the full-size originals. Anything
 * that is not a Cloudinary delivery URL is handed back untouched, and the URL
 * stored on the record is never affected — this only changes what <img> fetches.
 */
export const thumbnailUrl = (url, transform = "w_240,c_fill,q_auto") => {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com")) return url;

  const index = url.indexOf(CLOUDINARY_UPLOAD_SEGMENT);
  if (index === -1) return url;

  const start = index + CLOUDINARY_UPLOAD_SEGMENT.length;
  if (url.slice(start).startsWith(`${transform}/`)) return url;

  return `${url.slice(0, start)}${transform}/${url.slice(start)}`;
};

const COMPRESS_ABOVE_BYTES = 300 * 1024;

/**
 * Downscale oversized photos in the browser. Animated GIFs are passed through
 * untouched — a canvas round-trip would flatten them to a single frame.
 */
export const compressImage = async (file, maxDimension = 1600, quality = 0.85) => {
  if (
    !file ||
    !file.type?.startsWith("image/") ||
    file.type === "image/gif" ||
    file.size < COMPRESS_ABOVE_BYTES
  ) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      // Transparent PNGs encode as black in JPEG unless the canvas is painted first.
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) return resolve(file);
          resolve(
            new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: "image/jpeg",
              lastModified: Date.now(),
            })
          );
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
};

/**
 * Validate then downscale a picked file.
 * Resolves to `{ file }` on success or `{ error }` with a message to show.
 */
export const prepareImageFile = async (file) => {
  if (!file) return { error: "No file selected." };

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { error: `"${file.name}" is not a supported image. Use ${IMAGE_HINT.split(" · ")[0]}.` };
  }

  const prepared = await compressImage(file);

  if (prepared.size > MAX_IMAGE_BYTES) {
    return {
      error: `"${file.name}" is ${formatBytes(prepared.size)}. The limit is ${formatBytes(MAX_IMAGE_BYTES)}.`,
    };
  }

  return { file: prepared };
};

/** Prepare several files at once, keeping the good ones and collecting messages. */
export const prepareImageFiles = async (files) => {
  const results = await Promise.all(Array.from(files).map(prepareImageFile));
  return {
    files: results.filter((r) => r.file).map((r) => r.file),
    errors: results.filter((r) => r.error).map((r) => r.error),
  };
};

/**
 * Extracts the real package thumbnail or cover image from an inquiry or booking record.
 * If no real package image is available on the object, returns null so the component
 * can render an elegant, branded fallback card icon container instead of generic stock photos.
 */
export const getEventThumbnail = (record) => {
  if (!record) return null;

  // Check package relation cover image or image url
  const pkg = record.package_id && typeof record.package_id === "object" ? record.package_id : null;
  if (pkg?.cover_image) return pkg.cover_image;
  if (pkg?.image_url) return pkg.image_url;
  if (pkg?.image) return pkg.image;
  if (Array.isArray(pkg?.images) && pkg.images[0]) return pkg.images[0];

  // Check package snapshot or root object fields
  if (record.package_details?.image_url) return record.package_details.image_url;
  if (record.image_url) return record.image_url;
  if (record.cover_image) return record.cover_image;

  return null;
};

import React, { useState, useMemo } from "react";
import { Utensils } from "lucide-react";

/**
 * Resolves a dish's image URL by matching against the menu catalog if direct URL is not available.
 * Supports both resolveDishImageUrl(name, directUrl, catalog) and resolveDishImageUrl(dishObj, catalog).
 */
export function resolveDishImageUrl(nameOrDish, directUrlOrCatalog, maybeCatalog = []) {
  let name = "";
  let directUrl = "";
  let catalog = [];

  if (nameOrDish && typeof nameOrDish === "object") {
    name = nameOrDish.name || nameOrDish.item_name || "";
    directUrl = nameOrDish.image_url || nameOrDish.imageUrl || "";
    catalog = Array.isArray(directUrlOrCatalog) ? directUrlOrCatalog : maybeCatalog;
  } else {
    name = nameOrDish || "";
    if (typeof directUrlOrCatalog === "string") {
      directUrl = directUrlOrCatalog;
      catalog = maybeCatalog;
    } else if (Array.isArray(directUrlOrCatalog)) {
      directUrl = "";
      catalog = directUrlOrCatalog;
    }
  }

  if (directUrl && typeof directUrl === "string" && directUrl.trim()) {
    return directUrl.trim();
  }
  if (!name || !Array.isArray(catalog) || catalog.length === 0) {
    return null;
  }

  const clean = String(name).trim().toLowerCase();

  // 1. Exact match
  const exact = catalog.find((c) => (c.name || "").trim().toLowerCase() === clean);
  if (exact?.image_url) return exact.image_url;

  // 2. Plural / Singular match (e.g. "Buttered Shrimp" <-> "Buttered Shrimps", "Iced Tea" <-> "Ice Tea")
  const singular = clean.endsWith("s") ? clean.slice(0, -1) : clean;
  const match = catalog.find((c) => {
    const cName = (c.name || "").trim().toLowerCase();
    const cSingular = cName.endsWith("s") ? cName.slice(0, -1) : cName;
    if (cName === singular || cSingular === clean || cSingular === singular) {
      return true;
    }
    // Handle variations like "Iced Tea" vs "Ice Tea"
    if (clean.replace(/iced/g, "ice") === cName.replace(/iced/g, "ice")) {
      return true;
    }
    // Substring match for distinctive dish names (min 5 chars)
    if (clean.length >= 5 && (cName.includes(clean) || clean.includes(cName))) {
      return true;
    }
    return false;
  });

  return match?.image_url || null;
}

/**
 * DishThumbnail Component
 *
 * Compact square thumbnail designed specifically for table rows and cards in the Quotation Builder.
 * Keeps row height tight while providing clear visual food identification.
 */
export default function DishThumbnail({
  dish,
  name,
  imageUrl,
  catalog = [],
  catalogMenuItems = [],
  size = "sm",
  className = "",
}) {
  const [hasError, setHasError] = useState(false);

  const actualName = name || dish?.name || dish?.item_name || (typeof dish === "string" ? dish : "");
  const actualUrl = imageUrl || dish?.image_url || dish?.imageUrl || "";
  const actualCatalog = (catalog && catalog.length > 0) ? catalog : catalogMenuItems;

  const resolvedUrl = useMemo(
    () => resolveDishImageUrl(actualName, actualUrl, actualCatalog),
    [actualName, actualUrl, actualCatalog]
  );

  // Size mapping:
  // xs: 24x24px, sm: 28x28px (default), md: 32x32px
  const sizeClasses =
    size === "xs"
      ? "w-6 h-6 min-w-6"
      : size === "md"
      ? "w-8 h-8 min-w-8"
      : "w-7 h-7 min-w-7";

  const iconSize = size === "xs" ? 11 : size === "md" ? 14 : 12;

  if (resolvedUrl && !hasError) {
    return (
      <span
        className={`inline-block shrink-0 overflow-hidden rounded bg-slate-100 border border-slate-200/80 shadow-2xs ${sizeClasses} ${className}`}
        title={actualName}
      >
        <img
          src={resolvedUrl}
          alt={actualName || "Dish"}
          onError={() => setHasError(true)}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded bg-slate-100/90 border border-slate-200/70 text-slate-400 ${sizeClasses} ${className}`}
      title={actualName || "Dish"}
    >
      <Utensils size={iconSize} className="opacity-70" />
    </span>
  );
}

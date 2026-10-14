/**
 * Formatting utilities for currency, dates, times, and event data
 */

export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return `₱${num.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const parseLocalDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const str = String(value).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    const year = Number(y);
    const month = Number(m) - 1;
    const day = Number(d);
    const dateObj = new Date(year, month, day);
    return Number.isNaN(dateObj.getTime()) ? null : dateObj;
  }
  const fallback = new Date(value);
  if (!Number.isNaN(fallback.getTime())) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
  }
  return null;
};

export const formatDate = (dateValue) => {
  if (!dateValue) return "N/A";
  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
    const [year, month, day] = dateValue.slice(0, 10).split("-").map(Number);
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return String(dateValue);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatShortDate = (dateValue) => {
  if (!dateValue) return "";
  if (typeof dateValue === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
    const [year, month, day] = dateValue.slice(0, 10).split("-").map(Number);
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  }
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export const formatDateTime = (value, fallback = "—") => {
  if (!value) return fallback;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return fallback;
  const datePart = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timePart = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
};

export const formatTime = (timeStr) => {
  if (!timeStr) return "";
  if (/am|pm/i.test(timeStr)) return timeStr.trim();
  const parts = String(timeStr).split(":");
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, "0");
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
};

export const formatEventStartTime = (value, fallback = "Time TBA") => {
  if (!value) return fallback;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/i);
  if (!match) return String(value).trim() || fallback;
  const hours = Number(match[1]);
  const minutes = match[2];
  if (!Number.isFinite(hours) || hours > 23) return String(value).trim() || fallback;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(displayHour).padStart(2, "0")}:${minutes} ${suffix}`;
};

export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "";
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(timestamp);
};

export const getBookingVenueLocation = (booking) => {
  if (!booking) return "Location not specified";

  if (booking.delivery_method === "pickup" && booking.pickup_location?.trim()) {
    return `Pickup: ${booking.pickup_location.trim()}`;
  }

  const addressParts = [
    booking.street,
    booking.barangay,
    booking.municipality,
    booking.province,
  ]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);

  if (addressParts.length > 0) {
    return addressParts.join(", ");
  }

  if (booking.location && typeof booking.location === "string" && booking.location.trim()) {
    return booking.location.trim();
  }
  if (booking.venue_address && typeof booking.venue_address === "string" && booking.venue_address.trim()) {
    return booking.venue_address.trim();
  }
  if (booking.address && typeof booking.address === "string" && booking.address.trim()) {
    return booking.address.trim();
  }
  if (booking.venue_name && typeof booking.venue_name === "string" && booking.venue_name.trim()) {
    return booking.venue_name.trim();
  }
  if (booking.landmark && typeof booking.landmark === "string" && booking.landmark.trim()) {
    return booking.landmark.trim();
  }

  return "Location not specified";
};

export const getEventTimingStatus = (booking) => {
  if (!booking) {
    return { isStarted: false, isFinished: false, isCompleted: false, isUpcoming: true, label: "Upcoming" };
  }

  const status = String(booking.status || "").toLowerCase();
  const isCompleted = ["completed"].includes(status);
  const isPendingCompletion = ["pending completion"].includes(status);
  const isOngoing = ["ongoing"].includes(status);

  let isPastDate = false;
  let dateObj = null;
  if (booking.event_date) {
    dateObj = new Date(booking.event_date);
    if (!Number.isNaN(dateObj.getTime())) {
      const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);
      isPastDate = new Date() > endOfDay;
    }
  }

  if (isCompleted) {
    return { isStarted: true, isFinished: true, isCompleted: true, isUpcoming: false, label: "Completed" };
  }
  if (isPendingCompletion) {
    return { isStarted: true, isFinished: true, isCompleted: false, isUpcoming: false, label: "Pending Completion" };
  }
  if (isOngoing) {
    if (isPastDate) {
      return { isStarted: true, isFinished: true, isCompleted: false, isUpcoming: false, label: "Concluded" };
    }
    return { isStarted: true, isFinished: false, isCompleted: false, isUpcoming: false, label: "In Progress" };
  }

  if (!booking.event_date || !dateObj || Number.isNaN(dateObj.getTime())) {
    return { isStarted: true, isFinished: false, isCompleted: false, isUpcoming: false, label: "Ready" };
  }

  let hours = 0;
  let minutes = 0;
  if (booking.start_time) {
    const match = String(booking.start_time).trim().match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
    }
  }

  const startDateTime = new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate(),
    hours,
    minutes,
    0,
    0
  );

  const now = new Date();
  const isStarted = now >= startDateTime;
  const isFinished = isCompleted || isPastDate;
  const isUpcoming = !isStarted && !isCompleted && !isPastDate;

  let label = "Upcoming Shift";
  if (isCompleted) {
    label = "Event Concluded";
  } else if (isPastDate) {
    label = "Concluded";
  } else if (isStarted) {
    label = "Event In Progress";
  }

  return {
    isStarted,
    isFinished,
    isCompleted,
    isUpcoming,
    startDateTime,
    label,
  };
};

export const initialsOf = (nameOrEmail, fallback = "??") => {
  const source = String(nameOrEmail || "").split("@")[0];
  const parts = source.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const INCLUSION_PATTERN = /^\s*\[([^\]]+)\]\s*(.+?)\s*(?:\(([^()]*)\))?\s*$/;

export function parseInclusion(value) {
  let raw = String(value || "").trim();
  if (!raw) return null;

  for (let i = 0; i < 4; i++) {
    raw = raw.replace(/^["'\\]+|["'\\]+$/g, "").trim();
  }

  raw = raw.replace(/^\[+[\s"'\\]*\[/, "[");
  raw = raw.replace(/\]+[\s"'\\]*\]+$/, "]");
  raw = raw.replace(/^\[+[\s"'\\]+/, "[");
  raw = raw.replace(/[\s"'\\]+\]+$/, "]");

  for (let i = 0; i < 4; i++) {
    raw = raw.replace(/^["'\\]+|["'\\]+$/g, "").trim();
  }

  const match = raw.match(INCLUSION_PATTERN);
  if (!match) {
    let cleanName = raw.replace(/^\[+|\]+$/g, "").trim();
    cleanName = cleanName.replace(/^["'\\]+|["'\\]+$/g, "").trim();
    return { category: null, name: cleanName, qty: null };
  }

  let cat = match[1].trim();
  cat = cat.replace(/^["'\\]+|["'\\]+$/g, "").trim();

  let name = match[2].trim();
  name = name.replace(/^["'\\]+|["'\\]+$/g, "").trim();

  let qty = match[3]?.trim() || null;
  if (qty) qty = qty.replace(/^["'\\]+|["'\\]+$/g, "").trim();

  return {
    category: cat || null,
    name: name,
    qty: qty,
  };
}

export function buildDynamicChecklist(booking) {
  if (!booking) return [];

  const savedChecklist = Array.isArray(booking.equipment_checklist) && booking.equipment_checklist.length > 0
    ? booking.equipment_checklist
    : [];
  const savedMap = new Map();
  savedChecklist.forEach((item) => {
    if (item.item_key) savedMap.set(item.item_key, item);
  });

  const items = [];

  // 1. Package Inclusions (Event Setup inclusions and Package Equipment)
  const inclusions = Array.isArray(booking.package_inclusions) ? booking.package_inclusions : [];
  inclusions.forEach((inc, idx) => {
    const raw = String(inc).trim();
    if (!raw) return;

    const parsed = parseInclusion(raw);
    if (!parsed) return;

    const nameLower = parsed.name.toLowerCase();
    const catLower = (parsed.category || "").toLowerCase();

    // Skip crew/staff inclusions
    if (nameLower === "crew" || catLower === "crew" || catLower === "staff") {
      return;
    }

    const isSetup = catLower.includes("setup");
    const itemCategory = isSetup ? "Event Setup Inclusion" : "Package Equipment";

    let qty = undefined;
    let unit = "";
    if (!isSetup) {
      if (parsed.qty) {
        const numMatch = parsed.qty.match(/\d+/);
        qty = numMatch ? parseInt(numMatch[0], 10) : 1;
        const unitMatch = parsed.qty.match(/[a-zA-Z]+/);
        unit = unitMatch ? unitMatch[0] : "pcs";
      } else {
        qty = 1;
        unit = "pcs";
      }
    }

    const itemKey = `inclusion_${idx}_${parsed.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    const saved = savedMap.get(itemKey);

    const finalQuantity = isSetup
      ? null
      : (saved?.quantity !== undefined && saved?.quantity !== null ? saved.quantity : qty);
    const finalUnit = isSetup
      ? ""
      : (saved?.unit || unit || "pcs");

    items.push({
      item_key: itemKey,
      name: parsed.name,
      category: itemCategory,
      quantity: finalQuantity,
      unit: finalUnit,
      is_inspected: saved ? Boolean(saved.is_inspected) : false,
      status: saved?.status || "not_inspected",
      issue_type: saved?.issue_type || "none",
      notes: saved?.notes || "",
      completed_at: saved?.completed_at || null,
    });
  });

  // 2. Direct Inventory Items (Package physical equipment)
  const inventoryItems = Array.isArray(booking.inventory_items) ? booking.inventory_items : [];
  inventoryItems.forEach((inv, idx) => {
    const name = inv.name || inv.inventory_id?.name || inv.inventory_id?.item_name || `Equipment Item #${idx + 1}`;
    const itemKey = `inv_${inv.inventory_id?._id || inv.inventory_id || idx}_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    if (items.some((it) => it.item_key === itemKey || it.name.toLowerCase() === name.toLowerCase())) {
      return;
    }
    const saved = savedMap.get(itemKey);
    items.push({
      item_key: itemKey,
      name,
      category: "Inventory Equipment",
      quantity: saved?.quantity !== undefined && saved?.quantity !== null ? saved.quantity : (Number(inv.quantity) || 1),
      unit: saved?.unit || inv.unit || "units",
      is_inspected: saved ? Boolean(saved.is_inspected) : false,
      status: saved?.status || "not_inspected",
      issue_type: saved?.issue_type || "none",
      notes: saved?.notes || "",
      completed_at: saved?.completed_at || null,
    });
  });

  return items;
}

export default {
  formatCurrency,
  formatDate,
  formatShortDate,
  formatDateTime,
  formatTime,
  formatEventStartTime,
  formatRelativeTime,
  getBookingVenueLocation,
  getEventTimingStatus,
  initialsOf,
  parseInclusion,
  buildDynamicChecklist,
};

/**
 * Shared formatting helpers for the customer portal.
 * Keeps currency/date presentation identical across pages.
 */

export const formatCurrency = (value, { fallback = "₱0.00" } = {}) => {
  if (value === undefined || value === null || value === "") return fallback;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return fallback;
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatEventDate = (value, { fallback = "Date to be confirmed" } = {}) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

/** "Aug 12, 2026 · 11:00 AM" — one readable string for a card headline. */
export const formatEventDateTime = (date, time, options) => {
  const datePart = formatEventDate(date, options);
  const timePart = formatTime(time);
  return timePart ? `${datePart} · ${timePart}` : datePart;
};

/** Turns "11:00" / "14:30" into "11:00 AM" / "2:30 PM". Leaves other input as-is. */
export const formatTime = (value) => {
  if (!value) return "";
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(value);
  const hours = Number(match[1]);
  const minutes = match[2];
  if (!Number.isFinite(hours) || hours > 23) return String(value);
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${minutes} ${suffix}`;
};

export const formatShortDate = (value, fallback = "—") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

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

/**
 * Determines whether an event has started, is in progress, finished, or is upcoming.
 */
export const getEventTimingStatus = (booking) => {
  if (!booking) {
    return { isStarted: false, isFinished: false, isCompleted: false, isUpcoming: true, label: "Upcoming" };
  }

  const status = String(booking.status || "").toLowerCase();
  const isCompleted = ["completed"].includes(status);
  const isOngoing = ["ongoing"].includes(status);

  if (isCompleted) {
    return { isStarted: true, isFinished: true, isCompleted: true, isUpcoming: false, label: "Completed" };
  }
  if (isOngoing) {
    return { isStarted: true, isFinished: false, isCompleted: false, isUpcoming: false, label: "In Progress" };
  }

  if (!booking.event_date) {
    return { isStarted: true, isFinished: false, isCompleted: false, isUpcoming: false, label: "Ready" };
  }

  const dateObj = new Date(booking.event_date);
  if (Number.isNaN(dateObj.getTime())) {
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

  const durationHours = Number(booking.duration_hours) || 4;
  const endDateTime = new Date(startDateTime.getTime() + durationHours * 60 * 60 * 1000);
  const now = new Date();

  const isStarted = now >= startDateTime;
  const isFinished = now >= endDateTime;
  const isUpcoming = !isStarted;

  let label = "Upcoming Shift";
  if (isFinished) {
    label = "Event Concluded";
  } else if (isStarted) {
    label = "Event In Progress";
  }

  return {
    isStarted,
    isFinished,
    isCompleted,
    isUpcoming,
    startDateTime,
    endDateTime,
    label
  };
};


/**
 * Avatar initials from a display name, falling back to an email local part.
 * Lived as a copy-pasted IIFE in each of the three portal sidebars; the
 * mobile menu made it a fourth, which is one too many to keep in sync.
 */
export const initialsOf = (nameOrEmail, fallback = "??") => {
  const source = String(nameOrEmail || "").split("@")[0];
  const parts = source.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

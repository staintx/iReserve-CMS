import { CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react";

// Mirrors the semantic variants already used by ui/badge.jsx (success/warning/info/destructive)
// so a notification's color always means the same thing everywhere in the admin UI.
const TYPE_META = {
  success: { icon: CheckCircle2, iconClass: "text-emerald-600", chipClass: "bg-emerald-100" },
  warning: { icon: AlertTriangle, iconClass: "text-amber-600", chipClass: "bg-amber-100" },
  error: { icon: AlertCircle, iconClass: "text-red-600", chipClass: "bg-red-100" },
  info: { icon: Info, iconClass: "text-blue-600", chipClass: "bg-blue-100" }
};

export const getNotificationMeta = (type) => TYPE_META[type] || TYPE_META.info;

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// Buckets a list already sorted newest-first into Today / Yesterday / Earlier
// groups so a long list reads as scannable chunks instead of one flat stream.
export const groupNotificationsByDay = (items) => {
  const now = new Date();
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = { Today: [], Yesterday: [], Earlier: [] };

  for (const item of items) {
    const created = new Date(item.createdAt);
    const day = Number.isNaN(created.getTime()) ? null : startOfDay(created);
    if (day && day.getTime() === today.getTime()) groups.Today.push(item);
    else if (day && day.getTime() === yesterday.getTime()) groups.Yesterday.push(item);
    else groups.Earlier.push(item);
  }

  return Object.entries(groups).filter(([, list]) => list.length > 0);
};

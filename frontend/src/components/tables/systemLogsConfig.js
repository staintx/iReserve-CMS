import {
  Package,
  Utensils,
  Sparkles,
  FileText,
  Calendar,
  Building2,
} from "lucide-react";

export const ACTION_LABELS = {
  business_info_updated: "Business Info Updated",
  package_created: "Package Created",
  package_updated: "Package Updated",
  package_deleted: "Package Deleted",
  menu_item_created: "Menu Item Created",
  menu_item_updated: "Menu Item Updated",
  menu_item_deleted: "Menu Item Deleted",
  menu_bulk_created: "Menu Bulk Created",
  addon_created: "Addon Created",
  addon_updated: "Addon Updated",
  addon_deleted: "Addon Deleted",
  addons_bulk_created: "Addons Bulk Created",
  inquiry_reviewed: "Inquiry Reviewed",
  inquiry_updated: "Inquiry Updated",
  inquiry_customer_status_update: "Customer Status Update",
  booking_created: "Booking Created",
  booking_created_from_inquiry: "Booking from Inquiry",
  booking_updated: "Booking Updated",
  booking_deleted: "Booking Deleted",
  booking_guests_added: "Guests Added",
  booking_upgraded: "Booking Upgraded",
  booking_change_requested: "Change Requested",
  booking_refunded: "Booking Refunded",
  booking_returns_verified: "Returns Verified",
  booking_inventory_assigned: "Inventory Assigned",
  ocular_scheduled: "Ocular Scheduled",
  ocular_completed: "Ocular Completed",
  ocular_requested: "Ocular Requested",
  booking_cancellation_requested: "Cancellation Requested",
  booking_cancellation_approved: "Cancellation Approved",
  booking_cancellation_rejected: "Cancellation Rejected",
  change_request_submitted: "Change Submitted",
  change_request_resolved: "Change Resolved",
  booking_revision_proposed: "Revision Proposed",
  booking_revision_accepted: "Revision Accepted",
  booking_revision_rejected: "Revision Rejected",
  quote_accepted: "Quote Accepted",
};

/**
 * Semantic Action Badge Styling:
 * - Primary blue (#4C81E0) for standard administrative creation, updates, and configurations.
 * - Emerald for approved, verified, completed, accepted.
 * - Amber for review states, revision proposed, change requested.
 * - Rose for deletions, cancellations, refunds, rejections.
 */
export const ACTION_BADGE_STYLES = {
  // Normal Admin / Primary blue
  business_info_updated: "bg-blue-50 text-[#2C5EB5] border-blue-200/80",
  package_created: "bg-blue-50 text-[#2C5EB5] border-blue-200/80",
  package_updated: "bg-blue-50 text-[#2C5EB5] border-blue-200/80",
  menu_item_created: "bg-blue-50 text-[#2C5EB5] border-blue-200/80",
  menu_item_updated: "bg-blue-50 text-[#2C5EB5] border-blue-200/80",
  menu_bulk_created: "bg-blue-50 text-[#2C5EB5] border-blue-200/80",
  addon_created: "bg-blue-50 text-[#2C5EB5] border-blue-200/80",
  addon_updated: "bg-blue-50 text-[#2C5EB5] border-blue-200/80",
  addons_bulk_created: "bg-blue-50 text-[#2C5EB5] border-blue-200/80",
  booking_created: "bg-blue-50 text-[#2C5EB5] border-blue-200/80",
  booking_created_from_inquiry: "bg-blue-50 text-[#2C5EB5] border-blue-200/80",
  booking_updated: "bg-blue-50 text-[#2C5EB5] border-blue-200/80",
  booking_guests_added: "bg-blue-50 text-[#2C5EB5] border-blue-200/80",
  booking_upgraded: "bg-blue-50 text-[#2C5EB5] border-blue-200/80",
  booking_inventory_assigned: "bg-blue-50 text-[#2C5EB5] border-blue-200/80",
  inquiry_updated: "bg-blue-50 text-[#2C5EB5] border-blue-200/80",
  ocular_scheduled: "bg-blue-50 text-[#2C5EB5] border-blue-200/80",

  // Success / Emerald
  quote_accepted: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  booking_revision_accepted: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  change_request_resolved: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  ocular_completed: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  booking_returns_verified: "bg-emerald-50 text-emerald-700 border-emerald-200/80",

  // Warning / Amber
  inquiry_reviewed: "bg-amber-50 text-amber-700 border-amber-200/80",
  inquiry_customer_status_update: "bg-amber-50 text-amber-700 border-amber-200/80",
  booking_change_requested: "bg-amber-50 text-amber-700 border-amber-200/80",
  ocular_requested: "bg-amber-50 text-amber-700 border-amber-200/80",
  change_request_submitted: "bg-amber-50 text-amber-700 border-amber-200/80",
  booking_revision_proposed: "bg-amber-50 text-amber-700 border-amber-200/80",
  booking_cancellation_requested: "bg-amber-50 text-amber-700 border-amber-200/80",
  booking_cancellation_rejected: "bg-amber-50 text-amber-700 border-amber-200/80",

  // Destructive / Rose
  package_deleted: "bg-rose-50 text-rose-700 border-rose-200/80",
  menu_item_deleted: "bg-rose-50 text-rose-700 border-rose-200/80",
  addon_deleted: "bg-rose-50 text-rose-700 border-rose-200/80",
  booking_deleted: "bg-rose-50 text-rose-700 border-rose-200/80",
  booking_refunded: "bg-rose-50 text-rose-700 border-rose-200/80",
  booking_cancellation_approved: "bg-rose-50 text-rose-700 border-rose-200/80",
  booking_revision_rejected: "bg-rose-50 text-rose-700 border-rose-200/80",
};

export const ENTITY_META = {
  business_info: { label: "Business Info", icon: Building2 },
  package: { label: "Package", icon: Package },
  menu: { label: "Menu", icon: Utensils },
  addon: { label: "Addon", icon: Sparkles },
  inquiry: { label: "Inquiry", icon: FileText },
  booking: { label: "Booking", icon: Calendar },
};

export const ROLE_STYLES = {
  admin: "bg-slate-100 text-slate-700 border-slate-200/80",
  manager: "bg-amber-50 text-amber-700 border-amber-200/80",
  staff: "bg-blue-50 text-blue-700 border-blue-200/80",
  customer: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
};

export function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatTimeCompact(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function formatDateTimeFull(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Info,
  FileText,
  Eye,
  Edit,
  Receipt,
  Wallet,
  ClipboardList,
  XCircle
} from "lucide-react";

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

// Formats a generic backend notification into a structured UI-friendly object
// Features robust keyword/regex matching and a safe fallback.
export const formatCustomerNotification = (item) => {
  const rawTitle = (item.title || "").toLowerCase();
  const rawBody = (item.body || "").toLowerCase();
  
  // Safe fallback defaults
  const formatted = {
    ...item,
    formattedTitle: item.title,
    formattedBody: item.body,
    icon: TYPE_META[item.type]?.icon || Info,
    iconClass: TYPE_META[item.type]?.iconClass || "text-blue-600",
    chipClass: TYPE_META[item.type]?.chipClass || "bg-blue-100",
    cta: null
  };

  // Inquiry / Review
  if (rawTitle.includes("inquiry") || rawTitle.includes("review")) {
    formatted.icon = rawTitle.includes("review") ? Eye : FileText;
    formatted.iconClass = "text-blue-600";
    formatted.chipClass = "bg-blue-100";
    if (rawTitle.includes("submitted")) {
      formatted.formattedTitle = "Inquiry submitted";
      formatted.formattedBody = "We have received your inquiry and will review it shortly.";
      formatted.cta = "View Inquiry →";
    } else if (rawTitle.includes("review")) {
      formatted.formattedTitle = "Inquiry under review";
      formatted.formattedBody = "Our team is currently reviewing your inquiry.";
      formatted.cta = "View Details →";
    }
  }
  
  // Quotation
  if (rawTitle.includes("quote") || rawTitle.includes("quotation")) {
    formatted.icon = Receipt;
    formatted.iconClass = "text-indigo-600";
    formatted.chipClass = "bg-indigo-100";
    if (rawTitle.includes("received") || rawTitle.includes("ready")) {
      formatted.formattedTitle = "Quotation ready";
      formatted.cta = "Review Quotation →";
    } else if (rawTitle.includes("revised") || rawTitle.includes("update")) {
      formatted.formattedTitle = "Quotation revised";
      formatted.cta = "Review Changes →";
    } else if (rawTitle.includes("accept") || rawTitle.includes("confirm")) {
      formatted.icon = CheckCircle2;
      formatted.iconClass = "text-emerald-600";
      formatted.chipClass = "bg-emerald-100";
      formatted.formattedTitle = "Quotation accepted";
      formatted.cta = "View Booking →";
    } else if (rawTitle.includes("decline") || rawTitle.includes("reject")) {
      formatted.icon = XCircle;
      formatted.iconClass = "text-red-600";
      formatted.chipClass = "bg-red-100";
      formatted.formattedTitle = "Quotation declined";
    } else if (rawTitle.includes("action") || rawTitle.includes("require")) {
      formatted.icon = AlertCircle;
      formatted.iconClass = "text-amber-600";
      formatted.chipClass = "bg-amber-100";
      formatted.formattedTitle = "Quotation requires action";
      formatted.cta = "Take Action →";
    }
  }

  // Booking / Revision
  if (rawTitle.includes("booking") || rawTitle.includes("revision") || rawTitle.includes("proposal")) {
    formatted.icon = rawTitle.includes("revision") || rawTitle.includes("proposal") ? Edit : ClipboardList;
    formatted.iconClass = "text-purple-600";
    formatted.chipClass = "bg-purple-100";
    
    if (rawTitle.includes("confirm")) {
      formatted.icon = CheckCircle2;
      formatted.iconClass = "text-emerald-600";
      formatted.chipClass = "bg-emerald-100";
      formatted.formattedTitle = "Booking confirmed";
      formatted.cta = "View Booking →";
    } else if (rawTitle.includes("cancel")) {
      formatted.icon = XCircle;
      formatted.iconClass = "text-red-600";
      formatted.chipClass = "bg-red-100";
      formatted.formattedTitle = "Booking cancelled";
    } else if (rawTitle.includes("revis") || rawTitle.includes("propos")) {
      formatted.icon = Edit;
      formatted.formattedTitle = "Revision requested";
      formatted.cta = "Review Revision →";
    } else if (rawTitle.includes("assign")) {
      formatted.formattedTitle = "Staff assigned";
      formatted.cta = "View Booking →";
    }
  }

  // Payment
  if (rawTitle.includes("payment") || rawTitle.includes("fee") || rawTitle.includes("refund")) {
    formatted.icon = Wallet;
    formatted.iconClass = "text-emerald-600";
    formatted.chipClass = "bg-emerald-100";
    
    if (rawTitle.includes("fail") || rawTitle.includes("error")) {
      formatted.icon = AlertCircle;
      formatted.iconClass = "text-red-600";
      formatted.chipClass = "bg-red-100";
      formatted.formattedTitle = "Payment failed";
      formatted.cta = "Try Again →";
    } else if (rawTitle.includes("success") || rawTitle.includes("received")) {
      formatted.formattedTitle = "Payment successful";
      formatted.cta = "View Receipt →";
    } else if (rawTitle.includes("requir") || rawTitle.includes("due")) {
      formatted.icon = AlertCircle;
      formatted.iconClass = "text-amber-600";
      formatted.chipClass = "bg-amber-100";
      formatted.formattedTitle = "Payment required";
      formatted.cta = "Make Payment →";
    } else if (rawTitle.includes("refund")) {
      formatted.formattedTitle = "Refund processed";
    } else if (rawTitle.includes("fee")) {
      formatted.icon = AlertCircle;
      formatted.iconClass = "text-amber-600";
      formatted.chipClass = "bg-amber-100";
      formatted.formattedTitle = "Additional fee applied";
      formatted.cta = "View Details →";
    }
  }

  // Reservation / Ocular
  if (rawTitle.includes("reservation") || rawTitle.includes("ocular") || rawTitle.includes("visit")) {
    formatted.icon = ClipboardList;
    formatted.iconClass = "text-teal-600";
    formatted.chipClass = "bg-teal-100";
    
    if (rawTitle.includes("confirm") || rawTitle.includes("schedul")) {
      formatted.icon = CheckCircle2;
      formatted.formattedTitle = rawTitle.includes("ocular") ? "Ocular visit scheduled" : "Reservation confirmed";
      formatted.cta = "View Details →";
    }
  }

  // General fallback for action required
  if (!formatted.cta && (rawTitle.includes("action") || rawBody.includes("please review") || rawBody.includes("please confirm"))) {
    formatted.icon = AlertCircle;
    formatted.iconClass = "text-amber-600";
    formatted.chipClass = "bg-amber-100";
    formatted.cta = "Review Details →";
  }

  return formatted;
};

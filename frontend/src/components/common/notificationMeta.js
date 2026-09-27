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
  XCircle,
  MessageSquare,
  MapPin,
  Clock
} from "lucide-react";

// Mirrors the semantic variants already used by ui/badge.jsx (success/warning/info/destructive)
// so a notification's color always means the same thing everywhere in the UI.
const TYPE_META = {
  success: { icon: CheckCircle2, iconClass: "text-emerald-600", chipClass: "bg-emerald-100" },
  warning: { icon: AlertTriangle, iconClass: "text-amber-600", chipClass: "bg-amber-100" },
  error: { icon: AlertCircle, iconClass: "text-red-600", chipClass: "bg-red-100" },
  info: { icon: Info, iconClass: "text-blue-600", chipClass: "bg-blue-100" }
};

export const getNotificationMeta = (typeOrItem, maybeTitle) => {
  let type = typeof typeOrItem === "string" ? typeOrItem : typeOrItem?.type;
  let title = (typeof typeOrItem === "object" ? typeOrItem?.title : maybeTitle) || "";
  const rawTitle = title.toLowerCase();

  const base = TYPE_META[type] || TYPE_META.info;
  let icon = base.icon;
  let iconClass = base.iconClass;
  let chipClass = base.chipClass;

  if (rawTitle.includes("message") || type === "message") {
    icon = MessageSquare;
    iconClass = "text-sky-600";
    chipClass = "bg-sky-100";
  } else if (rawTitle.includes("inquiry") || type === "new_inquiry" || type === "inquiry_updated") {
    icon = rawTitle.includes("review") ? Eye : FileText;
    iconClass = "text-blue-600";
    chipClass = "bg-blue-100";
  } else if (rawTitle.includes("quote") || rawTitle.includes("quotation") || type === "quotation") {
    icon = Receipt;
    iconClass = "text-indigo-600";
    chipClass = "bg-indigo-100";
    if (rawTitle.includes("accept") || rawTitle.includes("confirm")) {
      icon = CheckCircle2;
      iconClass = "text-emerald-600";
      chipClass = "bg-emerald-100";
    } else if (rawTitle.includes("decline") || rawTitle.includes("reject")) {
      icon = XCircle;
      iconClass = "text-red-600";
      chipClass = "bg-red-100";
    }
  } else if (rawTitle.includes("payment") || rawTitle.includes("fee") || rawTitle.includes("refund") || type === "payment") {
    icon = Wallet;
    iconClass = "text-emerald-600";
    chipClass = "bg-emerald-100";
    if (rawTitle.includes("fail") || rawTitle.includes("error")) {
      icon = AlertCircle;
      iconClass = "text-red-600";
      chipClass = "bg-red-100";
    } else if (rawTitle.includes("due") || rawTitle.includes("require") || rawTitle.includes("unsettled")) {
      icon = AlertTriangle;
      iconClass = "text-amber-600";
      chipClass = "bg-amber-100";
    }
  } else if (rawTitle.includes("booking") || rawTitle.includes("revision") || rawTitle.includes("proposal") || type === "revision_requested") {
    icon = rawTitle.includes("revision") || rawTitle.includes("proposal") ? Edit : ClipboardList;
    iconClass = "text-purple-600";
    chipClass = "bg-purple-100";
    if (rawTitle.includes("confirm")) {
      icon = CheckCircle2;
      iconClass = "text-emerald-600";
      chipClass = "bg-emerald-100";
    } else if (rawTitle.includes("cancel")) {
      icon = XCircle;
      iconClass = "text-red-600";
      chipClass = "bg-red-100";
    }
  } else if (rawTitle.includes("ocular") || rawTitle.includes("inspection") || rawTitle.includes("visit")) {
    icon = MapPin;
    iconClass = "text-teal-600";
    chipClass = "bg-teal-100";
  } else if (rawTitle.includes("upcoming") || rawTitle.includes("reminder") || rawTitle.includes("deadline")) {
    icon = Clock;
    iconClass = "text-amber-600";
    chipClass = "bg-amber-100";
  }

  return { icon, iconClass, chipClass };
};

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

// Formats a backend notification for UI presentation.
// CRITICAL: NEVER overwrite item.title or item.body! The backend generates
// audience-specific copy (admin vs customer) containing vital IDs and context.
export const formatNotification = (item) => {
  const meta = getNotificationMeta(item);
  const rawTitle = (item?.title || "").toLowerCase();
  const rawBody = (item?.body || "").toLowerCase();
  
  let cta = null;
  if (rawTitle.includes("quote") || rawTitle.includes("quotation")) {
    if (rawTitle.includes("ready") || rawTitle.includes("received") || rawTitle.includes("sent")) {
      cta = "Review Quotation →";
    } else if (rawTitle.includes("revis") || rawTitle.includes("update") || rawTitle.includes("change")) {
      cta = "Review Changes →";
    }
  } else if (rawTitle.includes("inquiry")) {
    cta = "View Inquiry →";
  } else if (rawTitle.includes("booking")) {
    cta = "View Booking →";
  } else if (rawTitle.includes("payment")) {
    if (rawTitle.includes("due") || rawTitle.includes("require") || rawTitle.includes("fail")) {
      cta = "Make Payment →";
    } else if (rawTitle.includes("approved") || rawTitle.includes("received") || rawTitle.includes("success")) {
      cta = "View Receipt →";
    }
  } else if (rawTitle.includes("message")) {
    cta = "View Message →";
  } else if (rawTitle.includes("ocular")) {
    cta = "View Details →";
  }

  return {
    ...item,
    title: item.title,
    body: item.body,
    formattedTitle: item.title,
    formattedBody: item.body,
    icon: meta.icon,
    iconClass: meta.iconClass,
    chipClass: meta.chipClass,
    cta
  };
};

// Backwards-compatible export
export const formatCustomerNotification = formatNotification;


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

/**
 * Evaluates whether a notification is relevant to the user's role and responsibilities.
 * Enforces established authorization boundaries and recipient rules.
 */
export const isNotificationRelevantForRole = (item, role) => {
  if (!item) return false;
  if (role !== "manager") return true;

  // --- Manager Portal Role Authorization Rules ---
  // 1. Chat / Messages are strictly admin-only:
  if (item.meta?.conversation_id) return false;
  if (typeof item.link === "string" && /^\/admin\/messages(\/|$)/i.test(item.link)) return false;

  // 2. Payments & Billing are strictly admin-only:
  if (item.meta?.payment_id) return false;
  if (typeof item.link === "string" && /^\/admin\/(payments|refunds)(\/|$)/i.test(item.link)) return false;

  // 3. Inventory management is strictly admin-only:
  if (item.meta?.inventory_id) return false;
  if (typeof item.link === "string" && /^\/admin\/inventory(\/|$)/i.test(item.link)) return false;

  // 4. Staff administration, System logs, Analytics, and Inquiries are strictly admin-only:
  if (typeof item.link === "string" && /^\/admin\/(staff|managers|analytics|logs|business-info|quotes|bookings\/inquiries|bookings\/calendar|bookings\/history)(\/|$)/i.test(item.link)) {
    return false;
  }

  // 5. Exclude strictly admin titles / actions
  const title = String(item.title || "").toLowerCase();
  const body = String(item.body || "").toLowerCase();
  if (
    title.includes("payment") ||
    title.includes("refund") ||
    title.includes("low stock") ||
    title.includes("customer message") ||
    title.includes("new inquiry") ||
    title.includes("quotation") ||
    body.includes("refund of ₱")
  ) {
    return false;
  }

  // 6. Relevant manager notifications (direct manager assignments, assigned event operations):
  return true;
};


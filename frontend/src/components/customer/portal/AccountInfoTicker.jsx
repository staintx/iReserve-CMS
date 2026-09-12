import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CustomerAPI } from "../../../api/customer";
import useAuth from "../../../hooks/useAuth";
import useRealTimeRefresh from "../../../hooks/useRealTimeRefresh";
import { formatCurrency, parseLocalDate } from "../../../utils/format";
import { recordTitle } from "./statusMeta";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  CalendarCheck,
  Calendar,
  FileText,
  Clock,
  Sparkles,
  MessageSquare,
} from "lucide-react";

/**
 * Formats a Date/string into "Month Day, Year", e.g. "September 15, 2026".
 * Uses local date parsing to avoid UTC day-shift bugs.
 */
function formatLongDate(dateVal) {
  if (!dateVal) return "";
  const parsed = parseLocalDate(dateVal);
  if (!parsed) return "";
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const badgeToneStyles = {
  amber: "bg-amber-50 text-amber-800 border-amber-300/70",
  emerald: "bg-emerald-50 text-emerald-800 border-emerald-300/70",
  blue: "bg-[#2C4B8A]/10 text-[#2C4B8A] border-[#2C4B8A]/25",
  indigo: "bg-indigo-50 text-indigo-800 border-indigo-300/70",
  purple: "bg-purple-50 text-purple-800 border-purple-300/70",
  gold: "bg-[#D2B67C]/20 text-[#7A5A1A] border-[#D2B67C]/40",
};

export default function AccountInfoTicker() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [inquiries, setInquiries] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const fetchCustomerAccountData = useCallback(async () => {
    try {
      const [inqRes, bookRes, payRes, convoRes] = await Promise.all([
        CustomerAPI.getInquiries().catch(() => ({ data: [] })),
        CustomerAPI.getBookings().catch(() => ({ data: [] })),
        CustomerAPI.getPayments().catch(() => ({ data: [] })),
        CustomerAPI.getConversations().catch(() => ({ data: [] })),
      ]);

      setInquiries(inqRes.data || []);
      setBookings(bookRes.data || []);
      setPayments(payRes.data || []);

      const convos = convoRes.data || [];
      const unread = convos.filter((c) => {
        const p = c.participants?.find(
          (part) => String(part.user._id || part.user) === String(user?._id)
        );
        return p && p.unread_count > 0;
      }).length;
      setUnreadMessages(unread);
    } catch {
      // silent fallback
    } finally {
      setLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    fetchCustomerAccountData();
  }, [fetchCustomerAccountData]);

  useRealTimeRefresh(fetchCustomerAccountData);

  // Generate dynamic, prioritized ticker items from actual customer account data
  const tickerItems = useMemo(() => {
    const items = [];
    const now = new Date();

    // ── 1. Important Payment / Balance Reminder (Priority 1) ──
    const totalBalanceDue = bookings.reduce((sum, b) => {
      const status = (b.status || "").toLowerCase();
      if (["cancelled", "refunded"].includes(status)) return sum;
      const total = Number(b.total_price || 0);
      const paid = payments
        .filter(
          (p) =>
            String(p.booking_id?._id || p.booking_id) === String(b._id) &&
            p.status === "approved"
        )
        .reduce((pSum, p) => pSum + (Number(p.amount) || 0), 0);
      return sum + Math.max(0, total - paid);
    }, 0);

    if (totalBalanceDue > 0) {
      items.push({
        id: "balance-due",
        type: "payment",
        badge: "Balance Due",
        badgeTone: "amber",
        icon: CreditCard,
        text: `Your remaining balance is ${formatCurrency(totalBalanceDue)}.`,
        link: "/customer/bookings",
      });
    }

    // Deposit payment pending for accepted bookings
    const depositNeededBookings = bookings.filter((b) => {
      const s = (b.status || "").toLowerCase();
      return (
        s === "pending deposit" ||
        s === "deposit pending" ||
        s === "customer_accepted"
      );
    });

    depositNeededBookings.forEach((b) => {
      const title = recordTitle(b) || "booking";
      items.push({
        id: `deposit-due-${b._id}`,
        type: "payment",
        badge: "Deposit Due",
        badgeTone: "amber",
        icon: CreditCard,
        text: `Deposit payment required to confirm your ${title} booking.`,
        link: `/customer/bookings/${b._id}`,
      });
    });

    // ── 2. Upcoming & Active Bookings (Priority 2 & 5) ──
    const activeBookings = bookings.filter((b) => {
      const s = (b.status || "").toLowerCase();
      return !["cancelled", "refunded"].includes(s);
    });

    const confirmedBookings = activeBookings.filter((b) => {
      const s = (b.status || "").toLowerCase();
      return [
        "confirmed",
        "ready for event",
        "converted to booking",
        "preparing",
        "ongoing",
        "ocular scheduled",
      ].includes(s);
    });

    confirmedBookings.forEach((b) => {
      const dateStr = formatLongDate(b.event_date);
      const title = recordTitle(b) || "event";
      const eventDate = parseLocalDate(b.event_date);
      const isFuture = eventDate && eventDate >= now;

      // Confirmed booking message
      items.push({
        id: `booking-confirmed-${b._id}`,
        type: "booking",
        badge: "Confirmed",
        badgeTone: "emerald",
        icon: CalendarCheck,
        text: dateStr
          ? `Your booking for ${dateStr} is confirmed and reserved.`
          : `Your ${title} booking is confirmed and reserved.`,
        link: `/customer/bookings/${b._id}`,
      });

      // Upcoming event reminder
      if (isFuture && dateStr) {
        items.push({
          id: `upcoming-event-${b._id}`,
          type: "event",
          badge: "Upcoming Event",
          badgeTone: "blue",
          icon: Calendar,
          text: `You have an upcoming event on ${dateStr}.`,
          link: `/customer/bookings/${b._id}`,
        });
      }

      // Site inspection / ocular visit reminder
      if (
        b.ocular_visit?.status === "scheduled" &&
        b.ocular_visit?.scheduled_date
      ) {
        const ocularDateStr = formatLongDate(b.ocular_visit.scheduled_date);
        items.push({
          id: `ocular-scheduled-${b._id}`,
          type: "ocular",
          badge: "Site Visit",
          badgeTone: "purple",
          icon: Sparkles,
          text: `Site inspection for ${title} is scheduled for ${ocularDateStr}.`,
          link: `/customer/bookings/${b._id}`,
        });
      }
    });

    // ── 3. Inquiry Status & Quotation Updates (Priority 3 & 4) ──
    const activeInquiries = inquiries.filter(
      (i) =>
        !["Converted to Booking", "Cancelled", "Quote Rejected"].includes(
          i.status
        )
    );

    activeInquiries.forEach((i) => {
      const title = recordTitle(i) || i.event_type || "Event";
      const dateStr = formatLongDate(i.event_date);

      if (i.status === "Quotation Sent") {
        items.push({
          id: `quote-ready-${i._id}`,
          type: "quotation",
          badge: "Quotation Ready",
          badgeTone: "indigo",
          icon: FileText,
          text: "Your quotation is ready for review.",
          link: `/customer/inquiries/${i._id}`,
        });
      } else if (
        ["Quote Accepted", "Awaiting Final Confirmation"].includes(i.status)
      ) {
        items.push({
          id: `quote-accepted-${i._id}`,
          type: "inquiry",
          badge: "Quote Accepted",
          badgeTone: "emerald",
          icon: CalendarCheck,
          text: `Your quotation for ${title} is accepted and pending final confirmation.`,
          link: `/customer/inquiries/${i._id}`,
        });
      } else if (i.status === "Revision Requested") {
        items.push({
          id: `quote-revision-${i._id}`,
          type: "inquiry",
          badge: "Revision In Progress",
          badgeTone: "amber",
          icon: Clock,
          text: `Revision in progress for your ${title} quotation.`,
          link: `/customer/inquiries/${i._id}`,
        });
      } else {
        // Pending Review / Under Review
        items.push({
          id: `inquiry-scheduled-${i._id}`,
          type: "inquiry",
          badge: "Inquiry Update",
          badgeTone: "amber",
          icon: Clock,
          text: dateStr
            ? `Your ${title} inquiry is scheduled for ${dateStr}.`
            : `Your ${title} inquiry is currently under review by our catering team.`,
          link: `/customer/inquiries/${i._id}`,
        });
      }
    });

    // ── 4. Unread Messages from Staff (Priority 6) ──
    if (unreadMessages > 0) {
      items.push({
        id: "unread-messages",
        type: "messages",
        badge: "New Message",
        badgeTone: "blue",
        icon: MessageSquare,
        text: `You have ${unreadMessages} new message${
          unreadMessages > 1 ? "s" : ""
        } from our catering staff.`,
        link: "/customer/messages",
      });
    }

    // ── 5. Welcome Fallback if account has no active records ──
    if (items.length === 0) {
      items.push({
        id: "welcome-notice",
        type: "welcome",
        badge: "Customer Portal",
        badgeTone: "gold",
        icon: Sparkles,
        text: "Welcome to Caezelle's Catering. Track your bookings, quote requests, and event schedule in one place.",
        link: "/customer/book",
      });
    }

    return items;
  }, [inquiries, bookings, payments, unreadMessages]);

  // Slower, relaxed animation duration so text is very easy and comfortable to read
  const duration = useMemo(() => {
    return Math.max(55, tickerItems.length * 24);
  }, [tickerItems.length]);

  if (!loaded && tickerItems.length === 0) {
    return (
      <div className="flex-1 min-w-0 h-9 flex items-center justify-center">
        <div className="w-24 h-2 bg-slate-100 rounded-full animate-pulse" />
      </div>
    );
  }

  const renderTickerItem = (item, idx, prefix) => (
    <div
      key={`${prefix}-${item.id}-${idx}`}
      onClick={() => item.link && navigate(item.link)}
      className={cn(
        "inline-flex items-center gap-2 group/item transition-colors",
        item.link && "cursor-pointer hover:opacity-85"
      )}
      title={item.link ? "Click to view details" : undefined}
    >
      {/* Category Pill Badge */}
      {item.badge && (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase shadow-2xs shrink-0 border",
            badgeToneStyles[item.badgeTone] || badgeToneStyles.blue
          )}
        >
          {item.icon && <item.icon className="w-3 h-3 shrink-0" />}
          <span className="truncate max-w-[130px]">{item.badge}</span>
        </span>
      )}

      {/* Message Text */}
      <span className="text-xs sm:text-[13px] font-medium text-slate-700 whitespace-nowrap group-hover/item:text-[#2C4B8A] transition-colors">
        {item.text}
      </span>

      {/* Visual Divider / Separator */}
      <span
        className="text-[#D2B67C] font-semibold text-xs select-none opacity-80 px-2 sm:px-3"
        aria-hidden="true"
      >
        ✦
      </span>
    </div>
  );

  return (
    <div
      className="relative flex-1 min-w-0 h-10 overflow-hidden flex items-center select-none"
      style={{
        maskImage:
          "linear-gradient(to right, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 40px, black calc(100% - 40px), transparent 100%)",
      }}
      title="Hover to pause ticker · Click an update to view details"
    >
      {/* Left Edge Fade Overlay (ensures smooth fade-out on all browsers) */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-r from-white via-white/80 to-transparent z-10" />

      {/* Continuous Right-to-Left Moving Belt */}
      <div
        className="animate-account-ticker pl-[100%] flex items-center shrink-0 cursor-pointer"
        style={{ animationDuration: `${duration}s` }}
      >
        {/* First track set */}
        <div className="flex items-center gap-3 sm:gap-4 pr-3 sm:pr-4 shrink-0">
          {tickerItems.map((item, idx) => renderTickerItem(item, idx, "track-a"))}
        </div>
        {/* Second track set for continuous seamless loop */}
        <div
          className="flex items-center gap-3 sm:gap-4 pr-3 sm:pr-4 shrink-0"
          aria-hidden="true"
        >
          {tickerItems.map((item, idx) => renderTickerItem(item, idx, "track-b"))}
        </div>
      </div>

      {/* Right Edge Fade Overlay (ensures smooth fade-in from the right) */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-white via-white/80 to-transparent z-10" />
    </div>
  );
}

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import OcularDatePickerModal from "../../components/customer/OcularDatePickerModal";
import PaymentChoiceModal from "../../components/customer/PaymentChoiceModal";
import InvoiceModal from "../../components/common/invoice/InvoiceModal";
import useBusinessInfo from "../../hooks/useBusinessInfo";
import { createConversation } from "../../api/messages";
import { isOcularEligibleBooking } from "../../utils/ocularEligibility";
import { getBookingOcularActionMeta } from "../../utils/ocularStatusHelper";
import { CustomerAPI } from "../../api/customer";
import useToast from "../../hooks/useToast";
import { getEventThumbnail } from "../../utils/eventThumbnails";
import { Button } from "../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu";
import {
  bookingStatusGroup,
  bookingStatusMeta,
  recordTitle,
  resolveServiceType,
  isFoodOnly,
} from "../../components/customer/portal/statusMeta";
import { isSpecialOffer } from "../../lib/specialOffers";
import { formatCurrency, formatEventDateWithDay, formatShortDate } from "../../utils/format";
import { cn } from "@/lib/utils";
import {
  Plus,
  CreditCard,
  Search,
  XCircle,
  ChevronDown,
  ChevronRight,
  MapPin,
  Users,
  Calendar,
  Utensils,
  FileText,
  ArrowLeft,
  SlidersHorizontal,
  Check,
  Package,
  CalendarClock,
  Eye,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function CustomerBookings() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { businessInfo } = useBusinessInfo();

  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [packages, setPackages] = useState([]);
  const [_menuCatalog, setMenuCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters, Search, Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Mobile View Toggle: 'list' | 'detail'
  const [mobileView, setMobileView] = useState("list");

  // Selected Booking for Overview Pane
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  // Ocular Modal State
  const [requestingOcularBooking, setRequestingOcularBooking] = useState(null);
  const [isSubmittingOcular, setIsSubmittingOcular] = useState(false);

  // Invoice Modal State
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  // Payment Choice Modal State (for balance payments)
  const [choiceModalBooking, setChoiceModalBooking] = useState(null);
  const [choiceModalOpen, setChoiceModalOpen] = useState(false);

  const submitOcularRequest = async (selectedDate, selectedTime) => {
    if (!requestingOcularBooking?._id) return;
    try {
      setIsSubmittingOcular(true);
      await CustomerAPI.requestOcular(requestingOcularBooking._id, {
        scheduled_date: selectedDate,
        scheduled_time: selectedTime,
      });
      notify("Ocular visit requested successfully!", "success");
      setRequestingOcularBooking(null);
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to request ocular visit.", "error");
    } finally {
      setIsSubmittingOcular(false);
    }
  };

  const isFetchingRef = useRef(false);

  const loadData = useCallback(async (isBackground = false) => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      if (!isBackground) setLoading(true);
      const [bRes, pRes, pkgRes, menuRes] = await Promise.all([
        CustomerAPI.getBookings(),
        CustomerAPI.getPayments(),
        CustomerAPI.getPackages(),
        CustomerAPI.getMenu().catch(() => ({ data: [] })),
      ]);
      setBookings(bRes.data || []);
      setPayments(pRes.data || []);
      setPackages(pkgRes.data || []);
      setMenuCatalog(menuRes.data || []);
    } catch (err) {
      if (err?.response?.status !== 429 && !isBackground) {
        notify("Failed to load booking details.", "error", { id: "customer-bookings-load-error" });
      }
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Outstanding balance per booking
  const balanceOf = useMemo(() => {
    return (booking) => {
      if (!booking) return 0;
      const total = Number(booking.total_price || 0);
      const rawPaid = payments
        .filter(
          (p) =>
            String(p.booking_id?._id || p.booking_id) === String(booking._id) &&
            p.status === "approved"
        )
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const paid = total > 0 ? Math.min(rawPaid, total) : rawPaid;
      return Math.max(0, total - paid);
    };
  }, [payments]);

  // Filtered & Sorted Bookings List
  const filteredBookings = useMemo(() => {
    return bookings
      .filter((booking) => {
        if (statusFilter !== "all" && bookingStatusGroup(booking) !== statusFilter) {
          return false;
        }
        if (serviceTypeFilter !== "all" && resolveServiceType(booking) !== serviceTypeFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const ref = (booking.reference || "").toLowerCase();
          const type = (booking.event_type || "").toLowerCase();
          const name = `${booking.contact_first_name || ""} ${booking.contact_last_name || ""}`.toLowerCase();
          const city = (booking.municipality || booking.province || "").toLowerCase();

          return ref.includes(q) || type.includes(q) || name.includes(q) || city.includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") {
          const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return timeA - timeB;
        }
        if (sortBy === "date") {
          const timeA = new Date(a.event_date || 0).getTime();
          const timeB = new Date(b.event_date || 0).getTime();
          return timeA - timeB;
        }
        // Default: newest
        const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return timeB - timeA;
      });
  }, [bookings, statusFilter, serviceTypeFilter, searchQuery, sortBy]);

  const isFiltered = Boolean(searchQuery.trim()) || statusFilter !== "all" || serviceTypeFilter !== "all";

  // Dynamically derive configured Combo Pack names from packages and existing bookings
  const comboPackNames = useMemo(() => {
    const names = new Set();
    (packages || []).forEach((pkg) => {
      if (pkg.offer_type === "special" || isSpecialOffer(pkg)) {
        if (pkg.name) names.add(pkg.name);
      }
    });
    (bookings || []).forEach((bkg) => {
      const isSpecial =
        bkg.booking_type === "special" ||
        bkg.package_id?.offer_type === "special" ||
        bkg.event_type === "Special Offer Catering" ||
        Boolean(bkg.package_id?.is_special_offer) ||
        (Array.isArray(bkg.offer_food_snapshot) && bkg.offer_food_snapshot.length > 0);
      if (isSpecial) {
        const name = bkg.package_name_snapshot || bkg.package_id?.name || bkg.package_name;
        if (name) names.add(name);
      }
    });
    return Array.from(names);
  }, [packages, bookings]);

  // Dynamically derive package service options from bookings and packages
  const packageServiceOptions = useMemo(() => {
    const options = new Set();
    (packages || []).forEach((pkg) => {
      if (pkg.offer_type !== "special" && !isSpecialOffer(pkg) && pkg.name) {
        options.add(pkg.name);
        options.add(`${pkg.name} + Menu`);
      }
    });
    (bookings || []).forEach((bkg) => {
      const st = resolveServiceType(bkg);
      if (st && !st.startsWith("Custom Quote -") && !comboPackNames.includes(st)) {
        options.add(st);
      }
    });
    return Array.from(options);
  }, [packages, bookings, comboPackNames]);

  // Auto-select first booking for desktop pane
  useEffect(() => {
    if (filteredBookings.length > 0) {
      if (!selectedBookingId || !filteredBookings.some((b) => b._id === selectedBookingId)) {
        setSelectedBookingId(filteredBookings[0]._id);
      }
    } else {
      setSelectedBookingId(null);
    }
  }, [filteredBookings, selectedBookingId]);

  const selectedBooking = useMemo(() => {
    return bookings.find((b) => b._id === selectedBookingId) || filteredBookings[0] || null;
  }, [bookings, filteredBookings, selectedBookingId]);

  const handleSelectBooking = (id) => {
    setSelectedBookingId(id);
    setMobileView("detail");
  };

  const startCheckout = async (booking) => {
    const amount = balanceOf(booking);
    if (amount <= 0) {
      notify("This booking is fully paid.", "info");
      return;
    }
    const isDeposit = (booking.status || "").toLowerCase().includes("deposit");
    if (!isDeposit) {
      // Final / remaining balance payment: present choice of Online vs In-Person
      setChoiceModalBooking(booking);
      setChoiceModalOpen(true);
      return;
    }

    // Deposit payment: direct online checkout to lock the booking date
    try {
      notify("Generating checkout session for deposit payment...", "info");
      const checkoutRes = await CustomerAPI.createPaymentCheckout({
        booking_id: booking._id,
        amount,
        payment_type: "deposit",
      });

      if (checkoutRes.data?.checkout_url) {
        notify("Redirecting to PayMongo checkout...", "success");
        window.location.assign(checkoutRes.data.checkout_url);
      } else {
        notify("Could not generate payment URL.", "error");
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to start payment checkout.", "error");
    }
  };

  const handleOpenChat = async (booking) => {
    if (!booking?._id) return;
    try {
      setIsOpeningChat(true);
      const res = await createConversation({ booking_id: booking._id });
      if (res.data?._id) {
        navigate(`/customer/messages?conversation=${res.data._id}`);
      } else {
        navigate("/customer/messages");
      }
    } catch {
      navigate("/customer/messages");
    } finally {
      setIsOpeningChat(false);
    }
  };

  // Helper: Event Countdown string
  const getEventCountdown = (dateString) => {
    if (!dateString) return null;
    const target = new Date(dateString);
    const now = new Date();
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: "Past Event", tone: "neutral", days: diffDays };
    if (diffDays === 0) return { label: "Happening Today!", tone: "urgent", days: 0 };
    if (diffDays === 1) return { label: "Tomorrow!", tone: "warning", days: 1 };
    if (diffDays <= 7) return { label: `In ${diffDays} days`, tone: "warning", days: diffDays };
    if (diffDays <= 30) return { label: `In ${diffDays} days`, tone: "info", days: diffDays };
    return { label: `In ${diffDays} days`, tone: "neutral", days: diffDays };
  };

  // High-Clarity Next Action Resolver for Bookings
  const getNextActionInfo = (bkg) => {
    if (!bkg) return null;
    const bal = balanceOf(bkg);
    const rawStatus = (bkg.status || "").toLowerCase();
    const ocularMeta = getBookingOcularActionMeta(bkg);
    const isDepositNeeded = rawStatus.includes("deposit") || (bkg.payment_status === "deposit_pending" && bal > 0);
    const isPendingRevision = bkg.pending_revision && ["pending_customer_approval"].includes(bkg.pending_revision.status);
    const isUnderReview = bkg.change_request && bkg.change_request.status === "pending";

    // 1. Revision proposal awaiting customer approval
    if (isPendingRevision) {
      return {
        state: "action_required",
        badge: "Action Required",
        badgeClass: "bg-amber-100 text-amber-900 border-amber-300 font-bold",
        title: "Revised Booking Proposal Awaiting Your Confirmation",
        description: "An updated proposal with revised pricing or setup details is ready for your review.",
        actionType: "proposal",
        actionLabel: "Review Proposal",
      };
    }

    // 2. Deposit needed
    if (isDepositNeeded) {
      return {
        state: "action_required",
        badge: "Action Required: Deposit",
        badgeClass: "bg-amber-100 text-amber-900 border-amber-300 font-bold",
        title: "Pay Reservation Deposit to Secure Your Event Date",
        description: "Your booking request is approved. Complete your deposit to lock in our kitchen and setup team.",
        actionType: "deposit",
        actionLabel: "Pay Deposit Now",
      };
    }

    // 3. Ocular Inspection needed
    if (ocularMeta && ocularMeta.state === "action_required") {
      return {
        state: "action_required",
        badge: "Action Required: Ocular",
        badgeClass: "bg-orange-100 text-orange-900 border-orange-300 font-bold",
        title: "Schedule Your Venue Ocular Visit",
        description: "Choose a preferred date for our team to inspect venue logistics and layout.",
        actionType: "ocular",
        actionLabel: "Schedule Ocular",
      };
    }

    // 4. Ocular requested / awaiting admin confirmation
    if (ocularMeta && ocularMeta.state === "requested") {
      return {
        state: "in_progress",
        badge: "Site Visit Requested",
        badgeClass: "bg-blue-100 text-blue-900 border-blue-200 font-semibold",
        title: "Site Visit Requested — Pending Admin Confirmation",
        description: `Requested schedule: ${ocularMeta.scheduled_date ? formatShortDate(ocularMeta.scheduled_date) : "Pending confirmation"}. Our team will confirm shortly.`,
        actionType: "ocular_reschedule",
        actionLabel: "Reschedule Ocular",
      };
    }

    // 5. Ocular scheduled
    if (ocularMeta && ocularMeta.state === "scheduled") {
      return {
        state: "in_progress",
        badge: "Site Visit Scheduled",
        badgeClass: "bg-blue-100 text-blue-900 border-blue-200 font-semibold",
        title: `Site Ocular Visit Confirmed for ${ocularMeta.scheduled_date ? formatShortDate(ocularMeta.scheduled_date) : "agreed date"}`,
        description: "Our catering and staging team will meet you at the venue on the scheduled date.",
        actionType: "view",
        actionLabel: "View Details",
      };
    }

    // 6. Change request under admin review
    if (isUnderReview) {
      return {
        state: "in_progress",
        badge: "Change Under Review",
        badgeClass: "bg-blue-50 text-blue-800 border-blue-200/80 font-semibold",
        title: "Proposed Changes Under Review by Catering Admin",
        description: "Our team is reviewing your requested date, guest, or venue updates.",
        actionType: "view",
        actionLabel: "View Details",
      };
    }

    // 7. Balance owed before or on event day
    if (bal > 0 && ["confirmed", "converted to booking", "preparing", "ready for event", "ongoing"].includes(rawStatus)) {
      const isCash = bkg.balance_payment_preference === "in_person";
      return {
        state: "balance_due",
        badge: isCash ? "Cash on Event Day" : "Balance Due",
        badgeClass: isCash ? "bg-amber-100 text-amber-900 border-amber-300 font-semibold" : "bg-amber-50 text-amber-900 border-amber-200 font-semibold",
        title: `Remaining Balance: ${formatCurrency(bal)}`,
        description: isCash
          ? "You elected cash on event day. Due the same day after event completion to your Event Manager."
          : "Remaining balance is due the same day after your event has been completed (payable online or in cash).",
        actionType: "balance",
        actionLabel: isCash ? `Manage Payment (${formatCurrency(bal)})` : `Pay Balance (${formatCurrency(bal)})`,
      };
    }

    // 8. Confirmed & fully paid
    if (["confirmed", "converted to booking", "preparing", "ready for event", "ongoing"].includes(rawStatus) && bal <= 0) {
      const isFood = isFoodOnly(resolveServiceType(bkg));
      return {
        state: "all_set",
        badge: "Confirmed & Reserved",
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold",
        title: "All Set! Everything is Paid & Ready",
        description: isFood
          ? "Your order is confirmed. Dishes are scheduled for kitchen preparation and dispatch on your event date."
          : "Your event reservation is fully secured. Our styling and culinary teams are preparing all requirements.",
        actionType: "view",
        actionLabel: "View Full Details",
      };
    }

    // 9. Completed
    if (["completed", "event completed"].includes(rawStatus)) {
      if (bal > 0) {
        const isCash = bkg.balance_payment_preference === "in_person";
        return {
          state: "balance_due",
          badge: isCash ? "Cash Due (Completed)" : "Balance Due Today",
          badgeClass: "bg-amber-100 text-amber-900 border-amber-300 font-semibold",
          title: `Event Concluded · Remaining Balance: ${formatCurrency(bal)}`,
          description: isCash
            ? "Your event has completed! Please hand the remaining cash to your Event Manager or settle online."
            : "Your event has completed today! Please settle your remaining balance online or with your Event Manager.",
          actionType: "balance",
          actionLabel: `Settle Balance (${formatCurrency(bal)})`,
        };
      }
      return {
        state: "completed",
        badge: "Event Completed",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-300 font-medium",
        title: "Event Successfully Concluded",
        description: "Thank you for choosing Caezelle's Catering! View your event invoice or rate your experience.",
        actionType: "view",
        actionLabel: "View Details",
      };
    }

    // 10. Cancelled
    if (rawStatus === "cancelled") {
      return {
        state: "cancelled",
        badge: "Cancelled",
        badgeClass: "bg-rose-100 text-rose-800 border-rose-200 font-semibold",
        title: "Reservation Cancelled",
        description: "This booking was cancelled. Message our support team if you would like to rebook.",
        actionType: "view",
        actionLabel: "View Details",
      };
    }

    // Default fallback
    return {
      state: "neutral",
      badge: "Reserved",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200 font-medium",
      title: "Booking Active",
      description: "Your reservation is registered in our catering portal.",
      actionType: "view",
      actionLabel: "View Details",
    };
  };

  // Modern High-Contrast Status Badge
  const renderStatusBadge = (bkg) => {
    const bal = balanceOf(bkg);
    const meta = bookingStatusMeta(bkg, { balance: bal });
    let badgeClass = "bg-emerald-50 text-emerald-800 border-emerald-300";

    if (meta.tone === "warning") {
      badgeClass = "bg-amber-50 text-amber-900 border-amber-300";
    } else if (meta.tone === "info") {
      badgeClass = "bg-blue-50 text-blue-800 border-blue-300";
    } else if (meta.tone === "danger") {
      badgeClass = "bg-rose-50 text-rose-800 border-rose-300";
    } else if (meta.tone === "neutral") {
      badgeClass = "bg-slate-100 text-slate-800 border-slate-300";
    }

    return (
      <span
        className={cn(
          "px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide border inline-flex items-center gap-1.5 shrink-0 select-none",
          badgeClass
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        <span>{meta.label}</span>
      </span>
    );
  };

  // 4-Step Catering Journey active step index (0-3)
  const activeBookingStep = useMemo(() => {
    if (!selectedBooking) return 2;
    const statusLower = (selectedBooking.status || "").toLowerCase();
    if (["completed", "event completed"].includes(statusLower)) return 3;
    if (["preparing", "ongoing", "ready for event"].includes(statusLower)) return 2;
    if (["confirmed", "converted to booking", "ocular scheduled"].includes(statusLower)) return 2;
    if (statusLower.includes("deposit")) return 1;
    return 2;
  }, [selectedBooking]);

  return (
    <CustomerDashboardLayout fullBleed>
      <div className="h-[calc(100vh-3.5rem)] w-full bg-[#F8FAFC] flex flex-col font-sans antialiased overflow-hidden">
        {/* TOP PAGE HEADER */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-sans">
              My Bookings
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Track confirmed event reservations, monitor preparation progress, and access event details.
            </p>
          </div>

          <Button
            onClick={() => navigate("/packages")}
            className="bg-[#1E3563] hover:bg-[#152547] text-white shadow-xs rounded-lg font-semibold text-xs h-9 px-4 shrink-0 cursor-pointer transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>New Request</span>
          </Button>
        </div>

        {/* WORKSPACE AREA: TWO-COLUMN MASTER/DETAIL */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row p-4 sm:p-6 gap-5 sm:gap-6 w-full">
          {/* LEFT LIST SECTION: CARDS & SEARCH/FILTERS */}
          <div
            className={cn(
              "flex-1 min-w-0 flex flex-col space-y-3.5 overflow-hidden",
              mobileView === "detail" ? "hidden md:flex" : "flex"
            )}
          >
            {/* SEARCH & FILTERS CONTROLS */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by event name, reference, venue..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white text-xs text-slate-900 placeholder:text-slate-500 rounded-lg border border-slate-200 focus:border-[#1E3563] focus:ring-2 focus:ring-[#1E3563]/10 outline-none transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label="Clear search"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Controls */}
              <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
                {/* Status Dropdown Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold px-3 rounded-lg shadow-2xs gap-1.5 cursor-pointer shrink-0"
                    >
                      <span>
                        {statusFilter === "all"
                          ? "All Bookings"
                          : statusFilter === "confirmed"
                            ? "Confirmed"
                            : statusFilter === "deposit_needed"
                              ? "Deposit Needed"
                              : statusFilter === "completed"
                                ? "Completed"
                                : "Cancelled"}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5 shadow-lg border-slate-200">
                    <DropdownMenuLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
                      Filter Status
                    </DropdownMenuLabel>
                    {[
                      { id: "all", label: "All Bookings" },
                      { id: "confirmed", label: "Confirmed & Reserved" },
                      { id: "deposit_needed", label: "Deposit Needed" },
                      { id: "completed", label: "Completed" },
                      { id: "cancelled", label: "Cancelled" },
                    ].map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => setStatusFilter(item.id)}
                        className={cn(
                          "text-xs font-medium px-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                          statusFilter === item.id ? "bg-[#1E3563]/10 text-[#1E3563] font-bold" : "text-slate-700"
                        )}
                      >
                        <span>{item.label}</span>
                        {statusFilter === item.id && <Check className="w-3.5 h-3.5 text-[#1E3563]" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Service Type Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold px-3 rounded-lg shadow-2xs gap-1.5 cursor-pointer shrink-0",
                        serviceTypeFilter !== "all" && "bg-blue-50 text-[#1E3563] border-blue-200"
                      )}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#1E3563]" />
                      <span>{serviceTypeFilter === "all" ? "All Services" : serviceTypeFilter}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5 shadow-lg border-slate-200 max-h-96 overflow-y-auto [scrollbar-width:thin]">
                    <DropdownMenuItem
                      onClick={() => setServiceTypeFilter("all")}
                      className={cn(
                        "text-xs font-medium px-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                        serviceTypeFilter === "all" ? "bg-[#1E3563]/10 text-[#1E3563] font-bold" : "text-slate-700"
                      )}
                    >
                      <span>All Services</span>
                      {serviceTypeFilter === "all" && <Check className="w-3.5 h-3.5 text-[#1E3563]" />}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-1 bg-slate-100" />

                    {/* Category 1: Packages */}
                    <DropdownMenuLabel className="text-[11px] font-bold text-slate-800 uppercase tracking-wider px-2 pt-2 pb-1 select-none">
                      Packages
                    </DropdownMenuLabel>
                    {packageServiceOptions.length > 0 ? (
                      packageServiceOptions.map((opt) => (
                        <DropdownMenuItem
                          key={opt}
                          onClick={() => setServiceTypeFilter(opt)}
                          className={cn(
                            "text-xs font-medium pl-3 pr-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                            serviceTypeFilter === opt ? "bg-[#1E3563]/10 text-[#1E3563] font-bold" : "text-slate-700"
                          )}
                        >
                          <span>{opt}</span>
                          {serviceTypeFilter === opt && <Check className="w-3.5 h-3.5 text-[#1E3563]" />}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <div className="px-3 py-1 text-[11px] text-slate-400 italic">No packages</div>
                    )}

                    <DropdownMenuSeparator className="my-1 bg-slate-100" />

                    {/* Category 2: Combo Packs */}
                    <DropdownMenuLabel className="text-[11px] font-bold text-slate-800 uppercase tracking-wider px-2 pt-2 pb-1 select-none">
                      Combo Packs
                    </DropdownMenuLabel>
                    {comboPackNames.length > 0 ? (
                      comboPackNames.map((name) => (
                        <DropdownMenuItem
                          key={name}
                          onClick={() => setServiceTypeFilter(name)}
                          className={cn(
                            "text-xs font-medium pl-3 pr-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                            serviceTypeFilter === name ? "bg-[#1E3563]/10 text-[#1E3563] font-bold" : "text-slate-700"
                          )}
                        >
                          <span className="truncate">{name}</span>
                          {serviceTypeFilter === name && <Check className="w-3.5 h-3.5 text-[#1E3563] shrink-0" />}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <div className="px-3 py-1 text-[11px] text-slate-500 italic">No combo packs configured</div>
                    )}

                    <DropdownMenuSeparator className="my-1 bg-slate-100" />

                    {/* Category 3: Custom Quotes */}
                    <DropdownMenuLabel className="text-[11px] font-bold text-slate-800 uppercase tracking-wider px-2 pt-2 pb-1 select-none">
                      Custom Quotes
                    </DropdownMenuLabel>
                    {[
                      "Custom Quote - Food Only",
                      "Custom Quote - Event Setup Only",
                      "Custom Quote - Food and Event Setup",
                    ].map((opt) => (
                      <DropdownMenuItem
                        key={opt}
                        onClick={() => setServiceTypeFilter(opt)}
                        className={cn(
                          "text-xs font-medium pl-3 pr-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                          serviceTypeFilter === opt ? "bg-[#1E3563]/10 text-[#1E3563] font-bold" : "text-slate-700"
                        )}
                      >
                        <span>{opt}</span>
                        {serviceTypeFilter === opt && <Check className="w-3.5 h-3.5 text-[#1E3563]" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Sort Order */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold px-3 rounded-lg shadow-2xs gap-1.5 cursor-pointer shrink-0"
                    >
                      <span>
                        {sortBy === "newest"
                          ? "Newest first"
                          : sortBy === "oldest"
                            ? "Oldest first"
                            : "Event date"}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 rounded-xl p-1.5 shadow-lg border-slate-200">
                    <DropdownMenuLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1">
                      Sort Order
                    </DropdownMenuLabel>
                    {[
                      { id: "newest", label: "Newest first" },
                      { id: "oldest", label: "Oldest first" },
                      { id: "date", label: "Event date" },
                    ].map((item) => (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => setSortBy(item.id)}
                        className={cn(
                          "text-xs font-medium px-2 py-1.5 rounded-lg cursor-pointer flex items-center justify-between",
                          sortBy === item.id ? "bg-[#1E3563]/10 text-[#1E3563] font-bold" : "text-slate-700"
                        )}
                      >
                        <span>{item.label}</span>
                        {sortBy === item.id && <Check className="w-3.5 h-3.5 text-[#1E3563]" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* UNBOXED BOOKINGS CARDS LIST */}
            <div className="flex-1 overflow-y-auto space-y-3 p-1.5 [scrollbar-width:thin]">
              {loading ? (
                <div className="p-12 text-center text-xs text-slate-500 animate-pulse bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  Loading your event bookings...
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center my-4 shadow-2xs">
                  <FileText className="w-10 h-10 text-slate-400 mb-2" />
                  <h3 className="text-sm font-bold text-slate-900 font-sans">No bookings found</h3>
                  <p className="text-xs text-slate-600 mt-1 max-w-xs text-center">
                    {isFiltered
                      ? "Try clearing active search or filters to see other bookings."
                      : "No active bookings yet. Convert an accepted quotation to book your event."}
                  </p>
                  {isFiltered && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery("");
                        setStatusFilter("all");
                        setServiceTypeFilter("all");
                      }}
                      className="mt-4 text-xs font-semibold rounded-lg border-slate-200 text-slate-800"
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              ) : (
                filteredBookings.map((bkg) => {
                  const isSelected = bkg._id === selectedBookingId;
                  const refCode = bkg.reference || `CAZ-${bkg._id.substring(0, 6).toUpperCase()}`;
                  const thumbnail = getEventThumbnail(bkg);
                  const titleStr = recordTitle(bkg);
                  const bal = balanceOf(bkg);
                  const totalCost = Number(bkg.total_price || 0);
                  const locationStr = [bkg.municipality, bkg.province].filter(Boolean).join(", ") || bkg.venue_address || "Location TBD";
                  const nextAction = getNextActionInfo(bkg);
                  const countdown = getEventCountdown(bkg.event_date);

                  // Date badge parts
                  const eventDateObj = bkg.event_date ? new Date(bkg.event_date) : null;
                  const monthStr = eventDateObj ? eventDateObj.toLocaleDateString(undefined, { month: "short" }) : null;
                  const dayStr = eventDateObj ? eventDateObj.getDate() : null;

                  return (
                    <div
                      key={bkg._id}
                      onClick={() => handleSelectBooking(bkg._id)}
                      className={cn(
                        "group p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative",
                        isSelected
                          ? "bg-gradient-to-r from-blue-50/40 via-white to-white border-blue-200/90 shadow-xs"
                          : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-2xs"
                      )}
                    >
                      {/* CARD MAIN SECTION: BALANCED FLEX CONTAINER */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* LEFT/CENTER BLOCK: THUMBNAIL TILE & EVENT INFO */}
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          {/* Visual Tile */}
                          {thumbnail ? (
                            <img
                              src={thumbnail}
                              alt={titleStr}
                              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-blue-50/60 border border-blue-100 flex flex-col items-center justify-center text-center shrink-0 shadow-2xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2C4B8A] leading-none mb-0.5">
                                {monthStr || "DATE"}
                              </span>
                              <span className="text-base sm:text-lg font-extrabold text-slate-800 leading-tight">
                                {dayStr || "—"}
                              </span>
                            </div>
                          )}

                          {/* Event Specs & Title */}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-base text-slate-900 font-sans group-hover:text-[#1E3563] transition-colors leading-snug">
                                {titleStr}
                              </h3>
                              {renderStatusBadge(bkg)}
                              <span className="text-[11px] font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/70">
                                {refCode}
                              </span>
                              {isSelected && (
                                <span className="text-[10px] font-bold text-[#2C4B8A] bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1 select-none">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#2C4B8A]" />
                                  <span>Viewing</span>
                                </span>
                              )}
                            </div>

                            {/* Metadata Row */}
                            <div className="flex items-center gap-2 text-xs text-slate-700 font-medium flex-wrap pt-0.5">
                              <span className="inline-flex items-center gap-1 bg-blue-50/80 text-[#1E3563] px-2 py-0.5 rounded-md font-semibold text-[11px] border border-blue-100">
                                <Utensils className="w-3 h-3 text-[#1E3563]" />
                                {resolveServiceType(bkg)}
                              </span>
                              <span className="flex items-center gap-1 text-slate-700">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                {formatShortDate(bkg.event_date)}
                                {bkg.start_time && ` · ${bkg.start_time}`}
                              </span>
                              <span className="flex items-center gap-1 text-slate-700">
                                <Users className="w-3.5 h-3.5 text-slate-500" />
                                {bkg.guest_count ? `${bkg.guest_count} guests` : "Guests TBD"}
                              </span>
                              <span className="flex items-center gap-1 text-slate-700 truncate max-w-[180px]">
                                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate">{locationStr}</span>
                              </span>
                              {countdown && countdown.days >= 0 && (
                                <span
                                  className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                                    countdown.tone === "urgent"
                                      ? "bg-rose-50 text-rose-700 border-rose-200"
                                      : countdown.tone === "warning"
                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                        : "bg-blue-50 text-blue-800 border-blue-200"
                                  )}
                                >
                                  {countdown.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* RIGHT: FINANCIAL SUMMARY & CONTEXTUAL CTA */}
                        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Total Cost
                            </span>
                            <span className="font-sans font-extrabold text-base text-slate-900 block leading-tight">
                              {formatCurrency(totalCost)}
                            </span>
                            <span
                              className={cn(
                                "inline-block text-[10px] font-bold mt-0.5 px-2 py-0.5 rounded-full border",
                                bal > 0
                                  ? "text-amber-800 bg-amber-50 border-amber-200/80"
                                  : "text-emerald-800 bg-emerald-50 border-emerald-200/80"
                              )}
                            >
                              {bal > 0 ? `₱${bal.toLocaleString()} Due` : "Paid in Full"}
                            </span>
                          </div>

                          <div className="pt-0.5">
                            {nextAction?.actionType === "deposit" && (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startCheckout(bkg);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3.5 rounded-lg shadow-2xs gap-1.5 cursor-pointer active:scale-[0.98]"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Pay Deposit</span>
                                </Button>
                                {getBookingOcularActionMeta(bkg)?.state === "action_required" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRequestingOcularBooking(bkg);
                                    }}
                                    className="border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs h-8 px-2.5 rounded-lg shadow-2xs gap-1 cursor-pointer"
                                  >
                                    <CalendarClock className="w-3.5 h-3.5 text-amber-700" />
                                    <span>Ocular</span>
                                  </Button>
                                )}
                              </div>
                            )}

                            {nextAction?.actionType === "ocular" && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRequestingOcularBooking(bkg);
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 px-3.5 rounded-lg shadow-2xs gap-1.5 cursor-pointer active:scale-[0.98]"
                              >
                                <CalendarClock className="w-3.5 h-3.5" />
                                <span>Schedule Ocular</span>
                              </Button>
                            )}

                            {nextAction?.actionType === "ocular_reschedule" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRequestingOcularBooking(bkg);
                                }}
                                className="border-blue-300 bg-white hover:bg-blue-50 text-blue-900 font-bold text-xs h-8 px-3.5 rounded-lg shadow-2xs gap-1.5 cursor-pointer active:scale-[0.98]"
                              >
                                <CalendarClock className="w-3.5 h-3.5 text-blue-700" />
                                <span>Reschedule Ocular</span>
                              </Button>
                            )}

                            {nextAction?.actionType === "balance" && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startCheckout(bkg);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3.5 rounded-lg shadow-2xs gap-1.5 cursor-pointer active:scale-[0.98]"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Pay Balance</span>
                              </Button>
                            )}

                            {nextAction?.actionType === "proposal" && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/customer/bookings/${bkg._id}`);
                                }}
                                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 px-3.5 rounded-lg shadow-2xs gap-1.5 cursor-pointer active:scale-[0.98]"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Review Proposal</span>
                              </Button>
                            )}

                            {nextAction?.actionType === "view" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/customer/bookings/${bkg._id}`);
                                }}
                                className="border-slate-200 text-[#1E3563] hover:border-[#1E3563] hover:bg-[#1E3563] hover:text-white font-bold text-xs h-8 px-3 rounded-lg shadow-2xs gap-1 cursor-pointer transition-all"
                              >
                                <span>View</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* FULL-WIDTH INTEGRATED NEXT STEP FOOTER */}
                      {nextAction && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className={cn(
                                "w-2 h-2 rounded-full shrink-0",
                                nextAction.state === "action_required"
                                  ? "bg-amber-500 animate-pulse"
                                  : nextAction.state === "balance_due"
                                    ? "bg-blue-600"
                                    : nextAction.state === "in_progress"
                                      ? "bg-indigo-600"
                                      : "bg-emerald-600"
                              )}
                            />
                            <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500 shrink-0">
                              Next Step:
                            </span>
                            <span className="font-semibold text-slate-800 truncate">
                              {nextAction.title}
                            </span>
                          </div>

                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 border select-none",
                              nextAction.badgeClass
                            )}
                          >
                            {nextAction.badge}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT ACTION & EVENT OPERATIONS PANEL */}
          <div
            className={cn(
              "w-full md:w-[350px] lg:w-[380px] xl:w-[410px] shrink-0 bg-white border border-slate-200/90 rounded-2xl shadow-2xs flex flex-col h-full max-h-full min-h-0 overflow-hidden",
              mobileView === "list" ? "hidden md:flex" : "flex"
            )}
          >
            {/* Mobile Back Button */}
            <div className="md:hidden px-4 py-2.5 border-b border-slate-100 shrink-0 bg-white">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileView("list")}
                className="text-xs font-semibold text-[#1E3563] gap-1 p-0 hover:bg-transparent cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Bookings List
              </Button>
            </div>

            {selectedBooking ? (() => {
              const totalCost = Number(selectedBooking.total_price || 0);
              const bal = balanceOf(selectedBooking);
              const paidAmount = Math.max(0, totalCost - bal);
              const percentPaid = totalCost > 0 ? Math.min(100, Math.round((paidAmount / totalCost) * 100)) : 100;
              const nextAction = getNextActionInfo(selectedBooking);
              const countdown = getEventCountdown(selectedBooking.event_date);
              const assignedLead = selectedBooking.event_manager_id || (selectedBooking.staff_assignments && selectedBooking.staff_assignments[0]);
              const refCode = selectedBooking.reference || `CAZ-${selectedBooking._id.substring(0, 6).toUpperCase()}`;

              return (
                <>
                  {/* PANEL TOP HEADER: EVENT TITLE, STATUS & COUNTDOWN */}
                  <div className="p-4 border-b border-slate-100 shrink-0 bg-white space-y-2">
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Selected Event
                        </span>
                        <h3 className="font-bold text-base text-slate-900 font-sans leading-snug truncate">
                          {recordTitle(selectedBooking)}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono text-slate-600 font-medium">
                            Ref: {refCode}
                          </span>
                          {countdown && (
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                countdown.tone === "urgent"
                                  ? "bg-rose-50 text-rose-800 border-rose-200"
                                  : countdown.tone === "warning"
                                    ? "bg-amber-50 text-amber-900 border-amber-200"
                                    : "bg-blue-50 text-blue-800 border-blue-200"
                              )}
                            >
                              {countdown.label}
                            </span>
                          )}
                        </div>
                      </div>
                      {renderStatusBadge(selectedBooking)}
                    </div>
                  </div>

                  {/* SCROLLABLE OPERATIONS CONTENT */}
                  <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3.5 [scrollbar-width:thin]">
                    {/* 1. NEXT ACTION / STATUS GUIDANCE HERO CARD */}
                    {nextAction && (
                      <div
                        className={cn(
                          "rounded-xl border p-3.5 space-y-2.5 shadow-2xs",
                          nextAction.state === "action_required"
                            ? "bg-amber-50/80 border-amber-200"
                            : nextAction.state === "balance_due"
                              ? "bg-blue-50/70 border-blue-200"
                              : nextAction.state === "all_set"
                                ? "bg-emerald-50/60 border-emerald-200"
                                : "bg-slate-50 border-slate-200"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border",
                              nextAction.badgeClass
                            )}
                          >
                            {nextAction.badge}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-600">
                            Current Stage
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 font-sans leading-snug">
                            {nextAction.title}
                          </h4>
                          <p className="text-xs text-slate-700 leading-relaxed font-medium mt-1">
                            {nextAction.description}
                          </p>
                        </div>

                        {/* Primary Action Button inside Guidance */}
                        {nextAction.actionType === "deposit" && (
                          <div className="space-y-2">
                            <Button
                              onClick={() => startCheckout(selectedBooking)}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 rounded-lg shadow-xs gap-1.5 cursor-pointer active:scale-[0.98]"
                            >
                              <CreditCard className="w-4 h-4" />
                              <span>Pay Deposit Now ({formatCurrency(bal)})</span>
                            </Button>
                            {getBookingOcularActionMeta(selectedBooking)?.state === "action_required" && (
                              <Button
                                variant="outline"
                                onClick={() => setRequestingOcularBooking(selectedBooking)}
                                className="w-full border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs h-8.5 rounded-lg shadow-xs gap-1.5 cursor-pointer"
                              >
                                <CalendarClock className="w-4 h-4 text-amber-700" />
                                <span>Schedule Ocular Visit</span>
                              </Button>
                            )}
                          </div>
                        )}

                        {nextAction.actionType === "ocular" && (
                          <Button
                            onClick={() => setRequestingOcularBooking(selectedBooking)}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8.5 rounded-lg shadow-xs gap-1.5 cursor-pointer active:scale-[0.98]"
                          >
                            <CalendarClock className="w-4 h-4" />
                            <span>Select Ocular Visit Date</span>
                          </Button>
                        )}

                        {nextAction.actionType === "ocular_reschedule" && (
                          <Button
                            variant="outline"
                            onClick={() => setRequestingOcularBooking(selectedBooking)}
                            className="w-full border-blue-300 bg-white hover:bg-blue-50 text-blue-900 font-bold text-xs h-8.5 rounded-lg shadow-xs gap-1.5 cursor-pointer"
                          >
                            <CalendarClock className="w-4 h-4 text-blue-700" />
                            <span>Reschedule Ocular Visit</span>
                          </Button>
                        )}

                        {nextAction.actionType === "balance" && (
                          <Button
                            onClick={() => startCheckout(selectedBooking)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8.5 rounded-lg shadow-xs gap-1.5 cursor-pointer active:scale-[0.98]"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>Settle Remaining Balance ({formatCurrency(bal)})</span>
                          </Button>
                        )}
                      </div>
                    )}

                    {/* 2. CATERING JOURNEY TIMELINE STEPPER */}
                    <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#1E3563]" />
                          <span>Journey Progress</span>
                        </span>
                        <span className="text-slate-500 font-medium">Step {activeBookingStep + 1} of 4</span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-semibold relative pt-1 pb-1">
                        {/* Connecting Background Line */}
                        <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200 -z-0" />
                        {/* Active Filled Progress Line */}
                        <div
                          className="absolute top-4 left-4 h-0.5 bg-[#1E3563] transition-all duration-300 -z-0"
                          style={{ width: `${(activeBookingStep / 3) * 100}%` }}
                        />

                        {[
                          { label: "Inquiry", step: 0 },
                          { label: "Quote", step: 1 },
                          { label: "Booking", step: 2 },
                          { label: "Event", step: 3 },
                        ].map((s) => {
                          const isDone = activeBookingStep > s.step;
                          const isCurrent = activeBookingStep === s.step;

                          return (
                            <div key={s.label} className="flex flex-col items-center gap-1 z-10">
                              <div
                                className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-2xs",
                                  isDone
                                    ? "bg-emerald-600 text-white"
                                    : isCurrent
                                      ? "bg-[#1E3563] text-white ring-3 ring-[#1E3563]/15 scale-105"
                                      : "bg-white text-slate-500 border border-slate-300"
                                )}
                              >
                                {isDone ? <Check className="w-3 h-3 stroke-[2.5]" /> : s.step + 1}
                              </div>
                              <span
                                className={cn(
                                  "text-[10px] font-medium leading-tight",
                                  isCurrent ? "font-bold text-[#1E3563]" : isDone ? "text-slate-800" : "text-slate-500"
                                )}
                              >
                                {s.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. ASSIGNED CATERING LEAD & DIRECT MESSAGING */}
                    <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-3 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Catering &amp; Dispatch Coordination
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#1E3563]/10 text-[#1E3563] border border-[#1E3563]/20 flex items-center justify-center text-xs font-bold shrink-0">
                            {assignedLead?.full_name?.charAt(0) || assignedLead?.name?.charAt(0) || "C"}
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-bold text-xs text-slate-900 truncate">
                              {assignedLead?.full_name || assignedLead?.name || "Caezelle Catering Team"}
                            </h5>
                            <p className="text-[11px] text-slate-600">
                              {isFoodOnly(resolveServiceType(selectedBooking)) ? "Dispatch & Kitchen Lead" : "Event Coordinator"}
                            </p>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenChat(selectedBooking)}
                          disabled={isOpeningChat}
                          className="h-7.5 px-2.5 text-xs font-semibold rounded-lg border-slate-200 text-slate-700 hover:text-[#1E3563] hover:border-[#1E3563] gap-1 shrink-0 cursor-pointer shadow-2xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-[#1E3563]" />
                          <span>Chat</span>
                        </Button>
                      </div>
                    </div>

                    {/* 4. FINANCIAL SUMMARY & INVOICE SHORTCUT */}
                    <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Payment Status
                        </span>
                        <span className="font-bold text-xs text-slate-800">{percentPaid}% Settled</span>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            percentPaid === 100 ? "bg-emerald-600" : percentPaid > 0 ? "bg-[#1E3563]" : "bg-amber-500"
                          )}
                          style={{ width: `${percentPaid}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                        <div>
                          <div className="text-[10px] text-slate-500 font-medium">Total Cost</div>
                          <div className="font-bold text-slate-900 text-xs font-sans">{formatCurrency(totalCost)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 font-medium">Balance Due</div>
                          <div className={cn("font-bold text-xs font-sans", bal > 0 ? "text-amber-800" : "text-emerald-800")}>
                            {bal > 0 ? formatCurrency(bal) : "Fully Settled"}
                          </div>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => setIsInvoiceOpen(true)}
                          className="text-[11px] font-semibold text-[#1E3563] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Official Invoice</span>
                        </button>
                        {bal > 0 && (
                          <button
                            type="button"
                            onClick={() => startCheckout(selectedBooking)}
                            className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                          >
                            Pay Balance →
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 5. EVENT LOGISTICS SUMMARY */}
                    <div className="bg-slate-50/70 border border-slate-200/90 rounded-xl p-3 space-y-1.5 text-xs">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                        Logistics Summary
                      </div>
                      <div className="flex items-center justify-between text-slate-700 py-0.5 border-b border-slate-200/60">
                        <span className="text-slate-600 font-medium">Event Date</span>
                        <span className="font-semibold text-slate-900">{formatEventDateWithDay(selectedBooking.event_date)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700 py-0.5 border-b border-slate-200/60">
                        <span className="text-slate-600 font-medium">Guest Count</span>
                        <span className="font-semibold text-slate-900">{selectedBooking.guest_count ? `${selectedBooking.guest_count} pax` : "TBD"}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700 py-0.5 border-b border-slate-200/60">
                        <span className="text-slate-600 font-medium">Service Type</span>
                        <span className="font-semibold text-slate-900">{resolveServiceType(selectedBooking)}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700 py-0.5">
                        <span className="text-slate-600 font-medium">Location</span>
                        <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                          {[selectedBooking.municipality, selectedBooking.province].filter(Boolean).join(", ") || selectedBooking.venue_address || "Location TBD"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* FIXED FOOTER: VIEW FULL DETAILS CTA */}
                  <div className="p-3.5 bg-white border-t border-slate-100 shrink-0">
                    <Button
                      onClick={() => navigate(`/customer/bookings/${selectedBooking._id}`)}
                      className="w-full bg-[#1E3563] hover:bg-[#152547] text-white font-bold text-xs h-9 rounded-lg cursor-pointer shadow-xs gap-1.5 shrink-0 transition-all flex items-center justify-center active:scale-[0.98]"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Full Booking Details</span>
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </Button>
                  </div>
                </>
              );
            })() : (
              <div className="p-8 text-center text-slate-500 text-xs my-auto">
                Select a booking to view its operational summary.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REUSED MODALS */}
      {requestingOcularBooking && (
        <OcularDatePickerModal
          isOpen={Boolean(requestingOcularBooking)}
          onClose={() => setRequestingOcularBooking(null)}
          onSubmit={submitOcularRequest}
          isSubmitting={isSubmittingOcular}
          initialDate={requestingOcularBooking?.ocular_visit?.scheduled_date}
          initialTime={requestingOcularBooking?.ocular_visit?.scheduled_time || "10:00 AM"}
          eventDate={requestingOcularBooking?.event_date}
          eventTitle={requestingOcularBooking?.event_type}
          eventType={requestingOcularBooking?.event_type}
          booking={requestingOcularBooking}
        />
      )}

      {selectedBooking && isInvoiceOpen && (
        <InvoiceModal
          open={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
          booking={selectedBooking}
          payments={payments.filter(
            (p) => String(p.booking_id?._id || p.booking_id) === String(selectedBooking._id)
          )}
          businessInfo={businessInfo}
        />
      )}

      {choiceModalOpen && choiceModalBooking && (
        <PaymentChoiceModal
          open={choiceModalOpen}
          onClose={() => {
            setChoiceModalOpen(false);
            setChoiceModalBooking(null);
          }}
          booking={choiceModalBooking}
          balanceAmount={balanceOf(choiceModalBooking)}
          onSuccess={() => loadData(true)}
        />
      )}
    </CustomerDashboardLayout>
  );
}
